import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAudit,
  deleteReport,
  getAuditById,
  getChecklistProgress,
  getReportById,
  listAuditsForUser,
  listRecentAudits,
  listReportsForUser,
  saveReport,
  updateAuditResults,
  updateAuditStatus,
  upsertChecklistItem,
} from "./db";
import { runFullAudit } from "./auditEngine";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
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
        const auditId = await createAudit({
          userId,
          url: input.url,
          industry: input.industry,
          customIndustry: input.customIndustry ?? null,
        });
        await updateAuditStatus(auditId, "running");
        try {
          const result = await runFullAudit(input.url, effectiveIndustry);
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

        let checklistDoneMap: Record<string, boolean> = {};
        if (ctx.user && audit.checklist) {
          const progress = await getChecklistProgress(input.id, ctx.user.id);
          for (const p of progress) {
            checklistDoneMap[p.itemId] = p.done;
          }
        }

        return { audit, checklistDoneMap };
      }),

    // List all audits for the current user (history)
    list: protectedProcedure.query(async ({ ctx }) => {
      return listAuditsForUser(ctx.user.id, 20);
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
});

export type AppRouter = typeof appRouter;
