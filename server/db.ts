import { eq, desc, and, sql, isNotNull, isNull, or, notInArray, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, emailAccounts, emails, tasks, draftReplies, invoiceDetails, supplierSettings, emailAttachments, oauthTokens, brainLessons, brainAgentLog, brainChatMessages, brainPlaybooks } from "../drizzle/schema";
import type { InsertUser, InsertEmailAccount, InsertEmail, InsertTask, InsertDraftReply, InsertInvoiceDetail, InsertSupplierSetting, InsertEmailAttachment, InsertBrainLesson, InsertBrainAgentLog, InsertBrainChatMessage, InsertBrainPlaybook } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle Postgres instance.
// Supabase pooler URLs include `?pgbouncer=true` — we set prepare:false
// to be safe with PgBouncer transaction-mode pooling.
export async function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("[Database] DATABASE_URL is not set");
      return null;
    }
    try {
      _client = postgres(url, {
        max: 1,
        prepare: false,
        ssl: "require",
      });
      _db = drizzle(_client);
      // Verify the connection is actually working
      await _db.execute(sql`SELECT 1`);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string
): Promise<{ id: number; email: string; name: string | null; role: "user" | "admin" }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First registered user becomes admin
  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const isFirstUser = (countResult?.count ?? 0) === 0;

  const result = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      role: isFirstUser ? "admin" : "user",
      lastSignedIn: new Date(),
    })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ===== EMAIL ACCOUNT QUERIES =====

export async function getEmailAccount(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailAccounts).where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.isActive, true))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertEmailAccount(data: InsertEmailAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(emailAccounts).where(eq(emailAccounts.userId, data.userId)).limit(1);
  if (existing.length > 0) {
    await db.update(emailAccounts).set({
      emailAddress: data.emailAddress,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      password: data.password,
      isActive: true,
    }).where(eq(emailAccounts.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(emailAccounts).values(data).returning({ id: emailAccounts.id });
    return result[0].id;
  }
}

export async function updateLastSync(accountId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailAccounts).set({ lastSyncAt: new Date() }).where(eq(emailAccounts.id, accountId));
}

// ===== EMAIL QUERIES =====

export async function getEmailsByUser(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emails).where(eq(emails.userId, userId)).orderBy(desc(emails.receivedAt)).limit(limit);
}

export async function getEmailById(emailId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emails).where(and(eq(emails.id, emailId), eq(emails.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertEmail(data: InsertEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emails).values(data).returning({ id: emails.id });
  return result[0].id;
}

export async function emailExistsByMessageId(messageId: string, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: emails.id }).from(emails).where(and(eq(emails.messageId, messageId), eq(emails.userId, userId))).limit(1);
  return result.length > 0;
}

export async function updateEmailClassification(emailId: number, data: {
  classification: "invoice" | "task";
  aiSummary: string;
  aiAnalysis: any;
  isProcessed: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(emails).set(data).where(eq(emails.id, emailId));
}

export async function markEmailRead(emailId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emails).set({ isRead: true }).where(eq(emails.id, emailId));
}

