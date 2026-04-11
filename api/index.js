var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  draftReplies: () => draftReplies,
  emailAccounts: () => emailAccounts,
  emailAttachments: () => emailAttachments,
  emails: () => emails,
  employees: () => employees,
  invoiceDetails: () => invoiceDetails,
  oauthTokens: () => oauthTokens,
  supplierSettings: () => supplierSettings,
  tasks: () => tasks,
  users: () => users,
  whatsappDraftReplies: () => whatsappDraftReplies,
  whatsappMessages: () => whatsappMessages
});
import { integer, serial, pgTable, text, timestamp, varchar, boolean, jsonb } from "drizzle-orm/pg-core";
var updatedNow, users, emailAccounts, emails, emailAttachments, tasks, draftReplies, whatsappMessages, whatsappDraftReplies, employees, invoiceDetails, supplierSettings, oauthTokens;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    updatedNow = () => /* @__PURE__ */ new Date();
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      email: varchar("email", { length: 320 }).notNull().unique(),
      passwordHash: varchar("passwordHash", { length: 255 }),
      name: text("name"),
      role: text("role").$type().default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    emailAccounts = pgTable("email_accounts", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      emailAddress: varchar("emailAddress", { length: 320 }).notNull(),
      imapHost: varchar("imapHost", { length: 255 }).notNull().default("imap.one.com"),
      imapPort: integer("imapPort").notNull().default(993),
      smtpHost: varchar("smtpHost", { length: 255 }).notNull().default("send.one.com"),
      smtpPort: integer("smtpPort").notNull().default(465),
      password: varchar("password", { length: 512 }).notNull(),
      isActive: boolean("isActive").default(true).notNull(),
      lastSyncAt: timestamp("lastSyncAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
    emails = pgTable("emails", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      accountId: integer("accountId").notNull(),
      messageId: varchar("messageId", { length: 512 }),
      uid: integer("uid"),
      subject: text("subject"),
      fromAddress: varchar("fromAddress", { length: 320 }),
      fromName: varchar("fromName", { length: 255 }),
      toAddress: text("toAddress"),
      body: text("body"),
      bodyHtml: text("bodyHtml"),
      receivedAt: timestamp("receivedAt"),
      isRead: boolean("isRead").default(false).notNull(),
      classification: text("classification").$type().default("general"),
      aiSummary: text("aiSummary"),
      aiAnalysis: jsonb("aiAnalysis"),
      isProcessed: boolean("isProcessed").default(false).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    emailAttachments = pgTable("email_attachments", {
      id: serial("id").primaryKey(),
      emailId: integer("emailId").notNull(),
      userId: integer("userId").notNull(),
      filename: varchar("filename", { length: 500 }).notNull(),
      mimeType: varchar("mimeType", { length: 100 }).notNull(),
      size: integer("size").default(0),
      s3Key: varchar("s3Key", { length: 1e3 }).notNull(),
      s3Url: varchar("s3Url", { length: 2e3 }).notNull(),
      createdAt: timestamp("attachCreatedAt").defaultNow().notNull()
    });
    tasks = pgTable("tasks", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      emailId: integer("emailId"),
      title: varchar("title", { length: 500 }).notNull(),
      description: text("description"),
      priority: text("priority").$type().default("medium").notNull(),
      status: text("status").$type().default("pending").notNull(),
      dueDate: timestamp("dueDate"),
      category: varchar("category", { length: 100 }),
      source: text("source").$type().default("email").notNull(),
      metadata: jsonb("metadata"),
      urgencyScore: integer("urgencyScore").default(5),
      importanceScore: integer("importanceScore").default(5),
      priorityScore: integer("priorityScore").default(50),
      quadrant: text("quadrant").$type().default("schedule"),
      escalationLevel: integer("escalationLevel").default(0),
      suggestedAction: text("suggestedAction"),
      isOverdue: boolean("isOverdue").default(false),
      snoozedUntil: timestamp("snoozedUntil"),
      suggestedCategory: varchar("suggestedCategory", { length: 100 }),
      suggestionConfidence: integer("suggestionConfidence"),
      suggestionReasoning: text("suggestionReasoning"),
      suggestionConfirmed: boolean("suggestionConfirmed"),
      lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
      autoArchivedAt: timestamp("autoArchivedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
    draftReplies = pgTable("draft_replies", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      emailId: integer("emailId").notNull(),
      subject: varchar("subject", { length: 500 }),
      body: text("body").notNull(),
      toAddress: varchar("toAddress", { length: 320 }).notNull(),
      status: text("status").$type().default("pending").notNull(),
      approvedAt: timestamp("approvedAt"),
      sentAt: timestamp("sentAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
    whatsappMessages = pgTable("whatsapp_messages", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      waMessageId: varchar("waMessageId", { length: 512 }).notNull().unique(),
      senderPhone: varchar("senderPhone", { length: 20 }).notNull(),
      senderName: varchar("senderName", { length: 255 }),
      messageType: varchar("messageType", { length: 50 }).notNull().default("text"),
      messageText: text("messageText"),
      classification: text("waClassification").$type(),
      aiSummary: text("waAiSummary"),
      aiAnalysis: jsonb("waAiAnalysis"),
      isProcessed: boolean("waIsProcessed").default(false).notNull(),
      receivedAt: timestamp("waReceivedAt").notNull(),
      createdAt: timestamp("waCreatedAt").defaultNow().notNull()
    });
    whatsappDraftReplies = pgTable("whatsapp_draft_replies", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      whatsappMessageId: integer("whatsappMessageId").notNull(),
      replyText: text("replyText").notNull(),
      toPhone: varchar("toPhone", { length: 20 }).notNull(),
      originalWaMessageId: varchar("originalWaMessageId", { length: 512 }),
      status: text("waReplyStatus").$type().default("pending").notNull(),
      approvedAt: timestamp("waReplyApprovedAt"),
      sentAt: timestamp("waReplySentAt"),
      createdAt: timestamp("waReplyCreatedAt").defaultNow().notNull(),
      updatedAt: timestamp("waReplyUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
    employees = pgTable("employees", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      phone: varchar("phone", { length: 20 }).notNull(),
      name: varchar("empName", { length: 255 }).notNull(),
      role: varchar("empRole", { length: 100 }),
      department: varchar("department", { length: 100 }),
      isActive: boolean("empIsActive").default(true).notNull(),
      createdAt: timestamp("empCreatedAt").defaultNow().notNull(),
      updatedAt: timestamp("empUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
    invoiceDetails = pgTable("invoice_details", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      emailId: integer("emailId").notNull(),
      taskId: integer("taskId"),
      supplier: varchar("supplier", { length: 500 }).notNull(),
      invoiceNumber: varchar("invoiceNumber", { length: 255 }),
      amount: varchar("amount", { length: 100 }),
      currency: varchar("currency", { length: 10 }).default("DKK"),
      paymentDate: varchar("paymentDate", { length: 50 }),
      dueDate: varchar("dueDate", { length: 50 }),
      products: text("products"),
      lineItems: jsonb("lineItems"),
      invoiceType: text("invoiceType").$type().default("unknown").notNull(),
      status: text("invoiceStatus").$type().default("pending").notNull(),
      sentToEconomicAt: timestamp("sentToEconomicAt"),
      eEconomicResponse: jsonb("eEconomicResponse"),
      rawExtraction: jsonb("rawExtraction"),
      createdAt: timestamp("invCreatedAt").defaultNow().notNull(),
      updatedAt: timestamp("invUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
    supplierSettings = pgTable("supplier_settings", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      supplierName: varchar("supplierName", { length: 500 }).notNull(),
      supplierEmail: varchar("supplierEmail", { length: 320 }),
      eEconomicEndpoint: varchar("eEconomicEndpoint", { length: 1e3 }),
      eEconomicApiKey: varchar("eEconomicApiKey", { length: 500 }),
      eEconomicAgreement: varchar("eEconomicAgreement", { length: 500 }),
      isConfigured: boolean("isConfigured").default(false).notNull(),
      createdAt: timestamp("ssCreatedAt").defaultNow().notNull(),
      updatedAt: timestamp("ssUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
    oauthTokens = pgTable("oauth_tokens", {
      id: serial("id").primaryKey(),
      userId: integer("userId").notNull(),
      provider: varchar("provider", { length: 50 }).notNull(),
      // "google"
      accessToken: text("accessToken").notNull(),
      refreshToken: text("refreshToken"),
      expiresAt: timestamp("expiresAt"),
      scope: text("scope"),
      email: varchar("tokenEmail", { length: 320 }),
      createdAt: timestamp("oaCreatedAt").defaultNow().notNull(),
      updatedAt: timestamp("oaUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow)
    });
  }
});

// server/vercel/entry.ts
import "dotenv/config";

// server/_core/createApp.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// server/db.ts
init_schema();
init_schema();
import { eq, desc, and, sql, isNotNull, isNull, or, notInArray, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
var _db = null;
var _client = null;
async function getDb() {
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
        ssl: "require"
      });
      _db = drizzle(_client);
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
async function createUser(email, name, passwordHash) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [countResult] = await db.select({ count: sql`count(*)::int` }).from(users);
  const isFirstUser = (countResult?.count ?? 0) === 0;
  const result = await db.insert(users).values({
    email,
    name,
    passwordHash,
    role: isFirstUser ? "admin" : "user",
    lastSignedIn: /* @__PURE__ */ new Date()
  }).returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  return result[0];
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateLastSignedIn(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}
async function getEmailAccount(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(emailAccounts).where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.isActive, true))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function upsertEmailAccount(data) {
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
      isActive: true
    }).where(eq(emailAccounts.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(emailAccounts).values(data).returning({ id: emailAccounts.id });
    return result[0].id;
  }
}
async function updateLastSync(accountId) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailAccounts).set({ lastSyncAt: /* @__PURE__ */ new Date() }).where(eq(emailAccounts.id, accountId));
}
async function getEmailsByUser(userId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emails).where(eq(emails.userId, userId)).orderBy(desc(emails.receivedAt)).limit(limit);
}
async function getEmailById(emailId, userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(emails).where(and(eq(emails.id, emailId), eq(emails.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function insertEmail(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emails).values(data).returning({ id: emails.id });
  return result[0].id;
}
async function emailExistsByMessageId(messageId, userId) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: emails.id }).from(emails).where(and(eq(emails.messageId, messageId), eq(emails.userId, userId))).limit(1);
  return result.length > 0;
}
async function updateEmailClassification(emailId, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(emails).set(data).where(eq(emails.id, emailId));
}
async function markEmailRead(emailId) {
  const db = await getDb();
  if (!db) return;
  await db.update(emails).set({ isRead: true }).where(eq(emails.id, emailId));
}
async function getEmailStats(userId) {
  const db = await getDb();
  if (!db) return { total: 0, unread: 0, invoices: 0, tasks: 0 };
  const [totalResult] = await db.select({ count: sql`count(*)::int` }).from(emails).where(eq(emails.userId, userId));
  const [unreadResult] = await db.select({ count: sql`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.isRead, false)));
  const [invoiceResult] = await db.select({ count: sql`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.classification, "invoice")));
  const [taskResult] = await db.select({ count: sql`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), eq(emails.classification, "task")));
  return {
    total: totalResult?.count || 0,
    unread: unreadResult?.count || 0,
    invoices: invoiceResult?.count || 0,
    tasks: taskResult?.count || 0
  };
}
async function getAccountingSummary(userId) {
  const db = await getDb();
  if (!db) return { totalEmails: 0, totalTasks: 0, invoiceTasks: 0, regularTasks: 0, matched: true };
  const [emailCount] = await db.select({ count: sql`count(*)::int` }).from(emails).where(eq(emails.userId, userId));
  const [taskCount] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(eq(tasks.userId, userId));
  const [invoiceTaskCount] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.category, "invoice")));
  const totalEmails = emailCount?.count || 0;
  const totalTasks = taskCount?.count || 0;
  const invoiceTasks = invoiceTaskCount?.count || 0;
  const regularTasks = totalTasks - invoiceTasks;
  return {
    totalEmails,
    totalTasks,
    invoiceTasks,
    regularTasks,
    matched: totalEmails === totalTasks
  };
}
async function getEmailsWithoutTasks(userId, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const emailsWithTasks = db.select({ emailId: tasks.emailId }).from(tasks).where(and(eq(tasks.userId, userId), isNotNull(tasks.emailId)));
  return db.select().from(emails).where(and(eq(emails.userId, userId), notInArray(emails.id, emailsWithTasks))).orderBy(desc(emails.receivedAt)).limit(limit);
}
async function countEmailsWithoutTasks(userId) {
  const db = await getDb();
  if (!db) return 0;
  const emailsWithTasks = db.select({ emailId: tasks.emailId }).from(tasks).where(and(eq(tasks.userId, userId), isNotNull(tasks.emailId)));
  const [result] = await db.select({ count: sql`count(*)::int` }).from(emails).where(and(eq(emails.userId, userId), notInArray(emails.id, emailsWithTasks)));
  return result?.count || 0;
}
async function getTasksByUser(userId, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(limit);
}
async function insertTask(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data).returning({ id: tasks.id });
  return result[0].id;
}
async function updateTaskStatus(taskId, userId, status) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ status }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function updateTaskCategory(taskId, userId, category) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ category }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function getTaskEmailId(taskId, userId) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ emailId: tasks.emailId }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).limit(1);
  return rows[0]?.emailId ?? null;
}
async function getTaskStats(userId) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, inProgress: 0, completed: 0 };
  const [totalResult] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(eq(tasks.userId, userId));
  const [pendingResult] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "pending")));
  const [inProgressResult] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "in_progress")));
  const [completedResult] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "completed")));
  return {
    total: totalResult?.count || 0,
    pending: pendingResult?.count || 0,
    inProgress: inProgressResult?.count || 0,
    completed: completedResult?.count || 0
  };
}
async function getDraftsByEmail(emailId, userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(draftReplies).where(and(eq(draftReplies.emailId, emailId), eq(draftReplies.userId, userId))).orderBy(desc(draftReplies.createdAt));
}
async function getTasksByEmailId(emailId, userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(and(eq(tasks.emailId, emailId), eq(tasks.userId, userId))).orderBy(desc(tasks.createdAt));
}
async function getDraftsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(draftReplies).where(and(eq(draftReplies.userId, userId), eq(draftReplies.status, "pending"))).orderBy(desc(draftReplies.createdAt));
}
async function insertDraft(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(draftReplies).values(data).returning({ id: draftReplies.id });
  return result[0].id;
}
async function updateDraftStatus(draftId, userId, status) {
  const db = await getDb();
  if (!db) return;
  const updateData = { status };
  if (status === "approved") updateData.approvedAt = /* @__PURE__ */ new Date();
  if (status === "sent") updateData.sentAt = /* @__PURE__ */ new Date();
  await db.update(draftReplies).set(updateData).where(and(eq(draftReplies.id, draftId), eq(draftReplies.userId, userId)));
}
async function updateDraftBody(draftId, userId, body) {
  const db = await getDb();
  if (!db) return;
  await db.update(draftReplies).set({ body }).where(and(eq(draftReplies.id, draftId), eq(draftReplies.userId, userId)));
}
async function getDraftById(draftId, userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(draftReplies).where(and(eq(draftReplies.id, draftId), eq(draftReplies.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getWhatsAppMessagesByUser(userId, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappMessages).where(eq(whatsappMessages.userId, userId)).orderBy(desc(whatsappMessages.receivedAt)).limit(limit);
}
async function getWhatsAppMessageById(messageId, userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(whatsappMessages).where(and(eq(whatsappMessages.id, messageId), eq(whatsappMessages.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getWhatsAppStats(userId) {
  const db = await getDb();
  if (!db) return { total: 0, problems: 0, questions: 0, updates: 0, requests: 0 };
  const [totalResult] = await db.select({ count: sql`count(*)::int` }).from(whatsappMessages).where(eq(whatsappMessages.userId, userId));
  const [problemResult] = await db.select({ count: sql`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "problem")));
  const [questionResult] = await db.select({ count: sql`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "question")));
  const [updateResult] = await db.select({ count: sql`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "update")));
  const [requestResult] = await db.select({ count: sql`count(*)::int` }).from(whatsappMessages).where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.classification, "request")));
  return {
    total: totalResult?.count || 0,
    problems: problemResult?.count || 0,
    questions: questionResult?.count || 0,
    updates: updateResult?.count || 0,
    requests: requestResult?.count || 0
  };
}
async function getWhatsAppAccounting(userId) {
  const db = await getDb();
  if (!db) return { totalMessages: 0, totalTasks: 0, matched: true };
  const [msgCount] = await db.select({ count: sql`count(*)::int` }).from(whatsappMessages).where(eq(whatsappMessages.userId, userId));
  const [taskCount] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.source, "whatsapp")));
  const totalMessages = msgCount?.count || 0;
  const totalTasks = taskCount?.count || 0;
  return {
    totalMessages,
    totalTasks,
    matched: totalMessages === totalTasks
  };
}
async function getWhatsAppDraftsByMessage(messageId, userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappDraftReplies).where(and(eq(whatsappDraftReplies.whatsappMessageId, messageId), eq(whatsappDraftReplies.userId, userId))).orderBy(desc(whatsappDraftReplies.createdAt));
}
async function getWhatsAppPendingDrafts(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappDraftReplies).where(and(eq(whatsappDraftReplies.userId, userId), eq(whatsappDraftReplies.status, "pending"))).orderBy(desc(whatsappDraftReplies.createdAt));
}
async function updateWhatsAppDraftStatus(draftId, userId, status) {
  const db = await getDb();
  if (!db) return;
  const updateData = { status };
  if (status === "approved") updateData.approvedAt = /* @__PURE__ */ new Date();
  if (status === "sent") updateData.sentAt = /* @__PURE__ */ new Date();
  await db.update(whatsappDraftReplies).set(updateData).where(and(eq(whatsappDraftReplies.id, draftId), eq(whatsappDraftReplies.userId, userId)));
}
async function updateWhatsAppDraftText(draftId, userId, replyText) {
  const db = await getDb();
  if (!db) return;
  await db.update(whatsappDraftReplies).set({ replyText }).where(and(eq(whatsappDraftReplies.id, draftId), eq(whatsappDraftReplies.userId, userId)));
}
async function getWhatsAppDraftById(draftId, userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(whatsappDraftReplies).where(and(eq(whatsappDraftReplies.id, draftId), eq(whatsappDraftReplies.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getEmployeesByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees).where(and(eq(employees.userId, userId), eq(employees.isActive, true))).orderBy(desc(employees.createdAt));
}
async function upsertEmployee(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(employees).where(and(eq(employees.phone, data.phone), eq(employees.userId, data.userId))).limit(1);
  if (existing.length > 0) {
    await db.update(employees).set({
      name: data.name,
      role: data.role,
      department: data.department,
      isActive: true
    }).where(eq(employees.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(employees).values(data).returning({ id: employees.id });
    return result[0].id;
  }
}
async function deleteEmployee(employeeId, userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set({ isActive: false }).where(and(eq(employees.id, employeeId), eq(employees.userId, userId)));
}
async function updateTaskUrgency(taskId, userId, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(data).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function updateTaskSuggestion(taskId, userId, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({
    suggestedCategory: data.suggestedCategory,
    suggestionConfidence: data.suggestionConfidence,
    suggestionReasoning: data.suggestionReasoning,
    suggestionConfirmed: false
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function acceptTaskSuggestion(taskId, userId) {
  const db = await getDb();
  if (!db) return;
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).limit(1);
  if (!task || !task.suggestedCategory) return;
  await db.update(tasks).set({
    category: task.suggestedCategory,
    suggestionConfirmed: true,
    lastActivityAt: /* @__PURE__ */ new Date()
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function rejectTaskSuggestion(taskId, userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({
    suggestionConfirmed: true,
    lastActivityAt: /* @__PURE__ */ new Date()
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function getSuggestionStats(userId) {
  const db = await getDb();
  if (!db) return { pending: 0, accepted: 0, rejected: 0 };
  const [pendingResult] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(
    and(eq(tasks.userId, userId), isNotNull(tasks.suggestedCategory), or(isNull(tasks.suggestionConfirmed), eq(tasks.suggestionConfirmed, false)))
  );
  const [acceptedResult] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.suggestionConfirmed, true), isNotNull(tasks.suggestedCategory))
  );
  return {
    pending: pendingResult?.count || 0,
    accepted: acceptedResult?.count || 0,
    rejected: 0
  };
}
async function getTasksByUserPrioritized(userId, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.priorityScore), desc(tasks.urgencyScore)).limit(limit);
}
async function getTasksByQuadrant(userId, quadrant) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, quadrant))).orderBy(desc(tasks.priorityScore)).limit(200);
}
async function getPendingTasksForReprioritization(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(and(
    eq(tasks.userId, userId),
    inArray(tasks.status, ["pending", "in_progress"])
  )).orderBy(desc(tasks.createdAt));
}
async function getPriorityDistribution(userId) {
  const db = await getDb();
  if (!db) return { do_first: 0, schedule: 0, delegate: 0, archive: 0, unscored: 0 };
  const [doFirst] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "do_first")));
  const [schedule] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "schedule")));
  const [delegate] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "delegate")));
  const [archive] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.quadrant, "archive")));
  const [unscored] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), or(isNull(tasks.urgencyScore), eq(tasks.urgencyScore, 5))));
  return {
    do_first: doFirst?.count || 0,
    schedule: schedule?.count || 0,
    delegate: delegate?.count || 0,
    archive: archive?.count || 0,
    unscored: unscored?.count || 0
  };
}
async function snoozeTask(taskId, userId, until) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ snoozedUntil: until }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function getStaleArchiveTasks(userId, daysInactive = 30) {
  const db = await getDb();
  if (!db) return [];
  const threshold = /* @__PURE__ */ new Date();
  threshold.setDate(threshold.getDate() - daysInactive);
  return db.select().from(tasks).where(and(
    eq(tasks.userId, userId),
    eq(tasks.quadrant, "archive"),
    inArray(tasks.status, ["pending", "in_progress"]),
    sql`${tasks.lastActivityAt} < ${threshold}`,
    isNull(tasks.autoArchivedAt)
  )).orderBy(desc(tasks.lastActivityAt));
}
async function autoArchiveTasks(taskIds, userId) {
  const db = await getDb();
  if (!db) return 0;
  if (taskIds.length === 0) return 0;
  const now = /* @__PURE__ */ new Date();
  await db.update(tasks).set({
    status: "dismissed",
    autoArchivedAt: now
  }).where(and(
    eq(tasks.userId, userId),
    inArray(tasks.id, taskIds)
  ));
  return taskIds.length;
}
async function touchTaskActivity(taskId, userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ lastActivityAt: /* @__PURE__ */ new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}
async function getAutoArchiveStats(userId, daysInactive = 30) {
  const db = await getDb();
  if (!db) return { candidates: 0, alreadyArchived: 0 };
  const threshold = /* @__PURE__ */ new Date();
  threshold.setDate(threshold.getDate() - daysInactive);
  const [candidates] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(
    eq(tasks.userId, userId),
    eq(tasks.quadrant, "archive"),
    inArray(tasks.status, ["pending", "in_progress"]),
    sql`${tasks.lastActivityAt} < ${threshold}`,
    isNull(tasks.autoArchivedAt)
  ));
  const [alreadyArchived] = await db.select({ count: sql`count(*)::int` }).from(tasks).where(and(
    eq(tasks.userId, userId),
    isNotNull(tasks.autoArchivedAt)
  ));
  return {
    candidates: candidates?.count || 0,
    alreadyArchived: alreadyArchived?.count || 0
  };
}
async function getInvoiceEmails(userId) {
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
        sql`LOWER(${emails.subject}) LIKE '%salgsfaktura%'`
      )
    )
  ).orderBy(desc(emails.receivedAt));
}
async function insertInvoiceDetail(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(invoiceDetails).values(data).returning({ id: invoiceDetails.id });
  return result[0];
}
async function getInvoiceDetailsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoiceDetails).where(eq(invoiceDetails.userId, userId)).orderBy(desc(invoiceDetails.createdAt));
}
async function getInvoiceDetailByEmailId(emailId) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(invoiceDetails).where(eq(invoiceDetails.emailId, emailId));
  return result || null;
}
async function updateInvoiceStatus(invoiceId, status, eEconomicResponse) {
  const db = await getDb();
  if (!db) return;
  const updates = { status };
  if (status === "sent_to_economic") {
    updates.sentToEconomicAt = /* @__PURE__ */ new Date();
    if (eEconomicResponse) updates.eEconomicResponse = eEconomicResponse;
  }
  await db.update(invoiceDetails).set(updates).where(eq(invoiceDetails.id, invoiceId));
}
async function getInvoiceStats(userId) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, reviewed: 0, sentToEconomic: 0, paid: 0, pbs: 0, faktura: 0, unknown: 0 };
  const [total] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(eq(invoiceDetails.userId, userId));
  const [pending] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "pending")));
  const [reviewed] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "reviewed")));
  const [sentToEconomic] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "sent_to_economic")));
  const [paid] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.status, "paid")));
  const [pbs] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.invoiceType, "pbs")));
  const [faktura] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.invoiceType, "faktura")));
  const [unknown] = await db.select({ count: sql`count(*)::int` }).from(invoiceDetails).where(and(eq(invoiceDetails.userId, userId), eq(invoiceDetails.invoiceType, "unknown")));
  return {
    total: total?.count || 0,
    pending: pending?.count || 0,
    reviewed: reviewed?.count || 0,
    sentToEconomic: sentToEconomic?.count || 0,
    paid: paid?.count || 0,
    pbs: pbs?.count || 0,
    faktura: faktura?.count || 0,
    unknown: unknown?.count || 0
  };
}
async function getSupplierSettings(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierSettings).where(eq(supplierSettings.userId, userId)).orderBy(supplierSettings.supplierName);
}
async function getSupplierByName(userId, supplierName) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(supplierSettings).where(
    and(eq(supplierSettings.userId, userId), eq(supplierSettings.supplierName, supplierName))
  );
  return result || null;
}
async function upsertSupplierSetting(data) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getSupplierByName(data.userId, data.supplierName);
  if (existing) {
    await db.update(supplierSettings).set({
      supplierEmail: data.supplierEmail,
      eEconomicEndpoint: data.eEconomicEndpoint,
      eEconomicApiKey: data.eEconomicApiKey,
      eEconomicAgreement: data.eEconomicAgreement,
      isConfigured: data.isConfigured ?? false
    }).where(eq(supplierSettings.id, existing.id));
    return existing;
  }
  const result = await db.insert(supplierSettings).values(data).returning({ id: supplierSettings.id });
  return result[0];
}
async function insertEmailAttachment(data) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(emailAttachments).values(data).returning({ id: emailAttachments.id });
  return result[0].id;
}
async function getAttachmentsByEmail(emailId) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(emailAttachments).where(eq(emailAttachments.emailId, emailId));
}
async function getAttachmentsByEmails(emailIds) {
  const database = await getDb();
  if (!database || emailIds.length === 0) return [];
  return database.select().from(emailAttachments).where(inArray(emailAttachments.emailId, emailIds));
}
async function getOAuthToken(userId, provider) {
  const database = await getDb();
  if (!database) return void 0;
  const result = await database.select().from(oauthTokens).where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function upsertOAuthToken(data) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const existing = await getOAuthToken(data.userId, data.provider);
  if (existing) {
    await database.update(oauthTokens).set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? existing.refreshToken,
      expiresAt: data.expiresAt,
      scope: data.scope ?? existing.scope,
      email: data.email ?? existing.email
    }).where(eq(oauthTokens.id, existing.id));
    return existing.id;
  }
  const result = await database.insert(oauthTokens).values({
    userId: data.userId,
    provider: data.provider,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    scope: data.scope,
    email: data.email
  }).returning({ id: oauthTokens.id });
  return result[0].id;
}
async function deleteOAuthToken(userId, provider) {
  const database = await getDb();
  if (!database) return;
  await database.delete(oauthTokens).where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)));
}

