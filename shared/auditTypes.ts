// Shared TypeScript interfaces matching the JSONB column contracts from the PRD

export interface DimensionScore {
  name: string;
  score: number;
  note: string;
}

export interface Overview {
  summary: string;
  keyInsight: string;
  overallScore: number;
  dimensions: DimensionScore[];
}

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

export interface InternalLinking {
  clusters: TopicalCluster[];
  immediateActions: ImmediateAction[];
}

export interface AuditData {
  id: number;
  userId: number | null;
  url: string;
  industry: string;
  overallScore: number;
  overview: Overview | null;
  keywords: Keywords | null;
  metadata: Metadata | null;
  schemaData: SchemaData | null;
  calendar: ContentCalendar | null;
  checklist: Checklist | null;
  linking: InternalLinking | null;
  status: "pending" | "running" | "complete" | "failed";
  errorMsg: string | null;
  durationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  "Indexation",
  "Metadata",
  "Content Depth",
  "Internal Links",
  "Topical Authority",
  "Local/Niche SEO",
  "Technical SEO",
  "Competitor Gap",
] as const;