export async function getEmailStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, unread: 0, invoices: 0, tasks: 0 };
  const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(emails).where(eq(emails.userId, userId));
  const [unreadResult] = await db.select({ count: sql<number>`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.isRead, false)));
  const [invoiceResult] = await db.select({ count: sql<number>`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.classification, "invoice")));
  const [taskResult] = await db.select({ count: sql<number>`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.classification, "task")));
  return {
    total: totalResult?.count || 0,
    unread: unreadResult?.count || 0,
    invoices: invoiceResult?.count || 0,
    tasks: taskResult?.count || 0,
  };
}

export async function getAllEmailsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emails).where(eq(emails.userId, userId)).orderBy(desc(emails.receivedAt));
}

export async function deleteAllTasksByUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.userId, userId));
}

export async function getAccountingSummary(userId: number) {
  const db = await getDb();
  if (!db) return { totalEmails: 0, totalTasks: 0, invoiceTasks: 0, regularTasks: 0, matched: true };
  const [emailCount] = await db.select({ count: sql<number>`count(*)::int` }).from(emails).where(eq(emails.userId, userId));
  const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.userId, userId));
  const [invoiceTaskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.category, "invoice")));
  const totalEmails = emailCount?.count || 0;
  const totalTasks = taskCount?.count || 0;
  const invoiceTasks = invoiceTaskCount?.count || 0;
  const regularTasks = totalTasks - invoiceTasks;
  return {
    totalEmails,
    totalTasks,
    invoiceTasks,
    regularTasks,
    matched: totalEmails === totalTasks,
  };
}

export async function getEmailsWithoutTasks(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  const emailsWithTasks = db.select({ emailId: tasks.emailId }).from(tasks).where(and(eq(tasks.userId, userId), isNotNull(tasks.emailId)));
  return db.select().from(emails).where(and(eq(emails.userId, userId), notInArray(emails.id, emailsWithTasks))).orderBy(desc(emails.receivedAt)).limit(limit);
}

export async function countEmailsWithoutTasks(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const emailsWithTasks = db.select({ emailId: tasks.emailId }).from(tasks).where(and(eq(tasks.userId, userId), isNotNull(tasks.emailId)));
  const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), notInArray(emails.id, emailsWithTasks)));
  return result?.count || 0;
}

// ===== TASK QUERIES =====

export async function getTasksByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(limit);
}

export async function insertTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data).returning({ id: tasks.id });
  return result[0].id;
}

export async function updateTaskStatus(taskId: number, userId: number, status: "pending" | "in_progress" | "completed" | "dismissed") {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ status }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function updateTaskCategory(taskId: number, userId: number, category: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ category }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function getTaskEmailId(taskId: number, userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ emailId: tasks.emailId }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).limit(1);
  return rows[0]?.emailId ?? null;
}

export async function getTaskStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, inProgress: 0, completed: 0 };
  const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.userId, userId));
  const [pendingResult] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "pending")));
  const [inProgressResult] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "in_progress")));
  const [completedResult] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "completed")));
  return {
    total: totalResult?.count || 0,
    pending: pendingResult?.count || 0,
    inProgress: inProgressResult?.count || 0,
    completed: completedResult?.count || 0,
  };
}

// ===== DRAFT REPLY QUERIES =====

export async function getDraftsByEmail(emailId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(draftReplies).where(and(eq(draftReplies.emailId, emailId), eq(draftReplies.userId, userId))).orderBy(desc(draftReplies.createdAt));
}

export async function getTasksByEmailId(emailId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(and(eq(tasks.emailId, emailId), eq(tasks.userId, userId))).orderBy(desc(tasks.createdAt));
}

export async function getDraftsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(draftReplies).where(and(eq(draftReplies.userId, userId), eq(draftReplies.status, "pending"))).orderBy(desc(draftReplies.createdAt));
}

export async function insertDraft(data: InsertDraftReply) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(draftReplies).values(data).returning({ id: draftReplies.id });
  return result[0].id;
}

export async function updateDraftStatus(draftId: number, userId: number, status: "approved" | "rejected" | "sent") {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status };
  if (status === "approved") updateData.approvedAt = new Date();
  if (status === "sent") updateData.sentAt = new Date();
  await db.update(draftReplies).set(updateData).where(and(eq(draftReplies.id, draftId), eq(draftReplies.userId, userId)));
}

export async function updateDraftBody(draftId: number, userId: number, body: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(draftReplies).set({ body }).where(and(eq(draftReplies.id, draftId), eq(draftReplies.userId, userId)));
}

export async function getDraftById(draftId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(draftReplies).where(and(eq(draftReplies.id, draftId), eq(draftReplies.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== WHATSAPP MESSAGE QUERIES =====

import { whatsappMessages, whatsappDraftReplies, employees } from "../drizzle/schema";
import type { InsertWhatsAppMessage, InsertWhatsAppDraftReply, InsertEmployee } from "../drizzle/schema";

export async function getWhatsAppMessagesByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappMessages).where(eq(whatsappMessages.userId, userId)).orderBy(desc(whatsappMessages.receivedAt)).limit(limit);
}

export async function getWhatsAppMessageById(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(whatsappMessages).where(and(eq(whatsappMessages.id, messageId), eq(whatsappMessages.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWhatsAppStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, problems: 0, questions: 0, updates: 0, requests: 0 };
  const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(whatsappMessages).where(eq(whatsappMessages.userId, userId));
  const [problemResult] = await db.select({ count: sql<number>`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "problem")));
  const [questionResult] = await db.select({ count: sql<number>`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "question")));
  const [updateResult] = await db.select({ count: sql<number>`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "update")));
  const [requestResult] = await db.select({ count: sql<number>`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "request")));
  return {
    total: totalResult?.count || 0,
    problems: problemResult?.count || 0,
    questions: questionResult?.count || 0,
    updates: updateResult?.count || 0,
    requests: requestResult?.count || 0,
  };
}

export async function getWhatsAppAccounting(userId: number) {
  const db = await getDb();
  if (!db) return { totalMessages: 0, totalTasks: 0, matched: true };
  const [msgCount] = await db.select({ count: sql<number>`count(*)::int` }).from(whatsappMessages).where(eq(whatsappMessages.userId, userId));
  const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.source, "whatsapp")));
  const totalMessages = msgCount?.count || 0;
  const totalTasks = taskCount?.count || 0;
  return {
    totalMessages,
    totalTasks,
    matched: totalMessages === totalTasks,
  };
}

// ===== WHATSAPP DRAFT REPLY QUERIES =====

export async function getWhatsAppDraftsByMessage(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappDraftReplies).where(and(eq(whatsappDraftReplies.whatsappMessageId, messageId), eq(whatsappDraftReplies.userId, userId))).orderBy(desc(whatsappDraftReplies.createdAt));
}

export async function getWhatsAppPendingDrafts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappDraftReplies).where(and(eq(whatsappDraftReplies.userId, userId), eq(whatsappDraftReplies.status, "pending"))).orderBy(desc(whatsappDraftReplies.createdAt));
}

export async function updateWhatsAppDraftStatus(draftId: number, userId: number, status: "approved" | "rejected" | "sent") {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status };
  if (status === "approved") updateData.approvedAt = new Date();
  if (status === "sent") updateData.sentAt = new Date();
  await db.update(whatsappDraftReplies).set(updateData).where(and(eq(whatsappDraftReplies.id, draftId), eq(whatsappDraftReplies.userId, userId)));
}

export async function updateWhatsAppDraftText(draftId: number, userId: number, replyText: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(whatsappDraftReplies).set({ replyText }).where(and(eq(whatsappDraftReplies.id, draftId), eq(whatsappDraftReplies.userId, userId)));
}

export async function getWhatsAppDraftById(draftId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(whatsappDraftReplies).where(and(eq(whatsappDraftReplies.id, draftId), eq(whatsappDraftReplies.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== EMPLOYEE QUERIES =====

export async function getEmployeesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees).where(and(eq(employees.userId, userId), eq(employees.isActive, true))).orderBy(desc(employees.createdAt));
}

export async function getEmployeeByPhone(phone: string, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(and(eq(employees.phone, phone), eq(employees.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(employees).where(and(eq(employees.phone, data.phone), eq(employees.userId, data.userId))).limit(1);
  if (existing.length > 0) {
    await db.update(employees).set({
      name: data.name,
      role: data.role,
      department: data.department,
      isActive: true,
    }).where(eq(employees.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(employees).values(data).returning({ id: employees.id });
    return result[0].id;
  }
}

export async function deleteEmployee(employeeId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set({ isActive: false }).where(and(eq(employees.id, employeeId), eq(employees.userId, userId)));
}

// ===== URGENCY / PRIORITY QUERIES =====

export async function updateTaskUrgency(taskId: number, userId: number, data: {
  urgencyScore: number;
  importanceScore: number;
  priorityScore: number;
  quadrant: "do_first" | "schedule" | "delegate" | "archive";
  escalationLevel?: number;
  suggestedAction?: string;
  isOverdue?: boolean;
  snoozedUntil?: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(data).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function updateTaskSuggestion(taskId: number, userId: number, data: {
  suggestedCategory: string;
  suggestionConfidence: number;
  suggestionReasoning: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({
    suggestedCategory: data.suggestedCategory,
    suggestionConfidence: data.suggestionConfidence,
    suggestionReasoning: data.suggestionReasoning,
    suggestionConfirmed: false,
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function acceptTaskSuggestion(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).limit(1);
  if (!task || !task.suggestedCategory) return;
  await db.update(tasks).set({
    category: task.suggestedCategory,
    suggestionConfirmed: true,
    lastActivityAt: new Date(),
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function rejectTaskSuggestion(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({
    suggestionConfirmed: true,
    lastActivityAt: new Date(),
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function getSuggestionStats(userId: number) {
  const db = await getDb();
  if (!db) return { pending: 0, accepted: 0, rejected: 0 };
  const [pendingResult] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(
    and(eq(tasks.userId, userId), isNotNull(tasks.suggestedCategory), or(isNull(tasks.suggestionConfirmed), eq(tasks.suggestionConfirmed, false)))
  );
  const [acceptedResult] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.suggestionConfirmed, true), isNotNull(tasks.suggestedCategory))
  );
  return {
    pending: pendingResult?.count || 0,
    accepted: acceptedResult?.count || 0,
    rejected: 0,
  };
}

export async function getTasksByUserPrioritized(userId: number, limit: number = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.priorityScore), desc(tasks.urgencyScore))
    .limit(limit);
}

export async function getTasksByQuadrant(userId: number, quadrant: "do_first" | "schedule" | "delegate" | "archive") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.quadrant, quadrant)))
    .orderBy(desc(tasks.priorityScore))
    .limit(200);
}

export async function getPendingTasksForReprioritization(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      inArray(tasks.status, ["pending", "in_progress"])
    ))
    .orderBy(desc(tasks.createdAt));
}

export async function getPriorityDistribution(userId: number) {
  const db = await getDb();
  if (!db) return { do_first: 0, schedule: 0, delegate: 0, archive: 0, unscored: 0 };
  const [doFirst] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "do_first")));
  const [schedule] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "schedule")));
  const [delegate] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "delegate")));
  const [archive] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "archive")));
  const [unscored] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), or(isNull(tasks.urgencyScore), eq(tasks.urgencyScore, 5))));
  return {
    do_first: doFirst?.count || 0,
    schedule: schedule?.count || 0,
    delegate: delegate?.count || 0,
    archive: archive?.count || 0,
    unscored: unscored?.count || 0,
  };
}

export async function snoozeTask(taskId: number, userId: number, until: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ snoozedUntil: until }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

// ===== AUTO-ARCHIVE QUERIES =====

export async function getStaleArchiveTasks(userId: number, daysInactive: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysInactive);
  return db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.quadrant, "archive"),
      inArray(tasks.status, ["pending", "in_progress"]),
      sql`${tasks.lastActivityAt} < ${threshold}`,
      isNull(tasks.autoArchivedAt)
    ))
    .orderBy(desc(tasks.lastActivityAt));
}

export async function autoArchiveTasks(taskIds: number[], userId: number) {
  const db = await getDb();
  if (!db) return 0;
  if (taskIds.length === 0) return 0;
  const now = new Date();
  await db.update(tasks).set({
    status: "dismissed",
    autoArchivedAt: now,
  }).where(and(
    eq(tasks.userId, userId),
    inArray(tasks.id, taskIds)
  ));
  return taskIds.length;
}

export async function touchTaskActivity(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ lastActivityAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function getAutoArchiveStats(userId: number, daysInactive: number = 30) {
  const db = await getDb();
  if (!db) return { candidates: 0, alreadyArchived: 0 };
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysInactive);
  const [candidates] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.quadrant, "archive"),
      inArray(tasks.status, ["pending", "in_progress"]),
      sql`${tasks.lastActivityAt} < ${threshold}`,
      isNull(tasks.autoArchivedAt)
    ));
  const [alreadyArchived] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      isNotNull(tasks.autoArchivedAt)
    ));
  return {
    candidates: candidates?.count || 0,
    alreadyArchived: alreadyArchived?.count || 0,
  };
}

// ===== INVOICE DASHBOARD QUERIES =====

export async function getInvoiceEmails(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emails).where(
    and(
      eq(emails.userId, userId),
      or(
        eq(emails.classification, "invoice"),
        sql`LOWER(${emails.subject}) LIKE '%invoice%'`,
        sql`LOWER(${emails.subject}) LIKE '%faktura%'`,
        sql`LOWER(${emails.subject}) LIKE '%factura%'`,
        sql`LOWER(${emails.subject}) LIKE '%payment%'`,
        sql`LOWER(${emails.subject}) LIKE '%bilag%'`,
        sql`LOWER(${emails.subject}) LIKE '%regning%'`,
        sql`LOWER(${emails.subject}) LIKE '%følgeseddel%'`,
        sql`LOWER(${emails.subject}) LIKE '%kreditnota%'`,
        sql`LOWER(${emails.subject}) LIKE '%salgsfaktura%'`,
      )
    )
  ).orderBy(desc(emails.receivedAt));
}

export async function insertInvoiceDetail(data: InsertInvoiceDetail) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(invoiceDetails).values(data).returning({ id: invoiceDetails.id });
  return result[0];
}

export async function getInvoiceDetailsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoiceDetails).where(eq(invoiceDetails.userId, userId)).orderBy(desc(invoiceDetails.createdAt));
}

export async function getInvoiceDetailByEmailId(emailId: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(invoiceDetails).where(eq(invoiceDetails.emailId, emailId));
  return result || null;
}

export async function updateInvoiceStatus(invoiceId: number, status: "pending" | "reviewed" | "sent_to_economic" | "paid" | "rejected", eEconomicResponse?: any) {
  const db = await getDb();
  if (!db) return;
  const updates: any = { status };
  if (status === "sent_to_economic") {
    updates.sentToEconomicAt = new Date();
    if (eEconomicResponse) updates.eEconomicResponse = eEconomicResponse;
  }
  await db.update(invoiceDetails).set(updates).where(eq(invoiceDetails.id, invoiceId));
}

export async function getInvoiceStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, reviewed: 0, sentToEconomic: 0, paid: 0, pbs: 0, faktura: 0, unknown: 0 };
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(eq(invoiceDetails.userId, userId));
  const [pending] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "pending")));
  const [reviewed] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "reviewed")));
  const [sentToEconomic] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "sent_to_economic")));
  const [paid] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "paid")));
  const [pbs] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.invoiceType, "pbs")));
  const [faktura] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.invoiceType, "faktura")));
  const [unknown] = await db.select({ count: sql<number>`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.invoiceType, "unknown")));
  return {
    total: total?.count || 0,
    pending: pending?.count || 0,
    reviewed: reviewed?.count || 0,
    sentToEconomic: sentToEconomic?.count || 0,
    paid: paid?.count || 0,
    pbs: pbs?.count || 0,
    faktura: faktura?.count || 0,
    unknown: unknown?.count || 0,
  };
}

