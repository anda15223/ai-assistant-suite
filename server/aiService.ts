import { invokeLLM } from "./_core/llm";

export interface UrgencyAssessment {
  urgencyScore: number;
  importanceScore: number;
  priorityScore: number;
  priorityLevel: "critical" | "high" | "medium" | "low";
  quadrant: "do_first" | "schedule" | "delegate" | "archive";
  deadlineDate: string | null;
  escalationLevel: "none" | "gentle_reminder" | "follow_up" | "escalation" | "final_notice";
  suggestedAction: string;
  reasoning: string;
}

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
  urgency: UrgencyAssessment;
  contentCategory: {
    suggestedCategory: "task" | "invoice" | "read_lecture" | "read_learn" | "might_be_interesting";
    confidence: number;
    reasoning: string;
  };
}

/**
 * Classify an email using AI — every email is either an "invoice" or a "task".
 * Now includes Eisenhower Matrix urgency/importance scoring.
 */
export async function classifyEmail(
  subject: string,
  body: string,
  fromAddress: string,
  fromName: string
): Promise<EmailClassification> {
  const today = new Date().toISOString().split("T")[0];
  
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an intelligent email assistant. Analyze the email and:
1. Classify it into EXACTLY one of two categories: "invoice" or "task"
2. Score its urgency and importance for Eisenhower Matrix prioritization

CLASSIFICATION RULES:
- "invoice": Contains a bill, invoice, payment request, or financial document.
- "task": EVERYTHING else. Every non-invoice email is a task.
- Every email MUST produce a task in taskData — even invoices.
- If newsletter/notification: task is "Review [subject]" with low priority.
- If meeting invite: task is "Respond to meeting invite: [subject]".
- Due dates: use ISO format (YYYY-MM-DD) or null if none mentioned.
- Category: one of "invoice", "correspondence", "meeting", "request", "notification", "follow-up", "approval", "report", "other".

INVOICE TYPE DETECTION (for invoices only):
When classification is "invoice", you MUST also determine the invoice sub-type in invoiceData.action:
- If PBS/Betalingsservice/automatic payment/direct debit/subscription: set action to "PBS - Automatic payment, no action needed"
- If Faktura/traditional invoice/manual payment required: set action to "FAKTURA - Manual payment required before due date"
- Always prefix the action with "PBS" or "FAKTURA" so the system can distinguish them.
Keywords for PBS: "PBS", "Betalingsservice", "Automatisk betaling", "Trukket", "Hævet", "Abonnement", "Subscription", "Direct debit", "Recurring", "Betalingsaftale".
Keywords for Faktura: "Faktura", "Invoice", "Regning", "Forfaldsdato", "Bedes betalt", bank account details, payment instructions.

CONTENT CATEGORY SUGGESTION:
Beyond invoice/task classification, also predict the best content category for the user's reading workflow:
- "invoice": Financial documents, bills, payment requests
- "task": Actionable items requiring a response or work
- "read_lecture": Educational content, tutorials, course materials, webinars, training — content to study carefully
- "read_learn": Industry news, articles, blog posts, research papers — content to absorb knowledge from
- "might_be_interesting": Newsletters, promotions, announcements, events — content that might be worth a glance
Provide a confidence score (0-1) and brief reasoning for the suggestion.

URGENCY SCORING (1-10, time-sensitivity):
- 9-10: Overdue, legal deadline, "urgent/ASAP", same-day required
- 7-8: Deadline within 48 hours, payment due soon, follow-up on pending
- 5-6: Deadline within 1 week, routine but time-bound
- 3-4: Deadline within 1 month, planning-phase
- 1-2: No deadline, informational, no time pressure

IMPORTANCE SCORING (1-10, business impact):
- 9-10: Revenue >$10K at risk, legal/compliance, C-level, client escalation
- 7-8: Revenue $1K-$10K, key client, operational blocker, contract
- 5-6: Routine business, standard vendor, internal process
- 3-4: Low financial impact, informational
- 1-2: No business impact, promotional

PRIORITY FORMULA: priorityScore = urgencyScore * 0.6 + importanceScore * 0.4
QUADRANT RULES:
- urgency >= 6 AND importance >= 6 → "do_first"
- urgency < 6 AND importance >= 6 → "schedule"
- urgency >= 6 AND importance < 6 → "delegate"
- urgency < 6 AND importance < 6 → "archive"

PRIORITY LEVEL:
- priorityScore 8.0-10.0 → "critical"
- priorityScore 6.0-7.9 → "high"
- priorityScore 4.0-5.9 → "medium"
- priorityScore 1.0-3.9 → "low"

Today's date: ${today}

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
        name: "email_classification_with_urgency",
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
            contentCategory: {
              type: "object",
              properties: {
                suggestedCategory: { type: "string", enum: ["task", "invoice", "read_lecture", "read_learn", "might_be_interesting"], description: "Best content category for reading workflow" },
                confidence: { type: "number", description: "Confidence 0-1" },
                reasoning: { type: "string", description: "Brief explanation for the suggestion" },
              },
              required: ["suggestedCategory", "confidence", "reasoning"],
              additionalProperties: false,
            },
            urgency: {
              type: "object",
              properties: {
                urgencyScore: { type: "integer", description: "1-10 urgency score" },
                importanceScore: { type: "integer", description: "1-10 importance score" },
                priorityScore: { type: "number", description: "Combined: urgency*0.6 + importance*0.4" },
                priorityLevel: { type: "string", enum: ["critical", "high", "medium", "low"] },
                quadrant: { type: "string", enum: ["do_first", "schedule", "delegate", "archive"] },
                deadlineDate: { type: ["string", "null"], description: "ISO date or null" },
                escalationLevel: { type: "string", enum: ["none", "gentle_reminder", "follow_up", "escalation", "final_notice"] },
                suggestedAction: { type: "string", description: "One-line action" },
                reasoning: { type: "string", description: "Brief scoring explanation" },
              },
              required: ["urgencyScore", "importanceScore", "priorityScore", "priorityLevel", "quadrant", "deadlineDate", "escalationLevel", "suggestedAction", "reasoning"],
              additionalProperties: false,
            },
          },
          required: ["classification", "summary", "confidence", "invoiceData", "taskData", "suggestedAction", "contentCategory", "urgency"],
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
 * Re-score urgency for an existing task (used during re-prioritization passes).
 */
