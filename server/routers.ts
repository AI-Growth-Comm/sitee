import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAudit,
  getAuditById,
  getChecklistProgress,
  listAuditsForUser,
  listRecentAudits,
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
    // Run a full SEO audit (can be used by guests too, but saves to DB if logged in)
    run: publicProcedure
      .input(
        z.object({
          url: z.string().url("Please enter a valid URL"),
          industry: z.string().min(1, "Please select an industry"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id ?? null;
        const startTime = Date.now();

        // Create audit record
        const auditId = await createAudit({
          userId,
          url: input.url,
          industry: input.industry,
        });

        await updateAuditStatus(auditId, "running");

        try {
          const result = await runFullAudit(input.url, input.industry);
          const durationMs = Date.now() - startTime;

          await updateAuditResults(auditId, {
            overallScore: result.overallScore,
            overview: result.overview,
            keywords: result.keywords,
            metadata: result.metadata,
            schemaData: result.schemaData,
            calendar: result.calendar,
            checklist: result.checklist,
            linking: result.linking,
            durationMs,
          });

          return { auditId, overallScore: result.overallScore };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          await updateAuditStatus(auditId, "failed", msg);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: msg,
          });
        }
      }),

    // Get a single audit by ID
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const audit = await getAuditById(input.id);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });

        // Merge checklist progress if user is logged in
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
      .input(
        z.object({
          auditId: z.number(),
          itemId: z.string(),
          done: z.boolean(),
        })
      )
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

        const checklist = audit.checklist as { items: Array<{
          id: string; category: string; task: string;
          priority: string; phase: string; impact: string; done: boolean;
        }> } | null;

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
});

export type AppRouter = typeof appRouter;