// server/_core/env.ts
var ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsBucketName: process.env.AWS_BUCKET_NAME ?? "",
  awsRegion: process.env.AWS_REGION ?? "eu-central-1",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  isProduction: process.env.NODE_ENV === "production",
  port: process.env.PORT ? parseInt(process.env.PORT) : 3e3
};

// server/_core/sdk.ts
var AuthService = class {
  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
  getSessionSecret() {
    return new TextEncoder().encode(ENV.jwtSecret);
  }
  async createSessionToken(userId, email, name) {
    const secretKey = this.getSessionSecret();
    const issuedAt = Date.now();
    const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1e3);
    return new SignJWT({ userId, email, name }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) return null;
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { userId, email, name } = payload;
      if (typeof userId !== "number" || typeof email !== "string") {
        return null;
      }
      return { userId, email, name: name ?? "" };
    } catch {
      return null;
    }
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) return /* @__PURE__ */ new Map();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const user = await getUserById(session.userId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    return user;
  }
};
var authService = new AuthService();

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.code === "INTERNAL_SERVER_ERROR" ? "An internal server error occurred" : shape.message,
      data: {
        ...shape.data,
        // Never leak stack traces to the client
        stack: void 0
      }
    };
  }
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  }))
});

// server/routers.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z as z2 } from "zod";

