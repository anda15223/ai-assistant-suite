import { invokeLLM } from "./_core/llm";

export interface EmailClassification {
  classification: "invoice" | "task";
  summary: string;
  confidence: number;
  invoiceData?: {
    vendor: string;
    amount: string;
    dueDate: string;
    invoiceNumber: string;
    action: string;
  };
  taskData: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate: string | null;
    category: string;
  };
  suggestedAction: string;
}

/**
 * Classify an email using AI — every email is either an "invoice" or a "task".
 * No general/irrelevant categories. Every email produces actionable output.
 */
export async function classifyEmail(
  subject: string,
  body: string,
  fromAddress: string,
  fromName: string
): Promise<EmailClassification> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an intelligent email assistant. Analyze the email and classify it into EXACTLY one of these two categories:

- "invoice": Contains a bill, invoice, payment request, or financial document that needs to be paid or forwarded to accounting.
- "task": EVERYTHING else. Every non-invoice email is a task. This includes: action items, requests, reminders, meeting invites, general correspondence, updates, newsletters, notifications — ALL of them become tasks.

RULES:
1. There are ONLY two categories: "invoice" and "task". No other category exists.
2. Every single email MUST produce a task in taskData — even invoices get a task (e.g., "Forward invoice to accounting" or "Pay invoice by [date]").
3. For invoices: also fill invoiceData with vendor, amount, due date, invoice number, and recommended action.
4. For tasks: determine the appropriate priority and a clear, actionable title.
5. If the email is a newsletter or notification, the task is "Review [subject]" with low priority.
6. If the email is a meeting invite, the task is "Respond to meeting invite: [subject]".
7. Due dates: use ISO format (YYYY-MM-DD) or null if no date is mentioned. Do NOT invent dates.
8. Category should be one of: "invoice", "correspondence", "meeting", "request", "notification", "follow-up", "approval", "report", "other".

Always respond in valid JSON matching the schema.`,
      },
      {
        role: "user",
        content: `From: ${fromName} <${fromAddress}>
Subject: ${subject}

${body.substring(0, 4000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "email_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            classification: {
              type: "string",
              enum: ["invoice", "task"],
            },
            summary: { type: "string", description: "Brief 1-2 sentence summary" },
            confidence: { type: "number", description: "Confidence 0-1" },
            invoiceData: {
              type: ["object", "null"],
              properties: {
                vendor: { type: "string" },
                amount: { type: "string" },
                dueDate: { type: "string" },
                invoiceNumber: { type: "string" },
                action: { type: "string" },
              },
              required: ["vendor", "amount", "dueDate", "invoiceNumber", "action"],
              additionalProperties: false,
            },
            taskData: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                dueDate: { type: ["string", "null"] },
                category: { type: "string" },
              },
              required: ["title", "description", "priority", "dueDate", "category"],
              additionalProperties: false,
            },
            suggestedAction: { type: "string", description: "What the user should do" },
          },
          required: ["classification", "summary", "confidence", "invoiceData", "taskData", "suggestedAction"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as EmailClassification;
}

/**
 * Generate a draft reply for an email.
 */
export async function generateDraftReply(
  originalSubject: string,
  originalBody: string,
  fromName: string,
  classification: string,
  aiSummary: string,
  userInstructions?: string
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional email assistant. Draft a reply to the email below.
The reply should be:
- Professional and courteous
- Concise but complete
- Appropriate for the email type (${classification})
- Written as if from the user (first person)

${classification === "invoice" ? "For invoices: acknowledge receipt and mention it will be forwarded to accounting for processing." : ""}
${classification === "task" ? "For tasks: acknowledge the request and confirm you will handle it." : ""}

${userInstructions ? `Additional instructions from user: ${userInstructions}` : ""}

Write ONLY the reply body text. Do not include subject line, greeting headers, or email formatting.`,
      },
      {
        role: "user",
        content: `Original email from ${fromName}:
Subject: ${originalSubject}
Summary: ${aiSummary}

Body:
${originalBody.substring(0, 3000)}`,
      },
    ],
  });

  return (response.choices?.[0]?.message?.content as string) || "Thank you for your email. I will review and get back to you shortly.";
}
