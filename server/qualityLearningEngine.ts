/**
 * Quality Learning Engine
 *
 * This module implements the self-improving audit quality system:
 * 1. After each audit completes, it automatically triggers an AI accuracy analysis
 * 2. Extracts failure patterns (inaccurate/partial sections) as "audit criteria"
 * 3. Stores criteria in the DB keyed by domain
 * 4. On future audits for the same domain, injects known issues as LLM context
 *    so the AI avoids repeating the same mistakes
 */

import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectionResult {
  rating: "accurate" | "partial" | "inaccurate";
  reasoning: string;
  suggestedFix?: string;
}

export interface QualityAnalysisResult {
  overallAccuracy: number;
  overallSummary: string;
  sections: Record<string, SectionResult>;
  criteriaExtracted: number;
}

// ─── Normalize domain ─────────────────────────────────────────────────────────

export function normalizeDomain(url: string): string {
  try {
    const raw = url.startsWith("http") ? url : `https://${url}`;
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, "").split("/")[0];
  }
}

// ─── Run AI accuracy analysis ─────────────────────────────────────────────────

export async function runAccuracyAnalysis(audit: {
  id: number;
  url: string;
  industry: string;
  overallScore: number;
  siteContext: unknown;
  keywords: unknown;
  metadata: unknown;
  calendar: unknown;
  checklist: unknown;
  linking: unknown;
  overview: unknown;
  contentAudit: unknown;
  roadmap: unknown;
}): Promise<QualityAnalysisResult | null> {
  try {
    const siteContext = audit.siteContext as Record<string, unknown> | null;
    const contextSummary = siteContext
      ? `SCRAPED SITE DATA:
- Title: ${(siteContext as any).title ?? (siteContext as any).homepage?.title ?? "N/A"}
- Meta Description: ${(siteContext as any).metaDescription ?? (siteContext as any).homepage?.metaDesc ?? "N/A"}
- H1: ${(siteContext as any).h1 ?? (siteContext as any).homepage?.h1 ?? "N/A"}
- H2s: ${((siteContext as any).h2s ?? (siteContext as any).homepage?.h2s ?? []).slice(0, 5).join(", ")}
- Body text excerpt: ${((siteContext as any).bodyText ?? (siteContext as any).homepage?.bodyText ?? "").slice(0, 600)}
- Pages found: ${((siteContext as any).pages ?? (siteContext as any).discoveredPages ?? []).map((p: any) => p.url ?? p).join(", ")}
- Scrape error: ${(siteContext as any).scrapeError ?? "none"}`
      : "No scraped site data available — analysis may be limited.";

    const keywords = audit.keywords as any;
    const metadata = audit.metadata as any;
    const calendar = audit.calendar as any;
    const checklist = audit.checklist as any;
    const linking = audit.linking as any;
    const overview = audit.overview as any;
    const contentAudit = audit.contentAudit as any;
    const roadmap = audit.roadmap as any;

    const auditSummary = JSON.stringify({
      url: audit.url,
      industry: audit.industry,
      overallScore: audit.overallScore,
      keywords: keywords ? { topKeywords: keywords.topKeywords?.slice(0, 5), strategy: keywords.strategy } : null,
      metadata: metadata ? { pages: metadata.pages?.slice(0, 3) } : null,
      calendar: calendar ? { strategy: calendar.strategy, itemCount: calendar.items?.length } : null,
      checklist: checklist ? { itemCount: checklist.items?.length, categories: checklist.items?.map((i: any) => i.category).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i) } : null,
      linking: linking ? { totalLinks: linking.totalInternalLinks, clusterCount: linking.topicalClusters?.length } : null,
      overview: overview ? { summary: overview.summary, keyInsight: overview.keyInsight } : null,
      contentAudit: contentAudit ? { executiveSummary: contentAudit.executiveSummary } : null,
      roadmap: roadmap ? { phase1Count: roadmap.phase1?.length, phase2Count: roadmap.phase2?.length } : null,
    }, null, 2);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an SEO audit quality analyst. Evaluate the accuracy of AI-generated SEO audit sections against actual scraped site data. For each inaccurate or partial section, provide a specific "suggestedFix" explaining exactly what the AI should do differently next time (e.g., "Use the actual page titles found in scrape instead of generic placeholders"). Be concise and actionable. Respond ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `Evaluate this SEO audit accuracy.\n\n${contextSummary}\n\nAUDIT OUTPUT:\n${auditSummary}\n\nReturn JSON:\n{\n  "overallAccuracy": <0-100>,\n  "overallSummary": "<2-3 sentences>",\n  "sections": {\n    "keywords": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" },\n    "metadata": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" },\n    "calendar": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" },\n    "checklist": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" },\n    "linking": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" },\n    "overview": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" },\n    "contentAudit": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" },\n    "roadmap": { "rating": "accurate|partial|inaccurate", "reasoning": "<evidence>", "suggestedFix": "<actionable fix or null>" }\n  }\n}`,
        },
      ],
    });

    const raw = response.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as QualityAnalysisResult;
  } catch (err) {
    console.error("[QualityLearning] Analysis failed:", err);
    return null;
  }
}

