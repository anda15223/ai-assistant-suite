import { describe, it, expect } from "vitest";

// ===== Pure logic tests for category reassignment and email link features =====

const VALID_CATEGORIES = ["task", "invoice", "read_lecture", "read_learn", "might_be_interesting"];

const CATEGORY_LABELS: Record<string, string> = {
  task: "Task",
  invoice: "Invoice",
  read_lecture: "Lecture",
  read_learn: "Learn",
  might_be_interesting: "Interesting",
};

interface TaskForCategory {
  id: number;
  emailId: number | null;
  category: string | null;
  status: "pending" | "in_progress" | "completed" | "dismissed";
}

/**
 * Validates that a category value is one of the allowed categories.
 */
function isValidCategory(category: string): boolean {
  return VALID_CATEGORIES.includes(category);
}

/**
 * Returns a human-readable label for a category.
 */
function getCategoryLabel(category: string | null): string {
  if (!category) return "Uncategorized";
  return CATEGORY_LABELS[category] || category;
}

/**
 * Determines if a task has a linked email that can be opened.
 */
function hasLinkedEmail(task: TaskForCategory): boolean {
  return task.emailId != null;
}

/**
 * Validates category reassignment input.
 */
function validateCategoryInput(category: string): { valid: boolean; error?: string } {
  if (!category || category.trim().length === 0) {
    return { valid: false, error: "Category cannot be empty" };
  }
  if (category.length > 100) {
    return { valid: false, error: "Category must be 100 characters or less" };
  }
  return { valid: true };
}

// ===== Tests =====

describe("Category Validation", () => {
  it("should accept all predefined categories", () => {
    for (const cat of VALID_CATEGORIES) {
      expect(isValidCategory(cat)).toBe(true);
    }
  });

  it("should reject unknown category values", () => {
    expect(isValidCategory("unknown")).toBe(false);
    expect(isValidCategory("")).toBe(false);
    expect(isValidCategory("random_category")).toBe(false);
  });

  it("should validate category input is not empty", () => {
    expect(validateCategoryInput("")).toEqual({ valid: false, error: "Category cannot be empty" });
    expect(validateCategoryInput("   ")).toEqual({ valid: false, error: "Category cannot be empty" });
  });

  it("should validate category input length limit", () => {
    const longCategory = "a".repeat(101);
    expect(validateCategoryInput(longCategory)).toEqual({ valid: false, error: "Category must be 100 characters or less" });
  });

  it("should accept valid category input", () => {
    expect(validateCategoryInput("task")).toEqual({ valid: true });
    expect(validateCategoryInput("read_lecture")).toEqual({ valid: true });
    expect(validateCategoryInput("custom_category")).toEqual({ valid: true });
  });
});

describe("Category Labels", () => {
  it("should return correct labels for predefined categories", () => {
    expect(getCategoryLabel("task")).toBe("Task");
    expect(getCategoryLabel("invoice")).toBe("Invoice");
    expect(getCategoryLabel("read_lecture")).toBe("Lecture");
    expect(getCategoryLabel("read_learn")).toBe("Learn");
    expect(getCategoryLabel("might_be_interesting")).toBe("Interesting");
  });

  it("should return 'Uncategorized' for null category", () => {
    expect(getCategoryLabel(null)).toBe("Uncategorized");
  });

  it("should return the raw value for unknown categories", () => {
    expect(getCategoryLabel("custom")).toBe("custom");
    expect(getCategoryLabel("other")).toBe("other");
  });
});

describe("Email Link Detection", () => {
  it("should detect tasks with linked emails", () => {
    const task: TaskForCategory = { id: 1, emailId: 42, category: "task", status: "pending" };
    expect(hasLinkedEmail(task)).toBe(true);
  });

  it("should detect tasks without linked emails", () => {
    const task: TaskForCategory = { id: 2, emailId: null, category: "task", status: "pending" };
    expect(hasLinkedEmail(task)).toBe(false);
  });

  it("should handle emailId of 0 as a valid link", () => {
    // emailId 0 is technically a valid ID
    const task: TaskForCategory = { id: 3, emailId: 0, category: "task", status: "pending" };
    expect(hasLinkedEmail(task)).toBe(true);
  });
});

describe("Category Reassignment Scenarios", () => {
  const baseTask: TaskForCategory = { id: 1, emailId: 10, category: "task", status: "pending" };

  it("should allow reassigning from task to read_lecture", () => {
    const newCategory = "read_lecture";
    expect(isValidCategory(newCategory)).toBe(true);
    expect(newCategory).not.toBe(baseTask.category);
  });

  it("should allow reassigning from task to read_learn", () => {
    const newCategory = "read_learn";
    expect(isValidCategory(newCategory)).toBe(true);
  });

  it("should allow reassigning from task to might_be_interesting", () => {
    const newCategory = "might_be_interesting";
    expect(isValidCategory(newCategory)).toBe(true);
  });

  it("should allow reassigning from invoice to task", () => {
    const invoiceTask: TaskForCategory = { ...baseTask, category: "invoice" };
    const newCategory = "task";
    expect(isValidCategory(newCategory)).toBe(true);
    expect(newCategory).not.toBe(invoiceTask.category);
  });

  it("should handle reassigning to the same category (no-op)", () => {
    const newCategory = "task";
    expect(newCategory).toBe(baseTask.category);
    // UI should skip the mutation when category is the same
  });
});

describe("Category Filter Matching", () => {
  const tasks: TaskForCategory[] = [
    { id: 1, emailId: 10, category: "task", status: "pending" },
    { id: 2, emailId: 11, category: "invoice", status: "pending" },
    { id: 3, emailId: 12, category: "read_lecture", status: "pending" },
    { id: 4, emailId: null, category: "read_learn", status: "in_progress" },
    { id: 5, emailId: 14, category: "might_be_interesting", status: "pending" },
    { id: 6, emailId: null, category: null, status: "pending" },
    { id: 7, emailId: 16, category: "task", status: "completed" },
  ];

  it("should filter tasks by read_lecture category", () => {
    const filtered = tasks.filter(t => t.category === "read_lecture");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(3);
  });

  it("should filter tasks by read_learn category", () => {
    const filtered = tasks.filter(t => t.category === "read_learn");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(4);
  });

  it("should filter tasks by might_be_interesting category", () => {
    const filtered = tasks.filter(t => t.category === "might_be_interesting");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(5);
  });

  it("should count categories correctly", () => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.category) {
        counts[t.category] = (counts[t.category] || 0) + 1;
      }
    });
    expect(counts["task"]).toBe(2);
    expect(counts["invoice"]).toBe(1);
    expect(counts["read_lecture"]).toBe(1);
    expect(counts["read_learn"]).toBe(1);
    expect(counts["might_be_interesting"]).toBe(1);
  });

  it("should identify tasks with email links for the email button", () => {
    const withEmail = tasks.filter(t => hasLinkedEmail(t));
    expect(withEmail).toHaveLength(5);
    const withoutEmail = tasks.filter(t => !hasLinkedEmail(t));
    expect(withoutEmail).toHaveLength(2);
  });
});