// ===== SUPPLIER SETTINGS =====

export async function getSupplierSettings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierSettings).where(eq(supplierSettings.userId, userId)).orderBy(supplierSettings.supplierName);
}

export async function getSupplierByName(userId: number, supplierName: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(supplierSettings).where(
    and(eq(supplierSettings.userId, userId), eq(supplierSettings.supplierName, supplierName))
  );
  return result || null;
}

export async function upsertSupplierSetting(data: InsertSupplierSetting) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getSupplierByName(data.userId, data.supplierName);
  if (existing) {
    await db.update(supplierSettings).set({
      supplierEmail: data.supplierEmail,
      eEconomicEndpoint: data.eEconomicEndpoint,
      eEconomicApiKey: data.eEconomicApiKey,
      eEconomicAgreement: data.eEconomicAgreement,
      isConfigured: data.isConfigured ?? false,
    }).where(eq(supplierSettings.id, existing.id));
    return existing;
  }
  const result = await db.insert(supplierSettings).values(data).returning({ id: supplierSettings.id });
  return result[0];
}

// ── Email Attachments ──
export async function insertEmailAttachment(data: InsertEmailAttachment) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(emailAttachments).values(data).returning({ id: emailAttachments.id });
  return result[0].id;
}

export async function getAttachmentsByEmail(emailId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(emailAttachments).where(eq(emailAttachments.emailId, emailId));
}

