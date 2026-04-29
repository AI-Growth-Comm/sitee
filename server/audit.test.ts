import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  createAudit: vi.fn().mockResolvedValue(1),
  updateAuditStatus: vi.fn().mockResolvedValue(undefined),
  updateAuditResults: vi.fn().mockResolvedValue(undefined),
  getAuditById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    url: "https://example.com",
    industry: "SaaS",
    overallScore: 72,
    overview: {
      summary: "Good site.",
      keyInsight: "Improve metadata.",
      overallScore: 72,
      dimensions: [],
    },
    keywords: { strategy: "Focus on long-tail.", opportunities: [] },
    metadata: { note: "Needs work.", pages: [] },
    schemaData: { recommendation: "Add schema.", schemas: [] },
    calendar: { strategy: "Publish weekly.", items: [] },
    checklist: { items: [] },
    linking: { clusters: [], immediateActions: [] },
    status: "complete",
    errorMsg: null,
    durationMs: 18000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  listAuditsForUser: vi.fn().mockResolvedValue([]),
  listRecentAudits: vi.fn().mockResolvedValue([]),
  getChecklistProgress: vi.fn().mockResolvedValue([]),
  upsertChecklistItem: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// Mock the audit engine
vi.mock("./auditEngine", () => ({
  runFullAudit: vi.fn().mockResolvedValue({
    overallScore: 72,
    overview: {
      summary: "Test summary.",
      keyInsight: "Test insight.",
      overallScore: 72,
      dimensions: [],
    },
    keywords: { strategy: "Test strategy.", opportunities: [] },
    metadata: { note: "Test note.", pages: [] },
    schemaData: { recommendation: "Test rec.", schemas: [] },
    calendar: { strategy: "Test cal.", items: [] },
    checklist: { items: [] },
    linking: { clusters: [], immediateActions: [] },
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    plan: "free",
    auditsUsed: 0,
    auditsLimit: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("audit.run", () => {
  it("runs an audit for a guest user and returns auditId", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.run({
      url: "https://example.com",
      industry: "SaaS",
    });
    expect(result).toHaveProperty("auditId");
    expect(result).toHaveProperty("overallScore");
    expect(result.overallScore).toBe(72);
  });

  it("runs an audit for an authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.run({
      url: "https://example.com",
      industry: "SaaS",
    });
    expect(result.auditId).toBe(1);
  });
});

describe("audit.get", () => {
  it("returns teaser data for guest", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.get({ id: 1 });
    expect(result.isTeaser).toBe(true);
    expect(result.audit.id).toBe(1);
    expect(result.audit.url).toBe("https://example.com");
    expect(result.audit.overallScore).toBe(72);
  });

  it("returns checklistDoneMap for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.get({ id: 1 });
    expect(result.checklistDoneMap).toBeDefined();
  });
});

describe("audit.recent", () => {
  it("returns empty array for guest", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.recent();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("audit.toggleChecklist", () => {
  it("requires authentication", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.audit.toggleChecklist({ auditId: 1, itemId: "c1", done: true })
    ).rejects.toThrow();
  });

  it("toggles a checklist item for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.toggleChecklist({
      auditId: 1,
      itemId: "c1",
      done: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
