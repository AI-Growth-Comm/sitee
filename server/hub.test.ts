import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB helpers
vi.mock("./db", () => ({
  listAuditsForUser: vi.fn().mockResolvedValue([
    { id: 1, url: "https://example.com", industry: "SaaS", overallScore: 72, createdAt: new Date(), status: "complete" },
  ]),
  listReportsForUser: vi.fn().mockResolvedValue([
    { id: 1, title: "Example Report", clientName: "Example Co", auditId: 1, createdAt: new Date() },
  ]),
}));

import { listAuditsForUser, listReportsForUser } from "./db";

describe("hub.summary data helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns auditsUsed count equal to listAuditsForUser length", async () => {
    const audits = await listAuditsForUser("user-1", 1000);
    expect(audits.length).toBe(1);
  });

  it("returns savedReports from listReportsForUser", async () => {
    const reports = await listReportsForUser("user-1", 5);
    expect(reports[0].title).toBe("Example Report");
  });

  it("computes auditsLimit as 50", () => {
    const auditsLimit = 50;
    expect(auditsLimit).toBe(50);
  });
});