export async function getAttachmentsByEmails(emailIds: number[]) {
  const database = await getDb();
  if (!database || emailIds.length === 0) return [];
  return database.select().from(emailAttachments).where(inArray(emailAttachments.emailId, emailIds));
}

// ===== OAUTH TOKENS =====

export async function getOAuthToken(userId: number, provider: string) {
  const database = await getDb();
  if (!database) return undefined;
  const result = await database.select().from(oauthTokens)
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertOAuthToken(data: {
  userId: number;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  email?: string | null;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const existing = await getOAuthToken(data.userId, data.provider);
  if (existing) {
    await database.update(oauthTokens)
      .set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? existing.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope ?? existing.scope,
        email: data.email ?? existing.email,
      })
      .where(eq(oauthTokens.id, existing.id));
    return existing.id;
  }
  const result = await database.insert(oauthTokens).values({
    userId: data.userId,
    provider: data.provider,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    scope: data.scope,
    email: data.email,
  }).returning({ id: oauthTokens.id });
  return result[0].id;
}

export async function deleteOAuthToken(userId: number, provider: string) {
  const database = await getDb();
  if (!database) return;
  await database.delete(oauthTokens)
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)));
}

// ============================================================
// Festival Brain — Lessons, Chat, Agent Log, Playbooks
// ============================================================

