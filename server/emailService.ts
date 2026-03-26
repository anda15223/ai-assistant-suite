import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import type { EmailAccount } from "../drizzle/schema";

export interface FetchedEmail {
  uid: number;
  messageId: string;
  subject: string;
  fromAddress: string;
  fromName: string;
  toAddress: string;
  body: string;
  bodyHtml: string;
  receivedAt: Date;
}

function createImapClient(account: {
  emailAddress: string;
  password: string;
  imapHost: string;
  imapPort: number;
}) {
  return new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: {
      user: account.emailAddress,
      pass: account.password,
    },
    logger: false,
    emitLogs: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    greetingTimeout: 30000,
    socketTimeout: 120000, // 2 min for large fetches
  } as any);
}

function parseEmailSource(source: string): { bodyText: string; bodyHtml: string } {
  let bodyText = "";
  let bodyHtml = "";

  const textMatch = source.match(
    /Content-Type:\s*text\/plain[^]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\.\r\n|$)/i
  );
  if (textMatch) bodyText = textMatch[1]?.trim() || "";

  const htmlMatch = source.match(
    /Content-Type:\s*text\/html[^]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\.\r\n|$)/i
  );
  if (htmlMatch) bodyHtml = htmlMatch[1]?.trim() || "";

  if (!bodyText && !bodyHtml) {
    const simpleBody = source.split("\r\n\r\n").slice(1).join("\r\n\r\n");
    bodyText = simpleBody?.substring(0, 10000) || "";
  }

  return { bodyText: bodyText.substring(0, 10000), bodyHtml: bodyHtml.substring(0, 50000) };
}

function messageToFetchedEmail(message: any): FetchedEmail | null {
  const envelope = message.envelope;
  if (!envelope) return null;

  const source = message.source?.toString() || "";
  const { bodyText, bodyHtml } = parseEmailSource(source);

  return {
    uid: message.uid,
    messageId: envelope?.messageId || `generated-${message.uid}-${Date.now()}`,
    subject: envelope?.subject || "(No Subject)",
    fromAddress: envelope?.from?.[0]?.address || "",
    fromName: envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || "",
    toAddress: envelope?.to?.map((t: any) => t.address).join(", ") || "",
    body: bodyText,
    bodyHtml: bodyHtml,
    receivedAt: envelope?.date ? new Date(envelope.date) : new Date(),
  };
}

/**
 * Fetch emails from an IMAP account.
 * Fetches ALL messages from the mailbox and filters by sinceDate client-side.
 * Uses sequence-number-based fetching in batches for robustness.
 */
export async function fetchEmails(
  account: EmailAccount,
  limit: number = 500,
  sinceDate?: Date
): Promise<FetchedEmail[]> {
  const client = createImapClient(account);
  const results: FetchedEmail[] = [];

  try {
    console.log("[EmailService] Connecting to IMAP server:", account.imapHost);
    await client.connect();
    console.log("[EmailService] Connected successfully");

    const mailbox = await client.mailboxOpen("INBOX");
    console.log("[EmailService] Mailbox opened. Total messages:", mailbox.exists);

    if (!mailbox.exists || mailbox.exists === 0) {
      console.log("[EmailService] Mailbox is empty, nothing to fetch");
      await client.logout();
      return results;
    }

    const totalMessages = mailbox.exists;
    // Fetch ALL messages (or up to limit) starting from the newest
    const messagesToFetch = Math.min(limit, totalMessages);
    const startSeq = Math.max(1, totalMessages - messagesToFetch + 1);

    console.log(`[EmailService] Will fetch messages seq ${startSeq}:${totalMessages} (up to ${messagesToFetch} messages)`);
    if (sinceDate) {
      console.log(`[EmailService] Filtering for emails since: ${sinceDate.toISOString()}`);
    }

    // Fetch in batches of 50 to avoid timeouts on large mailboxes
    const BATCH_SIZE = 50;
    let reachedOldEnough = false;

    for (let batchEnd = totalMessages; batchEnd >= startSeq && !reachedOldEnough; batchEnd -= BATCH_SIZE) {
      const batchStart = Math.max(startSeq, batchEnd - BATCH_SIZE + 1);
      const range = `${batchStart}:${batchEnd}`;

      console.log(`[EmailService] Fetching batch ${range}...`);

      try {
        for await (const message of client.fetch(range, {
          uid: true,
          envelope: true,
          source: true,
        }, { uid: false })) {
          try {
            const email = messageToFetchedEmail(message);
            if (!email) continue;

            // If we have a sinceDate and this email is older, skip it
            if (sinceDate && email.receivedAt < sinceDate) {
              // If we're processing newest-first and hit an old email,
              // we might still have newer ones in this batch, so just skip
              continue;
            }

            results.push(email);
          } catch (msgErr) {
            console.error("[EmailService] Error processing message:", (msgErr as Error).message);
          }
        }
      } catch (batchErr) {
        console.error(`[EmailService] Batch ${range} failed:`, (batchErr as Error).message);
        console.log("[EmailService] Trying one-by-one fallback for this batch...");

        // Fallback: fetch one at a time for this batch
        for (let seq = batchEnd; seq >= batchStart; seq--) {
          try {
            for await (const message of client.fetch(`${seq}`, {
              uid: true,
              envelope: true,
              source: true,
            }, { uid: false })) {
              const email = messageToFetchedEmail(message);
              if (!email) continue;
              if (sinceDate && email.receivedAt < sinceDate) continue;
              results.push(email);
            }
          } catch (singleErr) {
            console.error(`[EmailService] Failed seq ${seq}:`, (singleErr as Error).message);
          }
        }
      }

      console.log(`[EmailService] Progress: ${results.length} emails collected so far`);
    }

    console.log(`[EmailService] Successfully fetched ${results.length} emails total`);
    await client.logout();
  } catch (err) {
    console.error("[EmailService] IMAP connection error:", err);
    try { await client.logout(); } catch (_) {}
    throw new Error(`Failed to fetch emails: ${(err as Error).message}`);
  }

  // Sort by date descending (newest first)
  results.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  return results;
}

/**
 * Test IMAP connection to verify credentials.
 */
export async function testConnection(account: {
  emailAddress: string;
  password: string;
  imapHost: string;
  imapPort: number;
}): Promise<boolean> {
  const client = createImapClient(account);

  try {
    console.log("[EmailService] Testing connection to:", account.imapHost);
    await client.connect();
    console.log("[EmailService] Connection test successful");
    await client.logout();
    return true;
  } catch (err) {
    console.error("[EmailService] Connection test failed:", err);
    return false;
  }
}

/**
 * Send an email via SMTP.
 */
export async function sendEmail(
  account: EmailAccount,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string
): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: true,
    auth: {
      user: account.emailAddress,
      pass: account.password,
    },
  });

  try {
    console.log("[EmailService] Sending email to:", to);
    await transporter.sendMail({
      from: account.emailAddress,
      to,
      subject,
      text: body,
      ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    });
    console.log("[EmailService] Email sent successfully");
    return true;
  } catch (err) {
    console.error("[EmailService] SMTP error:", err);
    throw new Error(`Failed to send email: ${(err as Error).message}`);
  }
}
