import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, emailAccounts, emails, tasks, draftReplies } from "../drizzle/schema";
import type { InsertEmailAccount, InsertEmail, InsertTask, InsertDraftReply } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
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
    const result = await db.insert(emailAccounts).values(data);
    return result[0].insertId;
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
  const result = await db.insert(emails).values(data);
  return result[0].insertId;
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
  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(emails).where(eq(emails.userId, userId));
  const [unreadResult] = await db.select({ count: sql<number>`count(*)` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.isRead, false)));
  const [invoiceResult] = await db.select({ count: sql<number>`count(*)` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.classification, "invoice")));
  const [taskResult] = await db.select({ count: sql<number>`count(*)` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.classification, "task")));
  return {
    total: totalResult?.count || 0,
    unread: unreadResult?.count || 0,
    invoices: invoiceResult?.count || 0,
    tasks: taskResult?.count || 0,
  };
}

// Get all emails for a user (for reclassification)
export async function getAllEmailsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emails).where(eq(emails.userId, userId)).orderBy(desc(emails.receivedAt));
}

// Delete all tasks for a user (for clean reclassification)
export async function deleteAllTasksByUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.userId, userId));
}

// Get accounting summary: total emails, total tasks, invoice tasks, regular tasks
export async function getAccountingSummary(userId: number) {
  const db = await getDb();
  if (!db) return { totalEmails: 0, totalTasks: 0, invoiceTasks: 0, regularTasks: 0, matched: true };
  const [emailCount] = await db.select({ count: sql<number>`count(*)` }).from(emails).where(eq(emails.userId, userId));
  const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(eq(tasks.userId, userId));
  const [invoiceTaskCount] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.category, "invoice")));
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

// ===== TASK QUERIES =====

export async function getTasksByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(limit);
}

export async function insertTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data);
  return result[0].insertId;
}

export async function updateTaskStatus(taskId: number, userId: number, status: "pending" | "in_progress" | "completed" | "dismissed") {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ status }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function getTaskStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, inProgress: 0, completed: 0 };
  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(eq(tasks.userId, userId));
  const [pendingResult] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "pending")));
  const [inProgressResult] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "in_progress")));
  const [completedResult] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "completed")));
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

export async function getDraftsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(draftReplies).where(and(eq(draftReplies.userId, userId), eq(draftReplies.status, "pending"))).orderBy(desc(draftReplies.createdAt));
}

export async function insertDraft(data: InsertDraftReply) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(draftReplies).values(data);
  return result[0].insertId;
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
  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(whatsappMessages).where(eq(whatsappMessages.userId, userId));
  const [problemResult] = await db.select({ count: sql<number>`count(*)` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "problem")));
  const [questionResult] = await db.select({ count: sql<number>`count(*)` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "question")));
  const [updateResult] = await db.select({ count: sql<number>`count(*)` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "update")));
  const [requestResult] = await db.select({ count: sql<number>`count(*)` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "request")));
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
  const [msgCount] = await db.select({ count: sql<number>`count(*)` }).from(whatsappMessages).where(eq(whatsappMessages.userId, userId));
  const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.source, "whatsapp")));
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
    const result = await db.insert(employees).values(data);
    return result[0].insertId;
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
      sql`${tasks.status} IN ('pending', 'in_progress')`
    ))
    .orderBy(desc(tasks.createdAt));
}

export async function getPriorityDistribution(userId: number) {
  const db = await getDb();
  if (!db) return { do_first: 0, schedule: 0, delegate: 0, archive: 0, unscored: 0 };
  const [doFirst] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "do_first")));
  const [schedule] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "schedule")));
  const [delegate] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "delegate")));
  const [archive] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "archive")));
  const [unscored] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.userId, userId), sql`${tasks.urgencyScore} IS NULL OR ${tasks.urgencyScore} = 5`));
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

/**
 * Get tasks in the 'archive' quadrant that have been inactive for more than `daysInactive` days.
 * Inactive = lastActivityAt is older than the threshold.
 */
export async function getStaleArchiveTasks(userId: number, daysInactive: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysInactive);
  return db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.quadrant, "archive"),
      sql`${tasks.status} IN ('pending', 'in_progress')`,
      sql`${tasks.lastActivityAt} < ${threshold}`,
      sql`${tasks.autoArchivedAt} IS NULL`
    ))
    .orderBy(desc(tasks.lastActivityAt));
}

/**
 * Auto-archive a batch of tasks: set status to 'dismissed' and record the archive timestamp.
 */
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
    sql`${tasks.id} IN (${sql.join(taskIds.map(id => sql`${id}`), sql`, `)})`
  ));
  return taskIds.length;
}

/**
 * Touch a task's lastActivityAt to reset the inactivity timer.
 */
export async function touchTaskActivity(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ lastActivityAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

/**
 * Get auto-archive stats: how many tasks are candidates, how many were already auto-archived.
 */
export async function getAutoArchiveStats(userId: number, daysInactive: number = 30) {
  const db = await getDb();
  if (!db) return { candidates: 0, alreadyArchived: 0 };
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysInactive);
  const [candidates] = await db.select({ count: sql<number>`count(*)` }).from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.quadrant, "archive"),
      sql`${tasks.status} IN ('pending', 'in_progress')`,
      sql`${tasks.lastActivityAt} < ${threshold}`,
      sql`${tasks.autoArchivedAt} IS NULL`
    ));
  const [alreadyArchived] = await db.select({ count: sql<number>`count(*)` }).from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      sql`${tasks.autoArchivedAt} IS NOT NULL`
    ));
  return {
    candidates: candidates?.count || 0,
    alreadyArchived: alreadyArchived?.count || 0,
  };
}
