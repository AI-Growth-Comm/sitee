import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "starter", "pro", "agency"]).default("free").notNull(),
  auditsUsed: int("auditsUsed").default(0).notNull(),
  auditsLimit: int("auditsLimit").default(3).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  url: varchar("url", { length: 2048 }).notNull(),
  industry: varchar("industry", { length: 128 }).notNull(),
  customIndustry: varchar("customIndustry", { length: 256 }),
  overallScore: int("overallScore").default(0).notNull(),
  overview: json("overview"),
  contentAudit: json("contentAudit"),
  keywords: json("keywords"),
  metadata: json("metadata"),
  schemaData: json("schemaData"),
  calendar: json("calendar"),
  checklist: json("checklist"),
  linking: json("linking"),
  roadmap: json("roadmap"),
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"])
    .default("pending")
    .notNull(),
  errorMsg: text("errorMsg"),
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;

export const checklistProgress = mysqlTable("checklist_progress", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId")
    .notNull()
    .references(() => audits.id),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  itemId: varchar("itemId", { length: 16 }).notNull(),
  done: boolean("done").default(false).notNull(),
  doneAt: timestamp("doneAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistProgress = typeof checklistProgress.$inferSelect;
export type InsertChecklistProgress = typeof checklistProgress.$inferInsert;

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId")
    .notNull()
    .references(() => audits.id),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 256 }).notNull(),
  clientName: varchar("clientName", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
