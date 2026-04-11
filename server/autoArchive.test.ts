import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ===== Pure logic tests for auto-archive eligibility =====

interface TaskForArchive {
  id: number;
  quadrant: "do_first" | "schedule" | "delegate" | "archive" | null;
  status: "pending" | "in_progress" | "completed" | "dismissed";
  lastActivityAt: Date;
  autoArchivedAt: Date | null;
}

/**
 * Determines if a task is eligible for auto-archive.
 * Mirrors the SQL logic in db.getStaleArchiveTasks.
 */
function isEligibleForAutoArchive(
  task: TaskForArchive,
  daysInactive: number = 30
): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysInactive);

  return (
    task.quadrant === "archive" &&
    (task.status === "pending" || task.status === "in_progress") &&
    task.lastActivityAt < threshold &&
    task.autoArchivedAt === null
  );
}

/**
 * Computes the number of days since last activity.
 */
function daysSinceActivity(lastActivityAt: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
}

// ===== Auth context helpers =====

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    email: "test@example.com",
    passwordHash: null,
    name: "Test User",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ===== Tests =====

describe("Auto-Archive Eligibility Logic", () => {
  it("marks archive-quadrant task as eligible after 30 days of inactivity", () => {
    const task: TaskForArchive = {
      id: 1,
      quadrant: "archive",
      status: "pending",
      lastActivityAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task)).toBe(true);
  });

  it("does NOT mark archive-quadrant task as eligible if activity is recent", () => {
    const task: TaskForArchive = {
      id: 2,
      quadrant: "archive",
      status: "pending",
      lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task)).toBe(false);
  });

  it("does NOT mark non-archive quadrant tasks as eligible", () => {
    const task: TaskForArchive = {
      id: 3,
      quadrant: "do_first",
      status: "pending",
      lastActivityAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task)).toBe(false);
  });

  it("does NOT mark already-dismissed tasks as eligible", () => {
    const task: TaskForArchive = {
      id: 4,
      quadrant: "archive",
      status: "dismissed",
      lastActivityAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task)).toBe(false);
  });

  it("does NOT mark completed tasks as eligible", () => {
    const task: TaskForArchive = {
      id: 5,
      quadrant: "archive",
      status: "completed",
      lastActivityAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task)).toBe(false);
  });

  it("does NOT mark already-auto-archived tasks as eligible", () => {
    const task: TaskForArchive = {
      id: 6,
      quadrant: "archive",
      status: "pending",
      lastActivityAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      autoArchivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // already archived 5 days ago
    };
    expect(isEligibleForAutoArchive(task)).toBe(false);
  });

  it("respects custom daysInactive threshold (7 days)", () => {
    const task: TaskForArchive = {
      id: 7,
      quadrant: "archive",
      status: "pending",
      lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task, 7)).toBe(true);
    expect(isEligibleForAutoArchive(task, 30)).toBe(false);
  });

  it("handles in_progress status as eligible", () => {
    const task: TaskForArchive = {
      id: 8,
      quadrant: "archive",
      status: "in_progress",
      lastActivityAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task)).toBe(true);
  });

  it("boundary: exactly 30 days ago is NOT eligible (needs > 30 days)", () => {
    // The threshold is set to "today minus 30 days", so a task with lastActivityAt
    // exactly at the threshold should NOT be eligible (needs to be strictly before).
    const exactlyThirtyDays = new Date();
    exactlyThirtyDays.setDate(exactlyThirtyDays.getDate() - 30);
    // Add 1 second to be just barely within the 30-day window
    exactlyThirtyDays.setSeconds(exactlyThirtyDays.getSeconds() + 1);

    const task: TaskForArchive = {
      id: 9,
      quadrant: "archive",
      status: "pending",
      lastActivityAt: exactlyThirtyDays,
      autoArchivedAt: null,
    };
    expect(isEligibleForAutoArchive(task)).toBe(false);
  });
});

describe("Days Since Activity Calculation", () => {
  it("calculates 0 days for activity just now", () => {
    expect(daysSinceActivity(new Date())).toBe(0);
  });

  it("calculates 30 days for activity 30 days ago", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(daysSinceActivity(thirtyDaysAgo)).toBe(30);
  });

  it("calculates 90 days for activity 90 days ago", () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(daysSinceActivity(ninetyDaysAgo)).toBe(90);
  });
});

describe("Auto-Archive Batch Processing", () => {
  it("filters only eligible tasks from a mixed batch", () => {
    const tasks: TaskForArchive[] = [
      { id: 1, quadrant: "archive", status: "pending", lastActivityAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), autoArchivedAt: null },
      { id: 2, quadrant: "archive", status: "pending", lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), autoArchivedAt: null },
      { id: 3, quadrant: "do_first", status: "pending", lastActivityAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), autoArchivedAt: null },
      { id: 4, quadrant: "archive", status: "completed", lastActivityAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), autoArchivedAt: null },
      { id: 5, quadrant: "archive", status: "pending", lastActivityAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), autoArchivedAt: null },
      { id: 6, quadrant: "archive", status: "pending", lastActivityAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), autoArchivedAt: new Date() },
    ];

    const eligible = tasks.filter(t => isEligibleForAutoArchive(t));
    expect(eligible).toHaveLength(2);
    expect(eligible.map(t => t.id)).toEqual([1, 5]);
  });

  it("returns empty array when no tasks are eligible", () => {
    const tasks: TaskForArchive[] = [
      { id: 1, quadrant: "archive", status: "pending", lastActivityAt: new Date(), autoArchivedAt: null },
      { id: 2, quadrant: "schedule", status: "pending", lastActivityAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), autoArchivedAt: null },
    ];

    const eligible = tasks.filter(t => isEligibleForAutoArchive(t));
    expect(eligible).toHaveLength(0);
  });
});

describe("Auto-Archive tRPC Endpoints - Auth", () => {
  it("autoArchiveStats requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.task.autoArchiveStats()).rejects.toThrow();
  });

  it("autoArchivePreview requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.task.autoArchivePreview()).rejects.toThrow();
  });

  it("autoArchiveRun requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.task.autoArchiveRun()).rejects.toThrow();
  });

  it("touchActivity requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.task.touchActivity({ taskId: 1 })).rejects.toThrow();
  });
});
