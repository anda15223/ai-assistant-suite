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
    // Increase timeouts for slow servers
    greetingTimeout: 30000,
    socketTimeout: 60000,
  } as any);
}

/**
 * Fetch recent emails from an IMAP account.
 * Uses a robust approach: open mailbox, check message count, fetch by sequence number.
 */
export async function fetchEmails(
  account: EmailAccount,
  limit: number = 20,
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

    // Strategy: fetch the most recent N messages by sequence number
    // This avoids the "Command failed" error from SEARCH with dates on some servers
    const totalMessages = mailbox.exists;
    const startSeq = Math.max(1, totalMessages - limit + 1);
    const range = `${startSeq}:${totalMessages}`;

    console.log(`[EmailService] Fetching messages ${range} (${Math.min(limit, totalMessages)} messages)`);

    try {
      // Use fetch with sequence numbers (not UIDs) for maximum compatibility
      for await (const message of client.fetch(range, {
        uid: true,
        envelope: true,
        source: true,
      }, { uid: false })) {
        try {
          const envelope = message.envelope;
          if (!envelope) {
            console.log("[EmailService] Skipping message with no envelope, seq:", message.seq);
            continue;
          }

          // Skip messages older than sinceDate if provided
          if (sinceDate && envelope.date && new Date(envelope.date) < sinceDate) {
            continue;
          }

          const source = message.source?.toString() || "";

          // Extract plain text and HTML from the raw source
          let bodyText = "";
          let bodyHtml = "";

          // Try multipart extraction first
          const textMatch = source.match(
            /Content-Type:\s*text\/plain[^]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\.\r\n|$)/i
          );
          if (textMatch) {
            bodyText = textMatch[1]?.trim() || "";
          }

          const htmlMatch = source.match(
            /Content-Type:\s*text\/html[^]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\.\r\n|$)/i
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
            messageId: envelope?.messageId || `generated-${message.uid}-${Date.now()}`,
            subject: envelope?.subject || "(No Subject)",
            fromAddress: envelope?.from?.[0]?.address || "",
            fromName: envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || "",
            toAddress: envelope?.to?.map((t: any) => t.address).join(", ") || "",
            body: bodyText.substring(0, 10000),
            bodyHtml: bodyHtml.substring(0, 50000),
            receivedAt: envelope?.date ? new Date(envelope.date) : new Date(),
          });
        } catch (msgErr) {
          console.error("[EmailService] Error processing individual message:", (msgErr as Error).message);
          // Continue processing other messages
        }
      }
    } catch (fetchErr) {
      console.error("[EmailService] Fetch loop error:", (fetchErr as Error).message);
      console.log("[EmailService] Trying fallback: fetch one-by-one...");

      // Fallback: fetch messages one at a time
      for (let seq = totalMessages; seq >= startSeq && results.length < limit; seq--) {
        try {
          for await (const message of client.fetch(`${seq}`, {
            uid: true,
            envelope: true,
            source: true,
          }, { uid: false })) {
            const envelope = message.envelope;
            if (!envelope) continue;

            if (sinceDate && envelope.date && new Date(envelope.date) < sinceDate) {
              continue;
            }

            const source = message.source?.toString() || "";
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

            results.push({
              uid: message.uid,
              messageId: envelope?.messageId || `generated-${message.uid}-${Date.now()}`,
              subject: envelope?.subject || "(No Subject)",
              fromAddress: envelope?.from?.[0]?.address || "",
              fromName: envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || "",
              toAddress: envelope?.to?.map((t: any) => t.address).join(", ") || "",
              body: bodyText.substring(0, 10000),
              bodyHtml: bodyHtml.substring(0, 50000),
              receivedAt: envelope?.date ? new Date(envelope.date) : new Date(),
            });
          }
        } catch (singleErr) {
          console.error(`[EmailService] Failed to fetch message seq ${seq}:`, (singleErr as Error).message);
          // Skip this message and continue
        }
      }
    }

    console.log(`[EmailService] Successfully fetched ${results.length} emails`);
    await client.logout();
  } catch (err) {
    console.error("[EmailService] IMAP connection error:", err);
    // Try to clean up
    try { await client.logout(); } catch (_) {}
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
