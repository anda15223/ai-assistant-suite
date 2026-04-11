import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import * as db from "./db";
import { fetchEmails, sendEmail, fetchAttachmentsForEmail } from "./emailService";
import { classifyEmail, extractInvoiceDetails, generateDraftReply, scoreTaskUrgency } from "./aiService";
import { searchDriveFiles, listDriveFiles, readDriveFile, getDriveConnectionStatus } from "./googleDrive";

// ── Tool definitions ────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_emails",
    description:
      "Search the user's emails by keyword. Searches subject, body, sender name, and sender address. Returns matching emails with their AI summaries.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search keyword or phrase" },
        limit: { type: "number", description: "Max results (default 20)" },
        include_sent: { type: "boolean", description: "Include sent emails (default true)" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_email",
    description: "Read a specific email by its ID. Returns subject, body, sender, date, attachments, and AI analysis.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: { type: "number", description: "The email ID" },
      },
      required: ["email_id"],
    },
  },
  {
    name: "list_emails",
    description: "List recent emails, optionally filtered. Returns a summary list.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max emails to return (default 20)" },
        classification: { type: "string", enum: ["invoice", "task"], description: "Filter by classification" },
      },
    },
  },
  {
    name: "search_tasks",
    description: "Search tasks by keyword in title or description.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search keyword" },
        status: { type: "string", enum: ["pending", "in_progress", "done", "archived"], description: "Filter by status" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks, optionally filtered by status, priority, or category.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["pending", "in_progress", "done", "archived"] },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        category: { type: "string", description: "Category name" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task in the task board.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority level" },
        category: { type: "string", description: "Category (e.g. correspondence, invoice, vendor, logistics)" },
        due_date: { type: "string", description: "Due date in ISO format (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update an existing task's status or category.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "number", description: "The task ID" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "dismissed"], description: "New status" },
        category: { type: "string", description: "New category" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "list_invoices",
    description: "List invoices with their details (vendor, amount, dates).",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "extract_invoice_from_email",
    description: "Extract invoice data (line items, totals, dates) from a specific email and its attachments using AI.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: { type: "number", description: "The email ID containing the invoice" },
      },
      required: ["email_id"],
    },
  },
  {
    name: "generate_draft_reply",
    description: "Generate an AI draft reply for a specific email.",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: { type: "number", description: "The email ID to reply to" },
        instructions: { type: "string", description: "Optional instructions for the reply tone/content" },
      },
      required: ["email_id"],
    },
  },
  {
    name: "get_dashboard_stats",
    description: "Get overview statistics: email counts, task counts by status, invoice totals.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "sync_emails",
    description: "Trigger an email sync to fetch new emails from the mail server.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "search_drive",
    description: "Search Google Drive files by keyword. Searches file names and content. Requires Google Drive to be connected in Settings.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search keyword or phrase" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_drive_files",
    description: "List files in Google Drive, optionally in a specific folder.",
    input_schema: {
      type: "object" as const,
      properties: {
        folder_id: { type: "string", description: "Google Drive folder ID (optional, defaults to root)" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "read_drive_file",
    description: "Read the content of a Google Drive file. Works with Google Docs, Sheets (as CSV), and text files. PDFs return metadata only.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_id: { type: "string", description: "The Google Drive file ID" },
      },
      required: ["file_id"],
    },
  },
];

