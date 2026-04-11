import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ===== Pure logic tests for AI category suggestion features =====

const VALID_SUGGESTED_CATEGORIES = ["task", "invoice", "read_lecture", "read_learn", "might_be_interesting"];

const CATEGORY_LABELS: Record<string, string> = {
  task: "Task",
  invoice: "Invoice",
  read_lecture: "Lecture",
  read_learn: "Learn",
  might_be_interesting: "Interesting",
};

interface TaskWithSuggestion {
  id: number;
  category: string | null;
  suggestedCategory: string | null;
  suggestionConfidence: number | null;
  suggestionReasoning: string | null;
  suggestionConfirmed: boolean | null;
}

/**
 * Determines if a task has a pending (unconfirmed) AI suggestion.
 */
function hasPendingSuggestion(task: TaskWithSuggestion): boolean {
  return !!task.suggestedCategory && !task.suggestionConfirmed;
}

/**
 * Simulates accepting a suggestion: sets category = suggestedCategory, marks confirmed.
 */
function acceptSuggestion(task: TaskWithSuggestion): TaskWithSuggestion {
  if (!task.suggestedCategory) return task;
  return {
    ...task,
    category: task.suggestedCategory,
    suggestionConfirmed: true,
  };
}

/**
 * Simulates rejecting a suggestion: marks confirmed without changing category.
 */
function rejectSuggestion(task: TaskWithSuggestion): TaskWithSuggestion {
  return {
    ...task,
    suggestionConfirmed: true,
  };
}

/**
 * Validates that a suggested category is one of the allowed values.
 */
function isValidSuggestedCategory(category: string): boolean {
  return VALID_SUGGESTED_CATEGORIES.includes(category);
}

/**
 * Validates confidence score is within valid range (0-100).
 */
function isValidConfidence(confidence: number): boolean {
  return confidence >= 0 && confidence <= 100;
}

/**
 * Filters tasks that have pending suggestions.
 */
function getTasksWithPendingSuggestions(tasks: TaskWithSuggestion[]): TaskWithSuggestion[] {
  return tasks.filter(hasPendingSuggestion);
}

/**
 * Computes suggestion stats from a list of tasks.
 */
function computeSuggestionStats(tasks: TaskWithSuggestion[]) {
  const pending = tasks.filter(t => t.suggestedCategory && !t.suggestionConfirmed).length;
  const confirmed = tasks.filter(t => t.suggestedCategory && t.suggestionConfirmed).length;
  const accepted = tasks.filter(t => t.suggestedCategory && t.suggestionConfirmed && t.category === t.suggestedCategory).length;
  const rejected = confirmed - accepted;
  return { pending, confirmed, accepted, rejected };
}

/**
 * Simulates the AI contentCategory response structure.
 */
function buildContentCategoryResponse(
  suggestedCategory: string,
  confidence: number,
  reasoning: string
) {
  return {
    suggestedCategory,
    confidence,
    reasoning,
  };
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
  return { ctx: { user } };
}

// ===== Tests =====

describe("Category Suggestion - Pending Detection", () => {
  it("should detect pending suggestion when suggestedCategory exists and not confirmed", () => {
    const task: TaskWithSuggestion = {
      id: 1, category: "task", suggestedCategory: "read_lecture",
      suggestionConfidence: 85, suggestionReasoning: "Educational content", suggestionConfirmed: false,
    };
    expect(hasPendingSuggestion(task)).toBe(true);
  });

  it("should not detect pending suggestion when already confirmed", () => {
    const task: TaskWithSuggestion = {
      id: 1, category: "read_lecture", suggestedCategory: "read_lecture",
      suggestionConfidence: 85, suggestionReasoning: "Educational content", suggestionConfirmed: true,
    };
    expect(hasPendingSuggestion(task)).toBe(false);
  });

  it("should not detect pending suggestion when suggestedCategory is null", () => {
    const task: TaskWithSuggestion = {
      id: 1, category: "task", suggestedCategory: null,
      suggestionConfidence: null, suggestionReasoning: null, suggestionConfirmed: null,
    };
    expect(hasPendingSuggestion(task)).toBe(false);
  });
});

describe("Category Suggestion - Accept/Reject Logic", () => {
  it("should set category to suggestedCategory on accept", () => {
    const task: TaskWithSuggestion = {
      id: 1, category: "task", suggestedCategory: "read_learn",
      suggestionConfidence: 90, suggestionReasoning: "Industry article", suggestionConfirmed: false,
    };
    const accepted = acceptSuggestion(task);
    expect(accepted.category).toBe("read_learn");
    expect(accepted.suggestionConfirmed).toBe(true);
  });

  it("should keep original category on reject", () => {
    const task: TaskWithSuggestion = {
      id: 1, category: "task", suggestedCategory: "might_be_interesting",
      suggestionConfidence: 60, suggestionReasoning: "Newsletter", suggestionConfirmed: false,
    };
    const rejected = rejectSuggestion(task);
    expect(rejected.category).toBe("task");
    expect(rejected.suggestionConfirmed).toBe(true);
  });

  it("should not change task if no suggestedCategory on accept", () => {
    const task: TaskWithSuggestion = {
      id: 1, category: "task", suggestedCategory: null,
      suggestionConfidence: null, suggestionReasoning: null, suggestionConfirmed: null,
    };
    const result = acceptSuggestion(task);
    expect(result.category).toBe("task");
    expect(result.suggestionConfirmed).toBeNull();
  });
});