// server/emailService.ts
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
function createImapClient(account) {
  return new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: {
      user: account.emailAddress,
      pass: account.password
    },
    logger: false,
    emitLogs: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2"
    },
    greetingTimeout: 3e4,
    socketTimeout: 12e4
    // 2 min for large fetches
  });
}
function decodeBase64(encoded) {
  const cleaned = encoded.replace(/[\r\n\s]/g, "");
  return Buffer.from(cleaned, "base64");
}
function decodeQuotedPrintable(encoded) {
  return encoded.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
function parseEmailSource(source) {
  let bodyText = "";
  let bodyHtml = "";
  const attachments = [];
  const boundaryMatch = source.match(/boundary="?([^"\r\n;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = source.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"));
    for (const part of parts) {
      if (part.trim() === "--" || part.trim() === "") continue;
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      const headers = part.substring(0, headerEnd);
      const content = part.substring(headerEnd + 4);
      const contentType = headers.match(/Content-Type:\s*([^;\r\n]+)/i)?.[1]?.trim()?.toLowerCase() || "";
      const transferEncoding = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1]?.trim()?.toLowerCase() || "";
      const disposition = headers.match(/Content-Disposition:\s*([^;\r\n]+)/i)?.[1]?.trim()?.toLowerCase() || "";
      const filenameMatch = headers.match(/(?:file)?name="?([^"\r\n;]+)"?/i);
      const filename = filenameMatch?.[1]?.trim() || "";
      if (contentType.startsWith("multipart/")) {
        const nestedParts = parseEmailSource(headers + "\r\n\r\n" + content);
        if (!bodyText && nestedParts.bodyText) bodyText = nestedParts.bodyText;
        if (!bodyHtml && nestedParts.bodyHtml) bodyHtml = nestedParts.bodyHtml;
        attachments.push(...nestedParts.attachments);
        continue;
      }
      if (contentType === "text/plain" && disposition !== "attachment") {
        let decoded = content;
        if (transferEncoding === "base64") {
          decoded = decodeBase64(content).toString("utf-8");
        } else if (transferEncoding === "quoted-printable") {
          decoded = decodeQuotedPrintable(content);
        }
        if (!bodyText) bodyText = decoded.trim();
      } else if (contentType === "text/html" && disposition !== "attachment") {
        let decoded = content;
        if (transferEncoding === "base64") {
          decoded = decodeBase64(content).toString("utf-8");
        } else if (transferEncoding === "quoted-printable") {
          decoded = decodeQuotedPrintable(content);
        }
        if (!bodyHtml) bodyHtml = decoded.trim();
      } else if (disposition === "attachment" || contentType === "application/pdf" || contentType.startsWith("image/") || filename && (filename.endsWith(".pdf") || filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg"))) {
        if (transferEncoding === "base64" && filename) {
          try {
            const buffer = decodeBase64(content);
            if (buffer.length > 0 && buffer.length < 15 * 1024 * 1024) {
              let resolvedMimeType = contentType || "application/octet-stream";
              if (filename.toLowerCase().endsWith(".pdf") && resolvedMimeType !== "application/pdf") {
                resolvedMimeType = "application/pdf";
              } else if (filename.toLowerCase().endsWith(".png") && !resolvedMimeType.startsWith("image/")) {
                resolvedMimeType = "image/png";
              } else if ((filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) && !resolvedMimeType.startsWith("image/")) {
                resolvedMimeType = "image/jpeg";
              }
              attachments.push({
                filename,
                mimeType: resolvedMimeType,
                content: buffer,
                size: buffer.length
              });
            }
          } catch (err) {
            console.error(`[EmailService] Failed to decode attachment ${filename}:`, err.message);
          }
        }
      }
    }
  } else {
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
      bodyText = simpleBody?.substring(0, 1e4) || "";
    }
  }
  return {
    bodyText: bodyText.substring(0, 1e4),
    bodyHtml: bodyHtml.substring(0, 5e4),
    attachments
  };
}
function messageToFetchedEmail(message) {
  const envelope = message.envelope;
  if (!envelope) return null;
  const source = message.source?.toString() || "";
  const { bodyText, bodyHtml, attachments } = parseEmailSource(source);
  return {
    uid: message.uid,
    messageId: envelope?.messageId || `generated-${message.uid}-${Date.now()}`,
    subject: envelope?.subject || "(No Subject)",
    fromAddress: envelope?.from?.[0]?.address || "",
    fromName: envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || "",
    toAddress: envelope?.to?.map((t2) => t2.address).join(", ") || "",
    body: bodyText,
    bodyHtml,
    receivedAt: envelope?.date ? new Date(envelope.date) : /* @__PURE__ */ new Date(),
    attachments
  };
}
async function fetchEmails(account, limit = 500, sinceDate) {
  const client = createImapClient(account);
  const results = [];
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
    const totalMessages = mailbox.exists;
    const messagesToFetch = Math.min(limit, totalMessages);
    const startSeq = Math.max(1, totalMessages - messagesToFetch + 1);
    console.log(`[EmailService] Will fetch messages seq ${startSeq}:${totalMessages} (up to ${messagesToFetch} messages)`);
    if (sinceDate) {
      console.log(`[EmailService] Filtering for emails since: ${sinceDate.toISOString()}`);
    }
    const BATCH_SIZE = 50;
    let reachedOldEnough = false;
    for (let batchEnd = totalMessages; batchEnd >= startSeq && !reachedOldEnough; batchEnd -= BATCH_SIZE) {
      const batchStart = Math.max(startSeq, batchEnd - BATCH_SIZE + 1);
      const range = `${batchStart}:${batchEnd}`;
      console.log(`[EmailService] Fetching batch ${range}...`);
      try {
        for await (const message of client.fetch(range, {
          uid: true,
          envelope: true,
          source: true
        }, { uid: false })) {
          try {
            const email = messageToFetchedEmail(message);
            if (!email) continue;
            if (sinceDate && email.receivedAt < sinceDate) {
              continue;
            }
            results.push(email);
          } catch (msgErr) {
            console.error("[EmailService] Error processing message:", msgErr.message);
          }
        }
      } catch (batchErr) {
        console.error(`[EmailService] Batch ${range} failed:`, batchErr.message);
        console.log("[EmailService] Trying one-by-one fallback for this batch...");
        for (let seq = batchEnd; seq >= batchStart; seq--) {
          try {
            for await (const message of client.fetch(`${seq}`, {
              uid: true,
              envelope: true,
              source: true
            }, { uid: false })) {
              const email = messageToFetchedEmail(message);
              if (!email) continue;
              if (sinceDate && email.receivedAt < sinceDate) continue;
              results.push(email);
            }
          } catch (singleErr) {
            console.error(`[EmailService] Failed seq ${seq}:`, singleErr.message);
          }
        }
      }
      console.log(`[EmailService] Progress: ${results.length} emails collected so far`);
    }
    console.log(`[EmailService] Successfully fetched ${results.length} emails total`);
    await client.logout();
  } catch (err) {
    console.error("[EmailService] IMAP connection error:", err);
    try {
      await client.logout();
    } catch (_) {
    }
    throw new Error(`Failed to fetch emails: ${err.message}`);
  }
  results.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  return results;
}
async function testConnection(account) {
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
async function sendEmail(account, to, subject, body, inReplyTo) {
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: true,
    auth: {
      user: account.emailAddress,
      pass: account.password
    }
  });
  try {
    console.log("[EmailService] Sending email to:", to);
    await transporter.sendMail({
      from: account.emailAddress,
      to,
      subject,
      text: body,
      ...inReplyTo ? { inReplyTo, references: inReplyTo } : {}
    });
    console.log("[EmailService] Email sent successfully");
    return true;
  } catch (err) {
    console.error("[EmailService] SMTP error:", err);
    throw new Error(`Failed to send email: ${err.message}`);
  }
}
async function fetchAttachmentsForEmail(account, messageId) {
  const client = createImapClient(account);
  const attachments = [];
  try {
    await client.connect();
    const mailbox = await client.mailboxOpen("INBOX");
    if (!mailbox.exists) {
      await client.logout();
      return attachments;
    }
    const uids = await client.search({ header: { "Message-ID": messageId } });
    if (!uids || uids.length === 0) {
      console.log(`[EmailService] No message found with Message-ID: ${messageId}`);
      await client.logout();
      return attachments;
    }
    for await (const message of client.fetch(uids[0].toString(), {
      uid: true,
      source: true
    })) {
      const source = message.source?.toString() || "";
      const parsed = parseEmailSource(source);
      attachments.push(...parsed.attachments);
    }
    console.log(`[EmailService] Found ${attachments.length} attachments for messageId: ${messageId}`);
    await client.logout();
  } catch (err) {
    console.error("[EmailService] Error fetching attachments:", err);
    try {
      await client.logout();
    } catch (_) {
    }
  }
  return attachments;
}

// server/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var _s3 = null;
function getS3Client() {
  if (!_s3) {
    _s3 = new S3Client({
      region: ENV.awsRegion,
      credentials: {
        accessKeyId: ENV.awsAccessKeyId,
        secretAccessKey: ENV.awsSecretAccessKey
      }
    });
  }
  return _s3;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : data;
  await s3.send(
    new PutObjectCommand({
      Bucket: ENV.awsBucketName,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ENV.awsBucketName, Key: key }),
    { expiresIn: 3600 }
  );
  return { key, url };
}

// server/_core/llm.ts
import Anthropic from "@anthropic-ai/sdk";
var _client2 = null;
function getClient() {
  if (!_client2) {
    if (!ENV.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    _client2 = new Anthropic({ apiKey: ENV.anthropicApiKey });
  }
  return _client2;
}
function extractTextContent(content) {
  if (typeof content === "string") return content;
  if (content.type === "text") return content.text;
  return JSON.stringify(content);
}
function toAnthropicContent(content) {
  const parts = Array.isArray(content) ? content : [content];
  if (parts.length === 1) {
    const part = parts[0];
    if (typeof part === "string") return part;
    if (part.type === "text") return part.text;
  }
  return parts.map((part) => {
    if (typeof part === "string") return { type: "text", text: part };
    if (part.type === "text") return { type: "text", text: part.text };
    if (part.type === "image_url") {
      const url = part.image_url.url;
      if (url.startsWith("data:")) {
        const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: match[1],
              data: match[2]
            }
          };
        }
      }
      return { type: "text", text: `[Image: ${url}]` };
    }
    if (part.type === "file_url") {
      return { type: "text", text: `[File: ${part.file_url.url}]` };
    }
    return { type: "text", text: JSON.stringify(part) };
  });
}
function getJsonSchemaInstruction(params) {
  const format = params.responseFormat || params.response_format;
  const schema = params.outputSchema || params.output_schema;
  if (format && format.type === "json_schema" && format.json_schema?.schema) {
    return `

You MUST respond with valid JSON matching this exact schema:
${JSON.stringify(format.json_schema.schema, null, 2)}

Respond ONLY with the JSON object, no other text.`;
  }
  if (schema?.schema) {
    return `

You MUST respond with valid JSON matching this exact schema:
${JSON.stringify(schema.schema, null, 2)}

Respond ONLY with the JSON object, no other text.`;
  }
  if (format && format.type === "json_object") {
    return "\n\nYou MUST respond with valid JSON. Respond ONLY with the JSON object, no other text.";
  }
  return null;
}
async function invokeLLM(params) {
  const client = getClient();
  let systemText = "";
  const conversationMessages = [];
  for (const msg of params.messages) {
    if (msg.role === "system") {
      const text2 = Array.isArray(msg.content) ? msg.content.map(extractTextContent).join("\n") : extractTextContent(msg.content);
      systemText += (systemText ? "\n\n" : "") + text2;
    } else if (msg.role === "user" || msg.role === "assistant") {
      conversationMessages.push({
        role: msg.role,
        content: toAnthropicContent(msg.content)
      });
    } else if (msg.role === "tool" || msg.role === "function") {
      const text2 = Array.isArray(msg.content) ? msg.content.map(extractTextContent).join("\n") : extractTextContent(msg.content);
      conversationMessages.push({
        role: "user",
        content: `[Tool result for ${msg.name || "unknown"}]: ${text2}`
      });
    }
  }
  const jsonInstruction = getJsonSchemaInstruction(params);
  if (jsonInstruction) {
    systemText += jsonInstruction;
  }
  const maxTokens = params.maxTokens || params.max_tokens || 8192;
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: maxTokens,
    system: systemText || void 0,
    messages: conversationMessages
  });
  let responseText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      responseText += block.text;
    }
  }
  return {
    id: response.id,
    created: Math.floor(Date.now() / 1e3),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: responseText
        },
        finish_reason: response.stop_reason === "end_turn" ? "stop" : response.stop_reason
      }
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens
    }
  };
}

// server/aiService.ts
async function classifyEmail(subject, body, fromAddress, fromName) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
- Every email MUST produce a task in taskData \u2014 even invoices.
- If newsletter/notification: task is "Review [subject]" with low priority.
- If meeting invite: task is "Respond to meeting invite: [subject]".
- Due dates: use ISO format (YYYY-MM-DD) or null if none mentioned.
- Category: one of "invoice", "correspondence", "meeting", "request", "notification", "follow-up", "approval", "report", "other".

INVOICE TYPE DETECTION (for invoices only):
When classification is "invoice", you MUST also determine the invoice sub-type in invoiceData.action:
- If PBS/Betalingsservice/automatic payment/direct debit/subscription: set action to "PBS - Automatic payment, no action needed"
- If Faktura/traditional invoice/manual payment required: set action to "FAKTURA - Manual payment required before due date"
- Always prefix the action with "PBS" or "FAKTURA" so the system can distinguish them.
Keywords for PBS: "PBS", "Betalingsservice", "Automatisk betaling", "Trukket", "H\xE6vet", "Abonnement", "Subscription", "Direct debit", "Recurring", "Betalingsaftale".
Keywords for Faktura: "Faktura", "Invoice", "Regning", "Forfaldsdato", "Bedes betalt", bank account details, payment instructions.

