import { describe, expect, it } from "vitest";

// Test the priority score formula: urgency * 0.6 + importance * 0.4
function calculatePriorityScore(urgency: number, importance: number): number {
  return Math.round((urgency * 0.6 + importance * 0.4) * 10) / 10;
}

// Test quadrant assignment logic
function assignQuadrant(urgency: number, importance: number): string {
  if (urgency >= 7 && importance >= 7) return "do_first";
  if (urgency < 7 && importance >= 7) return "schedule";
  if (urgency >= 7 && importance < 7) return "delegate";
  return "archive";
}

// Test escalation logic
function shouldEscalate(task: {
  dueDate: Date | null;
  createdAt: Date;
  status: string;
  escalationLevel: number;
}): { escalate: boolean; newLevel: number; reason: string } {
  const now = new Date();

  // Overdue check
  if (task.dueDate && task.dueDate < now && task.status !== "completed" && task.status !== "dismissed") {
    return { escalate: true, newLevel: task.escalationLevel + 1, reason: "overdue" };
  }

  // Stale task check (pending for more than 48 hours)
  const hoursSinceCreation = (now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation > 48 && task.status === "pending" && task.escalationLevel === 0) {
    return { escalate: true, newLevel: 1, reason: "stale" };
  }

  return { escalate: false, newLevel: task.escalationLevel, reason: "none" };
}

describe("Priority Score Calculation", () => {
  it("calculates correct priority score for high urgency + high importance", () => {
    const score = calculatePriorityScore(9, 8);
    // 9 * 0.6 + 8 * 0.4 = 5.4 + 3.2 = 8.6
    expect(score).toBe(8.6);
  });

  it("calculates correct priority score for low urgency + low importance", () => {
    const score = calculatePriorityScore(2, 3);
    // 2 * 0.6 + 3 * 0.4 = 1.2 + 1.2 = 2.4
    expect(score).toBe(2.4);
  });

  it("calculates correct priority score for mixed urgency/importance", () => {
    const score = calculatePriorityScore(9, 2);
    // 9 * 0.6 + 2 * 0.4 = 5.4 + 0.8 = 6.2
    expect(score).toBe(6.2);
  });

  it("handles edge case: both at maximum (10, 10)", () => {
    const score = calculatePriorityScore(10, 10);
    // 10 * 0.6 + 10 * 0.4 = 6 + 4 = 10
    expect(score).toBe(10);
  });

  it("handles edge case: both at minimum (1, 1)", () => {
    const score = calculatePriorityScore(1, 1);
    // 1 * 0.6 + 1 * 0.4 = 0.6 + 0.4 = 1
    expect(score).toBe(1);
  });
});

describe("Eisenhower Quadrant Assignment", () => {
  it("assigns do_first for high urgency + high importance", () => {
    expect(assignQuadrant(9, 8)).toBe("do_first");
  });

  it("assigns schedule for low urgency + high importance", () => {
    expect(assignQuadrant(4, 9)).toBe("schedule");
  });

  it("assigns delegate for high urgency + low importance", () => {
    expect(assignQuadrant(8, 3)).toBe("delegate");
  });

  it("assigns archive for low urgency + low importance", () => {
    expect(assignQuadrant(3, 4)).toBe("archive");
  });

  it("assigns do_first at the boundary (7, 7)", () => {
    expect(assignQuadrant(7, 7)).toBe("do_first");
  });

  it("assigns archive at just below boundary (6, 6)", () => {
    expect(assignQuadrant(6, 6)).toBe("archive");
  });
});

describe("Escalation Logic", () => {
  it("escalates overdue tasks", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = shouldEscalate({
      dueDate: yesterday,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "pending",
      escalationLevel: 0,
    });
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(1);
    expect(result.reason).toBe("overdue");
  });

  it("does not escalate completed overdue tasks", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = shouldEscalate({
      dueDate: yesterday,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "completed",
      escalationLevel: 0,
    });
    expect(result.escalate).toBe(false);
  });

  it("escalates stale pending tasks (>48h old)", () => {
    const result = shouldEscalate({
      dueDate: null,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
      status: "pending",
      escalationLevel: 0,
    });
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(1);
    expect(result.reason).toBe("stale");
  });

  it("does not escalate fresh pending tasks (<48h old)", () => {
    const result = shouldEscalate({
      dueDate: null,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      status: "pending",
      escalationLevel: 0,
    });
    expect(result.escalate).toBe(false);
  });

  it("increments escalation level for already-escalated overdue tasks", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = shouldEscalate({
      dueDate: yesterday,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "in_progress",
      escalationLevel: 2,
    });
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(3);
  });

  it("does not double-escalate already-escalated stale tasks", () => {
    const result = shouldEscalate({
      dueDate: null,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      status: "pending",
      escalationLevel: 1, // already escalated once
    });
    // Should not escalate again for staleness since already escalated
    expect(result.escalate).toBe(false);
  });
});
