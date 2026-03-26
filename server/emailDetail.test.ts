import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ===== Pure logic tests for email detail page features =====

interface EmailForDetail {
  id: number;
  userId: number;
  subject: string | null;
  fromAddress: string | null;
  fromName: string | null;
  toAddress: string | null;
  body: string | null;
  bodyHtml: string | null;
  receivedAt: Date | null;
  classification: string | null;
  aiSummary: string | null;
  isRead: boolean;
  isProcessed: boolean;
  messageId: string | null;
}

interface TaskLinked {
  id: number;
  emailId: number | null;
  title: string;
  category: string | null;
  status: string;
  quadrant: string | null;
  urgencyScore: number | null;
  importanceScore: number | null;
  isOverdue: boolean;
}

interface DraftLinked {
  id: number;
  emailId: number;
  status: string;
  body: string;
  sentAt: Date | null;
}

/**
 * Simulates the email detail response structure.
 */
function buildEmailDetailResponse(
  email: EmailForDetail,
  linkedTasks: TaskLinked[],
  drafts: DraftLinked[]
) {
  return {
    ...email,
    linkedTasks,
    drafts,
  };
}

/**
 * Checks if an email has HTML content available for rendering.
 */
function hasHtmlContent(email: EmailForDetail): boolean {
  return !!email.bodyHtml && email.bodyHtml.trim().length > 0;
}

/**
 * Formats sender display string.
 */
function formatSender(email: EmailForDetail): string {
  if (email.fromName && email.fromAddress) {
    return `${email.fromName} <${email.fromAddress}>`;
  }
  return email.fromName || email.fromAddress || "Unknown sender";
}

/**
 * Gets the pending draft from a list of drafts.
 */
function getPendingDraft(drafts: DraftLinked[]): DraftLinked | undefined {
  return drafts.find(d => d.status === "pending");
}

/**
 * Gets sent drafts from a list of drafts.
 */
function getSentDrafts(drafts: DraftLinked[]): DraftLinked[] {
  return drafts.filter(d => d.status === "sent");
}

/**
 * Validates that an email ID is a valid positive integer.
 */
function isValidEmailId(id: string): boolean {
  const parsed = parseInt(id, 10);
  return !isNaN(parsed) && parsed > 0 && String(parsed) === id;
}

// ===== Auth context helpers =====

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    role: "user",
    loginMethod: "oauth",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { ctx: { user } };
}

// ===== Tests =====

describe("Email Detail - Response Building", () => {
  const sampleEmail: EmailForDetail = {
    id: 42,
    userId: 1,
    subject: "Invoice from Acme Corp",
    fromAddress: "billing@acme.com",
    fromName: "Acme Billing",
    toAddress: "user@example.com",
    body: "Please find attached your invoice for March 2026.",
    bodyHtml: "<p>Please find attached your invoice for March 2026.</p>",
    receivedAt: new Date("2026-03-15T10:30:00Z"),
    classification: "invoice",
    aiSummary: "Invoice from Acme Corp for March services",
    isRead: true,
    isProcessed: true,
    messageId: "<abc123@acme.com>",
  };

  it("should build a complete email detail response with linked tasks and drafts", () => {
    const tasks: TaskLinked[] = [
      { id: 1, emailId: 42, title: "Pay Acme invoice", category: "invoice", status: "pending", quadrant: "do_first", urgencyScore: 8, importanceScore: 7, isOverdue: false },
    ];
    const drafts: DraftLinked[] = [
      { id: 10, emailId: 42, status: "pending", body: "Thank you for the invoice.", sentAt: null },
    ];

    const response = buildEmailDetailResponse(sampleEmail, tasks, drafts);

    expect(response.id).toBe(42);
    expect(response.subject).toBe("Invoice from Acme Corp");
    expect(response.linkedTasks).toHaveLength(1);
    expect(response.linkedTasks[0].title).toBe("Pay Acme invoice");
    expect(response.drafts).toHaveLength(1);
    expect(response.drafts[0].status).toBe("pending");
  });

  it("should handle email with no linked tasks", () => {
    const response = buildEmailDetailResponse(sampleEmail, [], []);
    expect(response.linkedTasks).toHaveLength(0);
    expect(response.drafts).toHaveLength(0);
  });

  it("should handle email with multiple linked tasks", () => {
    const tasks: TaskLinked[] = [
      { id: 1, emailId: 42, title: "Task A", category: "task", status: "pending", quadrant: "schedule", urgencyScore: 5, importanceScore: 5, isOverdue: false },
      { id: 2, emailId: 42, title: "Task B", category: "read_learn", status: "in_progress", quadrant: "delegate", urgencyScore: 3, importanceScore: 4, isOverdue: false },
    ];

    const response = buildEmailDetailResponse(sampleEmail, tasks, []);
    expect(response.linkedTasks).toHaveLength(2);
  });
});

