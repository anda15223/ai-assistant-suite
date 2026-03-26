import { Router } from "express";
import { parseWebhookMessages, markWhatsAppMessageAsRead, type ParsedWhatsAppMessage } from "./whatsappService";
import { classifyWhatsAppMessage } from "./aiService";
import { getDb } from "./db";
import { whatsappMessages, whatsappDraftReplies, tasks, employees } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

export const whatsappWebhookRouter = Router();

// GET /api/webhook/whatsapp — Verification endpoint
whatsappWebhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("[WhatsApp] Webhook verification request:", { mode, token: token ? "***" : "missing" });

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[WhatsApp] Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  console.warn("[WhatsApp] Webhook verification failed");
  return res.sendStatus(403);
});

// POST /api/webhook/whatsapp — Message receiver
whatsappWebhookRouter.post("/", async (req, res) => {
  // MUST return 200 immediately to prevent Meta retries
  res.sendStatus(200);

  try {
    const parsed = parseWebhookMessages(req.body);
    if (parsed.length === 0) return;

    console.log(`[WhatsApp] Received ${parsed.length} message(s)`);

    for (const msg of parsed) {
      await processWhatsAppMessage(msg);
    }
  } catch (error) {
    console.error("[WhatsApp] Webhook processing error:", error);
  }
});

/**
 * Process a single WhatsApp message:
 * 1. Deduplicate by waMessageId
 * 2. Save to DB
 * 3. Classify with AI
 * 4. Create task (1:1 rule)
 * 5. Generate draft reply
 * 6. Mark as read
 */
async function processWhatsAppMessage(msg: ParsedWhatsAppMessage) {
  const db = await getDb();
  if (!db) {
    console.error("[WhatsApp] Database not available");
    return;
  }

  try {
    // 1. Deduplicate by waMessageId
    const existing = await db
      .select({ id: whatsappMessages.id })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.waMessageId, msg.waMessageId))
      .limit(1);

    if (existing.length > 0) {
      console.log("[WhatsApp] Duplicate message, skipping:", msg.waMessageId);
      return;
    }

    // Look up employee by phone
    const employeeResult = await db
      .select()
      .from(employees)
      .where(eq(employees.phone, msg.senderPhone))
      .limit(1);
    const employee = employeeResult[0];
    const displayName = employee?.name || msg.senderName;

    // 2. Save message to DB (userId = 1 for owner, since webhook doesn't have auth context)
    const [insertResult] = await db.insert(whatsappMessages).values({
      userId: 1,
      waMessageId: msg.waMessageId,
      senderPhone: msg.senderPhone,
      senderName: displayName,
      messageType: msg.messageType,
      messageText: msg.messageText,
      isProcessed: false,
      receivedAt: msg.timestamp,
    });
    const messageDbId = insertResult.insertId;

    console.log(`[WhatsApp] Saved message ${msg.waMessageId} from ${displayName} (${msg.senderPhone})`);

    // 3. Classify with AI
    let classification: any = null;
    try {
      classification = await classifyWhatsAppMessage(msg.messageText, displayName, employee?.role || undefined);
      console.log(`[WhatsApp] Classified as: ${classification.classification}`);
    } catch (err) {
      console.error("[WhatsApp] AI classification failed:", err);
    }

    // Update message with classification
    const classValue = classification?.classification || "request";
    const aiSummary = classification?.summary || `Message from ${displayName}: ${msg.messageText.substring(0, 200)}`;

    await db.update(whatsappMessages)
      .set({
        classification: classValue as any,
        aiSummary,
        aiAnalysis: classification || {},
        isProcessed: true,
      })
      .where(eq(whatsappMessages.id, messageDbId));

    // 4. Create task (1:1 rule — every message = one task)
    const taskTitle = classification?.taskData?.title || `[WhatsApp] ${displayName}: ${msg.messageText.substring(0, 80)}`;
    const taskDescription = classification?.taskData?.description || `WhatsApp message from ${displayName} (${msg.senderPhone}):\n\n${msg.messageText}`;
    const taskPriority = classification?.taskData?.priority || (classValue === "problem" ? "high" : "medium");
    const taskCategory = classification?.taskData?.category || (employee?.department || "general");

    const safeParseDueDate = (dateStr: string | null | undefined): Date | undefined => {
      if (!dateStr) return undefined;
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? undefined : d;
      } catch {
        return undefined;
      }
    };

    await db.insert(tasks).values({
      userId: 1,
      emailId: null,
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority as any,
      status: "pending",
      dueDate: safeParseDueDate(classification?.taskData?.dueDate),
      category: taskCategory,
      source: "whatsapp",
      metadata: {
        whatsappMessageId: messageDbId,
        senderPhone: msg.senderPhone,
        senderName: displayName,
        waMessageId: msg.waMessageId,
        classification: classValue,
      },
    });

    console.log(`[WhatsApp] Task created: ${taskTitle}`);

    // 5. Generate draft reply
    try {
      const draftReplyText = await generateWhatsAppDraftReply(msg.messageText, displayName, classValue, aiSummary);

      await db.insert(whatsappDraftReplies).values({
        userId: 1,
        whatsappMessageId: messageDbId,
        replyText: draftReplyText,
        toPhone: msg.senderPhone,
        originalWaMessageId: msg.waMessageId,
        status: "pending",
      });

      console.log(`[WhatsApp] Draft reply generated for ${displayName}`);
    } catch (err) {
      console.error("[WhatsApp] Draft reply generation failed:", err);
    }

    // 6. Mark as read in WhatsApp
    await markWhatsAppMessageAsRead(msg.waMessageId);

  } catch (error) {
    console.error("[WhatsApp] Error processing message:", msg.waMessageId, error);
  }
}

/**
 * Generate a draft reply for a WhatsApp message
 */
async function generateWhatsAppDraftReply(
  messageText: string,
  senderName: string,
  classification: string,
  aiSummary: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional business assistant drafting WhatsApp replies on behalf of the business owner. 
Keep replies concise, friendly, and professional. Use short paragraphs suitable for WhatsApp.
Do NOT use formal letter format. Be direct and helpful.
The message was classified as: ${classification}.
AI Summary: ${aiSummary}`
      },
      {
        role: "user",
        content: `Draft a WhatsApp reply to this message from ${senderName}:\n\n"${messageText}"\n\nWrite a professional, helpful reply.`
      }
    ],
  });

  return (response.choices[0]?.message?.content as string) || "Thank you for your message. I'll look into this and get back to you shortly.";
}