export async function insertBrainLessons(lessons: InsertBrainLesson[]): Promise<number[]> {
  const database = await getDb();
  if (!database || lessons.length === 0) return [];
  const result = await database.insert(brainLessons).values(lessons).returning({ id: brainLessons.id });
  return result.map(r => r.id);
}

export async function getBrainLessons(festivalSlug?: string, category?: string, limit = 100) {
  const database = await getDb();
  if (!database) return [];
  const conditions = [];
  if (festivalSlug) conditions.push(eq(brainLessons.festivalSlug, festivalSlug));
  if (category) conditions.push(eq(brainLessons.category, category as any));

  return database.select().from(brainLessons)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(brainLessons.createdAt))
    .limit(limit);
}

export async function getBrainLessonsByConfidence(minConfidence: number, festivalSlug?: string) {
  const database = await getDb();
  if (!database) return [];
  const conditions = [sql`${brainLessons.confidence} >= ${minConfidence}`];
  if (festivalSlug) conditions.push(eq(brainLessons.festivalSlug, festivalSlug));
  return database.select().from(brainLessons)
    .where(and(...conditions))
    .orderBy(desc(brainLessons.confidence));
}

export async function updateLessonConfidence(lessonId: number, wasCorrect: boolean) {
  const database = await getDb();
  if (!database) return;
  const [lesson] = await database.select().from(brainLessons).where(eq(brainLessons.id, lessonId));
  if (!lesson) return;

  const newApplied = lesson.timesApplied + 1;
  const newCorrect = lesson.timesCorrect + (wasCorrect ? 1 : 0);
  // Bayesian-ish confidence update
  const boost = wasCorrect ? Math.max(2, 15 - lesson.timesApplied * 2) : -Math.max(5, 20 - lesson.timesApplied);
  const newConfidence = Math.min(100, Math.max(10, lesson.confidence + boost));

  await database.update(brainLessons)
    .set({ timesApplied: newApplied, timesCorrect: newCorrect, confidence: newConfidence })
    .where(eq(brainLessons.id, lessonId));
}

