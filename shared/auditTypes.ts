// Shared TypeScript interfaces matching the JSONB column contracts

export interface DimensionScore {
  name: string;
  score: number; // out of 10
  status: "Good" | "Improve" | "Needs Rewrite" | "Critical Gap" | "Underdeveloped";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "Maintain";
  note: string;
}

export interface Overview {
  summary: string;
  keyInsight: string;
  overallScore: number; // 0-100
  seoMaturity: "Low" | "Medium" | "High";
  dimensions: DimensionScore[];
}

// ─── Module 1: Content Audit ──────────────────────────────────────────────────

export interface PageInventoryItem {
  page: string;
  url: string;
  currentSeoValue: string;
  status: "Good" | "Improve" | "Critical Gap" | "Needs Work" | "Underperforming" | "Underlinked" | "Misused";
  recommendedAction: string;
}

export interface CompetitorGap {
  competitor: string;
  ranksFor: string;
  gapType: "Cannot Win" | "Content Gap" | "Partial Gap";
  opportunity: string;
}

export interface KeywordTierItem {
  keyword: string;
  estimatedVolume: string;
  estimatedKD: number;
  recommendedContent: string;
}

export interface ContentAudit {
  executiveSummary: string;
  pageInventory: PageInventoryItem[];
  competitorGaps: CompetitorGap[];
  keywordTier1: KeywordTierItem[]; // Buyer Intent
  keywordTier2: KeywordTierItem[]; // Seller Intent
  keywordTier3: KeywordTierItem[]; // Informational / Research
}

// ─── Module 2: Keywords & Metadata ───────────────────────────────────────────

export interface KeywordOpportunity {
  keyword: string;
  volume: string;
  difficulty: number;
  intent: "Informational" | "Commercial" | "Navigational" | "Transactional";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  contentType: string;
  cluster: string;
}

export interface Keywords {
  strategy: string;
  opportunities: KeywordOpportunity[];
}

export interface MetadataPage {
  page: string;
  url: string;
  currentTitle: string;
  currentDesc: string;
  optimizedTitle: string;
  optimizedDesc: string;
  titleChars: number;
  descChars: number;
  issue: "No keyword" | "Too long" | "Too short" | "Missing" | "Generic" | string;
}

export interface Metadata {
  note: string;
  pages: MetadataPage[];
}

// ─── Module 3: Schema ─────────────────────────────────────────────────────────

export interface SchemaItem {
  type: string;
  page: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  code: string;
}

export interface SchemaData {
  recommendation: string;
  schemas: SchemaItem[];
}

// ─── Module 4: Content Calendar ───────────────────────────────────────────────

export interface CalendarItem {
  week: number;
  title: string;
  keyword: string;
  wordCount: number;
  type: "Pillar" | "Cluster" | "How-To" | "Guide" | "Report";
  cluster: string;
  internalLinks: string[];
}

export interface ContentCalendar {
  strategy: string;
  items: CalendarItem[];
}

// ─── Module 5: Checklist ──────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  category: "Technical" | "On-Page" | "Content" | "Internal Links" | "Schema";
  task: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  phase: "Week 1-3" | "Week 4-8" | "Week 9-12";
  impact: string;
  done: boolean;
}

export interface Checklist {
  items: ChecklistItem[];
}

// ─── Module 6: Internal Linking ───────────────────────────────────────────────

export interface TopicalCluster {
  name: string;
  pillar: string;
  articles: string[];
}

export interface ImmediateAction {
  from: string;
  to: string;
  anchor: string;
  placement: string;
}

export interface ClusterPillarItem {
  contentPiece: string;
  targetKeyword: string;
  linkingBehavior: string;
}

export interface ClusterPillar {
  name: string;
  items: ClusterPillarItem[];
}

export interface CrossLinkItem {
  page: string;
  crossLinksTo: string[];
}

export interface InternalLinking {
  clusters: TopicalCluster[];
  immediateActions: ImmediateAction[];
  clusterPillars?: ClusterPillar[];
  crossLinkMap?: CrossLinkItem[];
}

// ─── Module 7: Action Roadmap ─────────────────────────────────────────────────

export interface RoadmapAction {
  action: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  platform: string;
}

export interface RoadmapPhase {
  phase: string; // e.g. "Phase 1 — Foundation (Weeks 1–3)"
  subtitle: string;
  actions: RoadmapAction[];
}

export interface RoadmapBlogItem {
  title: string;
  targetKeyword: string;
  cluster: string;
  estimatedWords: number;
}

export interface KpiRow {
  metric: string;
  baseline: string;
  target30Day: string;
  target90Day: string;
}

export interface ActionRoadmap {
  phases: RoadmapPhase[];
  phase2Blog: RoadmapBlogItem[];
  phase3Blog: RoadmapBlogItem[];
  kpis: KpiRow[];
}

// ─── Full Audit Data ──────────────────────────────────────────────────────────

export interface AuditData {
  id: number;
  userId: number | null;
  url: string;
  industry: string;
  overallScore: number;
  overview: Overview | null;
  contentAudit: ContentAudit | null;
  keywords: Keywords | null;
  metadata: Metadata | null;
  schemaData: SchemaData | null;
  calendar: ContentCalendar | null;
  checklist: Checklist | null;
  linking: InternalLinking | null;
  roadmap: ActionRoadmap | null;
  status: "pending" | "running" | "complete" | "failed";
  errorMsg: string | null;
  durationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Saved Report ─────────────────────────────────────────────────────────────

export interface SavedReport {
  id: number;
  auditId: number;
  userId: number;
  title: string;
  clientName: string;
  savedAt: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const INDUSTRIES = [
  "Real Estate",
  "SaaS",
  "E-commerce",
  "Legal",
  "Healthcare",
  "Marketing Agency",
  "Finance",
  "Restaurant",
  "Education",
  "General Business",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const DIMENSION_NAMES = [
  "Site Indexation",
  "Metadata",
  "Content Depth",
  "Internal Links",
  "Topical Authority",
  "Local/Niche SEO",
  "Technical SEO",
  "Competitor Gap",
] as const;