CONTENT CATEGORY SUGGESTION:
Beyond invoice/task classification, also predict the best content category for the user's reading workflow:
- "invoice": Financial documents, bills, payment requests
- "task": Actionable items requiring a response or work
- "read_lecture": Educational content, tutorials, course materials, webinars, training \u2014 content to study carefully
- "read_learn": Industry news, articles, blog posts, research papers \u2014 content to absorb knowledge from
- "might_be_interesting": Newsletters, promotions, announcements, events \u2014 content that might be worth a glance
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
- urgency >= 6 AND importance >= 6 \u2192 "do_first"
- urgency < 6 AND importance >= 6 \u2192 "schedule"
- urgency >= 6 AND importance < 6 \u2192 "delegate"
- urgency < 6 AND importance < 6 \u2192 "archive"

PRIORITY LEVEL:
- priorityScore 8.0-10.0 \u2192 "critical"
- priorityScore 6.0-7.9 \u2192 "high"
- priorityScore 4.0-5.9 \u2192 "medium"
- priorityScore 1.0-3.9 \u2192 "low"

Today's date: ${today}

Always respond in valid JSON matching the schema.`
      },
      {
        role: "user",
        content: `From: ${fromName} <${fromAddress}>
Subject: ${subject}

${body.substring(0, 4e3)}`
      }
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
              enum: ["invoice", "task"]
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
                action: { type: "string" }
              },
              required: ["vendor", "amount", "dueDate", "invoiceNumber", "action"],
              additionalProperties: false
            },
            taskData: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                dueDate: { type: ["string", "null"] },
                category: { type: "string" }
              },
              required: ["title", "description", "priority", "dueDate", "category"],
              additionalProperties: false
            },
            suggestedAction: { type: "string", description: "What the user should do" },
            contentCategory: {
              type: "object",
              properties: {
                suggestedCategory: { type: "string", enum: ["task", "invoice", "read_lecture", "read_learn", "might_be_interesting"], description: "Best content category for reading workflow" },
                confidence: { type: "number", description: "Confidence 0-1" },
                reasoning: { type: "string", description: "Brief explanation for the suggestion" }
              },
              required: ["suggestedCategory", "confidence", "reasoning"],
              additionalProperties: false
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
                reasoning: { type: "string", description: "Brief scoring explanation" }
              },
              required: ["urgencyScore", "importanceScore", "priorityScore", "priorityLevel", "quadrant", "deadlineDate", "escalationLevel", "suggestedAction", "reasoning"],
              additionalProperties: false
            }
          },
          required: ["classification", "summary", "confidence", "invoiceData", "taskData", "suggestedAction", "contentCategory", "urgency"],
          additionalProperties: false
        }
      }
    }
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }
  return JSON.parse(content);
}
async function scoreTaskUrgency(taskTitle, taskDescription, dueDate, category, createdAt) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
QUADRANT: urgency>=6 AND importance>=6 \u2192 "do_first", urgency<6 AND importance>=6 \u2192 "schedule", urgency>=6 AND importance<6 \u2192 "delegate", else \u2192 "archive"
PRIORITY LEVEL: 8-10 \u2192 "critical", 6-7.9 \u2192 "high", 4-5.9 \u2192 "medium", 1-3.9 \u2192 "low"

Today's date: ${today}
Task was created on: ${createdAt}
${dueDate ? `Task due date: ${dueDate}` : "No due date set."}

If the due date has passed, urgency should be 9-10 (overdue).
If due date is today or tomorrow, urgency should be 7-9.

Respond in valid JSON.`
      },
      {
        role: "user",
        content: `Task: ${taskTitle}
Description: ${taskDescription}
Category: ${category}`
      }
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
            reasoning: { type: "string", description: "Brief scoring explanation" }
          },
          required: ["urgencyScore", "importanceScore", "priorityScore", "priorityLevel", "quadrant", "deadlineDate", "escalationLevel", "suggestedAction", "reasoning"],
          additionalProperties: false
        }
      }
    }
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }
  return JSON.parse(content);
}
function computeEscalation(task) {
  const now = /* @__PURE__ */ new Date();
  let urgencyBoost = 0;
  let newEscalationLevel = task.escalationLevel ?? 0;
  let isOverdue = false;
  if (task.dueDate) {
    const diffMs = task.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 864e5);
    if (diffDays < 0) {
      isOverdue = true;
      urgencyBoost = Math.min(3, Math.abs(diffDays));
      newEscalationLevel = Math.max(newEscalationLevel, 3);
    } else if (diffDays === 0) {
      urgencyBoost = 2;
      newEscalationLevel = Math.max(newEscalationLevel, 2);
    } else if (diffDays === 1) {
      urgencyBoost = 1;
      newEscalationLevel = Math.max(newEscalationLevel, 1);
    }
  }
  if (task.status === "pending" && !task.dueDate) {
    const ageMs = now.getTime() - task.createdAt.getTime();
    const ageDays = Math.floor(ageMs / 864e5);
    if (ageDays > 7) {
      urgencyBoost = Math.max(urgencyBoost, 1);
    }
    if (ageDays > 14) {
      urgencyBoost = Math.max(urgencyBoost, 2);
    }
  }
  return { urgencyBoost, newEscalationLevel, isOverdue };
}
async function generateDraftReply(originalSubject, originalBody, fromName, classification, aiSummary, userInstructions) {
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

Write ONLY the reply body text. Do not include subject line, greeting headers, or email formatting.`
      },
      {
        role: "user",
        content: `Original email from ${fromName}:
Subject: ${originalSubject}
Summary: ${aiSummary}

Body:
${originalBody.substring(0, 3e3)}`
      }
    ]
  });
  return response.choices?.[0]?.message?.content || "Thank you for your email. I will review and get back to you shortly.";
}
async function classifyWhatsAppMessage(messageText, senderName, senderRole) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
QUADRANT: urgency>=6 AND importance>=6 \u2192 "do_first", urgency<6 AND importance>=6 \u2192 "schedule", urgency>=6 AND importance<6 \u2192 "delegate", else \u2192 "archive"
LEVEL: 8-10 \u2192 "critical", 6-7.9 \u2192 "high", 4-5.9 \u2192 "medium", 1-3.9 \u2192 "low"

Today: ${today}
${senderRole ? `Sender role: ${senderRole}` : ""}

Respond in valid JSON.`
      },
      {
        role: "user",
        content: `WhatsApp message from ${senderName}:

"${messageText.substring(0, 3e3)}"`
      }
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
              enum: ["problem", "question", "update", "request"]
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
                category: { type: "string" }
              },
              required: ["title", "description", "priority", "dueDate", "category"],
              additionalProperties: false
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
                reasoning: { type: "string", description: "Brief scoring explanation" }
              },
              required: ["urgencyScore", "importanceScore", "priorityScore", "priorityLevel", "quadrant", "deadlineDate", "escalationLevel", "suggestedAction", "reasoning"],
              additionalProperties: false
            }
          },
          required: ["classification", "summary", "confidence", "taskData", "suggestedAction", "urgency"],
          additionalProperties: false
        }
      }
    }
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }
  return JSON.parse(content);
}
async function extractInvoiceDetails(subject, body, fromAddress, fromName, attachmentUrls) {
  const userContent = [];
  if (attachmentUrls && attachmentUrls.length > 0) {
    for (const att of attachmentUrls) {
      if (att.mimeType === "application/pdf") {
        userContent.push({
          type: "file_url",
          file_url: {
            url: att.url,
            mime_type: "application/pdf"
          }
        });
      } else if (att.mimeType.startsWith("image/")) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: att.url,
            detail: "high"
          }
        });
      }
    }
  }
  let textContent = body;
  if (textContent.length < 100) {
    textContent = body;
  }
  const attachmentNote = attachmentUrls && attachmentUrls.length > 0 ? `

[IMPORTANT: This email has ${attachmentUrls.length} attached file(s): ${attachmentUrls.map((a) => a.filename).join(", ")}. The invoice data is likely in the attached PDF. Please extract data from the attachment(s) above.]` : "";
  userContent.push({
    type: "text",
    text: `From: ${fromName} <${fromAddress}>
Subject: ${subject}

${textContent.substring(0, 6e3)}${attachmentNote}`
  });
  console.log(`[Invoice AI] Extracting invoice from: ${fromName} <${fromAddress}>, Subject: ${subject}`);
  console.log(`[Invoice AI] Content parts: ${userContent.length} (${userContent.map((c) => c.type).join(", ")})`);
  if (attachmentUrls && attachmentUrls.length > 0) {
    console.log(`[Invoice AI] Attachments passed to LLM:`, attachmentUrls.map((a) => `${a.filename} [${a.mimeType}] ${a.url.substring(0, 80)}...`));
  } else {
    console.log(`[Invoice AI] No attachments \u2014 extracting from email body only`);
  }
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an invoice data extraction specialist. Extract structured data from the email and any attached PDF/image files.

IMPORTANT: Many invoice emails contain the actual invoice data INSIDE PDF ATTACHMENTS, not in the email body. If a PDF is provided, extract data from the PDF content. The email body may just say "Here is your invoice" or similar.

INVOICE TYPE DETECTION \u2014 CRITICAL:
You MUST classify every invoice into one of these types:
- "faktura": A traditional invoice that requires MANUAL payment. The recipient must actively pay it (bank transfer, card payment, etc.). Keywords: "Faktura", "Invoice", "Regning", "Betalingsfrist", "Forfaldsdato", "Bedes betalt", "Venligst betal", "Overf\xF8rsel til konto", "Reg.nr", "Kontonr", bank account details, payment instructions.
- "pbs": An automatic payment / direct debit / subscription charge. The money is automatically withdrawn from the customer's account. Keywords: "PBS", "Betalingsservice", "Automatisk betaling", "Trukket", "H\xE6vet", "Abonnement", "Subscription", "Auto-pay", "Direct debit", "Recurring", "M\xE5nedlig betaling", "Betalingsaftale", "Leverand\xF8rservice", "BS-aftale".
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
- invoiceType: "faktura", "pbs", or "unknown" \u2014 see detection rules above.

Handle Danish, Swedish, Norwegian, Romanian, English invoices. Common terms:
- Faktura/Fakturanr = Invoice/Invoice number
- Bel\xF8b/Betalingsbel\xF8b = Amount
- Forfaldsdato = Due date
- Moms/MVA = VAT
- Bilag = Attachment/Receipt
- F\xF8lgeseddel = Delivery note
- Kreditnota = Credit note
- Factura = Invoice (Romanian)
- PBS/Betalingsservice = Automatic payment / Direct debit

Always respond in valid JSON.`
      },
      {
        role: "user",
        content: userContent
      }
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
                  total: { type: "string" }
                },
                required: ["description", "quantity", "unitPrice", "total"],
                additionalProperties: false
              }
            },
            invoiceType: { type: "string", enum: ["faktura", "pbs", "unknown"], description: "faktura = manual payment required, pbs = automatic payment/direct debit, unknown = cannot determine" }
          },
          required: ["supplier", "invoiceNumber", "amount", "currency", "paymentDate", "dueDate", "products", "lineItems", "invoiceType"],
          additionalProperties: false
        }
      }
    }
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI for invoice extraction");
  }
  const parsed = JSON.parse(content);
  console.log(`[Invoice AI] Extraction result: supplier=${parsed.supplier}, amount=${parsed.amount} ${parsed.currency}, due=${parsed.dueDate}, type=${parsed.invoiceType}, items=${parsed.lineItems?.length || 0}`);
  return parsed;
}

// server/whatsappService.ts
var GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
async function sendWhatsAppMessage(to, text2, replyToMessageId) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp API credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.");
  }
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text2 }
  };
  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }
  const response = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    console.error("[WhatsApp] Send message failed:", JSON.stringify(error));
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }
  const result = await response.json();
  console.log("[WhatsApp] Message sent to:", to, "id:", result.messages?.[0]?.id);
  return result;
}
async function markWhatsAppMessageAsRead(messageId) {
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId
        })
      }
    );
    console.log("[WhatsApp] Marked as read:", messageId);
  } catch (error) {
    console.error("[WhatsApp] Failed to mark as read:", error);
  }
}
function parseWebhookMessages(body) {
  const messages = [];
  if (body.object !== "whatsapp_business_account") return messages;
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const incomingMessages = value.messages || [];
      const contacts = value.contacts || [];
      if (incomingMessages.length === 0) continue;
      for (let i = 0; i < incomingMessages.length; i++) {
        const msg = incomingMessages[i];
        const contact = contacts[i] || {};
        const senderName = contact.profile?.name || "Unknown";
        const senderPhone = msg.from;
        const waMessageId = msg.id;
        const timestamp2 = new Date(parseInt(msg.timestamp) * 1e3);
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
          timestamp: timestamp2
        });
      }
    }
  }
  return messages;
}

// server/chatAgent.ts
import Anthropic2 from "@anthropic-ai/sdk";

// server/googleDrive.ts
import { google } from "googleapis";
var SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email"
];
function createOAuth2Client() {
  return new google.auth.OAuth2(
    ENV.googleClientId,
    ENV.googleClientSecret,
    ENV.googleRedirectUri
  );
}
function getGoogleAuthUrl() {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent"
  });
}
async function handleGoogleCallback(code, userId) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || "";
  await upsertOAuthToken({
    userId,
    provider: "google",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope,
    email
  });
  return { email };
}
async function getAuthenticatedClient(userId) {
  const token = await getOAuthToken(userId, "google");
  if (!token) throw new Error("Google Drive not connected. Go to Settings to connect.");
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt?.getTime()
  });
  client.on("tokens", async (newTokens) => {
    await upsertOAuthToken({
      userId,
      provider: "google",
      accessToken: newTokens.access_token || token.accessToken,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
    });
  });
  return client;
}
async function searchDriveFiles(userId, query, limit = 20) {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });
  const escapedQuery = query.replace(/'/g, "\\'");
  const q = `fullText contains '${escapedQuery}' and trashed = false`;
  const response = await drive.files.list({
    q,
    pageSize: limit,
    fields: "files(id, name, mimeType, modifiedTime, size, webViewLink, parents)",
    orderBy: "modifiedTime desc"
  });
  return response.data.files || [];
}
async function listDriveFiles(userId, folderId, limit = 20) {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });
  const q = folderId ? `'${folderId}' in parents and trashed = false` : "trashed = false";
  const response = await drive.files.list({
    q,
    pageSize: limit,
    fields: "files(id, name, mimeType, modifiedTime, size, webViewLink, parents)",
    orderBy: "modifiedTime desc"
  });
  return response.data.files || [];
}
async function readDriveFile(userId, fileId) {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth });
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType"
  });
  const name = meta.data.name || "Unknown";
  const mimeType = meta.data.mimeType || "";
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    let exportMime = "text/plain";
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      exportMime = "text/csv";
    }
    const exported = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "text" }
    );
    return {
      name,
      mimeType: exportMime,
      content: (typeof exported.data === "string" ? exported.data : JSON.stringify(exported.data)).substring(0, 1e4)
    };
  }
  if (mimeType === "application/pdf") {
    return {
      name,
      mimeType,
      content: `[PDF file: ${name}. Use the file's webViewLink to open it in Google Drive.]`
    };
  }
  try {
    const content = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    return {
      name,
      mimeType,
      content: (typeof content.data === "string" ? content.data : JSON.stringify(content.data)).substring(0, 1e4)
    };
  } catch {
    return {
      name,
      mimeType,
      content: `[Binary file: ${name} (${mimeType}). Cannot read as text.]`
    };
  }
}
async function getDriveConnectionStatus(userId) {
  const token = await getOAuthToken(userId, "google");
  if (!token) return { connected: false, email: null };
  return { connected: true, email: token.email };
}

