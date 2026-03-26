import { ENV } from "./_core/env";

// WhatsApp Business Cloud API service

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

interface SendMessageResult {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  replyToMessageId?: string
): Promise<SendMessageResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp API credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.");
  }

  const payload: any = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  // Thread the reply to the original message
  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("[WhatsApp] Send message failed:", JSON.stringify(error));
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  console.log("[WhatsApp] Message sent to:", to, "id:", result.messages?.[0]?.id);
  return result as SendMessageResult;
}

/**
 * Mark a message as read in WhatsApp
 */
export async function markWhatsAppMessageAsRead(messageId: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  try {
    await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      }
    );
    console.log("[WhatsApp] Marked as read:", messageId);
  } catch (error) {
    console.error("[WhatsApp] Failed to mark as read:", error);
  }
}

/**
 * Parse incoming WhatsApp message from webhook payload
 */
export interface ParsedWhatsAppMessage {
  senderPhone: string;
  senderName: string;
  waMessageId: string;
  messageText: string;
  messageType: string;
  timestamp: Date;
}

export function parseWebhookMessages(body: any): ParsedWhatsAppMessage[] {
  const messages: ParsedWhatsAppMessage[] = [];

  if (body.object !== "whatsapp_business_account") return messages;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const value = change.value;

      // Filter out status updates — only process actual messages
      const incomingMessages = value.messages || [];
      const contacts = value.contacts || [];

      if (incomingMessages.length === 0) continue;

      for (let i = 0; i < incomingMessages.length; i++) {
        const msg = incomingMessages[i];
        const contact = contacts[i] || {};
        const senderName = contact.profile?.name || "Unknown";
        const senderPhone = msg.from;
        const waMessageId = msg.id;
        const timestamp = new Date(parseInt(msg.timestamp) * 1000);

        let messageText = "";
        switch (msg.type) {
          case "text":
            messageText = msg.text?.body || "";
            break;
          case "image":
            messageText = `[Image] ${msg.image?.caption || "No caption"}`;
            break;
          case "document":
            messageText = `[Document] ${msg.document?.filename || "Unknown file"}`;
            break;
          case "audio":
            messageText = "[Voice message]";
            break;
          case "video":
            messageText = `[Video] ${msg.video?.caption || "No caption"}`;
            break;
          case "location":
            messageText = `[Location] ${msg.location?.latitude}, ${msg.location?.longitude}`;
            break;
          default:
            messageText = `[${msg.type}] Unsupported message type`;
        }

        messages.push({
          senderPhone,
          senderName,
          waMessageId,
          messageText,
          messageType: msg.type,
          timestamp,
        });
      }
    }
  }

  return messages;
}
