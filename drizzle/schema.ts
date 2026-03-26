import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Email account settings (IMAP/SMTP credentials)
export const emailAccounts = mysqlTable("email_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  emailAddress: varchar("emailAddress", { length: 320 }).notNull(),
  imapHost: varchar("imapHost", { length: 255 }).notNull().default("imap.one.com"),
  imapPort: int("imapPort").notNull().default(993),
  smtpHost: varchar("smtpHost", { length: 255 }).notNull().default("send.one.com"),
  smtpPort: int("smtpPort").notNull().default(465),
  password: varchar("password", { length: 512 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = typeof emailAccounts.$inferInsert;

// Fetched emails
export const emails = mysqlTable("emails", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  messageId: varchar("messageId", { length: 512 }),
  uid: int("uid"),
  subject: text("subject"),
  fromAddress: varchar("fromAddress", { length: 320 }),
  fromName: varchar("fromName", { length: 255 }),
  toAddress: text("toAddress"),
  body: text("body"),
  bodyHtml: text("bodyHtml"),
  receivedAt: timestamp("receivedAt"),
  isRead: boolean("isRead").default(false).notNull(),
  classification: mysqlEnum("classification", ["invoice", "task", "reminder", "general", "irrelevant"]).default("general"),
  aiSummary: text("aiSummary"),
  aiAnalysis: json("aiAnalysis"),
  isProcessed: boolean("isProcessed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

// Tasks extracted from emails or WhatsApp
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  emailId: int("emailId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "dismissed"]).default("pending").notNull(),
  dueDate: timestamp("dueDate"),
  category: varchar("category", { length: 100 }),
  source: mysqlEnum("source", ["email", "whatsapp", "manual"]).default("email").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// Draft replies awaiting approval
export const draftReplies = mysqlTable("draft_replies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  emailId: int("emailId").notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  toAddress: varchar("toAddress", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "sent"]).default("pending").notNull(),
  approvedAt: timestamp("approvedAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DraftReply = typeof draftReplies.$inferSelect;
export type InsertDraftReply = typeof draftReplies.$inferInsert;