export async function overrideLesson(lessonId: number, reason: string) {
  const database = await getDb();
  if (!database) return;
  await database.update(brainLessons)
    .set({ humanOverridden: true, overrideReason: reason })
    .where(eq(brainLessons.id, lessonId));
}

// ── Chat messages ────────────────────────────────────────────────────────

export async function insertBrainChatMessage(msg: InsertBrainChatMessage): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(brainChatMessages).values(msg).returning({ id: brainChatMessages.id });
  return result[0].id;
}

export async function getBrainChatHistory(festivalSlug: string, limit = 100) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(brainChatMessages)
    .where(eq(brainChatMessages.festivalSlug, festivalSlug))
    .orderBy(desc(brainChatMessages.createdAt))
    .limit(limit);
}

// ── Agent log ────────────────────────────────────────────────────────────

export async function insertAgentLog(log: InsertBrainAgentLog): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(brainAgentLog).values(log).returning({ id: brainAgentLog.id });
  return result[0].id;
}

export async function getAgentLogs(festivalSlug?: string, limit = 50) {
  const database = await getDb();
  if (!database) return [];
  const conditions = festivalSlug ? eq(brainAgentLog.festivalSlug, festivalSlug) : undefined;
  return database.select().from(brainAgentLog)
    .where(conditions)
    .orderBy(desc(brainAgentLog.timestamp))
    .limit(limit);
}

