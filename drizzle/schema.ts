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

// ============================================================
// Festival Planner — structured per-festival Operations Plan.
//
// Schema-driven: `plan_sections` + `plan_questions` define the master form,
// and `plan_answers` stores scalar answers per festival. First-class sub-tables
// (concepts, staff, vagtplan shifts, action items, vehicles, accommodation,
// BC trolleys) hold the structured records that aren't simple scalars.
//
// `orgId` is inert single-tenant scaffolding today — every row gets org 1
// (the seeded Fidibus Team org). When multi-tenant becomes real, app-layer
// scoping drops into the tRPC middleware and the column already exists.
// ============================================================

export const planOrgs = pgTable("plan_orgs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlanOrg = typeof planOrgs.$inferSelect;
export type InsertPlanOrg = typeof planOrgs.$inferInsert;

export const planFestivals = pgTable("plan_festivals", {
  id: serial("id").primaryKey(),
  orgId: integer("orgId").notNull().default(1),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  location: text("location"),
  organiserName: varchar("organiserName", { length: 255 }),
  organiserPhone: varchar("organiserPhone", { length: 64 }),
  organiserEmail: varchar("organiserEmail", { length: 320 }),
  status: text("status").$type<"planning" | "active" | "complete">().default("planning").notNull(),
  driveFolderId: varchar("driveFolderId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type PlanFestival = typeof planFestivals.$inferSelect;
export type InsertPlanFestival = typeof planFestivals.$inferInsert;

export const planSections = pgTable("plan_sections", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: integer("orderIndex").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  subEditorRoute: varchar("subEditorRoute", { length: 255 }),
});

export type PlanSection = typeof planSections.$inferSelect;
export type InsertPlanSection = typeof planSections.$inferInsert;

export const planQuestions = pgTable("plan_questions", {
  id: serial("id").primaryKey(),
  sectionId: integer("sectionId").notNull(),
  key: varchar("key", { length: 128 }).notNull(),
  prompt: text("prompt").notNull(),
  kind: text("kind").$type<"single_select" | "multi_select" | "text" | "number" | "date" | "datetime">().notNull(),
  options: jsonb("options").$type<{ label: string; value: string }[]>(),
  helpText: text("helpText"),
  required: boolean("required").default(false).notNull(),
  orderIndex: integer("orderIndex").notNull(),
});

export type PlanQuestion = typeof planQuestions.$inferSelect;
export type InsertPlanQuestion = typeof planQuestions.$inferInsert;

export const planAnswers = pgTable("plan_answers", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  questionId: integer("questionId").notNull(),
  value: jsonb("value").notNull(),
  valueType: text("valueType").$type<"single_select" | "multi_select" | "text" | "number" | "date" | "datetime">().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type PlanAnswer = typeof planAnswers.$inferSelect;
export type InsertPlanAnswer = typeof planAnswers.$inferInsert;

export const planConcepts = pgTable("plan_concepts", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  zone: text("zone").$type<"INSIDE" | "CAMPING">().notNull(),
  salesHoursThu: varchar("salesHoursThu", { length: 64 }),
  salesHoursFri: varchar("salesHoursFri", { length: 64 }),
  salesHoursSat: varchar("salesHoursSat", { length: 64 }),
  salesHoursSun: varchar("salesHoursSun", { length: 64 }),
  powerBaseline: varchar("powerBaseline", { length: 64 }),
  powerExtras: jsonb("powerExtras").$type<{ amperage: string; count: number; phase: string | null; notes: string }[]>(),
  gasRequired: boolean("gasRequired").default(false).notNull(),
  gasSupplier: varchar("gasSupplier", { length: 255 }),
  wristbandMax: integer("wristbandMax"),
  wristbandBlackPartout: integer("wristbandBlackPartout"),
  wristbandNormalPartout: integer("wristbandNormalPartout"),
  tentSize: varchar("tentSize", { length: 128 }),
  productsSold: text("productsSold"),
  orderIndex: integer("orderIndex").notNull(),
});

export type PlanConcept = typeof planConcepts.$inferSelect;
export type InsertPlanConcept = typeof planConcepts.$inferInsert;

// plan_staff is a 1:1 row-to-SLOT table, not row-to-PERSON. A named Søborg
// can appear once (e.g. Fif as a manager row) while the 19 concept shift
// slots are separately modelled as unnamed placeholder rows. To count unique
// Søborg humans, query `SELECT COUNT(DISTINCT name) WHERE source = 'soborg'
// AND name IS NOT NULL` plus the unnamed-slot count — not `COUNT(*)`.
export const planStaff = pgTable("plan_staff", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  conceptId: integer("conceptId"),
  name: varchar("name", { length: 255 }),
  source: text("source").$type<"soborg" | "local">().notNull(),
  role: varchar("role", { length: 255 }),
  isManager: boolean("isManager").default(false).notNull(),
  isSetupCrew: boolean("isSetupCrew").default(false).notNull(),
  wristbandType: text("wristbandType").$type<"black_partout" | "normal_partout" | "day">(),
});

export type PlanStaff = typeof planStaff.$inferSelect;
export type InsertPlanStaff = typeof planStaff.$inferInsert;

export const planVagtplanShifts = pgTable("plan_vagtplan_shifts", {
  id: serial("id").primaryKey(),
  conceptId: integer("conceptId").notNull(),
  day: timestamp("day").notNull(),
  shiftName: varchar("shiftName", { length: 64 }).notNull(),
  startTime: varchar("startTime", { length: 8 }).notNull(),
  endTime: varchar("endTime", { length: 8 }).notNull(),
  peopleCount: integer("peopleCount").notNull(),
  notes: text("notes"),
  orderIndex: integer("orderIndex").notNull(),
});

export type PlanVagtplanShift = typeof planVagtplanShifts.$inferSelect;
export type InsertPlanVagtplanShift = typeof planVagtplanShifts.$inferInsert;

export const planActionItems = pgTable("plan_action_items", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  sectionKey: varchar("sectionKey", { length: 64 }),
  title: text("title").notNull(),
  deadline: timestamp("deadline"),
  status: text("status").$type<"open" | "in_progress" | "done" | "blocked">().default("open").notNull(),
  priority: text("priority").$type<"low" | "normal" | "high" | "hard_deadline">().default("normal").notNull(),
  owner: varchar("owner", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlanActionItem = typeof planActionItems.$inferSelect;
export type InsertPlanActionItem = typeof planActionItems.$inferInsert;

export const planVehicles = pgTable("plan_vehicles", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  vehicleType: text("vehicleType").$type<"lift" | "iveco" | "van" | "own" | "duster">().notNull(),
  status: text("status").$type<"booked" | "to_book" | "owned">().notNull(),
  driver: varchar("driver", { length: 255 }),
  purpose: text("purpose"),
  travelDate: timestamp("travelDate"),
  seats: integer("seats"),
});

export type PlanVehicle = typeof planVehicles.$inferSelect;
export type InsertPlanVehicle = typeof planVehicles.$inferInsert;

export const planAccommodation = pgTable("plan_accommodation", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  status: text("status").$type<"booked" | "to_book">().notNull(),
  checkIn: timestamp("checkIn"),
  checkOut: timestamp("checkOut"),
  peopleCount: integer("peopleCount"),
  roomConfig: varchar("roomConfig", { length: 255 }),
  notes: text("notes"),
});

export type PlanAccommodation = typeof planAccommodation.$inferSelect;
export type InsertPlanAccommodation = typeof planAccommodation.$inferInsert;

export const planBcTrolleys = pgTable("plan_bc_trolleys", {
  id: serial("id").primaryKey(),
  conceptId: integer("conceptId").notNull(),
  trolleyNumber: integer("trolleyNumber").notNull(),
  label: varchar("label", { length: 128 }).notNull(),
});

export type PlanBcTrolley = typeof planBcTrolleys.$inferSelect;
export type InsertPlanBcTrolley = typeof planBcTrolleys.$inferInsert;

export const planBcTrolleyItems = pgTable("plan_bc_trolley_items", {
  id: serial("id").primaryKey(),
  trolleyId: integer("trolleyId").notNull(),
  category: text("category").$type<"cooking_gear" | "serving_packaging" | "cleaning" | "stationery">().notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  quantity: varchar("quantity", { length: 64 }),
  orderIndex: integer("orderIndex").notNull(),
});

export type PlanBcTrolleyItem = typeof planBcTrolleyItems.$inferSelect;
export type InsertPlanBcTrolleyItem = typeof planBcTrolleyItems.$inferInsert;

// ============================================================
// SmartCard — reusable card primitive (Equipment List, Cooling,
// Cooking Equipment, Safety, Setup Timeline, Transportation, …).
// Each card belongs to a festival (and optionally a concept) and
// contains sections → lines, plus files, todos and a scoped chat.
// ============================================================

export const smartCards = pgTable("smart_cards", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  conceptId: integer("conceptId"),
  cardKey: varchar("cardKey", { length: 80 }).notNull(),
  title: varchar("title", { length: 255 }),
  meta: jsonb("scMeta").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("scCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("scUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type SmartCard = typeof smartCards.$inferSelect;
export type InsertSmartCard = typeof smartCards.$inferInsert;

export const smartSections = pgTable("smart_sections", {
  id: serial("id").primaryKey(),
  cardId: integer("cardId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: integer("orderIndex").default(0).notNull(),
  source: text("ssSource").$type<"manual" | "upload" | "brain" | "ai">().default("manual").notNull(),
  sourceFileId: integer("sourceFileId"),
  meta: jsonb("ssMeta").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("ssCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("ssUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type SmartSection = typeof smartSections.$inferSelect;
export type InsertSmartSection = typeof smartSections.$inferInsert;

export const smartLines = pgTable("smart_lines", {
  id: serial("id").primaryKey(),
  sectionId: integer("sectionId").notNull(),
  label: text("label"),
  value: text("value"),
  quantity: varchar("quantity", { length: 64 }),
  notes: text("notes"),
  status: varchar("status", { length: 32 }),
  owner: varchar("owner", { length: 128 }),
  dueDate: timestamp("dueDate", { mode: "date" }),
  orderIndex: integer("orderIndex").default(0).notNull(),
  source: text("slSource").$type<"manual" | "upload" | "brain" | "ai">().default("manual").notNull(),
  sourceFileId: integer("sourceFileId"),
  aiConfidence: numeric("aiConfidence"),
  meta: jsonb("slMeta").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("slCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("slUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type SmartLine = typeof smartLines.$inferSelect;
export type InsertSmartLine = typeof smartLines.$inferInsert;

export const smartFiles = pgTable("smart_files", {
  id: serial("id").primaryKey(),
  cardId: integer("cardId").notNull(),
  s3Key: text("s3Key").notNull(),
  url: text("url"),
  filename: varchar("filename", { length: 512 }),
  mimeType: varchar("mimeType", { length: 128 }),
  size: integer("size"),
  extractedText: text("extractedText"),
  aiSummary: text("aiSummary"),
  parseStatus: text("parseStatus").$type<"pending" | "processing" | "done" | "error">().default("pending").notNull(),
  parseError: text("parseError"),
  warnings: jsonb("warnings").$type<Array<{ field: string; message: string; severity: "error" | "warn" }>>().default(sql`'[]'::jsonb`).notNull(),
  meta: jsonb("sfMeta").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type SmartFile = typeof smartFiles.$inferSelect;
export type InsertSmartFile = typeof smartFiles.$inferInsert;

export const smartTodos = pgTable("smart_todos", {
  id: serial("id").primaryKey(),
  cardId: integer("cardId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("stDueDate", { mode: "date" }),
  owner: varchar("stOwner", { length: 128 }),
  status: text("stStatus").$type<"open" | "in_progress" | "done" | "blocked">().default("open").notNull(),
  source: text("stSource").$type<"manual" | "ai" | "brain">().default("manual").notNull(),
  relatedSectionId: integer("relatedSectionId"),
  relatedLineId: integer("relatedLineId"),
  orderIndex: integer("orderIndex").default(0).notNull(),
  meta: jsonb("stMeta").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("stCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("stUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type SmartTodo = typeof smartTodos.$inferSelect;
export type InsertSmartTodo = typeof smartTodos.$inferInsert;

export const smartChatMessages = pgTable("smart_chat_messages", {
  id: serial("id").primaryKey(),
  cardId: integer("cardId").notNull(),
  role: text("scmRole").$type<"user" | "assistant" | "tool">().notNull(),
  content: text("scmContent").notNull(),
  toolCalls: jsonb("toolCalls").$type<unknown[]>(),
  createdAt: timestamp("scmCreatedAt").defaultNow().notNull(),
});

export type SmartChatMessage = typeof smartChatMessages.$inferSelect;
export type InsertSmartChatMessage = typeof smartChatMessages.$inferInsert;

// ============================================================
// Brain entries — frequency-weighted knowledge keyed by festival
// and/or concept and/or card_key. Parallel to brain_lessons which
// stores operator-narrative lessons; this one stores structured
// reusable facts (equipment, suppliers, contacts, typical orders…).
// ============================================================

export const brainEntries = pgTable("brain_entries", {
  id: serial("id").primaryKey(),
  keyName: varchar("keyName", { length: 255 }).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  category: varchar("beCategory", { length: 80 }),
  source: text("beSource").$type<"ai_extraction" | "user_correction" | "manual" | "seed">().default("manual").notNull(),
  scope: text("beScope").$type<"global" | "festival" | "concept" | "section">().default("global").notNull(),
  festivalId: integer("beFestivalId"),
  lastSeenFestivalId: integer("lastSeenFestivalId"),
  subjectType: varchar("subjectType", { length: 80 }),
  subjectId: varchar("subjectId", { length: 128 }),
  content: text("beContent"),
  structuredData: jsonb("structuredData").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  tags: jsonb("beTags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  frequency: integer("frequency").default(1).notNull(),
  confidence: numeric("beConfidence").default("0.5").notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("beCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("beUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type BrainEntry = typeof brainEntries.$inferSelect;
export type InsertBrainEntry = typeof brainEntries.$inferInsert;

// ============================================================
// Festival contacts & extra details — side panels for intro section
// ============================================================

export const festivalContacts = pgTable("festival_contacts", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("fcRole", { length: 128 }),
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 320 }),
  notes: text("notes"),
  orderIndex: integer("orderIndex").default(0).notNull(),
  createdAt: timestamp("fcCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("fcUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type FestivalContact = typeof festivalContacts.$inferSelect;
export type InsertFestivalContact = typeof festivalContacts.$inferInsert;

export const festivalExtraDetails = pgTable("festival_extra_details", {
  id: serial("id").primaryKey(),
  festivalId: integer("festivalId").notNull(),
  label: varchar("label", { length: 255 }).default("").notNull(),
  value: text("value"),
  notes: text("notes"),
  orderIndex: integer("orderIndex").default(0).notNull(),
  createdAt: timestamp("fedCreatedAt").defaultNow().notNull(),
  updatedAt: timestamp("fedUpdatedAt").defaultNow().notNull().$onUpdate(updatedNow),
});

export type FestivalExtraDetail = typeof festivalExtraDetails.$inferSelect;
export type InsertFestivalExtraDetail = typeof festivalExtraDetails.$inferInsert;
