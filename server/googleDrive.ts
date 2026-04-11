import { google } from "googleapis";
import { ENV } from "./_core/env";
import * as db from "./db";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function createOAuth2Client() {
  return new google.auth.OAuth2(
    ENV.googleClientId,
    ENV.googleClientSecret,
    ENV.googleRedirectUri
  );
}

// ── OAuth Flow ──────────────────────────────────────────────────────

export function getGoogleAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function handleGoogleCallback(
  code: string,
  userId: number
): Promise<{ email: string }> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  client.setCredentials(tokens);

  // Get the user's email
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || "";

  await db.upsertOAuthToken({
    userId,
    provider: "google",
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope,
    email,
  });

  return { email };
}

// ── Authenticated Client ────────────────────────────────────────────

async function getAuthenticatedClient(userId: number) {
  const token = await db.getOAuthToken(userId, "google");
  if (!token) throw new Error("Google Drive not connected. Go to Settings to connect.");

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt?.getTime(),
  });

  // Auto-refresh if expired
  client.on("tokens", async (newTokens) => {
    await db.upsertOAuthToken({
      userId,
      provider: "google",
      accessToken: newTokens.access_token || token.accessToken,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
    });
  });

  return client;
}

// ── Drive API Operations ────────────────────────────────────────────

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  parents?: string[];
};

export async function searchDriveFiles(
  userId: number,
  query: string,
  limit: number = 20
): Promise<DriveFile[]> {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });

  // Search in file name and full text content
  const escapedQuery = query.replace(/'/g, "\\'");
  const q = `fullText contains '${escapedQuery}' and trashed = false`;

  const response = await drive.files.list({
    q,
    pageSize: limit,
    fields: "files(id, name, mimeType, modifiedTime, size, webViewLink, parents)",
    orderBy: "modifiedTime desc",
  });

  return (response.data.files || []) as DriveFile[];
}

export async function listDriveFiles(
  userId: number,
  folderId?: string,
  limit: number = 20
): Promise<DriveFile[]> {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });

  const q = folderId
    ? `'${folderId}' in parents and trashed = false`
    : "trashed = false";

  const response = await drive.files.list({
    q,
    pageSize: limit,
    fields: "files(id, name, mimeType, modifiedTime, size, webViewLink, parents)",
    orderBy: "modifiedTime desc",
  });

  return (response.data.files || []) as DriveFile[];
}

export async function readDriveFile(
  userId: number,
  fileId: string
): Promise<{ name: string; mimeType: string; content: string }> {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });

  // Get file metadata
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType",
  });

  const name = meta.data.name || "Unknown";
  const mimeType = meta.data.mimeType || "";

  // Google Docs/Sheets/Slides → export as plain text
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    let exportMime = "text/plain";
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      exportMime = "text/csv";
    }

    const exported = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "text" }
    );

    return {
      name,
      mimeType: exportMime,
      content: (typeof exported.data === "string"
        ? exported.data
        : JSON.stringify(exported.data)
      ).substring(0, 10000),
    };
  }

  // PDFs and other binary files — get download content as text
  if (mimeType === "application/pdf") {
    // For PDFs, return metadata only (Claude can't read raw PDF bytes via text)
    return {
      name,
      mimeType,
      content: `[PDF file: ${name}. Use the file's webViewLink to open it in Google Drive.]`,
    };
  }

  // Plain text, CSV, JSON, etc.
  try {
    const content = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    return {
      name,
      mimeType,
      content: (typeof content.data === "string"
        ? content.data
        : JSON.stringify(content.data)
      ).substring(0, 10000),
    };
  } catch {
    return {
      name,
      mimeType,
      content: `[Binary file: ${name} (${mimeType}). Cannot read as text.]`,
    };
  }
}

export async function getDriveConnectionStatus(userId: number) {
  const token = await db.getOAuthToken(userId, "google");
  if (!token) return { connected: false, email: null };
  return { connected: true, email: token.email };
}