export async function scoreTaskUrgency(
  taskTitle: string,
  taskDescription: string,
  dueDate: string | null,
  category: string,
  createdAt: string
): Promise<UrgencyAssessment> {
  const today = new Date().toISOString().split("T")[0];

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an AI that scores task urgency and importance using the Eisenhower Matrix.

URGENCY (1-10, time-sensitivity):
- 9-10: Overdue, same-day required, legal deadline
- 7-8: Deadline within 48 hours, payment due soon
- 5-6: Deadline within 1 week
- 3-4: Deadline within 1 month
- 1-2: No deadline, informational

IMPORTANCE (1-10, business impact):
- 9-10: Revenue >$10K at risk, legal/compliance
- 7-8: Revenue $1K-$10K, key client, operational blocker
- 5-6: Routine business, standard vendor
- 3-4: Low financial impact
- 1-2: No business impact

PRIORITY FORMULA: priorityScore = urgencyScore * 0.6 + importanceScore * 0.4
QUADRANT: urgency>=6 AND importance>=6 → "do_first", urgency<6 AND importance>=6 → "schedule", urgency>=6 AND importance<6 → "delegate", else → "archive"
PRIORITY LEVEL: 8-10 → "critical", 6-7.9 → "high", 4-5.9 → "medium", 1-3.9 → "low"

Today's date: ${today}
Task was created on: ${createdAt}
${dueDate ? `Task due date: ${dueDate}` : "No due date set."}

If the due date has passed, urgency should be 9-10 (overdue).
If due date is today or tomorrow, urgency should be 7-9.

Respond in valid JSON.`,
      },
      {
        role: "user",
        content: `Task: ${taskTitle}
Description: ${taskDescription}
Category: ${category}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "urgency_assessment",
        strict: true,
        schema: {
          type: "object",
          properties: {
            urgencyScore: { type: "integer", description: "1-10 urgency score" },
            importanceScore: { type: "integer", description: "1-10 importance score" },
            priorityScore: { type: "number", description: "Combined: urgency*0.6 + importance*0.4" },
            priorityLevel: { type: "string", enum: ["critical", "high", "medium", "low"] },
            quadrant: { type: "string", enum: ["do_first", "schedule", "delegate", "archive"] },
            deadlineDate: { type: ["string", "null"], description: "ISO date or null" },
            escalationLevel: { type: "string", enum: ["none", "gentle_reminder", "follow_up", "escalation", "final_notice"] },
            suggestedAction: { type: "string", description: "One-line action" },
            reasoning: { type: "string", description: "Brief scoring explanation" },
          },
          required: ["urgencyScore", "importanceScore", "priorityScore", "priorityLevel", "quadrant", "deadlineDate", "escalationLevel", "suggestedAction", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as UrgencyAssessment;
}

/**
 * Compute escalation based on task age and status.
 * Called during re-prioritization to auto-bump overdue/stale tasks.
 */
export function computeEscalation(task: {
  dueDate: Date | null;
  createdAt: Date;
  status: string;
  urgencyScore: number | null;
  escalationLevel: number | null;
}): { urgencyBoost: number; newEscalationLevel: number; isOverdue: boolean } {
  const now = new Date();
  let urgencyBoost = 0;
  let newEscalationLevel = task.escalationLevel ?? 0;
  let isOverdue = false;

  // Check if overdue
  if (task.dueDate) {
    const diffMs = task.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86400000);

    if (diffDays < 0) {
      isOverdue = true;
      urgencyBoost = Math.min(3, Math.abs(diffDays)); // +1 per day overdue, max +3
      newEscalationLevel = Math.max(newEscalationLevel, 3);
    } else if (diffDays === 0) {
      urgencyBoost = 2;
      newEscalationLevel = Math.max(newEscalationLevel, 2);
    } else if (diffDays === 1) {
      urgencyBoost = 1;
      newEscalationLevel = Math.max(newEscalationLevel, 1);
    }
  }

  // Check task age — if pending for too long without a deadline
  if (task.status === "pending" && !task.dueDate) {
    const ageMs = now.getTime() - task.createdAt.getTime();
    const ageDays = Math.floor(ageMs / 86400000);
    if (ageDays > 7) {
      urgencyBoost = Math.max(urgencyBoost, 1);
    }
    if (ageDays > 14) {
      urgencyBoost = Math.max(urgencyBoost, 2);
    }
  }

  return { urgencyBoost, newEscalationLevel, isOverdue };
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


export interface WhatsAppClassification {
  classification: "problem" | "question" | "update" | "request";
  summary: string;
  confidence: number;
  taskData: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate: string | null;
    category: string;
  };
  suggestedAction: string;
  urgency: UrgencyAssessment;
}

/**
 * Classify a WhatsApp message from an employee.
 * Now includes Eisenhower Matrix urgency/importance scoring.
 */
export async function classifyWhatsAppMessage(
  messageText: string,
  senderName: string,
  senderRole?: string
): Promise<WhatsAppClassification> {
  const today = new Date().toISOString().split("T")[0];

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an AI assistant analyzing WhatsApp messages from employees.
Classify each message into EXACTLY one category AND score urgency/importance.

CATEGORIES:
- "problem": Reporting a problem (equipment failure, customer complaint, process issue)
- "question": Asking a question (policy, procedure, schedule, approval)
- "update": Providing a status update (progress report, completion notice, FYI)
- "request": Requesting something (time off, resources, tools, permission, budget)

RULES:
1. Every message MUST be classified into one of the four categories.
2. Every message MUST produce a task in taskData.
3. Category for taskData: one of "operations", "HR", "maintenance", "IT", "finance", "logistics", "customer-service", "management", "other".
4. Due dates: ISO format (YYYY-MM-DD) or null.

URGENCY SCORING (1-10): 9-10 overdue/same-day, 7-8 within 48h, 5-6 within 1 week, 3-4 within 1 month, 1-2 no deadline
IMPORTANCE SCORING (1-10): 9-10 revenue/legal risk, 7-8 key client/blocker, 5-6 routine, 3-4 low impact, 1-2 no impact
PRIORITY: priorityScore = urgency*0.6 + importance*0.4
QUADRANT: urgency>=6 AND importance>=6 → "do_first", urgency<6 AND importance>=6 → "schedule", urgency>=6 AND importance<6 → "delegate", else → "archive"
LEVEL: 8-10 → "critical", 6-7.9 → "high", 4-5.9 → "medium", 1-3.9 → "low"

Today: ${today}
${senderRole ? `Sender role: ${senderRole}` : ""}

Respond in valid JSON.`,
      },
      {
        role: "user",
        content: `WhatsApp message from ${senderName}:\n\n"${messageText.substring(0, 3000)}"`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "whatsapp_classification_with_urgency",
        strict: true,
        schema: {
          type: "object",
          properties: {
            classification: {
              type: "string",
              enum: ["problem", "question", "update", "request"],
            },
            summary: { type: "string", description: "Brief 1-2 sentence summary" },
            confidence: { type: "number", description: "Confidence 0-1" },
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
            suggestedAction: { type: "string", description: "What the owner should do" },
            urgency: {
              type: "object",
              properties: {
                urgencyScore: { type: "integer", description: "1-10 urgency score" },
                importanceScore: { type: "integer", description: "1-10 importance score" },
                priorityScore: { type: "number", description: "Combined: urgency*0.6 + importance*0.4" },
                priorityLevel: { type: "string", enum: ["critical", "high", "medium", "low"] },
                quadrant: { type: "string", enum: ["do_first", "schedule", "delegate", "archive"] },
                deadlineDate: { type: ["string", "null"], description: "ISO date or null" },
                escalationLevel: { type: "string", enum: ["none", "gentle_reminder", "follow_up", "escalation", "final_notice"] },
                suggestedAction: { type: "string", description: "One-line action" },
                reasoning: { type: "string", description: "Brief scoring explanation" },
              },
              required: ["urgencyScore", "importanceScore", "priorityScore", "priorityLevel", "quadrant", "deadlineDate", "escalationLevel", "suggestedAction", "reasoning"],
              additionalProperties: false,
            },
          },
          required: ["classification", "summary", "confidence", "taskData", "suggestedAction", "urgency"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as WhatsAppClassification;
}

// ===== INVOICE EXTRACTION =====

export interface InvoiceExtraction {
  supplier: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  paymentDate: string;
  dueDate: string;
  products: string;
  lineItems: Array<{ description: string; quantity: string; unitPrice: string; total: string }>;
  invoiceType: "faktura" | "pbs" | "unknown";
}

/**
 * Extract structured invoice data from an email body.
 * Reads the email content and pulls out supplier, amounts, dates, products.
 */
export async function extractInvoiceDetails(
  subject: string,
  body: string,
  fromAddress: string,
  fromName: string,
  attachmentUrls?: { url: string; mimeType: string; filename: string }[]
): Promise<InvoiceExtraction> {
  // Build user message content — text + optional PDF/image attachments
  const userContent: any[] = [];

  // Add PDF attachments first so the AI reads them
  if (attachmentUrls && attachmentUrls.length > 0) {
    for (const att of attachmentUrls) {
      if (att.mimeType === "application/pdf") {
        userContent.push({
          type: "file_url",
          file_url: {
            url: att.url,
            mime_type: "application/pdf" as const,
          },
        });
      } else if (att.mimeType.startsWith("image/")) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: att.url,
            detail: "high" as const,
          },
        });
      }
    }
  }

  // Strip HTML tags to get plain text from bodyHtml if body is too short
  let textContent = body;
  if (textContent.length < 100) {
    // body is probably just a greeting — not useful
    textContent = body;
  }

  const attachmentNote = (attachmentUrls && attachmentUrls.length > 0)
    ? `\n\n[IMPORTANT: This email has ${attachmentUrls.length} attached file(s): ${attachmentUrls.map(a => a.filename).join(", ")}. The invoice data is likely in the attached PDF. Please extract data from the attachment(s) above.]`
    : "";

  userContent.push({
    type: "text",
    text: `From: ${fromName} <${fromAddress}>\nSubject: ${subject}\n\n${textContent.substring(0, 6000)}${attachmentNote}`,
  });

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an invoice data extraction specialist. Extract structured data from the email and any attached PDF/image files.

IMPORTANT: Many invoice emails contain the actual invoice data INSIDE PDF ATTACHMENTS, not in the email body. If a PDF is provided, extract data from the PDF content. The email body may just say "Here is your invoice" or similar.

INVOICE TYPE DETECTION — CRITICAL:
You MUST classify every invoice into one of these types:
- "faktura": A traditional invoice that requires MANUAL payment. The recipient must actively pay it (bank transfer, card payment, etc.). Keywords: "Faktura", "Invoice", "Regning", "Betalingsfrist", "Forfaldsdato", "Bedes betalt", "Venligst betal", "Overførsel til konto", "Reg.nr", "Kontonr", bank account details, payment instructions.
- "pbs": An automatic payment / direct debit / subscription charge. The money is automatically withdrawn from the customer's account. Keywords: "PBS", "Betalingsservice", "Automatisk betaling", "Trukket", "Hævet", "Abonnement", "Subscription", "Auto-pay", "Direct debit", "Recurring", "Månedlig betaling", "Betalingsaftale", "Leverandørservice", "BS-aftale".
- "unknown": Only if you truly cannot determine the type.

Key difference: PBS = money is taken automatically (no action needed from recipient). Faktura = recipient must manually pay before the due date.

EXTRACTION RULES:
- supplier: The company or person sending the invoice. Use the company name, not email address.
- invoiceNumber: The invoice/faktura number. If not found, use "N/A".
- amount: The total amount including VAT/tax. Return ONLY the number (e.g., "1234.56"). Do NOT include currency symbols or codes in the amount field.
- currency: The currency code (DKK, EUR, USD, SEK, NOK, RON, etc.). Default to "DKK" if unclear. Return ONLY the 3-letter code.
- paymentDate: When payment was made or is expected. ISO format (YYYY-MM-DD) or "N/A".
- dueDate: Payment deadline. ISO format (YYYY-MM-DD) or "N/A".
- products: A brief comma-separated list of what was purchased/billed.
- lineItems: Array of individual items with description, quantity, unitPrice, total. Return numbers only (no currency symbols). Empty array if not itemized.
- invoiceType: "faktura", "pbs", or "unknown" — see detection rules above.

Handle Danish, Swedish, Norwegian, Romanian, English invoices. Common terms:
- Faktura/Fakturanr = Invoice/Invoice number
- Beløb/Betalingsbeløb = Amount
- Forfaldsdato = Due date
- Moms/MVA = VAT
- Bilag = Attachment/Receipt
- Følgeseddel = Delivery note
- Kreditnota = Credit note
- Factura = Invoice (Romanian)
- PBS/Betalingsservice = Automatic payment / Direct debit

Always respond in valid JSON.`,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "invoice_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            supplier: { type: "string", description: "Company/person name" },
            invoiceNumber: { type: "string", description: "Invoice number or N/A" },
            amount: { type: "string", description: "Total amount as number string only, no currency" },
            currency: { type: "string", description: "3-letter currency code only" },
            paymentDate: { type: "string", description: "Payment date ISO or N/A" },
            dueDate: { type: "string", description: "Due date ISO or N/A" },
            products: { type: "string", description: "Comma-separated product list" },
            lineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "string" },
                  unitPrice: { type: "string" },
                  total: { type: "string" },
                },
                required: ["description", "quantity", "unitPrice", "total"],
                additionalProperties: false,
              },
            },
            invoiceType: { type: "string", enum: ["faktura", "pbs", "unknown"], description: "faktura = manual payment required, pbs = automatic payment/direct debit, unknown = cannot determine" },
          },
          required: ["supplier", "invoiceNumber", "amount", "currency", "paymentDate", "dueDate", "products", "lineItems", "invoiceType"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error("No response from AI for invoice extraction");
  }

  return JSON.parse(content) as InvoiceExtraction;
}