// ── Tool execution ──────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: number
): Promise<string> {
  try {
    switch (toolName) {
      case "search_emails": {
        const query = (args.query as string).toLowerCase();
        const limit = (args.limit as number) || 20;
        const allEmails = await db.getEmailsByUser(userId, 200);
        const matches = allEmails.filter((e) => {
          const haystack = [
            e.subject,
            e.body,
            e.fromName,
            e.fromAddress,
            e.toAddress,
            e.aiSummary,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });
        const results = matches.slice(0, limit).map((e) => ({
          id: e.id,
          subject: e.subject,
          from: e.fromName || e.fromAddress,
          to: e.toAddress,
          date: e.receivedAt,
          classification: e.classification,
          summary: e.aiSummary,
          isRead: e.isRead,
        }));
        return JSON.stringify({ count: results.length, totalMatches: matches.length, emails: results });
      }

      case "read_email": {
        const email = await db.getEmailById(args.email_id as number, userId);
        if (!email) return JSON.stringify({ error: "Email not found" });
        const attachments = await db.getAttachmentsByEmail(email.id);
        return JSON.stringify({
          id: email.id,
          subject: email.subject,
          from: `${email.fromName} <${email.fromAddress}>`,
          to: email.toAddress,
          date: email.receivedAt,
          body: email.body?.substring(0, 3000),
          classification: email.classification,
          aiSummary: email.aiSummary,
          aiAnalysis: email.aiAnalysis,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
          })),
        });
      }

      case "list_emails": {
        const limit = (args.limit as number) || 20;
        const emails = await db.getEmailsByUser(userId, limit);
        const filtered = args.classification
          ? emails.filter((e) => e.classification === args.classification)
          : emails;
        return JSON.stringify({
          count: filtered.length,
          emails: filtered.slice(0, limit).map((e) => ({
            id: e.id,
            subject: e.subject,
            from: e.fromName || e.fromAddress,
            date: e.receivedAt,
            classification: e.classification,
            summary: e.aiSummary,
          })),
        });
      }

      case "search_tasks": {
        const query = (args.query as string).toLowerCase();
        const limit = (args.limit as number) || 20;
        const allTasks = await db.getTasksByUser(userId);
        const matches = allTasks.filter((t) => {
          if (args.status && t.status !== args.status) return false;
          const haystack = [t.title, t.description, t.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });
        return JSON.stringify({
          count: matches.length,
          tasks: matches.slice(0, limit).map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            category: t.category,
            dueDate: t.dueDate,
            source: t.source,
          })),
        });
      }

      case "list_tasks": {
        const limit = (args.limit as number) || 20;
        const tasks = await db.getTasksByUser(userId);
        const filtered = tasks.filter((t) => {
          if (args.status && t.status !== args.status) return false;
          if (args.priority && t.priority !== args.priority) return false;
          if (args.category && t.category !== args.category) return false;
          return true;
        });
        return JSON.stringify({
          count: filtered.length,
          tasks: filtered.slice(0, limit).map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description?.substring(0, 200),
            status: t.status,
            priority: t.priority,
            category: t.category,
            dueDate: t.dueDate,
            source: t.source,
          })),
        });
      }

      case "create_task": {
        const safeParseDueDate = (dateStr: string | undefined): Date | undefined => {
          if (!dateStr) return undefined;
          try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? undefined : d;
          } catch {
            return undefined;
          }
        };
        const taskId = await db.insertTask({
          userId,
          title: args.title as string,
          description: (args.description as string) || "",
          priority: ((args.priority as string) || "medium") as "low" | "medium" | "high" | "urgent",
          category: (args.category as string) || "general",
          dueDate: safeParseDueDate(args.due_date as string),
          source: "manual",
        });
        return JSON.stringify({ success: true, taskId, title: args.title });
      }

      case "update_task": {
        const taskId = args.task_id as number;
        const results: string[] = [];
        if (args.status) {
          await db.updateTaskStatus(taskId, userId, args.status as "pending" | "in_progress" | "completed" | "dismissed");
          results.push(`status → ${args.status}`);
        }
        if (args.category) {
          await db.updateTaskCategory(taskId, userId, args.category as string);
          results.push(`category → ${args.category}`);
        }
        return JSON.stringify({ success: true, taskId, updated: results });
      }

      case "list_invoices": {
        const limit = (args.limit as number) || 20;
        const invoices = await db.getInvoiceDetailsByUser(userId);
        return JSON.stringify({
          count: Math.min(invoices.length, limit),
          invoices: invoices.slice(0, limit).map((inv) => ({
            id: inv.id,
            emailId: inv.emailId,
            invoiceNumber: inv.invoiceNumber,
            supplier: inv.supplier,
            amount: inv.amount,
            currency: inv.currency,
            dueDate: inv.dueDate,
            invoiceType: inv.invoiceType,
            status: inv.status,
          })),
        });
      }

      case "extract_invoice_from_email": {
        const email = await db.getEmailById(args.email_id as number, userId);
        if (!email) return JSON.stringify({ error: "Email not found" });
        const attachments = await db.getAttachmentsByEmail(email.id);
        const attachmentUrls = attachments
          .filter((a) => a.s3Url)
          .map((a) => ({ url: a.s3Url!, mimeType: a.mimeType, filename: a.filename }));
        const result = await extractInvoiceDetails(
          email.subject || "",
          email.body || "",
          email.fromAddress || "",
          email.fromName || "",
          attachmentUrls
        );
        return JSON.stringify(result);
      }

      case "generate_draft_reply": {
        const email = await db.getEmailById(args.email_id as number, userId);
        if (!email) return JSON.stringify({ error: "Email not found" });
        const draft = await generateDraftReply(
          email.subject || "",
          email.body || "",
          email.fromName || email.fromAddress || "",
          email.classification || "task",
          email.aiSummary || "",
          (args.instructions as string) || undefined
        );
        return JSON.stringify({ draft });
      }

      case "get_dashboard_stats": {
        const emailStats = await db.getEmailStats(userId);
        const tasks = await db.getTasksByUser(userId);
        const pending = tasks.filter((t) => t.status === "pending").length;
        const inProgress = tasks.filter((t) => t.status === "in_progress").length;
        const done = tasks.filter((t) => t.status === "completed").length;
        const urgent = tasks.filter((t) => t.priority === "urgent" || t.priority === "high").length;
        return JSON.stringify({
          emails: emailStats,
          tasks: { total: tasks.length, pending, inProgress, done, urgent },
        });
      }

      case "sync_emails": {
        const account = await db.getEmailAccount(userId);
        if (!account) return JSON.stringify({ error: "No email account configured. Go to Settings first." });
        const sinceDate = account.lastSyncAt || new Date("2026-03-01T00:00:00Z");
        const fetched = await fetchEmails(account, 100, sinceDate);
        let newCount = 0;
        for (const email of fetched) {
          if (email.messageId && await db.emailExistsByMessageId(email.messageId, userId)) continue;
          await db.insertEmail({
            userId,
            accountId: account.id,
            messageId: email.messageId,
            uid: email.uid,
            subject: email.subject,
            fromAddress: email.fromAddress,
            fromName: email.fromName,
            toAddress: email.toAddress,
            body: email.body,
            bodyHtml: email.bodyHtml,
            receivedAt: email.receivedAt,
          });
          newCount++;
        }
        await db.updateLastSync(account.id);
        return JSON.stringify({ synced: newCount, total: fetched.length });
      }

      case "search_drive": {
        const status = await getDriveConnectionStatus(userId);
        if (!status.connected) return JSON.stringify({ error: "Google Drive not connected. Go to Settings to connect." });
        const files = await searchDriveFiles(userId, args.query as string, (args.limit as number) || 20);
        return JSON.stringify({
          count: files.length,
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            size: f.size,
            webViewLink: f.webViewLink,
          })),
        });
      }

      case "list_drive_files": {
        const status = await getDriveConnectionStatus(userId);
        if (!status.connected) return JSON.stringify({ error: "Google Drive not connected. Go to Settings to connect." });
        const files = await listDriveFiles(userId, args.folder_id as string, (args.limit as number) || 20);
        return JSON.stringify({
          count: files.length,
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            size: f.size,
            webViewLink: f.webViewLink,
          })),
        });
      }

      case "read_drive_file": {
        const status = await getDriveConnectionStatus(userId);
        if (!status.connected) return JSON.stringify({ error: "Google Drive not connected. Go to Settings to connect." });
        const file = await readDriveFile(userId, args.file_id as string);
        return JSON.stringify(file);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`[ChatAgent] Tool ${toolName} failed:`, err);
    return JSON.stringify({ error: `Tool failed: ${(err as Error).message}` });
  }
}