describe("Email Detail - HTML Content Detection", () => {
  it("should detect email with HTML content", () => {
    const email: EmailForDetail = {
      id: 1, userId: 1, subject: "Test", fromAddress: "a@b.com", fromName: "A",
      toAddress: "b@c.com", body: "plain text", bodyHtml: "<p>HTML content</p>",
      receivedAt: new Date(), classification: "task", aiSummary: null,
      isRead: false, isProcessed: false, messageId: null,
    };
    expect(hasHtmlContent(email)).toBe(true);
  });

  it("should detect email without HTML content", () => {
    const email: EmailForDetail = {
      id: 1, userId: 1, subject: "Test", fromAddress: "a@b.com", fromName: "A",
      toAddress: "b@c.com", body: "plain text", bodyHtml: null,
      receivedAt: new Date(), classification: "task", aiSummary: null,
      isRead: false, isProcessed: false, messageId: null,
    };
    expect(hasHtmlContent(email)).toBe(false);
  });

  it("should treat empty HTML string as no content", () => {
    const email: EmailForDetail = {
      id: 1, userId: 1, subject: "Test", fromAddress: "a@b.com", fromName: "A",
      toAddress: "b@c.com", body: "plain text", bodyHtml: "   ",
      receivedAt: new Date(), classification: "task", aiSummary: null,
      isRead: false, isProcessed: false, messageId: null,
    };
    expect(hasHtmlContent(email)).toBe(false);
  });
});

describe("Email Detail - Sender Formatting", () => {
  it("should format sender with name and address", () => {
    const email = { fromName: "John Doe", fromAddress: "john@example.com" } as EmailForDetail;
    expect(formatSender(email)).toBe("John Doe <john@example.com>");
  });

  it("should use name only when address is missing", () => {
    const email = { fromName: "John Doe", fromAddress: null } as EmailForDetail;
    expect(formatSender(email)).toBe("John Doe");
  });

  it("should use address only when name is missing", () => {
    const email = { fromName: null, fromAddress: "john@example.com" } as EmailForDetail;
    expect(formatSender(email)).toBe("john@example.com");
  });

  it("should return 'Unknown sender' when both are missing", () => {
    const email = { fromName: null, fromAddress: null } as EmailForDetail;
    expect(formatSender(email)).toBe("Unknown sender");
  });
});

describe("Email Detail - Draft Filtering", () => {
  const drafts: DraftLinked[] = [
    { id: 1, emailId: 42, status: "pending", body: "Draft 1", sentAt: null },
    { id: 2, emailId: 42, status: "sent", body: "Draft 2", sentAt: new Date("2026-03-20T12:00:00Z") },
    { id: 3, emailId: 42, status: "rejected", body: "Draft 3", sentAt: null },
    { id: 4, emailId: 42, status: "sent", body: "Draft 4", sentAt: new Date("2026-03-21T14:00:00Z") },
  ];

  it("should find the pending draft", () => {
    const pending = getPendingDraft(drafts);
    expect(pending).toBeDefined();
    expect(pending!.id).toBe(1);
    expect(pending!.status).toBe("pending");
  });

  it("should return undefined when no pending draft exists", () => {
    const noPending = drafts.filter(d => d.status !== "pending");
    expect(getPendingDraft(noPending)).toBeUndefined();
  });

  it("should filter sent drafts correctly", () => {
    const sent = getSentDrafts(drafts);
    expect(sent).toHaveLength(2);
    expect(sent.every(d => d.status === "sent")).toBe(true);
  });

  it("should return empty array when no sent drafts exist", () => {
    const noSent = drafts.filter(d => d.status !== "sent");
    expect(getSentDrafts(noSent)).toHaveLength(0);
  });
});

describe("Email Detail - ID Validation", () => {
  it("should accept valid numeric IDs", () => {
    expect(isValidEmailId("1")).toBe(true);
    expect(isValidEmailId("42")).toBe(true);
    expect(isValidEmailId("9999")).toBe(true);
  });

  it("should reject non-numeric IDs", () => {
    expect(isValidEmailId("abc")).toBe(false);
    expect(isValidEmailId("")).toBe(false);
    expect(isValidEmailId("12.5")).toBe(false);
  });

  it("should reject zero and negative IDs", () => {
    expect(isValidEmailId("0")).toBe(false);
    expect(isValidEmailId("-1")).toBe(false);
  });

  it("should reject IDs with leading zeros", () => {
    expect(isValidEmailId("01")).toBe(false);
    expect(isValidEmailId("007")).toBe(false);
  });
});

describe("Email Detail - tRPC Router Structure", () => {
  it("email.get procedure should exist", () => {
    const caller = appRouter.createCaller(createAuthContext().ctx);
    expect(caller.email.get).toBeDefined();
    expect(typeof caller.email.get).toBe("function");
  });

  it("email.list procedure should exist", () => {
    const caller = appRouter.createCaller(createAuthContext().ctx);
    expect(caller.email.list).toBeDefined();
    expect(typeof caller.email.list).toBe("function");
  });
});
