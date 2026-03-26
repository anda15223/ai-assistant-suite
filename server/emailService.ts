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

/**
 * Fetch recent emails from an IMAP account.
 */
export async function fetchEmails(
  account: EmailAccount,
  limit: number = 20,
  sinceDate?: Date
): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: {
      user: account.emailAddress,
      pass: account.password,
    },
    logger: false,
  });

  const results: FetchedEmail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for recent emails
      const since = sinceDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // default: last 7 days
      const searchResult = await client.search({ since }, { uid: true });

      if (!searchResult || searchResult.length === 0) {
        return results;
      }

      // Take the most recent ones
      const uids = searchResult.slice(-limit);
      const uidRange = uids.join(",");

      for await (const message of client.fetch(uidRange, {
        uid: true,
        envelope: true,
        source: true,
        bodyStructure: true,
      })) {
        try {
          const envelope = message.envelope;
          const source = message.source?.toString() || "";

          // Extract plain text and HTML from the raw source
          let bodyText = "";
          let bodyHtml = "";

          // Simple extraction from raw source
          const textMatch = source.match(
            /Content-Type: text\/plain[^]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\.\r\n|$)/i
          );
          if (textMatch) {
            bodyText = textMatch[1]?.trim() || "";
          }

          const htmlMatch = source.match(
            /Content-Type: text\/html[^]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\.\r\n|$)/i
          );
          if (htmlMatch) {
            bodyHtml = htmlMatch[1]?.trim() || "";
          }

          // If no multipart, the whole body might be text
          if (!bodyText && !bodyHtml) {
            const simpleBody = source.split("\r\n\r\n").slice(1).join("\r\n\r\n");
            bodyText = simpleBody?.substring(0, 10000) || "";
          }

          results.push({
            uid: message.uid,
            messageId: envelope?.messageId || "",
            subject: envelope?.subject || "(No Subject)",
            fromAddress: envelope?.from?.[0]?.address || "",
            fromName: envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || "",
            toAddress: envelope?.to?.map((t: any) => t.address).join(", ") || "",
            body: bodyText.substring(0, 10000),
            bodyHtml: bodyHtml.substring(0, 50000),
            receivedAt: envelope?.date || new Date(),
          });
        } catch (msgErr) {
          console.error("[EmailService] Error processing message:", msgErr);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("[EmailService] IMAP error:", err);
    throw new Error(`Failed to fetch emails: ${(err as Error).message}`);
  }

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
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: {
      user: account.emailAddress,
      pass: account.password,
    },
    logger: false,
  });

  try {
    await client.connect();
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
    await transporter.sendMail({
      from: account.emailAddress,
      to,
      subject,
      text: body,
      ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    });
    return true;
  } catch (err) {
    console.error("[EmailService] SMTP error:", err);
    throw new Error(`Failed to send email: ${(err as Error).message}`);
  }
}