describe("Category Suggestion - Validation", () => {
  it("should validate all allowed categories", () => {
    VALID_SUGGESTED_CATEGORIES.forEach(cat => {
      expect(isValidSuggestedCategory(cat)).toBe(true);
    });
  });

  it("should reject invalid categories", () => {
    expect(isValidSuggestedCategory("unknown")).toBe(false);
    expect(isValidSuggestedCategory("")).toBe(false);
    expect(isValidSuggestedCategory("lecture")).toBe(false);
  });

  it("should validate confidence scores within range", () => {
    expect(isValidConfidence(0)).toBe(true);
    expect(isValidConfidence(50)).toBe(true);
    expect(isValidConfidence(100)).toBe(true);
  });

  it("should reject confidence scores outside range", () => {
    expect(isValidConfidence(-1)).toBe(false);
    expect(isValidConfidence(101)).toBe(false);
  });
});

describe("Category Suggestion - Filtering", () => {
  const tasks: TaskWithSuggestion[] = [
    { id: 1, category: "task", suggestedCategory: "read_lecture", suggestionConfidence: 85, suggestionReasoning: "Tutorial", suggestionConfirmed: false },
    { id: 2, category: "task", suggestedCategory: "read_learn", suggestionConfidence: 70, suggestionReasoning: "Article", suggestionConfirmed: true },
    { id: 3, category: "invoice", suggestedCategory: null, suggestionConfidence: null, suggestionReasoning: null, suggestionConfirmed: null },
    { id: 4, category: "task", suggestedCategory: "might_be_interesting", suggestionConfidence: 55, suggestionReasoning: "Newsletter", suggestionConfirmed: false },
  ];

  it("should filter only pending suggestions", () => {
    const pending = getTasksWithPendingSuggestions(tasks);
    expect(pending).toHaveLength(2);
    expect(pending.map(t => t.id)).toEqual([1, 4]);
  });

  it("should return empty array when no pending suggestions", () => {
    const allConfirmed = tasks.map(t => ({ ...t, suggestionConfirmed: true }));
    expect(getTasksWithPendingSuggestions(allConfirmed)).toHaveLength(0);
  });
});

describe("Category Suggestion - Stats Computation", () => {
  const tasks: TaskWithSuggestion[] = [
    { id: 1, category: "read_lecture", suggestedCategory: "read_lecture", suggestionConfidence: 85, suggestionReasoning: "Tutorial", suggestionConfirmed: true }, // accepted
    { id: 2, category: "task", suggestedCategory: "read_learn", suggestionConfidence: 70, suggestionReasoning: "Article", suggestionConfirmed: true }, // rejected (category != suggested)
    { id: 3, category: "task", suggestedCategory: "might_be_interesting", suggestionConfidence: 55, suggestionReasoning: "Newsletter", suggestionConfirmed: false }, // pending
    { id: 4, category: "invoice", suggestedCategory: null, suggestionConfidence: null, suggestionReasoning: null, suggestionConfirmed: null }, // no suggestion
  ];

  it("should compute correct pending count", () => {
    const stats = computeSuggestionStats(tasks);
    expect(stats.pending).toBe(1);
  });

  it("should compute correct confirmed count", () => {
    const stats = computeSuggestionStats(tasks);
    expect(stats.confirmed).toBe(2);
  });

  it("should compute correct accepted count", () => {
    const stats = computeSuggestionStats(tasks);
    expect(stats.accepted).toBe(1);
  });

  it("should compute correct rejected count", () => {
    const stats = computeSuggestionStats(tasks);
    expect(stats.rejected).toBe(1);
  });
});

describe("Category Suggestion - Content Category Response", () => {
  it("should build a valid content category response", () => {
    const response = buildContentCategoryResponse("read_lecture", 0.92, "This email contains course materials and lecture slides");
    expect(response.suggestedCategory).toBe("read_lecture");
    expect(response.confidence).toBe(0.92);
    expect(response.reasoning).toContain("course materials");
  });

  it("should handle all category types", () => {
    VALID_SUGGESTED_CATEGORIES.forEach(cat => {
      const response = buildContentCategoryResponse(cat, 0.8, `Reason for ${cat}`);
      expect(response.suggestedCategory).toBe(cat);
    });
  });
});

describe("Category Suggestion - tRPC Router Structure", () => {
  it("task.acceptSuggestion procedure should exist", () => {
    const caller = appRouter.createCaller(createAuthContext().ctx);
    expect(caller.task.acceptSuggestion).toBeDefined();
    expect(typeof caller.task.acceptSuggestion).toBe("function");
  });

  it("task.rejectSuggestion procedure should exist", () => {
    const caller = appRouter.createCaller(createAuthContext().ctx);
    expect(caller.task.rejectSuggestion).toBeDefined();
    expect(typeof caller.task.rejectSuggestion).toBe("function");
  });

  it("task.suggestionStats procedure should exist", () => {
    const caller = appRouter.createCaller(createAuthContext().ctx);
    expect(caller.task.suggestionStats).toBeDefined();
    expect(typeof caller.task.suggestionStats).toBe("function");
  });
});

describe("Category Suggestion - Label Mapping", () => {
  it("should have labels for all valid categories", () => {
    VALID_SUGGESTED_CATEGORIES.forEach(cat => {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe("string");
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    });
  });
});