// ─── Extract and store criteria from analysis ─────────────────────────────────

export async function extractAndStoreCriteria(
  auditId: number,
  domain: string,
  analysis: QualityAnalysisResult
): Promise<number> {
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return 0;

  const { auditCriteria, qualityInsights } = await import("../drizzle/schema");

  let criteriaCount = 0;
  const failingSections = Object.entries(analysis.sections).filter(
    ([, s]) => s.rating === "inaccurate" || s.rating === "partial"
  );

  for (const [sectionName, section] of failingSections) {
    if (!section.suggestedFix) continue;
    try {
      await db.insert(auditCriteria).values({
        domain,
        sectionName,
        issueType: section.rating === "inaccurate" ? "inaccurate_output" : "partial_output",
        description: section.reasoning,
        suggestedFix: section.suggestedFix,
        severity: section.rating === "inaccurate" ? "high" : "medium",
        learnedFromAuditId: auditId,
        active: true,
      });
      criteriaCount++;
    } catch (err) {
      console.error(`[QualityLearning] Failed to insert criteria for ${sectionName}:`, err);
    }
  }

  // Store the full insight record
  try {
    await db.insert(qualityInsights).values({
      auditId,
      overallAccuracy: analysis.overallAccuracy,
      overallSummary: analysis.overallSummary,
      sectionResults: analysis.sections as any,
      criteriaExtracted: criteriaCount,
      triggeredBy: "auto",
    });
  } catch (err) {
    console.error("[QualityLearning] Failed to insert quality insight:", err);
  }

  return criteriaCount;
}

// ─── Load known criteria for a domain ────────────────────────────────────────

export async function loadCriteriaForDomain(domain: string): Promise<Array<{
  sectionName: string;
  issueType: string;
  description: string;
  suggestedFix: string | null;
  severity: string;
}>> {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return [];

    const { auditCriteria } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    const rows = await db
      .select()
      .from(auditCriteria)
      .where(and(eq(auditCriteria.domain, domain), eq(auditCriteria.active, true)))
      .orderBy(auditCriteria.createdAt)
      .limit(30);

    return rows.map(r => ({
      sectionName: r.sectionName,
      issueType: r.issueType,
      description: r.description,
      suggestedFix: r.suggestedFix ?? null,
      severity: r.severity,
    }));
  } catch (err) {
    console.error("[QualityLearning] Failed to load criteria:", err);
    return [];
  }
}

// ─── Format criteria as LLM context injection ─────────────────────────────────

export function formatCriteriaAsContext(criteria: Array<{
  sectionName: string;
  description: string;
  suggestedFix: string | null;
  severity: string;
}>): string {
  if (criteria.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const c of criteria) {
    if (!grouped[c.sectionName]) grouped[c.sectionName] = [];
    const fix = c.suggestedFix ? ` FIX: ${c.suggestedFix}` : "";
    grouped[c.sectionName].push(`[${c.severity.toUpperCase()}] ${c.description}${fix}`);
  }

  const lines = Object.entries(grouped).map(([section, issues]) =>
    `${section.toUpperCase()} SECTION KNOWN ISSUES:\n${issues.map(i => `  - ${i}`).join("\n")}`
  );

  return `\n\n⚠️ PREVIOUSLY IDENTIFIED ISSUES FOR THIS DOMAIN (apply these corrections):\n${lines.join("\n\n")}`;
}

// ─── Full post-audit pipeline ─────────────────────────────────────────────────

export async function runPostAuditQualityPipeline(audit: {
  id: number;
  url: string;
  industry: string;
  overallScore: number;
  siteContext: unknown;
  keywords: unknown;
  metadata: unknown;
  calendar: unknown;
  checklist: unknown;
  linking: unknown;
  overview: unknown;
  contentAudit: unknown;
  roadmap: unknown;
}): Promise<void> {
  const domain = normalizeDomain(audit.url);
  console.log(`[QualityLearning] Starting post-audit pipeline for ${domain} (audit #${audit.id})`);

  const analysis = await runAccuracyAnalysis(audit);
  if (!analysis) {
    console.warn(`[QualityLearning] Analysis returned null for audit #${audit.id}`);
    return;
  }

  const count = await extractAndStoreCriteria(audit.id, domain, analysis);
  console.log(`[QualityLearning] Extracted ${count} criteria for ${domain} from audit #${audit.id}. Overall accuracy: ${analysis.overallAccuracy}%`);
}