// ── Agent loop ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant integrated into the user's personal productivity dashboard. You have direct access to their emails, tasks, invoices, and other data through tools.

Key behaviors:
- Use tools to look up real data before answering questions. Never guess or make up data.
- When the user asks to find, search, or organize something, use the appropriate tools.
- When creating tasks, use clear titles and descriptions.
- Summarize results concisely with key details. Use markdown formatting.
- If a tool returns an error, explain the issue and suggest what the user can do.
- You can chain multiple tool calls to accomplish complex requests (e.g., search emails, then extract invoice data from matches).
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function runChatAgent(
  messages: ChatMessage[],
  userId: number
): Promise<string> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  // Convert chat history to Anthropic format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Tool-use loop: Claude calls tools, we execute them, feed results back
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: anthropicMessages,
    });

    // If Claude responds with text only (no tool use), we're done
    if (response.stop_reason === "end_turn") {
      let text = "";
      for (const block of response.content) {
        if (block.type === "text") text += block.text;
      }
      return text;
    }

    // If Claude wants to use tools, execute them and continue the loop
    if (response.stop_reason === "tool_use") {
      // Add Claude's response (with tool_use blocks) to the conversation
      anthropicMessages.push({ role: "assistant", content: response.content });

      // Execute each tool call and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`[ChatAgent] Calling tool: ${block.name}`, block.input);
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            userId
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add tool results as a user message
      anthropicMessages.push({ role: "user", content: toolResults });
    }
  }

  return "I've reached the maximum number of steps for this request. Please try breaking it into smaller requests.";
}