// server/chatAgent.ts
var TOOLS = [
  {
    name: "search_emails",
    description: "Search the user's emails by keyword. Searches subject, body, sender name, and sender address. Returns matching emails with their AI summaries.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword or phrase" },
        limit: { type: "number", description: "Max results (default 20)" },
        include_sent: { type: "boolean", description: "Include sent emails (default true)" }
      },
      required: ["query"]
    }
  },
  {
    name: "read_email",
    description: "Read a specific email by its ID. Returns subject, body, sender, date, attachments, and AI analysis.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "number", description: "The email ID" }
      },
      required: ["email_id"]
    }
  },
  {
    name: "list_emails",
    description: "List recent emails, optionally filtered. Returns a summary list.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max emails to return (default 20)" },
        classification: { type: "string", enum: ["invoice", "task"], description: "Filter by classification" }
      }
    }
  },
  {
    name: "search_tasks",
    description: "Search tasks by keyword in title or description.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword" },
        status: { type: "string", enum: ["pending", "in_progress", "done", "archived"], description: "Filter by status" },
        limit: { type: "number", description: "Max results (default 20)" }
      },
      required: ["query"]
    }
  },
  {
    name: "list_tasks",
    description: "List tasks, optionally filtered by status, priority, or category.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "in_progress", "done", "archived"] },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        category: { type: "string", description: "Category name" },
        limit: { type: "number", description: "Max results (default 20)" }
      }
    }
  },
  {
    name: "create_task",
    description: "Create a new task in the task board.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority level" },
        category: { type: "string", description: "Category (e.g. correspondence, invoice, vendor, logistics)" },
        due_date: { type: "string", description: "Due date in ISO format (optional)" }
      },
      required: ["title"]
    }
  },
  {
    name: "update_task",
    description: "Update an existing task's status or category.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "number", description: "The task ID" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "dismissed"], description: "New status" },
        category: { type: "string", description: "New category" }
      },
      required: ["task_id"]
    }
  },
  {
    name: "list_invoices",
    description: "List invoices with their details (vendor, amount, dates).",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 20)" }
      }
    }
  },
  {
    name: "extract_invoice_from_email",
    description: "Extract invoice data (line items, totals, dates) from a specific email and its attachments using AI.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "number", description: "The email ID containing the invoice" }
      },
      required: ["email_id"]
    }
  },
  {
    name: "generate_draft_reply",
    description: "Generate an AI draft reply for a specific email.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "number", description: "The email ID to reply to" },
        instructions: { type: "string", description: "Optional instructions for the reply tone/content" }
      },
      required: ["email_id"]
    }
  },
  {
    name: "get_dashboard_stats",
    description: "Get overview statistics: email counts, task counts by status, invoice totals.",
    input_schema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sync_emails",
    description: "Trigger an email sync to fetch new emails from the mail server.",
    input_schema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "search_drive",
    description: "Search Google Drive files by keyword. Searches file names and content. Requires Google Drive to be connected in Settings.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword or phrase" },
        limit: { type: "number", description: "Max results (default 20)" }
      },
      required: ["query"]
    }
  },
  {
    name: "list_drive_files",
    description: "List files in Google Drive, optionally in a specific folder.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "Google Drive folder ID (optional, defaults to root)" },
        limit: { type: "number", description: "Max results (default 20)" }
      }
    }
  },
  {
    name: "read_drive_file",
    description: "Read the content of a Google Drive file. Works with Google Docs, Sheets (as CSV), and text files. PDFs return metadata only.",
    input_schema: {
      type: "object",
      properties: {
        file_id: { type: "string", description: "The Google Drive file ID" }
      },
      required: ["file_id"]
    }
  }
];
async function executeTool(toolName, args, userId) {
  try {
    switch (toolName) {
      case "search_emails": {
        const query = args.query.toLowerCase();
        const limit = args.limit || 20;
        const allEmails = await getEmailsByUser(userId, 200);
        const matches = allEmails.filter((e) => {
          const haystack = [
            e.subject,
            e.body,
            e.fromName,
            e.fromAddress,
            e.toAddress,
            e.aiSummary
          ].filter(Boolean).join(" ").toLowerCase();
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
          isRead: e.isRead
        }));
        return JSON.stringify({ count: results.length, totalMatches: matches.length, emails: results });
      }
      case "read_email": {
        const email = await getEmailById(args.email_id, userId);
        if (!email) return JSON.stringify({ error: "Email not found" });
        const attachments = await getAttachmentsByEmail(email.id);
        return JSON.stringify({
          id: email.id,
          subject: email.subject,
          from: `${email.fromName} <${email.fromAddress}>`,
          to: email.toAddress,
          date: email.receivedAt,
          body: email.body?.substring(0, 3e3),
          classification: email.classification,
          aiSummary: email.aiSummary,
          aiAnalysis: email.aiAnalysis,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size
          }))
        });
      }
      case "list_emails": {
        const limit = args.limit || 20;
        const emails2 = await getEmailsByUser(userId, limit);
        const filtered = args.classification ? emails2.filter((e) => e.classification === args.classification) : emails2;
        return JSON.stringify({
          count: filtered.length,
          emails: filtered.slice(0, limit).map((e) => ({
            id: e.id,
            subject: e.subject,
            from: e.fromName || e.fromAddress,
            date: e.receivedAt,
            classification: e.classification,
            summary: e.aiSummary
          }))
        });
      }
      case "search_tasks": {
        const query = args.query.toLowerCase();
        const limit = args.limit || 20;
        const allTasks = await getTasksByUser(userId);
        const matches = allTasks.filter((t2) => {
          if (args.status && t2.status !== args.status) return false;
          const haystack = [t2.title, t2.description, t2.category].filter(Boolean).join(" ").toLowerCase();
          return haystack.includes(query);
        });
        return JSON.stringify({
          count: matches.length,
          tasks: matches.slice(0, limit).map((t2) => ({
            id: t2.id,
            title: t2.title,
            status: t2.status,
            priority: t2.priority,
            category: t2.category,
            dueDate: t2.dueDate,
            source: t2.source
          }))
        });
      }
      case "list_tasks": {
        const limit = args.limit || 20;
        const tasks2 = await getTasksByUser(userId);
        const filtered = tasks2.filter((t2) => {
          if (args.status && t2.status !== args.status) return false;
          if (args.priority && t2.priority !== args.priority) return false;
          if (args.category && t2.category !== args.category) return false;
          return true;
        });
        return JSON.stringify({
          count: filtered.length,
          tasks: filtered.slice(0, limit).map((t2) => ({
            id: t2.id,
            title: t2.title,
            description: t2.description?.substring(0, 200),
            status: t2.status,
            priority: t2.priority,
            category: t2.category,
            dueDate: t2.dueDate,
            source: t2.source
          }))
        });
      }
      case "create_task": {
        const safeParseDueDate = (dateStr) => {
          if (!dateStr) return void 0;
          try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? void 0 : d;
          } catch {
            return void 0;
          }
        };
        const taskId = await insertTask({
          userId,
          title: args.title,
          description: args.description || "",
          priority: args.priority || "medium",
          category: args.category || "general",
          dueDate: safeParseDueDate(args.due_date),
          source: "manual"
        });
        return JSON.stringify({ success: true, taskId, title: args.title });
      }
      case "update_task": {
        const taskId = args.task_id;
        const results = [];
        if (args.status) {
          await updateTaskStatus(taskId, userId, args.status);
          results.push(`status \u2192 ${args.status}`);
        }
        if (args.category) {
          await updateTaskCategory(taskId, userId, args.category);
          results.push(`category \u2192 ${args.category}`);
        }
        return JSON.stringify({ success: true, taskId, updated: results });
      }
      case "list_invoices": {
        const limit = args.limit || 20;
        const invoices = await getInvoiceDetailsByUser(userId);
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
            status: inv.status
          }))
        });
      }
      case "extract_invoice_from_email": {
        const email = await getEmailById(args.email_id, userId);
        if (!email) return JSON.stringify({ error: "Email not found" });
        const attachments = await getAttachmentsByEmail(email.id);
        const attachmentUrls = attachments.filter((a) => a.s3Url).map((a) => ({ url: a.s3Url, mimeType: a.mimeType, filename: a.filename }));
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
        const email = await getEmailById(args.email_id, userId);
        if (!email) return JSON.stringify({ error: "Email not found" });
        const draft = await generateDraftReply(
          email.subject || "",
          email.body || "",
          email.fromName || email.fromAddress || "",
          email.classification || "task",
          email.aiSummary || "",
          args.instructions || void 0
        );
        return JSON.stringify({ draft });
      }
      case "get_dashboard_stats": {
        const emailStats = await getEmailStats(userId);
        const tasks2 = await getTasksByUser(userId);
        const pending = tasks2.filter((t2) => t2.status === "pending").length;
        const inProgress = tasks2.filter((t2) => t2.status === "in_progress").length;
        const done = tasks2.filter((t2) => t2.status === "completed").length;
        const urgent = tasks2.filter((t2) => t2.priority === "urgent" || t2.priority === "high").length;
        return JSON.stringify({
          emails: emailStats,
          tasks: { total: tasks2.length, pending, inProgress, done, urgent }
        });
      }
      case "sync_emails": {
        const account = await getEmailAccount(userId);
        if (!account) return JSON.stringify({ error: "No email account configured. Go to Settings first." });
        const sinceDate = account.lastSyncAt || /* @__PURE__ */ new Date("2026-03-01T00:00:00Z");
        const fetched = await fetchEmails(account, 100, sinceDate);
        let newCount = 0;
        for (const email of fetched) {
          if (email.messageId && await emailExistsByMessageId(email.messageId, userId)) continue;
          await insertEmail({
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
            receivedAt: email.receivedAt
          });
          newCount++;
        }
        await updateLastSync(account.id);
        return JSON.stringify({ synced: newCount, total: fetched.length });
      }
      case "search_drive": {
        const status = await getDriveConnectionStatus(userId);
        if (!status.connected) return JSON.stringify({ error: "Google Drive not connected. Go to Settings to connect." });
        const files = await searchDriveFiles(userId, args.query, args.limit || 20);
        return JSON.stringify({
          count: files.length,
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            size: f.size,
            webViewLink: f.webViewLink
          }))
        });
      }
      case "list_drive_files": {
        const status = await getDriveConnectionStatus(userId);
        if (!status.connected) return JSON.stringify({ error: "Google Drive not connected. Go to Settings to connect." });
        const files = await listDriveFiles(userId, args.folder_id, args.limit || 20);
        return JSON.stringify({
          count: files.length,
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            size: f.size,
            webViewLink: f.webViewLink
          }))
        });
      }
      case "read_drive_file": {
        const status = await getDriveConnectionStatus(userId);
        if (!status.connected) return JSON.stringify({ error: "Google Drive not connected. Go to Settings to connect." });
        const file = await readDriveFile(userId, args.file_id);
        return JSON.stringify(file);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`[ChatAgent] Tool ${toolName} failed:`, err);
    return JSON.stringify({ error: `Tool failed: ${err.message}` });
  }
}
var SYSTEM_PROMPT = `You are an AI assistant integrated into the user's personal productivity dashboard. You have direct access to their emails, tasks, invoices, and other data through tools.

Key behaviors:
- Use tools to look up real data before answering questions. Never guess or make up data.
- When the user asks to find, search, or organize something, use the appropriate tools.
- When creating tasks, use clear titles and descriptions.
- Summarize results concisely with key details. Use markdown formatting.
- If a tool returns an error, explain the issue and suggest what the user can do.
- You can chain multiple tool calls to accomplish complex requests (e.g., search emails, then extract invoice data from matches).
- Today's date is ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.`;
async function runChatAgent(messages, userId) {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const client = new Anthropic2({ apiKey: ENV.anthropicApiKey });
  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content
  }));
  const MAX_ITERATIONS = 10;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: anthropicMessages
    });
    if (response.stop_reason === "end_turn") {
      let text2 = "";
      for (const block of response.content) {
        if (block.type === "text") text2 += block.text;
      }
      return text2;
    }
    if (response.stop_reason === "tool_use") {
      anthropicMessages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`[ChatAgent] Calling tool: ${block.name}`, block.input);
          const result = await executeTool(
            block.name,
            block.input,
            userId
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result
          });
        }
      }
      anthropicMessages.push({ role: "user", content: toolResults });
    }
  }
  return "I've reached the maximum number of steps for this request. Please try breaking it into smaller requests.";
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const res = ctx.res;
      const cookieOptions = getSessionCookieOptions(ctx.req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    register: publicProcedure.input(z2.object({
      email: z2.string().email(),
      name: z2.string().min(1),
      password: z2.string().min(8, "Password must be at least 8 characters")
    })).mutation(async ({ ctx, input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError2({ code: "CONFLICT", message: "An account with this email already exists" });
      }
      const passwordHash = await authService.hashPassword(input.password);
      const user = await createUser(input.email, input.name, passwordHash);
      const token = await authService.createSessionToken(user.id, user.email, user.name ?? "");
      const res = ctx.res;
      const cookieOptions = getSessionCookieOptions(ctx.req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    }),
    login: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string().min(1)
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError2({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const valid = await authService.verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError2({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      await updateLastSignedIn(user.id);
      const token = await authService.createSessionToken(user.id, user.email, user.name ?? "");
      const res = ctx.res;
      const cookieOptions = getSessionCookieOptions(ctx.req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    })
  }),
  chat: router({
    send: protectedProcedure.input(z2.object({
      messages: z2.array(z2.object({
        role: z2.enum(["user", "assistant"]),
        content: z2.string()
      }))
    })).mutation(async ({ ctx, input }) => {
      try {
        const response = await runChatAgent(input.messages, ctx.user.id);
        return { response };
      } catch (err) {
        console.error("[Chat] Agent error:", err);
        throw err;
      }
    })
  }),
  googleDrive: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      return getDriveConnectionStatus(ctx.user.id);
    }),
    getAuthUrl: protectedProcedure.mutation(async () => {
      return { url: getGoogleAuthUrl() };
    }),
    callback: protectedProcedure.input(z2.object({ code: z2.string() })).mutation(async ({ ctx, input }) => {
      const result = await handleGoogleCallback(input.code, ctx.user.id);
      return result;
    }),
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteOAuthToken(ctx.user.id, "google");
      return { success: true };
    })
  }),
  emailAccount: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const account = await getEmailAccount(ctx.user.id);
      if (!account) return null;
      return {
        id: account.id,
        emailAddress: account.emailAddress,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        isActive: account.isActive,
        lastSyncAt: account.lastSyncAt
      };
    }),
    save: protectedProcedure.input(z2.object({
      emailAddress: z2.string().email(),
      password: z2.string().min(1),
      imapHost: z2.string().default("imap.one.com"),
      imapPort: z2.number().default(993),
      smtpHost: z2.string().default("send.one.com"),
      smtpPort: z2.number().default(465)
    })).mutation(async ({ ctx, input }) => {
      const connected = await testConnection({
        emailAddress: input.emailAddress,
        password: input.password,
        imapHost: input.imapHost,
        imapPort: input.imapPort
      });
      if (!connected) {
        throw new Error("Could not connect to email server. Please check your credentials.");
      }
      const accountId = await upsertEmailAccount({
        userId: ctx.user.id,
        emailAddress: input.emailAddress,
        password: input.password,
        imapHost: input.imapHost,
        imapPort: input.imapPort,
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort
      });
      return { success: true, accountId };
    }),
    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      const account = await getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured");
      const connected = await testConnection({
        emailAddress: account.emailAddress,
        password: account.password,
        imapHost: account.imapHost,
        imapPort: account.imapPort
      });
      return { connected };
    })
  }),
  email: router({
    list: protectedProcedure.input(z2.object({ limit: z2.number().optional() }).optional()).query(async ({ ctx, input }) => {
      return getEmailsByUser(ctx.user.id, input?.limit || 50);
    }),
    get: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      const email = await getEmailById(input.id, ctx.user.id);
      if (!email) throw new Error("Email not found");
      if (!email.isRead) await markEmailRead(email.id);
      const drafts = await getDraftsByEmail(email.id, ctx.user.id);
      const linkedTasks = await getTasksByEmailId(email.id, ctx.user.id);
      return { ...email, drafts, linkedTasks };
    }),
    sync: protectedProcedure.input(z2.object({ fullResync: z2.boolean().optional() }).optional()).mutation(async ({ ctx, input }) => {
      const account = await getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured. Go to Settings to add your email.");
      const CATCHUP_DATE = /* @__PURE__ */ new Date("2026-03-01T00:00:00Z");
      const isFullResync = input?.fullResync === true;
      const sinceDate = isFullResync ? CATCHUP_DATE : account.lastSyncAt && account.lastSyncAt > CATCHUP_DATE ? account.lastSyncAt : CATCHUP_DATE;
      console.log(`[Sync] Starting ${isFullResync ? "FULL " : ""}email sync for user ${ctx.user.id}, account: ${account.emailAddress}`);
      console.log(`[Sync] Fetching emails since: ${sinceDate.toISOString()}`);
      let fetched;
      try {
        fetched = await fetchEmails(account, 500, sinceDate);
      } catch (fetchErr) {
        console.error("[Sync] Email fetch failed:", fetchErr);
        throw new Error(`Email sync failed: ${fetchErr.message}. Please check your email credentials in Settings.`);
      }
      console.log(`[Sync] Fetched ${fetched.length} emails, processing...`);
      const safeParseDueDate = (dateStr) => {
        if (!dateStr) return void 0;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return void 0;
          return d;
        } catch {
          return void 0;
        }
      };
      let newCount = 0;
      for (const email of fetched) {
        if (email.messageId && await emailExistsByMessageId(email.messageId, ctx.user.id)) continue;
        const emailId = await insertEmail({
          userId: ctx.user.id,
          accountId: account.id,
          messageId: email.messageId,
          uid: email.uid,
          subject: email.subject,
          fromAddress: email.fromAddress,
          fromName: email.fromName,
          toAddress: email.toAddress,
          body: email.body,
          bodyHtml: email.bodyHtml,
          receivedAt: email.receivedAt
        });
        newCount++;
        if (email.attachments && email.attachments.length > 0) {
          for (const att of email.attachments) {
            try {
              const suffix = Math.random().toString(36).substring(2, 8);
              const s3Key = `attachments/${ctx.user.id}/${emailId}/${suffix}-${att.filename}`;
              const { url } = await storagePut(s3Key, att.content, att.mimeType);
              await insertEmailAttachment({
                emailId,
                userId: ctx.user.id,
                filename: att.filename,
                mimeType: att.mimeType,
                size: att.size,
                s3Key,
                s3Url: url
              });
              console.log(`[Sync] Uploaded attachment: ${att.filename} (${att.size} bytes) for email ${emailId}`);
            } catch (attErr) {
              console.error(`[Sync] Failed to upload attachment ${att.filename}:`, attErr.message);
            }
          }
        }
        try {
          const classification = await classifyEmail(email.subject, email.body, email.fromAddress, email.fromName);
          await updateEmailClassification(emailId, {
            classification: classification.classification,
            aiSummary: classification.summary,
            aiAnalysis: classification,
            isProcessed: true
          });
          const td = classification.taskData;
          const inv = classification.invoiceData;
          const isInvoice = classification.classification === "invoice";
          const urg = classification.urgency;
          const taskId = await insertTask({
            userId: ctx.user.id,
            emailId,
            title: isInvoice && inv ? `Invoice: ${inv.vendor} - ${inv.amount}` : td?.title || `Review: ${email.subject || "Untitled email"}`,
            description: isInvoice && inv ? `${inv.action}

Invoice #${inv.invoiceNumber}
Due: ${inv.dueDate}

${td?.description || ""}` : td?.description || `Email from ${email.fromName || email.fromAddress}. Please review.`,
            priority: isInvoice ? "high" : td?.priority || "medium",
            category: isInvoice ? "invoice" : td?.category || "correspondence",
            dueDate: isInvoice && inv ? safeParseDueDate(inv.dueDate) : safeParseDueDate(td?.dueDate),
            source: "email"
          });
          if (urg && taskId) {
            await updateTaskUrgency(taskId, ctx.user.id, {
              urgencyScore: urg.urgencyScore,
              importanceScore: urg.importanceScore,
              priorityScore: Math.round(urg.priorityScore * 10),
              quadrant: urg.quadrant,
              suggestedAction: urg.suggestedAction,
              isOverdue: urg.deadlineDate ? new Date(urg.deadlineDate) < /* @__PURE__ */ new Date() : false
            });
          }
          if (classification.contentCategory && taskId) {
            await updateTaskSuggestion(taskId, ctx.user.id, {
              suggestedCategory: classification.contentCategory.suggestedCategory,
              suggestionConfidence: Math.round(classification.contentCategory.confidence * 100),
              suggestionReasoning: classification.contentCategory.reasoning
            });
          }
        } catch (aiErr) {
          console.error("[AI] Classification failed for email:", emailId, aiErr);
          try {
            await insertTask({
              userId: ctx.user.id,
              emailId,
              title: `Review: ${email.subject || "Untitled email"}`,
              description: `Email from ${email.fromName || email.fromAddress}. AI classification failed \u2014 please review manually.`,
              priority: "medium",
              category: "correspondence",
              source: "email"
            });
          } catch (fallbackErr) {
            console.error("[AI] Fallback task creation also failed:", emailId, fallbackErr);
          }
        }
      }
      await updateLastSync(account.id);
      console.log(`[Sync] Sync complete: ${newCount} new emails out of ${fetched.length} fetched`);
      return { synced: newCount, total: fetched.length };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getEmailStats(ctx.user.id);
    }),
    // Returns how many emails still need tasks
    missingTaskCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await countEmailsWithoutTasks(ctx.user.id);
      return { missing: count };
    }),
    // Process a small batch of emails that don't have tasks yet (5 at a time)
    classifyBatch: protectedProcedure.mutation(async ({ ctx }) => {
      const BATCH_SIZE = 5;
      const safeParseDueDate = (dateStr) => {
        if (!dateStr) return void 0;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return void 0;
          return d;
        } catch {
          return void 0;
        }
      };
      const missingEmails = await getEmailsWithoutTasks(ctx.user.id, BATCH_SIZE);
      if (missingEmails.length === 0) {
        return { processed: 0, classified: 0, failed: 0, remaining: 0 };
      }
      let classified = 0;
      let failed = 0;
      for (const email of missingEmails) {
        try {
          const classification = await classifyEmail(
            email.subject || "",
            email.body || "",
            email.fromAddress || "",
            email.fromName || ""
          );
          await updateEmailClassification(email.id, {
            classification: classification.classification,
            aiSummary: classification.summary,
            aiAnalysis: classification,
            isProcessed: true
          });
          await insertTask({
            userId: ctx.user.id,
            emailId: email.id,
            title: classification.classification === "invoice" && classification.invoiceData ? `Invoice: ${classification.invoiceData.vendor} - ${classification.invoiceData.amount}` : classification.taskData.title,
            description: classification.classification === "invoice" && classification.invoiceData ? `${classification.invoiceData.action}

Invoice #${classification.invoiceData.invoiceNumber}
Due: ${classification.invoiceData.dueDate}

${classification.taskData.description}` : classification.taskData.description,
            priority: classification.classification === "invoice" ? "high" : classification.taskData.priority,
            category: classification.classification === "invoice" ? "invoice" : classification.taskData.category,
            dueDate: classification.classification === "invoice" && classification.invoiceData ? safeParseDueDate(classification.invoiceData.dueDate) : safeParseDueDate(classification.taskData.dueDate),
            source: "email"
          });
          classified++;
          console.log(`[ClassifyBatch] Classified email ${email.id} (${classified}/${missingEmails.length})`);
          if (classified < missingEmails.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (aiErr) {
          const isQuotaError = aiErr?.message?.includes("usage exhausted") || aiErr?.message?.includes("429") || aiErr?.message?.includes("rate limit");
          if (isQuotaError) {
            console.warn(`[ClassifyBatch] API quota hit at email ${email.id}, stopping batch early`);
            try {
              await updateEmailClassification(email.id, { classification: "task", aiSummary: "AI classification failed \u2014 review manually", aiAnalysis: {}, isProcessed: true });
              await insertTask({ userId: ctx.user.id, emailId: email.id, title: `Review: ${email.subject || "Untitled email"}`, description: `Email from ${email.fromName || email.fromAddress}. AI quota reached \u2014 please review manually.`, priority: "medium", category: "correspondence", source: "email" });
            } catch (_) {
            }
            failed++;
            break;
          }
          console.error(`[ClassifyBatch] Failed for email ${email.id}:`, aiErr);
          try {
            await updateEmailClassification(email.id, { classification: "task", aiSummary: "AI classification failed \u2014 review manually", aiAnalysis: {}, isProcessed: true });
            await insertTask({ userId: ctx.user.id, emailId: email.id, title: `Review: ${email.subject || "Untitled email"}`, description: `Email from ${email.fromName || email.fromAddress}. AI classification failed \u2014 please review manually.`, priority: "medium", category: "correspondence", source: "email" });
          } catch (fallbackErr) {
            console.error(`[ClassifyBatch] Fallback also failed for email ${email.id}:`, fallbackErr);
          }
          failed++;
        }
      }
      const remaining = await countEmailsWithoutTasks(ctx.user.id);
      console.log(`[ClassifyBatch] Batch done: ${classified} classified, ${failed} failed, ${remaining} remaining`);
      return { processed: missingEmails.length, classified, failed, remaining };
    }),
    // Legacy reclassifyAll — now just calls classifyBatch for emails without tasks (no delete)
    reclassifyAll: protectedProcedure.mutation(async ({ ctx }) => {
      const missing = await countEmailsWithoutTasks(ctx.user.id);
      return { total: missing, classified: 0, failed: 0, message: "Use the new batch processing button instead. It processes 5 emails at a time to avoid timeouts." };
    }),
    accounting: protectedProcedure.query(async ({ ctx }) => {
      return getAccountingSummary(ctx.user.id);
    })
  }),
  draft: router({
    generate: protectedProcedure.input(z2.object({ emailId: z2.number(), instructions: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      const email = await getEmailById(input.emailId, ctx.user.id);
      if (!email) throw new Error("Email not found");
      const replyBody = await generateDraftReply(
        email.subject || "",
        email.body || "",
        email.fromName || email.fromAddress || "",
        email.classification || "general",
        email.aiSummary || "",
        input.instructions
      );
      const draftId = await insertDraft({
        userId: ctx.user.id,
        emailId: email.id,
        subject: `Re: ${email.subject || ""}`,
        body: replyBody,
        toAddress: email.fromAddress || ""
      });
      return { draftId, body: replyBody };
    }),
    update: protectedProcedure.input(z2.object({ draftId: z2.number(), body: z2.string() })).mutation(async ({ ctx, input }) => {
      await updateDraftBody(input.draftId, ctx.user.id, input.body);
      return { success: true };
    }),
    approve: protectedProcedure.input(z2.object({ draftId: z2.number() })).mutation(async ({ ctx, input }) => {
      await updateDraftStatus(input.draftId, ctx.user.id, "approved");
      return { success: true };
    }),
    reject: protectedProcedure.input(z2.object({ draftId: z2.number() })).mutation(async ({ ctx, input }) => {
      await updateDraftStatus(input.draftId, ctx.user.id, "rejected");
      return { success: true };
    }),
    send: protectedProcedure.input(z2.object({ draftId: z2.number() })).mutation(async ({ ctx, input }) => {
      const draft = await getDraftById(input.draftId, ctx.user.id);
      if (!draft) throw new Error("Draft not found");
      const account = await getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured");
      const email = await getEmailById(draft.emailId, ctx.user.id);
      await sendEmail(account, draft.toAddress, draft.subject || "", draft.body, email?.messageId || void 0);
      await updateDraftStatus(input.draftId, ctx.user.id, "sent");
      return { success: true };
    }),
    pending: protectedProcedure.query(async ({ ctx }) => {
      return getDraftsByUser(ctx.user.id);
    })
  }),
  whatsapp: router({
    messages: protectedProcedure.input(z2.object({ limit: z2.number().optional() }).optional()).query(async ({ ctx, input }) => {
      return getWhatsAppMessagesByUser(ctx.user.id, input?.limit || 100);
    }),
    getMessage: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      const msg = await getWhatsAppMessageById(input.id, ctx.user.id);
      if (!msg) throw new Error("Message not found");
      const drafts = await getWhatsAppDraftsByMessage(msg.id, ctx.user.id);
      return { ...msg, drafts };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getWhatsAppStats(ctx.user.id);
    }),
    accounting: protectedProcedure.query(async ({ ctx }) => {
      return getWhatsAppAccounting(ctx.user.id);
    }),
    pendingDrafts: protectedProcedure.query(async ({ ctx }) => {
      return getWhatsAppPendingDrafts(ctx.user.id);
    }),
    updateDraft: protectedProcedure.input(z2.object({ draftId: z2.number(), replyText: z2.string() })).mutation(async ({ ctx, input }) => {
      await updateWhatsAppDraftText(input.draftId, ctx.user.id, input.replyText);
      return { success: true };
    }),
    approveDraft: protectedProcedure.input(z2.object({ draftId: z2.number() })).mutation(async ({ ctx, input }) => {
      await updateWhatsAppDraftStatus(input.draftId, ctx.user.id, "approved");
      return { success: true };
    }),
    rejectDraft: protectedProcedure.input(z2.object({ draftId: z2.number() })).mutation(async ({ ctx, input }) => {
      await updateWhatsAppDraftStatus(input.draftId, ctx.user.id, "rejected");
      return { success: true };
    }),
    sendDraft: protectedProcedure.input(z2.object({ draftId: z2.number() })).mutation(async ({ ctx, input }) => {
      const draft = await getWhatsAppDraftById(input.draftId, ctx.user.id);
      if (!draft) throw new Error("Draft not found");
      await sendWhatsAppMessage(draft.toPhone, draft.replyText, draft.originalWaMessageId || void 0);
      await updateWhatsAppDraftStatus(input.draftId, ctx.user.id, "sent");
      return { success: true };
    })
  }),
  employee: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getEmployeesByUser(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({
      phone: z2.string().min(1),
      name: z2.string().min(1),
      role: z2.string().optional(),
      department: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const id = await upsertEmployee({
        userId: ctx.user.id,
        phone: input.phone,
        name: input.name,
        role: input.role,
        department: input.department
      });
      return { id };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      await deleteEmployee(input.id, ctx.user.id);
      return { success: true };
    })
  }),
  task: router({
    list: protectedProcedure.input(z2.object({ limit: z2.number().optional() }).optional()).query(async ({ ctx, input }) => {
      return getTasksByUser(ctx.user.id, input?.limit || 100);
    }),
    prioritized: protectedProcedure.input(z2.object({ limit: z2.number().optional() }).optional()).query(async ({ ctx, input }) => {
      return getTasksByUserPrioritized(ctx.user.id, input?.limit || 200);
    }),
    byQuadrant: protectedProcedure.input(z2.object({ quadrant: z2.enum(["do_first", "schedule", "delegate", "archive"]) })).query(async ({ ctx, input }) => {
      return getTasksByQuadrant(ctx.user.id, input.quadrant);
    }),
    priorityDistribution: protectedProcedure.query(async ({ ctx }) => {
      return getPriorityDistribution(ctx.user.id);
    }),
    reprioritize: protectedProcedure.mutation(async ({ ctx }) => {
      console.log(`[Reprioritize] Starting for user ${ctx.user.id}`);
      const pendingTasks = await getPendingTasksForReprioritization(ctx.user.id);
      let updated = 0;
      let failed = 0;
      for (const task of pendingTasks) {
        try {
          const escalation = computeEscalation({
            dueDate: task.dueDate,
            createdAt: task.createdAt,
            status: task.status,
            urgencyScore: task.urgencyScore,
            escalationLevel: task.escalationLevel
          });
          const scoring = await scoreTaskUrgency(
            task.title,
            task.description || "",
            task.dueDate ? task.dueDate.toISOString().split("T")[0] : null,
            task.category || "other",
            task.createdAt.toISOString().split("T")[0]
          );
          const finalUrgency = Math.min(10, scoring.urgencyScore + escalation.urgencyBoost);
          const finalPriorityScore = finalUrgency * 0.6 + scoring.importanceScore * 0.4;
          const finalQuadrant = finalUrgency >= 6 && scoring.importanceScore >= 6 ? "do_first" : finalUrgency < 6 && scoring.importanceScore >= 6 ? "schedule" : finalUrgency >= 6 && scoring.importanceScore < 6 ? "delegate" : "archive";
          await updateTaskUrgency(task.id, ctx.user.id, {
            urgencyScore: finalUrgency,
            importanceScore: scoring.importanceScore,
            priorityScore: Math.round(finalPriorityScore * 10),
            quadrant: finalQuadrant,
            escalationLevel: escalation.newEscalationLevel,
            suggestedAction: scoring.suggestedAction,
            isOverdue: escalation.isOverdue
          });
          updated++;
          if (updated % 10 === 0) console.log(`[Reprioritize] Progress: ${updated}/${pendingTasks.length}`);
        } catch (err) {
          console.error(`[Reprioritize] Failed for task ${task.id}:`, err);
          failed++;
        }
      }
      console.log(`[Reprioritize] Complete: ${updated} updated, ${failed} failed`);
      return { total: pendingTasks.length, updated, failed };
    }),
    snooze: protectedProcedure.input(z2.object({ taskId: z2.number(), hours: z2.number().default(24) })).mutation(async ({ ctx, input }) => {
      const until = new Date(Date.now() + input.hours * 60 * 60 * 1e3);
      await snoozeTask(input.taskId, ctx.user.id, until);
      return { success: true, snoozedUntil: until };
    }),
    create: protectedProcedure.input(z2.object({
      title: z2.string(),
      description: z2.string().optional(),
      priority: z2.enum(["low", "medium", "high", "urgent"]).default("medium"),
      category: z2.string().optional(),
      dueDate: z2.number().optional(),
      source: z2.enum(["email", "whatsapp", "manual"]).default("manual")
    })).mutation(async ({ ctx, input }) => {
      const taskId = await insertTask({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        category: input.category,
        dueDate: input.dueDate ? new Date(input.dueDate) : void 0,
        source: input.source
      });
      return { taskId };
    }),
    updateStatus: protectedProcedure.input(z2.object({
      taskId: z2.number(),
      status: z2.enum(["pending", "in_progress", "completed", "dismissed"])
    })).mutation(async ({ ctx, input }) => {
      await updateTaskStatus(input.taskId, ctx.user.id, input.status);
      await touchTaskActivity(input.taskId, ctx.user.id);
      return { success: true };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getTaskStats(ctx.user.id);
    }),
    // ===== AUTO-ARCHIVE FEATURE =====
    autoArchiveStats: protectedProcedure.input(z2.object({ daysInactive: z2.number().min(1).max(365).default(30) }).optional()).query(async ({ ctx, input }) => {
      const days = input?.daysInactive || 30;
      return getAutoArchiveStats(ctx.user.id, days);
    }),
    autoArchivePreview: protectedProcedure.input(z2.object({ daysInactive: z2.number().min(1).max(365).default(30) }).optional()).query(async ({ ctx, input }) => {
      const days = input?.daysInactive || 30;
      const staleTasks = await getStaleArchiveTasks(ctx.user.id, days);
      return staleTasks.map((t2) => ({
        id: t2.id,
        title: t2.title,
        category: t2.category,
        lastActivityAt: t2.lastActivityAt,
        createdAt: t2.createdAt,
        quadrant: t2.quadrant,
        urgencyScore: t2.urgencyScore,
        importanceScore: t2.importanceScore
      }));
    }),
    autoArchiveRun: protectedProcedure.input(z2.object({ daysInactive: z2.number().min(1).max(365).default(30) }).optional()).mutation(async ({ ctx, input }) => {
      const days = input?.daysInactive || 30;
      const staleTasks = await getStaleArchiveTasks(ctx.user.id, days);
      if (staleTasks.length === 0) return { archived: 0, taskIds: [] };
      const taskIds = staleTasks.map((t2) => t2.id);
      const count = await autoArchiveTasks(taskIds, ctx.user.id);
      console.log(`[AutoArchive] Dismissed ${count} stale archive tasks for user ${ctx.user.id} (${days}-day threshold)`);
      return { archived: count, taskIds };
    }),
    touchActivity: protectedProcedure.input(z2.object({ taskId: z2.number() })).mutation(async ({ ctx, input }) => {
      await touchTaskActivity(input.taskId, ctx.user.id);
      return { success: true };
    }),
    // ===== CATEGORY REASSIGNMENT =====
    updateCategory: protectedProcedure.input(z2.object({
      taskId: z2.number(),
      category: z2.string().min(1).max(100)
    })).mutation(async ({ ctx, input }) => {
      await updateTaskCategory(input.taskId, ctx.user.id, input.category);
      await touchTaskActivity(input.taskId, ctx.user.id);
      console.log(`[CategoryUpdate] Task ${input.taskId} \u2192 "${input.category}" by user ${ctx.user.id}`);
      return { success: true, category: input.category };
    }),
    // ===== EMAIL LINK =====
    getEmailId: protectedProcedure.input(z2.object({ taskId: z2.number() })).query(async ({ ctx, input }) => {
      const emailId = await getTaskEmailId(input.taskId, ctx.user.id);
      return { emailId };
    }),
    // ===== AI CATEGORY SUGGESTIONS =====
    acceptSuggestion: protectedProcedure.input(z2.object({ taskId: z2.number() })).mutation(async ({ ctx, input }) => {
      await acceptTaskSuggestion(input.taskId, ctx.user.id);
      console.log(`[Suggestion] Accepted for task ${input.taskId} by user ${ctx.user.id}`);
      return { success: true };
    }),
    rejectSuggestion: protectedProcedure.input(z2.object({ taskId: z2.number() })).mutation(async ({ ctx, input }) => {
      await rejectTaskSuggestion(input.taskId, ctx.user.id);
      console.log(`[Suggestion] Rejected for task ${input.taskId} by user ${ctx.user.id}`);
      return { success: true };
    }),
    suggestionStats: protectedProcedure.query(async ({ ctx }) => {
      return getSuggestionStats(ctx.user.id);
    })
  }),
  // ===== INVOICE DASHBOARD =====
  invoice: router({
    // List all invoice emails (classified as invoice or matching keywords)
    listEmails: protectedProcedure.query(async ({ ctx }) => {
      return getInvoiceEmails(ctx.user.id);
    }),
    // List all extracted invoice details (with attachments for PDF links)
    list: protectedProcedure.query(async ({ ctx }) => {
      const invoices = await getInvoiceDetailsByUser(ctx.user.id);
      const emailIds = Array.from(new Set(invoices.map((i) => i.emailId).filter(Boolean)));
      const allAttachments = emailIds.length > 0 ? await getAttachmentsByEmails(emailIds) : [];
      const attachmentMap = /* @__PURE__ */ new Map();
      for (const att of allAttachments) {
        const list = attachmentMap.get(att.emailId) || [];
        list.push(att);
        attachmentMap.set(att.emailId, list);
      }
      return invoices.map((inv) => ({
        ...inv,
        attachments: attachmentMap.get(inv.emailId) || []
      }));
    }),
    // Get stats
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getInvoiceStats(ctx.user.id);
    }),
    // Extract invoice details from a specific email using AI
    extract: protectedProcedure.input(z2.object({ emailId: z2.number() })).mutation(async ({ ctx, input }) => {
      const existing = await getInvoiceDetailByEmailId(input.emailId);
      if (existing) return { invoiceId: existing.id, alreadyExtracted: true };
      const email = await getEmailById(input.emailId, ctx.user.id);
      if (!email) throw new Error("Email not found");
      const attachments = await getAttachmentsByEmail(input.emailId);
      const attachmentUrls = attachments.filter((a) => a.mimeType === "application/pdf" || a.mimeType.startsWith("image/") || a.filename.toLowerCase().endsWith(".pdf")).map((a) => ({
        url: a.s3Url,
        mimeType: a.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : a.mimeType,
        filename: a.filename
      }));
      console.log(`[Invoice] Extracting email ${input.emailId} with ${attachmentUrls.length} attachments:`, attachmentUrls.map((a) => `${a.filename} (${a.mimeType})`).join(", ") || "none");
      const extraction = await extractInvoiceDetails(
        email.subject || "(No subject)",
        email.body || email.bodyHtml || "(No body)",
        email.fromAddress || "unknown",
        email.fromName || "Unknown",
        attachmentUrls.length > 0 ? attachmentUrls : void 0
      );
      const linkedTasks = await getTasksByEmailId(input.emailId, ctx.user.id);
      const taskId = linkedTasks.length > 0 ? linkedTasks[0].id : null;
      const result = await insertInvoiceDetail({
        userId: ctx.user.id,
        emailId: input.emailId,
        taskId,
        supplier: extraction.supplier,
        invoiceNumber: extraction.invoiceNumber,
        amount: extraction.amount,
        currency: extraction.currency,
        paymentDate: extraction.paymentDate,
        dueDate: extraction.dueDate,
        products: extraction.products,
        lineItems: extraction.lineItems,
        invoiceType: extraction.invoiceType || "unknown",
        rawExtraction: extraction
      });
      console.log(`[Invoice] Extracted details for email ${input.emailId}: ${extraction.supplier} ${extraction.amount} ${extraction.currency}`);
      return { invoiceId: result?.id, alreadyExtracted: false, extraction };
    }),
    // Batch extract: process multiple invoice emails at once (5 at a time)
    extractBatch: protectedProcedure.mutation(async ({ ctx }) => {
      const invoiceEmails = await getInvoiceEmails(ctx.user.id);
      let processed = 0;
      let skipped = 0;
      let failed = 0;
      for (const email of invoiceEmails.slice(0, 5)) {
        try {
          const existing = await getInvoiceDetailByEmailId(email.id);
          if (existing) {
            const hasNAData = existing.amount === "N/A" && existing.dueDate === "N/A" && existing.products === "N/A";
            const attachments2 = await getAttachmentsByEmail(email.id);
            const hasPdfAttachments = attachments2.some((a) => a.mimeType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf"));
            if (hasNAData && hasPdfAttachments) {
              console.log(`[Invoice] Re-extracting email ${email.id} \u2014 previous extraction had N/A values but PDF attachments are now available`);
              const database = await getDb();
              if (database) {
                const { invoiceDetails: invTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
                const { eq: eq3 } = await import("drizzle-orm");
                await database.delete(invTable).where(eq3(invTable.id, existing.id));
              }
            } else {
              skipped++;
              continue;
            }
          }
          const attachments = await getAttachmentsByEmail(email.id);
          const attachmentUrls = attachments.filter((a) => a.mimeType === "application/pdf" || a.mimeType.startsWith("image/") || a.filename.toLowerCase().endsWith(".pdf")).map((a) => ({
            url: a.s3Url,
            mimeType: a.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : a.mimeType,
            filename: a.filename
          }));
          console.log(`[Invoice] Batch extracting email ${email.id} with ${attachmentUrls.length} attachments:`, attachmentUrls.map((a) => `${a.filename} (${a.mimeType})`).join(", ") || "none");
          const extraction = await extractInvoiceDetails(
            email.subject || "(No subject)",
            email.body || email.bodyHtml || "(No body)",
            email.fromAddress || "unknown",
            email.fromName || "Unknown",
            attachmentUrls.length > 0 ? attachmentUrls : void 0
          );
          const linkedTasks = await getTasksByEmailId(email.id, ctx.user.id);
          const taskId = linkedTasks.length > 0 ? linkedTasks[0].id : null;
          await insertInvoiceDetail({
            userId: ctx.user.id,
            emailId: email.id,
            taskId,
            supplier: extraction.supplier,
            invoiceNumber: extraction.invoiceNumber,
            amount: extraction.amount,
            currency: extraction.currency,
            paymentDate: extraction.paymentDate,
            dueDate: extraction.dueDate,
            products: extraction.products,
            lineItems: extraction.lineItems,
            invoiceType: extraction.invoiceType || "unknown",
            rawExtraction: extraction
          });
          processed++;
        } catch (err) {
          console.error(`[Invoice] Failed to extract email ${email.id}:`, err.message);
          failed++;
        }
      }
      console.log(`[Invoice] Batch: ${processed} extracted, ${skipped} skipped, ${failed} failed`);
      return { processed, skipped, failed, totalInvoiceEmails: invoiceEmails.length };
    }),
    // Count how many invoice emails still need extraction
    pendingCount: protectedProcedure.query(async ({ ctx }) => {
      const invoiceEmails = await getInvoiceEmails(ctx.user.id);
      let needExtraction = 0;
      let needReExtraction = 0;
      for (const email of invoiceEmails) {
        const existing = await getInvoiceDetailByEmailId(email.id);
        if (!existing) {
          needExtraction++;
        } else {
          const hasNAData = existing.amount === "N/A" && existing.dueDate === "N/A" && existing.products === "N/A";
          if (hasNAData) {
            const attachments = await getAttachmentsByEmail(email.id);
            const hasPdf = attachments.some((a) => a.mimeType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf"));
            if (hasPdf) needReExtraction++;
          }
        }
      }
      return { total: invoiceEmails.length, needExtraction: needExtraction + needReExtraction, needReExtraction };
    }),
    // Resync attachments: re-fetch invoice emails from IMAP to download PDF attachments
    resyncAttachments: protectedProcedure.mutation(async ({ ctx }) => {
      const account = await getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured.");
      const invoiceEmails = await getInvoiceEmails(ctx.user.id);
      let uploaded = 0;
      let skipped = 0;
      let failed = 0;
      for (const email of invoiceEmails.slice(0, 10)) {
        try {
          const existing = await getAttachmentsByEmail(email.id);
          if (existing.length > 0) {
            skipped++;
            continue;
          }
          if (!email.messageId) {
            skipped++;
            continue;
          }
          const attachments = await fetchAttachmentsForEmail(account, email.messageId);
          if (attachments.length === 0) {
            skipped++;
            continue;
          }
          for (const att of attachments) {
            const suffix = Math.random().toString(36).substring(2, 8);
            const s3Key = `attachments/${ctx.user.id}/${email.id}/${suffix}-${att.filename}`;
            const { url } = await storagePut(s3Key, att.content, att.mimeType);
            await insertEmailAttachment({
              emailId: email.id,
              userId: ctx.user.id,
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
              s3Key,
              s3Url: url
            });
            console.log(`[Attachments] Uploaded: ${att.filename} (${att.size} bytes) for email ${email.id}`);
          }
          uploaded++;
        } catch (err) {
          console.error(`[Attachments] Failed for email ${email.id}:`, err.message);
          failed++;
        }
      }
      return { uploaded, skipped, failed, total: invoiceEmails.length };
    }),
    // Delete an extraction so it can be re-processed (e.g., after attachments are available)
    deleteExtraction: protectedProcedure.input(z2.object({ invoiceId: z2.number() })).mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const { invoiceDetails: invTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq3, and: and2 } = await import("drizzle-orm");
      await database.delete(invTable).where(
        and2(eq3(invTable.id, input.invoiceId), eq3(invTable.userId, ctx.user.id))
      );
      return { success: true };
    }),
    // Delete ALL extractions so they can be re-processed with PDF content
    deleteAllExtractions: protectedProcedure.mutation(async ({ ctx }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const { invoiceDetails: invTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq3 } = await import("drizzle-orm");
      const result = await database.delete(invTable).where(eq3(invTable.userId, ctx.user.id));
      return { deleted: result[0]?.affectedRows || 0 };
    }),
    // Get attachments for an email
    attachments: protectedProcedure.input(z2.object({ emailId: z2.number() })).query(async ({ ctx, input }) => {
      return getAttachmentsByEmail(input.emailId);
    }),
    // Update invoice status
    updateStatus: protectedProcedure.input(z2.object({
      invoiceId: z2.number(),
      status: z2.enum(["pending", "reviewed", "sent_to_economic", "paid", "rejected"])
    })).mutation(async ({ ctx, input }) => {
      await updateInvoiceStatus(input.invoiceId, input.status);
      console.log(`[Invoice] Status updated: ${input.invoiceId} \u2192 ${input.status}`);
      return { success: true };
    }),
    // Send to e-conomic (placeholder — will use real API when configured)
    sendToEconomic: protectedProcedure.input(z2.object({ invoiceId: z2.number() })).mutation(async ({ ctx, input }) => {
      const invoices = await getInvoiceDetailsByUser(ctx.user.id);
      const invoice = invoices.find((i) => i.id === input.invoiceId);
      if (!invoice) throw new Error("Invoice not found");
      const supplier = await getSupplierByName(ctx.user.id, invoice.supplier);
      if (!supplier || !supplier.isConfigured) {
        throw new Error(`e-conomic not configured for supplier "${invoice.supplier}". Please configure it in Supplier Settings.`);
      }
      await updateInvoiceStatus(input.invoiceId, "sent_to_economic", {
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        endpoint: supplier.eEconomicEndpoint,
        note: "Placeholder \u2014 actual API integration pending"
      });
      console.log(`[Invoice] Sent to e-conomic: ${invoice.supplier} #${invoice.invoiceNumber} \u2192 ${supplier.eEconomicEndpoint}`);
      return { success: true, supplier: invoice.supplier };
    }),
    // ===== SUPPLIER SETTINGS =====
    suppliers: protectedProcedure.query(async ({ ctx }) => {
      return getSupplierSettings(ctx.user.id);
    }),
    upsertSupplier: protectedProcedure.input(z2.object({
      supplierName: z2.string().min(1),
      supplierEmail: z2.string().optional(),
      eEconomicEndpoint: z2.string().optional(),
      eEconomicApiKey: z2.string().optional(),
      eEconomicAgreement: z2.string().optional(),
      isConfigured: z2.boolean().default(false)
    })).mutation(async ({ ctx, input }) => {
      await upsertSupplierSetting({
        userId: ctx.user.id,
        ...input
      });
      console.log(`[Supplier] Upserted: ${input.supplierName} (configured: ${input.isConfigured})`);
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authService.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/whatsappWebhook.ts
import { Router } from "express";
init_schema();
import { eq as eq2 } from "drizzle-orm";
var whatsappWebhookRouter = Router();
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
whatsappWebhookRouter.post("/", async (req, res) => {
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
async function processWhatsAppMessage(msg) {
  const db = await getDb();
  if (!db) {
    console.error("[WhatsApp] Database not available");
    return;
  }
  try {
    const existing = await db.select({ id: whatsappMessages.id }).from(whatsappMessages).where(eq2(whatsappMessages.waMessageId, msg.waMessageId)).limit(1);
    if (existing.length > 0) {
      console.log("[WhatsApp] Duplicate message, skipping:", msg.waMessageId);
      return;
    }
    const employeeResult = await db.select().from(employees).where(eq2(employees.phone, msg.senderPhone)).limit(1);
    const employee = employeeResult[0];
    const displayName = employee?.name || msg.senderName;
    const insertResult = await db.insert(whatsappMessages).values({
      userId: 1,
      waMessageId: msg.waMessageId,
      senderPhone: msg.senderPhone,
      senderName: displayName,
      messageType: msg.messageType,
      messageText: msg.messageText,
      isProcessed: false,
      receivedAt: msg.timestamp
    }).returning({ id: whatsappMessages.id });
    const messageDbId = insertResult[0].id;
    console.log(`[WhatsApp] Saved message ${msg.waMessageId} from ${displayName} (${msg.senderPhone})`);
    let classification = null;
    try {
      classification = await classifyWhatsAppMessage(msg.messageText, displayName, employee?.role || void 0);
      console.log(`[WhatsApp] Classified as: ${classification.classification}`);
    } catch (err) {
      console.error("[WhatsApp] AI classification failed:", err);
    }
    const classValue = classification?.classification || "request";
    const aiSummary = classification?.summary || `Message from ${displayName}: ${msg.messageText.substring(0, 200)}`;
    await db.update(whatsappMessages).set({
      classification: classValue,
      aiSummary,
      aiAnalysis: classification || {},
      isProcessed: true
    }).where(eq2(whatsappMessages.id, messageDbId));
    const taskTitle = classification?.taskData?.title || `[WhatsApp] ${displayName}: ${msg.messageText.substring(0, 80)}`;
    const taskDescription = classification?.taskData?.description || `WhatsApp message from ${displayName} (${msg.senderPhone}):

${msg.messageText}`;
    const taskPriority = classification?.taskData?.priority || (classValue === "problem" ? "high" : "medium");
    const taskCategory = classification?.taskData?.category || (employee?.department || "general");
    const safeParseDueDate = (dateStr) => {
      if (!dateStr) return void 0;
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? void 0 : d;
      } catch {
        return void 0;
      }
    };
    await db.insert(tasks).values({
      userId: 1,
      emailId: null,
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority,
      status: "pending",
      dueDate: safeParseDueDate(classification?.taskData?.dueDate),
      category: taskCategory,
      source: "whatsapp",
      metadata: {
        whatsappMessageId: messageDbId,
        senderPhone: msg.senderPhone,
        senderName: displayName,
        waMessageId: msg.waMessageId,
        classification: classValue
      }
    });
    console.log(`[WhatsApp] Task created: ${taskTitle}`);
    try {
      const draftReplyText = await generateWhatsAppDraftReply(msg.messageText, displayName, classValue, aiSummary);
      await db.insert(whatsappDraftReplies).values({
        userId: 1,
        whatsappMessageId: messageDbId,
        replyText: draftReplyText,
        toPhone: msg.senderPhone,
        originalWaMessageId: msg.waMessageId,
        status: "pending"
      });
      console.log(`[WhatsApp] Draft reply generated for ${displayName}`);
    } catch (err) {
      console.error("[WhatsApp] Draft reply generation failed:", err);
    }
    await markWhatsAppMessageAsRead(msg.waMessageId);
  } catch (error) {
    console.error("[WhatsApp] Error processing message:", msg.waMessageId, error);
  }
}
async function generateWhatsAppDraftReply(messageText, senderName, classification, aiSummary) {
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
        content: `Draft a WhatsApp reply to this message from ${senderName}:

"${messageText}"

Write a professional, helpful reply.`
      }
    ]
  });
  return response.choices[0]?.message?.content || "Thank you for your message. I'll look into this and get back to you shortly.";
}

// server/_core/createApp.ts
function createApp() {
  const app2 = express();
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  app2.use("/api/webhook/whatsapp", whatsappWebhookRouter);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app2.get("/api/auth/google/callback", (req, res) => {
    const code = req.query.code;
    if (!code) {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }
    res.redirect(`/settings?google_code=${encodeURIComponent(code)}`);
  });
  app2.get("/api/health", async (_req, res) => {
    try {
      const db = await getDb();
      if (db) {
        res.status(200).json({
          ok: true,
          db: "connected",
          env: process.env.NODE_ENV ?? "unknown",
          hasDbUrl: !!process.env.DATABASE_URL
        });
      } else {
        res.status(503).json({
          ok: false,
          db: "disconnected",
          error: "Database connection failed",
          hasDbUrl: !!process.env.DATABASE_URL,
          env: process.env.NODE_ENV ?? "unknown"
        });
      }
    } catch (error) {
      res.status(503).json({
        ok: false,
        db: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        hasDbUrl: !!process.env.DATABASE_URL
      });
    }
  });
  return app2;
}

// server/vercel/entry.ts
var app = createApp();
var entry_default = app;
export {
  entry_default as default
};
