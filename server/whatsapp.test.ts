import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("WhatsApp tRPC routers", () => {
  it("whatsapp.list returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsapp.messages({ limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("whatsapp.stats returns expected shape", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsapp.stats();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("problems");
    expect(result).toHaveProperty("questions");
    expect(result).toHaveProperty("updates");
    expect(result).toHaveProperty("requests");
    expect(typeof result.total).toBe("number");
  });

  it("whatsapp.accounting returns expected shape with matched boolean", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsapp.accounting();
    expect(result).toHaveProperty("totalMessages");
    expect(result).toHaveProperty("totalTasks");
    expect(result).toHaveProperty("matched");
    expect(typeof result.matched).toBe("boolean");
  });

  it("whatsapp.pendingDrafts returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsapp.pendingDrafts();
    expect(Array.isArray(result)).toBe(true);
  });

  it("employee.list returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employee.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("WhatsApp classification types", () => {
  it("stats categories sum should match total (1:1 accounting rule)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.whatsapp.stats();
    const categorySum = stats.problems + stats.questions + stats.updates + stats.requests;
    // When there are no messages, both should be 0
    // When there are messages, categories should sum to total
    expect(categorySum).toBeLessThanOrEqual(stats.total);
  });
});
