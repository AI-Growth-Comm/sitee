import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { audits, checklistProgress, reports, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Audit helpers ────────────────────────────────────────────────────────────

export async function createAudit(data: {
  userId: number | null;
  url: string;
  industry: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(audits).values({
    userId: data.userId,
    url: data.url,
    industry: data.industry,
    overallScore: 0,
    status: "pending",
  });
  return result[0].insertId as number;
}

export async function updateAuditStatus(
  id: number,
  status: "pending" | "running" | "complete" | "failed",
  errorMsg?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(audits).set({ status, errorMsg: errorMsg ?? null }).where(eq(audits.id, id));
}

export async function updateAuditResults(
  id: number,
  data: {
    overallScore: number;
    overview: unknown;
    contentAudit: unknown;
    keywords: unknown;
    metadata: unknown;
    schemaData: unknown;
    calendar: unknown;
    checklist: unknown;
    linking: unknown;
    roadmap: unknown;
    durationMs: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(audits)
    .set({
      overallScore: data.overallScore,
      overview: data.overview,
      contentAudit: data.contentAudit,
      keywords: data.keywords,
      metadata: data.metadata,
      schemaData: data.schemaData,
      calendar: data.calendar,
      checklist: data.checklist,
      linking: data.linking,
      roadmap: data.roadmap,
      durationMs: data.durationMs,
      status: "complete",
    })
    .where(eq(audits.id, id));
}

export async function getAuditById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function listAuditsForUser(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(audits)
    .where(eq(audits.userId, userId))
    .orderBy(desc(audits.createdAt))
    .limit(limit);
}

export async function listRecentAudits(userId: number | null, limit = 3) {
  const db = await getDb();
  if (!db) return [];
  const selectFields = {
    id: audits.id,
    url: audits.url,
    industry: audits.industry,
    overallScore: audits.overallScore,
    createdAt: audits.createdAt,
  };
  if (userId) {
    return db
      .select(selectFields)
      .from(audits)
      .where(and(eq(audits.userId, userId), eq(audits.status, "complete")))
      .orderBy(desc(audits.createdAt))
      .limit(limit);
  }
  return db
    .select(selectFields)
    .from(audits)
    .where(eq(audits.status, "complete"))
    .orderBy(desc(audits.createdAt))
    .limit(limit);
}

// ─── Checklist progress helpers ───────────────────────────────────────────────

export async function getChecklistProgress(auditId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(checklistProgress)
    .where(and(eq(checklistProgress.auditId, auditId), eq(checklistProgress.userId, userId)));
}

export async function upsertChecklistItem(data: {
  auditId: number;
  userId: number;
  itemId: string;
  done: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(checklistProgress)
    .where(and(
      eq(checklistProgress.auditId, data.auditId),
      eq(checklistProgress.userId, data.userId),
      eq(checklistProgress.itemId, data.itemId)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(checklistProgress)
      .set({ done: data.done, doneAt: data.done ? new Date() : null })
      .where(and(
        eq(checklistProgress.auditId, data.auditId),
        eq(checklistProgress.userId, data.userId),
        eq(checklistProgress.itemId, data.itemId)
      ));
  } else {
    await db.insert(checklistProgress).values({
      auditId: data.auditId,
      userId: data.userId,
      itemId: data.itemId,
      done: data.done,
      doneAt: data.done ? new Date() : null,
    });
  }
}

// ─── Report helpers ───────────────────────────────────────────────────────────

export async function saveReport(data: {
  auditId: number;
  userId: number;
  title: string;
  clientName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reports).values(data);
  return result[0].insertId as number;
}

export async function listReportsForUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

export async function deleteReport(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reports).where(and(eq(reports.id, id), eq(reports.userId, userId)));
}

export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
