import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  claimAudit,
  createAudit,
  deleteReport,
  getAuditById,
  getAuditReview,
  getChecklistProgress,
  getReportById,
  listAllAuditsForAdmin,
  listAuditReviews,
  listAuditsByDomain,
  countAuditsByDomain,
  listAuditsForUser,
  listRecentAudits,
  listReportsForUser,
  saveReport,
  updateAuditResults,
  updateAuditStatus,
  upsertAuditReview,
  upsertChecklistItem,
} from "./db";
import { runFullAudit } from "./auditEngine";
import { runPostAuditQualityPipeline, loadCriteriaForDomain, formatCriteriaAsContext, normalizeDomain } from "./qualityLearningEngine";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),

  audit: router({
    // Run a full SEO audit
      run: publicProcedure
      .input(
        z.object({
          url: z.string().url("Please enter a valid URL"),
          industry: z.string().min(1, "Please select an industry"),
          customIndustry: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id ?? null;
        const startTime = Date.now();
        // Build the effective industry context for the AI engine
        const effectiveIndustry =
          input.industry === "Other" && input.customIndustry?.trim()
            ? input.customIndustry.trim()
            : input.industry;
        // Generate a guest token for unauthenticated users so they can claim later
        const guestToken = userId === null
          ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
          : null;
        if (guestToken) {
          ctx.res.cookie("sitee_guest_token", guestToken, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });
        }
        const auditId = await createAudit({
          userId,
          url: input.url,
          industry: input.industry,
          customIndustry: input.customIndustry ?? null,
          guestToken,
        });
        await updateAuditStatus(auditId, "running");
        try {
          // Load known quality criteria for this domain and inject into audit
          const domain = normalizeDomain(input.url);
          const knownCriteria = await loadCriteriaForDomain(domain);
          const criteriaContext = formatCriteriaAsContext(knownCriteria);
          const result = await runFullAudit(input.url, effectiveIndustry, criteriaContext);
          const durationMs = Date.now() - startTime;

          await updateAuditResults(auditId, {
            overallScore: result.overallScore,
            overview: result.overview,
            contentAudit: result.contentAudit,
            keywords: result.keywords,
            metadata: result.metadata,
            schemaData: result.schemaData,
            calendar: result.calendar,
            checklist: result.checklist,
            linking: result.linking,
            roadmap: result.roadmap,
            durationMs,
          });

          // Fire-and-forget: run quality analysis pipeline after audit completes
          // This stores insights and extracts criteria for future improvement
          setImmediate(async () => {
            try {
              const fullAudit = await getAuditById(auditId);
              if (fullAudit) {
                await runPostAuditQualityPipeline({
                  id: fullAudit.id,
                  url: fullAudit.url,
                  industry: fullAudit.industry,
                  overallScore: fullAudit.overallScore,
                  siteContext: fullAudit.siteContext,
                  keywords: fullAudit.keywords,
                  metadata: fullAudit.metadata,
                  calendar: fullAudit.calendar,
                  checklist: fullAudit.checklist,
                  linking: fullAudit.linking,
                  overview: fullAudit.overview,
                  contentAudit: fullAudit.contentAudit,
                  roadmap: fullAudit.roadmap,
                });
              }
            } catch (err) {
              console.error("[PostAuditQuality] Pipeline error:", err);
            }
          });

          return { auditId, overallScore: result.overallScore };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          await updateAuditStatus(auditId, "failed", msg);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
        }
      }),

    // Get a single audit by ID
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const audit = await getAuditById(input.id);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });

        // Guests get teaser data only (partial results)
        if (!ctx.user) {
          const overview = audit.overview as any;
          const keywords = audit.keywords as any;
          return {
            isTeaser: true as const,
            audit: {
              id: audit.id,
              url: audit.url,
              industry: audit.industry,
              customIndustry: audit.customIndustry,
              overallScore: audit.overallScore,
              status: audit.status,
              createdAt: audit.createdAt,
            },
            teaserData: {
              overallScore: audit.overallScore,
              summary: overview?.summary ?? null,
              keyInsight: overview?.keyInsight ?? null,
              seoMaturity: overview?.seoMaturity ?? null,
              dimensions: (overview?.dimensions ?? []).slice(0, 4),
              keywords: (keywords?.opportunities ?? []).slice(0, 4),
              keywordStrategy: (keywords as any)?.strategy ?? null,
            },
            checklistDoneMap: {} as Record<string, boolean>,
          };
        }

        let checklistDoneMap: Record<string, boolean> = {};
        if (audit.checklist) {
          const progress = await getChecklistProgress(input.id, ctx.user.id);
          for (const p of progress) {
            checklistDoneMap[p.itemId] = p.done;
          }
        }

         // Data isolation: signed-in users can only see their own audits
        if (audit.userId !== null && audit.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return { isTeaser: false as const, audit, checklistDoneMap };
      }),
    // Claim a guest audit after sign-in
    claim: publicProcedure
      .input(z.object({ auditId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be signed in to claim" });
        const claimed = await claimAudit(input.auditId, ctx.user.id);
        return { claimed };
      }),

    // List all audits for the current user (history)
    list: protectedProcedure.query(async ({ ctx }) => {
      return listAuditsForUser(ctx.user.id, 20);
    }),

    // List audits for the same domain as a given URL (domain-scoped history)
    listByDomain: protectedProcedure
      .input(z.object({ url: z.string() }))
      .query(async ({ input, ctx }) => {
        return listAuditsByDomain(ctx.user.id, input.url, 100);
      }),

    // Count how many times the current user has audited a specific domain
    domainStats: protectedProcedure
      .input(z.object({ url: z.string() }))
      .query(async ({ input, ctx }) => {
        const count = await countAuditsByDomain(ctx.user.id, input.url);
        return { count };
      }),

    // Get recent audits for landing page panel
    recent: publicProcedure.query(async ({ ctx }) => {
      return listRecentAudits(ctx.user?.id ?? null, 3);
    }),

    // Update a checklist item's done state
    toggleChecklist: protectedProcedure
      .input(z.object({ auditId: z.number(), itemId: z.string(), done: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await upsertChecklistItem({
          auditId: input.auditId,
          userId: ctx.user.id,
          itemId: input.itemId,
          done: input.done,
        });
        return { success: true };
      }),

    // Export checklist as CSV data
    exportCsv: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const audit = await getAuditById(input.id);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND" });

        const checklist = audit.checklist as {
          items: Array<{
            id: string; category: string; task: string;
            priority: string; phase: string; impact: string; done: boolean;
          }>;
        } | null;

        if (!checklist?.items) return { csv: "" };

        let doneMap: Record<string, boolean> = {};
        if (ctx.user) {
          const progress = await getChecklistProgress(input.id, ctx.user.id);
          for (const p of progress) doneMap[p.itemId] = p.done;
        }

        const rows = [
          ["ID", "Category", "Task", "Priority", "Phase", "Impact", "Done"],
          ...checklist.items.map((item) => [
            item.id,
            item.category,
            `"${item.task}"`,
            item.priority,
            item.phase,
            `"${item.impact}"`,
            (doneMap[item.id] ?? item.done) ? "Yes" : "No",
          ]),
        ];

        return { csv: rows.map((r) => r.join(",")).join("\n") };
      }),
  }),

  // ─── Reports ─────────────────────────────────────────────────────────────────
  report: router({
    // Save a report for an audit
    save: protectedProcedure
      .input(z.object({
        auditId: z.number(),
        title: z.string().min(1).max(256),
        clientName: z.string().min(1).max(256),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify the audit exists
        const audit = await getAuditById(input.auditId);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
        if (audit.status !== "complete") throw new TRPCError({ code: "BAD_REQUEST", message: "Audit is not complete" });

        const reportId = await saveReport({
          auditId: input.auditId,
          userId: ctx.user.id,
          title: input.title,
          clientName: input.clientName,
        });

        return { reportId };
      }),

    // List all saved reports for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return listReportsForUser(ctx.user.id, 50);
    }),

    // Get a single report with its audit data
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const report = await getReportById(input.id);
        if (!report) throw new TRPCError({ code: "NOT_FOUND" });
        if (report.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        const audit = await getAuditById(report.auditId);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit data not found" });

        let checklistDoneMap: Record<string, boolean> = {};
        if (audit.checklist) {
          const progress = await getChecklistProgress(report.auditId, ctx.user.id);
          for (const p of progress) checklistDoneMap[p.itemId] = p.done;
        }

        return { report, audit, checklistDoneMap };
      }),

    // Delete a saved report
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteReport(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Audit Quality Control (admin only) ─────────────────────────────────────────
  quality: router({
    // List all completed audits for admin review
    listAudits: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return listAllAuditsForAdmin(100);
    }),

    // Get a specific audit with full data + existing review for admin
    getAuditForReview: protectedProcedure
      .input(z.object({ auditId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const audit = await getAuditById(input.auditId);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
        const review = await getAuditReview(input.auditId, ctx.user.id);
        return { audit, review };
      }),

    // Submit or update an accuracy review for an audit
    submitReview: protectedProcedure
      .input(z.object({
        auditId: z.number(),
        sectionFlags: z.record(z.string(), z.object({
          rating: z.enum(["accurate", "partial", "inaccurate"]),
          notes: z.string(),
        })),
        overallAccuracy: z.number().min(0).max(100),
        notes: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const reviewId = await upsertAuditReview({
          auditId: input.auditId,
          reviewerId: ctx.user.id,
          sectionFlags: input.sectionFlags as Record<string, { rating: string; notes: string }>,
          overallAccuracy: input.overallAccuracy,
          notes: input.notes,
        });
        return { reviewId };
      }),

    // List all submitted reviews
    listReviews: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return listAuditReviews(50);
    }),

    // AI-powered section-by-section accuracy analysis
    analyzeAccuracy: protectedProcedure
      .input(z.object({ auditId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const audit = await getAuditById(input.auditId);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });

        const siteContext = audit.siteContext as Record<string, unknown> | null;
        const keywords = audit.keywords as Record<string, unknown> | null;
        const metadata = audit.metadata as Record<string, unknown> | null;
        const calendar = audit.calendar as Record<string, unknown> | null;
        const checklist = audit.checklist as Record<string, unknown> | null;
        const linking = audit.linking as Record<string, unknown> | null;
        const overview = audit.overview as Record<string, unknown> | null;
        const contentAudit = audit.contentAudit as Record<string, unknown> | null;
        const roadmap = audit.roadmap as Record<string, unknown> | null;

        const contextSummary = siteContext
          ? `SCRAPED SITE DATA:\n- Title: ${(siteContext as any).title ?? "N/A"}\n- Meta Description: ${(siteContext as any).metaDescription ?? "N/A"}\n- H1: ${(siteContext as any).h1 ?? "N/A"}\n- H2s: ${((siteContext as any).h2s ?? []).slice(0, 5).join(", ")}\n- Body text excerpt: ${((siteContext as any).bodyText ?? "").slice(0, 600)}\n- Pages found: ${((siteContext as any).pages ?? []).map((p: any) => p.url).join(", ")}\n- Scrape error: ${(siteContext as any).scrapeError ?? "none"}`
          : "No scraped site data available.";

        const auditSummary = JSON.stringify({
          url: audit.url,
          industry: audit.industry,
          overallScore: audit.overallScore,
          keywords: keywords ? { topKeywords: (keywords as any).topKeywords?.slice(0, 5) } : null,
          metadata: metadata ? { pages: (metadata as any).pages?.slice(0, 3) } : null,
          calendar: calendar ? { strategy: (calendar as any).strategy, itemCount: (calendar as any).items?.length } : null,
          checklist: checklist ? { itemCount: (checklist as any).items?.length } : null,
          linking: linking ? { totalLinks: (linking as any).totalInternalLinks } : null,
          overview: overview ? { summary: (overview as any).summary } : null,
          contentAudit: contentAudit ? { executiveSummary: (contentAudit as any).executiveSummary } : null,
          roadmap: roadmap ? { phase1Count: (roadmap as any).phase1?.length } : null,
        }, null, 2);

        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an SEO audit quality analyst. You will be given scraped data from a website and the AI-generated audit results. Your job is to evaluate whether each section of the audit is accurate, partially accurate, or inaccurate based on the actual site data. Be specific and cite evidence from the scraped data. Respond ONLY with valid JSON matching the schema exactly.`,
            },
            {
              role: "user",
              content: `Evaluate the accuracy of this SEO audit.\n\n${contextSummary}\n\nAUDIT OUTPUT:\n${auditSummary}\n\nReturn JSON with this exact structure:\n{\n  "overallAccuracy": <number 0-100>,\n  "overallSummary": "<2-3 sentence overall assessment>",\n  "sections": {\n    "keywords": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" },\n    "metadata": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" },\n    "calendar": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" },\n    "checklist": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" },\n    "linking": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" },\n    "overview": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" },\n    "contentAudit": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" },\n    "roadmap": { "rating": "accurate|partial|inaccurate", "reasoning": "<specific evidence>" }\n  }\n}`,
            },
          ],
        });

        const raw = response.choices?.[0]?.message?.content ?? "{}";
        let analysis: Record<string, unknown>;
        try {
          // Strip markdown code fences if present
          const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          analysis = JSON.parse(cleaned);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON. Try again." });
        }
        return analysis as {
          overallAccuracy: number;
          overallSummary: string;
          sections: Record<string, { rating: string; reasoning: string }>;
        };
      }),

    // Get quality insights for a specific audit (auto-generated after completion)
    getInsights: protectedProcedure
      .input(z.object({ auditId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return null;
        const { qualityInsights } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db.select().from(qualityInsights).where(eq(qualityInsights.auditId, input.auditId)).limit(5);
        return rows[0] ?? null;
      }),

    // Get all learned criteria for a domain
    getCriteriaForDomain: protectedProcedure
      .input(z.object({ domain: z.string() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        const { auditCriteria } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        return db.select().from(auditCriteria).where(eq(auditCriteria.domain, input.domain)).orderBy(auditCriteria.createdAt).limit(50);
      }),

    // Dismiss (deactivate) a learned criterion
    dismissCriteria: protectedProcedure
      .input(z.object({ criteriaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { auditCriteria } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(auditCriteria).set({ active: false }).where(eq(auditCriteria.id, input.criteriaId));
        return { success: true };
      }),
  }),

  // ─── Audit delete ────────────────────────────────────────────────────────────
  auditDelete: router({
    delete: protectedProcedure
      .input(z.object({ auditId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { audits: auditsTable } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        // Only allow deleting own audits
        await db.delete(auditsTable).where(
          and(eq(auditsTable.id, input.auditId), eq(auditsTable.userId, ctx.user.id))
        );
        return { success: true };
      }),
  }),

  // ─── Dashboard (user dashboard) ─────────────────────────────────────────────────────
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [allAudits, allReports] = await Promise.all([
        listAuditsForUser(ctx.user.id, 1000),
        listReportsForUser(ctx.user.id, 1000),
      ]);
      return {
        auditsUsed: allAudits.length,
        auditsLimit: 50,
        recentAudits: allAudits.slice(0, 5),
        allAudits,
        savedReports: allReports.slice(0, 5),
        allReports,
        user: ctx.user,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
