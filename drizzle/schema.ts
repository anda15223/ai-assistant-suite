import { integer, serial, pgTable, text, timestamp, varchar, boolean, jsonb, numeric, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

// ============================================================
// Festival Brain Tables — Shadow Mode Learning System
// ============================================================

export const brainLessons = pgTable("brain_lessons", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("blCreatedAt").defaultNow().notNull(),

  // Source context
  festivalSlug: varchar("festivalSlug", { length: 100 }).notNull(),
  concept: varchar("blConcept", { length: 100 }),
  dayNumber: integer("dayNumber"),
  source: text("blSource").$type<"you_said" | "file_change" | "sales_data" | "debrief" | "post_festival">().notNull(),
  rawInput: text("rawInput").notNull(),

  // The extracted rule
  category: text("blCategory").$type<"order" | "staff" | "logistics" | "timing" | "finance" | "ops" | "safety" | "quality">().notNull(),
  rule: text("blRule").notNull(),
  ruleCondition: text("ruleCondition"),
  confidence: integer("confidence").default(60).notNull(),

  // Numbers
  forecastValue: numeric("forecastValue"),
  actualValue: numeric("actualValue"),
  deviationPct: numeric("deviationPct"),

  // Action
  actionNextTime: text("actionNextTime").notNull(),

  // Usage tracking
  timesApplied: integer("timesApplied").default(0).notNull(),
  timesCorrect: integer("timesCorrect").default(0).notNull(),

  // Human override
  humanOverridden: boolean("humanOverridden").default(false).notNull(),
  overrideReason: text("overrideReason"),
});

export type BrainLesson = typeof brainLessons.$inferSelect;
export type InsertBrainLesson = typeof brainLessons.$inferInsert;

export const brainAgentLog = pgTable("brain_agent_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("balTimestamp").defaultNow().notNull(),
  agent: varchar("agent", { length: 100 }).notNull(),
  model: varchar("balModel", { length: 100 }),
  festivalSlug: varchar("balFestivalSlug", { length: 100 }),
  action: text("balAction").notNull(),
  inputSummary: text("inputSummary"),
  outputSummary: text("outputSummary"),
  lessonsUsed: jsonb("lessonsUsed").$type<number[]>(),
  tokensUsed: integer("tokensUsed"),
  durationMs: integer("durationMs"),
  success: boolean("balSuccess").default(true).notNull(),
  humanApproved: boolean("humanApproved"),
  humanChangedOutput: boolean("humanChangedOutput"),
  changeReason: text("changeReason"),
});

export type BrainAgentLog = typeof brainAgentLog.$inferSelect;
export type InsertBrainAgentLog = typeof brainAgentLog.$inferInsert;

export const brainChatMessages = pgTable("brain_chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("bcmUserId").notNull(),
  festivalSlug: varchar("bcmFestivalSlug", { length: 100 }).notNull(),
  role: text("bcmRole").$type<"user" | "brain">().notNull(),
  content: text("bcmContent").notNull(),
  lessonsExtracted: jsonb("lessonsExtracted").$type<number[]>(),
  createdAt: timestamp("bcmCreatedAt").defaultNow().notNull(),
});

export type BrainChatMessage = typeof brainChatMessages.$inferSelect;
export type InsertBrainChatMessage = typeof brainChatMessages.$inferInsert;

export const brainPlaybooks = pgTable("brain_playbooks", {
  id: serial("id").primaryKey(),
  sourceFestivalSlug: varchar("sourceFestivalSlug", { length: 100 }).notNull(),
  targetFestivalSlug: varchar("targetFestivalSlug", { length: 100 }),
  playbook: jsonb("playbook").notNull(),
  lessonsCount: integer("lessonsCount").default(0).notNull(),
  avgConfidence: integer("avgConfidence").default(0).notNull(),
  createdAt: timestamp("bpCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("bpUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type BrainPlaybook = typeof brainPlaybooks.$inferSelect;
export type InsertBrainPlaybook = typeof brainPlaybooks.$inferInsert;

// ============================================================
// Team & Task Management Tables
// ============================================================

export const orgTeam = pgTable("org_team", {
  id: serial("id").primaryKey(),
  email: varchar("otEmail", { length: 320 }).notNull().unique(),
  name: varchar("otName", { length: 255 }).notNull(),
  role: text("otRole").$type<"owner" | "manager" | "coordinator">().notNull(),
  avatarUrl: text("avatarUrl"),
  invitedBy: integer("invitedBy"),
  invitedAt: timestamp("invitedAt"),
  joinedAt: timestamp("joinedAt"),
  lastActive: timestamp("lastActive"),
  isActive: boolean("otIsActive").default(true).notNull(),
  createdAt: timestamp("otCreatedAt").defaultNow().notNull(),
});

export type OrgTeam = typeof orgTeam.$inferSelect;
export type InsertOrgTeam = typeof orgTeam.$inferInsert;

export const orgTeamFestivals = pgTable("org_team_festivals", {
  id: serial("id").primaryKey(),
  teamMemberId: integer("teamMemberId").notNull(),
  festivalSlug: varchar("otfFestivalSlug", { length: 100 }).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export type OrgTeamFestival = typeof orgTeamFestivals.$inferSelect;
export type InsertOrgTeamFestival = typeof orgTeamFestivals.$inferInsert;

export const festivalTasks = pgTable("festival_tasks", {
  id: serial("id").primaryKey(),
  festivalSlug: varchar("ftFestivalSlug", { length: 100 }).notNull(),
  conceptName: varchar("conceptName", { length: 100 }),
  title: varchar("ftTitle", { length: 500 }).notNull(),
  description: text("ftDescription"),
  category: text("ftCategory").$type<"contracts" | "logistics" | "staff" | "orders" | "setup" | "ops" | "finance">(),
  priority: text("ftPriority").$type<"critical" | "high" | "medium" | "low">().default("medium").notNull(),
  status: text("ftStatus").$type<"todo" | "in_progress" | "done">().default("todo").notNull(),
  assignedTo: integer("assignedTo"),
  createdBy: integer("createdBy"),
  dueDate: timestamp("ftDueDate"),
  completedAt: timestamp("completedAt"),
  phase: integer("phase"),
  createdAt: timestamp("ftCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("ftUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type FestivalTask = typeof festivalTasks.$inferSelect;
export type InsertFestivalTask = typeof festivalTasks.$inferInsert;

export const taskActivity = pgTable("task_activity", {
  id: serial("id").primaryKey(),
  taskId: integer("taTaskId").notNull(),
  userId: integer("taUserId").notNull(),
  type: text("taType").$type<"comment" | "file_upload" | "status_change" | "assignment">().notNull(),
  content: text("taContent"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 500 }),
  createdAt: timestamp("taCreatedAt").defaultNow().notNull(),
});

export type TaskActivity = typeof taskActivity.$inferSelect;
export type InsertTaskActivity = typeof taskActivity.$inferInsert;

export const inviteTokens = pgTable("invite_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("itEmail", { length: 320 }).notNull(),
  role: text("itRole").$type<"manager" | "coordinator">().notNull(),
  invitedBy: integer("itInvitedBy").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  festivalSlugs: jsonb("festivalSlugs").$type<string[]>(),
  createdAt: timestamp("itCreatedAt").defaultNow().notNull(),
});

export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = typeof inviteTokens.$inferInsert;
