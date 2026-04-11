import { integer, serial, pgTable, text, timestamp, varchar, boolean, jsonb } from "drizzle-orm/pg-core";

/**
 * Postgres schema for ai-assistant-suite (Supabase-compatible).
 *
 * Notes on the MySQL → Postgres port:
 *   - serial() replaces int().autoincrement()
 *   - jsonb replaces json (faster + indexable in Postgres)
 *   - mysqlEnum is replaced with text().$type<"a" | "b">() — values are
 *     enforced at the TS layer rather than via a CHECK constraint, which
 *     keeps drizzle migrations simple.
 *   - timestamp().onUpdateNow() does not exist in pg-core. We use
 *     $onUpdate() which is evaluated by drizzle at write time.
 */

const updatedNow = () => new Date();

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const emailAccounts = pgTable("email_accounts", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = typeof emailAccounts.$inferInsert;

export const emails = pgTable("emails", {
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
  classification: text("classification").$type<"invoice" | "task" | "reminder" | "general" | "irrelevant">().default("general"),
  aiSummary: text("aiSummary"),
  aiAnalysis: jsonb("aiAnalysis"),
  isProcessed: boolean("isProcessed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

export const emailAttachments = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  emailId: integer("emailId").notNull(),
  userId: integer("userId").notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  size: integer("size").default(0),
  s3Key: varchar("s3Key", { length: 1000 }).notNull(),
  s3Url: varchar("s3Url", { length: 2000 }).notNull(),
  createdAt: timestamp("attachCreatedAt").defaultNow().notNull(),
});

export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = typeof emailAttachments.$inferInsert;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  emailId: integer("emailId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  priority: text("priority").$type<"low" | "medium" | "high" | "urgent">().default("medium").notNull(),
  status: text("status").$type<"pending" | "in_progress" | "completed" | "dismissed">().default("pending").notNull(),
  dueDate: timestamp("dueDate"),
  category: varchar("category", { length: 100 }),
  source: text("source").$type<"email" | "whatsapp" | "manual">().default("email").notNull(),
  metadata: jsonb("metadata"),
  urgencyScore: integer("urgencyScore").default(5),
  importanceScore: integer("importanceScore").default(5),
  priorityScore: integer("priorityScore").default(50),
  quadrant: text("quadrant").$type<"do_first" | "schedule" | "delegate" | "archive">().default("schedule"),
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const draftReplies = pgTable("draft_replies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  emailId: integer("emailId").notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  toAddress: varchar("toAddress", { length: 320 }).notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected" | "sent">().default("pending").notNull(),
  approvedAt: timestamp("approvedAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type DraftReply = typeof draftReplies.$inferSelect;
export type InsertDraftReply = typeof draftReplies.$inferInsert;

// ============================================================
// WhatsApp Integration Tables
// ============================================================

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  waMessageId: varchar("waMessageId", { length: 512 }).notNull().unique(),
  senderPhone: varchar("senderPhone", { length: 20 }).notNull(),
  senderName: varchar("senderName", { length: 255 }),
  messageType: varchar("messageType", { length: 50 }).notNull().default("text"),
  messageText: text("messageText"),
  classification: text("waClassification").$type<"problem" | "question" | "update" | "request">(),
  aiSummary: text("waAiSummary"),
  aiAnalysis: jsonb("waAiAnalysis"),
  isProcessed: boolean("waIsProcessed").default(false).notNull(),
  receivedAt: timestamp("waReceivedAt").notNull(),
  createdAt: timestamp("waCreatedAt").defaultNow().notNull(),
});

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = typeof whatsappMessages.$inferInsert;

export const whatsappDraftReplies = pgTable("whatsapp_draft_replies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  whatsappMessageId: integer("whatsappMessageId").notNull(),
  replyText: text("replyText").notNull(),
  toPhone: varchar("toPhone", { length: 20 }).notNull(),
  originalWaMessageId: varchar("originalWaMessageId", { length: 512 }),
  status: text("waReplyStatus").$type<"pending" | "approved" | "rejected" | "sent">().default("pending").notNull(),
  approvedAt: timestamp("waReplyApprovedAt"),
  sentAt: timestamp("waReplySentAt"),
  createdAt: timestamp("waReplyCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("waReplyUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type WhatsAppDraftReply = typeof whatsappDraftReplies.$inferSelect;
export type InsertWhatsAppDraftReply = typeof whatsappDraftReplies.$inferInsert;

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  name: varchar("empName", { length: 255 }).notNull(),
  role: varchar("empRole", { length: 100 }),
  department: varchar("department", { length: 100 }),
  isActive: boolean("empIsActive").default(true).notNull(),
  createdAt: timestamp("empCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("empUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ============================================================
// Invoice Dashboard Tables
// ============================================================

export const invoiceDetails = pgTable("invoice_details", {
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
  invoiceType: text("invoiceType").$type<"faktura" | "pbs" | "unknown">().default("unknown").notNull(),
  status: text("invoiceStatus").$type<"pending" | "reviewed" | "sent_to_economic" | "paid" | "rejected">().default("pending").notNull(),
  sentToEconomicAt: timestamp("sentToEconomicAt"),
  eEconomicResponse: jsonb("eEconomicResponse"),
  rawExtraction: jsonb("rawExtraction"),
  createdAt: timestamp("invCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("invUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type InvoiceDetail = typeof invoiceDetails.$inferSelect;
export type InsertInvoiceDetail = typeof invoiceDetails.$inferInsert;

export const supplierSettings = pgTable("supplier_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  supplierName: varchar("supplierName", { length: 500 }).notNull(),
  supplierEmail: varchar("supplierEmail", { length: 320 }),
  eEconomicEndpoint: varchar("eEconomicEndpoint", { length: 1000 }),
  eEconomicApiKey: varchar("eEconomicApiKey", { length: 500 }),
  eEconomicAgreement: varchar("eEconomicAgreement", { length: 500 }),
  isConfigured: boolean("isConfigured").default(false).notNull(),
  createdAt: timestamp("ssCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("ssUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type SupplierSetting = typeof supplierSettings.$inferSelect;
export type InsertSupplierSetting = typeof supplierSettings.$inferInsert;

export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // "google"
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  scope: text("scope"),
  email: varchar("tokenEmail", { length: 320 }),
  createdAt: timestamp("oaCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("oaUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = typeof oauthTokens.$inferInsert;