// ── Playbooks ────────────────────────────────────────────────────────────

export async function savePlaybook(data: InsertBrainPlaybook): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(brainPlaybooks).values(data).returning({ id: brainPlaybooks.id });
  return result[0].id;
}

export async function getLatestPlaybook(sourceFestivalSlug: string) {
  const database = await getDb();
  if (!database) return null;
  const results = await database.select().from(brainPlaybooks)
    .where(eq(brainPlaybooks.sourceFestivalSlug, sourceFestivalSlug))
    .orderBy(desc(brainPlaybooks.createdAt))
    .limit(1);
  return results[0] || null;
}

// ── Brain stats ──────────────────────────────────────────────────────────

export async function getBrainStats(festivalSlug?: string) {
  const database = await getDb();
  if (!database) return { totalLessons: 0, byCategory: {}, avgConfidence: 0, highConfidence: 0 };

  const conditions = festivalSlug ? eq(brainLessons.festivalSlug, festivalSlug) : undefined;
  const allLessons = await database.select().from(brainLessons).where(conditions);

  const byCategory: Record<string, number> = {};
  let totalConfidence = 0;
  let highConfidence = 0;

  for (const l of allLessons) {
    byCategory[l.category] = (byCategory[l.category] || 0) + 1;
    totalConfidence += l.confidence;
    if (l.confidence >= 80) highConfidence++;
  }

  return {
    totalLessons: allLessons.length,
    byCategory,
    avgConfidence: allLessons.length > 0 ? Math.round(totalConfidence / allLessons.length) : 0,
    highConfidence,
  };
}
