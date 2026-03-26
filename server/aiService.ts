import { invokeLLM } from "./_core/llm";

export interface EmailClassification {
  classification: "invoice" | "task" | "reminder" | "general" | "irrelevant";
  summary: string;
  confidence: number;
  invoiceData?: {
    vendor: string;
    amount: string;
    dueDate: string;
    invoiceNumber: string;
    action: string;
  };
  taskData?: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate: string | null;
    category: string;
  };
  suggestedAction: string;
}

/**
 * Classify an email using AI and extract structured data.
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
        content: `You are an intelligent email assistant. Analyze the email and classify it into one of these categories:
- "invoice": Contains a bill, invoice, payment request, or financial document
- "task": Contains an action item, request, or something that needs to be done
- "reminder": Contains a reminder about a deadline, meeting, or event
- "general": General correspondence, updates, or informational emails
- "irrelevant": Spam, newsletters, marketing, or unimportant emails

For invoices, extract: vendor name, amount, due date, invoice number, and recommended action (e.g., "Forward to accounting", "Pay by [date]").
For tasks, extract: task title, description, priority (low/medium/high/urgent), due date if mentioned, and category.
For all emails, provide a brief summary and a suggested action for the user.

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
              enum: ["invoice", "task", "reminder", "general", "irrelevant"],
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
              type: ["object", "null"],
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
${classification === "reminder" ? "For reminders: acknowledge and confirm attendance/completion." : ""}

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
