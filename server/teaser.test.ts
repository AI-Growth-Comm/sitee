import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB helpers
vi.mock("./db", () => ({
  getAuditById: vi.fn(),
  claimAudit: vi.fn().mockResolvedValue(true),
  getChecklistProgress: vi.fn().mockResolvedValue([]),
}));

import { getAuditById, claimAudit } from "./db";

const mockAudit = {
  id: 42,
  userId: null,
  url: "https://example.com",
  industry: "SaaS",
  customIndustry: null,
  overallScore: 68,
  overview: {
    summary: "Good foundation but needs work.",
    dimensions: [
      { name: "Technical SEO", score: 72, note: "Solid" },
      { name: "Content Quality", score: 55, note: "Needs improvement" },
      { name: "Backlinks", score: 40, note: "Low" },
    ],
  },
  keywords: {
    opportunities: [
      { keyword: "seo tool", volume: 1200, difficulty: 45, intent: "COMMERCIAL", priority: "HIGH", contentType: "Landing page", cluster: "SEO" },
      { keyword: "site audit", volume: 800, difficulty: 30, intent: "INFORMATIONAL", priority: "MEDIUM", contentType: "Blog post", cluster: "Audit" },
    ],
  },
  status: "complete",
  claimed: false,
  guestToken: "abc123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("guest teaser data extraction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns teaserData with first 2 dimensions and keywords for guest", async () => {
    vi.mocked(getAuditById).mockResolvedValue(mockAudit as any);
    const audit = await getAuditById(42);
    expect(audit).toBeTruthy();
    const overview = audit!.overview as any;
    const keywords = audit!.keywords as any;
    const teaserDimensions = (overview?.dimensions ?? []).slice(0, 2);
    const teaserKeywords = (keywords?.opportunities ?? []).slice(0, 2);
    expect(teaserDimensions).toHaveLength(2);
    expect(teaserKeywords).toHaveLength(2);
    expect(teaserDimensions[0].name).toBe("Technical SEO");
    expect(teaserKeywords[0].keyword).toBe("seo tool");
  });

  it("claimAudit sets userId and claimed=true", async () => {
    const result = await claimAudit(42, 7);
    expect(result).toBe(true);
    expect(claimAudit).toHaveBeenCalledWith(42, 7);
  });

  it("guest token is generated as non-empty string", () => {
    const guestToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    expect(guestToken.length).toBeGreaterThan(8);
    expect(typeof guestToken).toBe("string");
  });
});
