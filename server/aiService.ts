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
          required: ["classification", "summary", "confidence", "invoiceData", "taskData", "suggestedAction", "urgency"],
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
