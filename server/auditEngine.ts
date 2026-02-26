import { invokeLLM } from "./_core/llm";
import type {
  Overview,
  Keywords,
  Metadata,
  SchemaData,
  ContentCalendar,
  Checklist,
  InternalLinking,
} from "../shared/auditTypes";

// ─── Resilient JSON parser (tryParse) ─────────────────────────────────────────
// Handles: markdown fences, prose prefix, partially truncated output
function tryParse<T>(raw: string): T | null {
  // 1. Strip ALL backtick fences globally
  let t = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  // 2. Slice from first { to last }
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  const slice = t.slice(s, e + 1);
  // 3. Direct parse (fast path)
  try {
    return JSON.parse(slice) as T;
  } catch (_) {}
  // 4. Walk chars to find last balanced close brace
  let depth = 0;
  let inStr = false;
  let esc = false;
  let last = -1;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) last = i;
    }
  }
  if (last > 0) {
    try {
      return JSON.parse(slice.slice(0, last + 1)) as T;
    } catch (_) {}
  }
  return null; // never throws — callers handle null
}

// ─── Helper: call LLM with assistant-prefill trick ───────────────────────────
async function callLLM<T>(
  url: string,
  industry: string,
  instruction: string,
  exampleJson: string,
  maxTokens: number
): Promise<T | null> {
  const prompt = `URL: ${url} | Industry: ${industry}\n${instruction}\nReturn this exact JSON shape:\n${exampleJson}`;
  
  try {
    const response = await invokeLLM({
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
      response_format: undefined,
    } as Parameters<typeof invokeLLM>[0]);

    const raw = "{" + (response.choices?.[0]?.message?.content ?? "");
    return tryParse<T>(raw);
  } catch (err) {
    console.error("[AuditEngine] LLM call failed:", err);
    return null;
  }
}

// ─── Call 1: Overview ─────────────────────────────────────────────────────────
export async function runOverviewCall(url: string, industry: string): Promise<Overview | null> {
  return callLLM<Overview>(
    url,
    industry,
    `You are an expert SEO auditor. Analyze this website and return an SEO health overview with scores for all 8 dimensions. Every string field max 8 words. Dimension names must be exactly: Indexation, Metadata, Content Depth, Internal Links, Topical Authority, Local/Niche SEO, Technical SEO, Competitor Gap.`,
    `{"summary":"Two sentence AI summary of the site.","keyInsight":"One sentence key insight.","overallScore":72,"dimensions":[{"name":"Indexation","score":80,"note":"Good crawlability"},{"name":"Metadata","score":65,"note":"Titles need work"},{"name":"Content Depth","score":70,"note":"Decent depth"},{"name":"Internal Links","score":55,"note":"Sparse linking"},{"name":"Topical Authority","score":75,"note":"Strong niche focus"},{"name":"Local/Niche SEO","score":60,"note":"Local signals weak"},{"name":"Technical SEO","score":78,"note":"Fast load times"},{"name":"Competitor Gap","score":50,"note":"Missing key topics"}]}`,
    700
  );
}

// ─── Call 2: Keywords ─────────────────────────────────────────────────────────
export async function runKeywordsCall(url: string, industry: string): Promise<Keywords | null> {
  return callLLM<Keywords>(
    url,
    industry,
    `You are an SEO keyword strategist. Return exactly 6 keyword opportunities for this website. Every string field max 5 words. Volume format: "1,200/mo". Difficulty: 1-100 integer. Intent: Informational|Commercial|Navigational|Transactional. Priority: URGENT|HIGH|MEDIUM|LOW.`,
    `{"strategy":"Two sentence keyword strategy for this site.","opportunities":[{"keyword":"best seo tools","volume":"2,400/mo","difficulty":45,"intent":"Commercial","priority":"HIGH","contentType":"Comparison post","cluster":"SEO Tools"},{"keyword":"how to rank google","volume":"1,200/mo","difficulty":38,"intent":"Informational","priority":"URGENT","contentType":"Guide","cluster":"SEO Basics"},{"keyword":"local seo tips","volume":"900/mo","difficulty":32,"intent":"Informational","priority":"HIGH","contentType":"List post","cluster":"Local SEO"},{"keyword":"seo audit checklist","volume":"600/mo","difficulty":28,"intent":"Informational","priority":"MEDIUM","contentType":"Checklist","cluster":"SEO Audit"},{"keyword":"keyword research tool","volume":"3,100/mo","difficulty":62,"intent":"Commercial","priority":"MEDIUM","contentType":"Review","cluster":"SEO Tools"},{"keyword":"on page seo guide","volume":"800/mo","difficulty":35,"intent":"Informational","priority":"LOW","contentType":"Guide","cluster":"On-Page SEO"}]}`,
    900
  );
}

// ─── Call 3: Metadata + Schema ────────────────────────────────────────────────
export async function runMetadataSchemaCall(
  url: string,
  industry: string
): Promise<{ metadata: Metadata; schemaData: SchemaData } | null> {
  const result = await callLLM<{ metadata: Metadata; schemaData: SchemaData }>(
    url,
    industry,
    `You are an SEO metadata and schema expert. Return metadata rewrites for 4 key pages AND 2 schema markup recommendations. Optimized titles max 55 chars. Optimized descriptions max 140 chars. Issue must be one of: No keyword, Too long, Too short, Missing, Generic.`,
    `{"metadata":{"note":"One sentence metadata assessment.","pages":[{"page":"Homepage","url":"/","currentTitle":"Welcome to Our Site","currentDesc":"We offer great services.","optimizedTitle":"Best SEO Agency | Rank Higher Today","optimizedDesc":"Expert SEO services that drive organic traffic. Get a free audit and start ranking on page 1 today.","titleChars":36,"descChars":98,"issue":"No keyword"},{"page":"About","url":"/about","currentTitle":"About Us","currentDesc":"Learn about our company.","optimizedTitle":"About Our SEO Team | 10 Years Experience","optimizedDesc":"Meet our expert SEO team with a decade of experience helping businesses rank on Google.","titleChars":40,"descChars":87,"issue":"Too short"},{"page":"Services","url":"/services","currentTitle":"Our Services","currentDesc":"Check out what we do.","optimizedTitle":"SEO Services | Audit, Content & Link Building","optimizedDesc":"Full-service SEO including technical audits, content strategy, and link building for lasting rankings.","titleChars":45,"descChars":101,"issue":"Generic"},{"page":"Blog","url":"/blog","currentTitle":"Blog","currentDesc":"Read our latest posts.","optimizedTitle":"SEO Blog | Tips, Guides & Case Studies","optimizedDesc":"Expert SEO tips, step-by-step guides, and real case studies to help you rank higher on Google.","titleChars":38,"descChars":93,"issue":"Missing"}]},"schemaData":{"recommendation":"Implement LocalBusiness and Article schema to improve rich results.","schemas":[{"type":"LocalBusiness","page":"Homepage","priority":"HIGH","code":"{\"@context\":\"https://schema.org\",\"@type\":\"LocalBusiness\",\"name\":\"Business Name\",\"url\":\"https://example.com\",\"telephone\":\"+1-555-0100\",\"address\":{\"@type\":\"PostalAddress\",\"streetAddress\":\"123 Main St\",\"addressLocality\":\"City\",\"addressRegion\":\"State\",\"postalCode\":\"12345\"}}"},{"type":"Article","page":"Blog posts","priority":"MEDIUM","code":"{\"@context\":\"https://schema.org\",\"@type\":\"Article\",\"headline\":\"Article Title\",\"author\":{\"@type\":\"Person\",\"name\":\"Author Name\"},\"datePublished\":\"2024-01-01\",\"image\":\"https://example.com/image.jpg\"}"}]}}`,
    1100
  );
  return result;
}

// ─── Call 4: Content Calendar ─────────────────────────────────────────────────
export async function runCalendarCall(
  url: string,
  industry: string
): Promise<ContentCalendar | null> {
  return callLLM<ContentCalendar>(
    url,
    industry,
    `You are a content strategist. Return a 90-day content calendar with exactly 5 articles. Week numbers 1-12. Type must be one of: Pillar|Cluster|How-To|Guide|Report. Word count: 800-3000 integer. internalLinks must be array of exactly 2 page name strings.`,
    `{"strategy":"Two sentence content strategy.","items":[{"week":1,"title":"Complete SEO Audit Guide 2024","keyword":"seo audit guide","wordCount":2500,"type":"Pillar","cluster":"SEO Audit","internalLinks":["Services","Blog"]},{"week":2,"title":"How to Fix Broken Links Fast","keyword":"fix broken links","wordCount":1200,"type":"How-To","cluster":"Technical SEO","internalLinks":["Services","About"]},{"week":4,"title":"Local SEO Checklist for SMBs","keyword":"local seo checklist","wordCount":1800,"type":"Guide","cluster":"Local SEO","internalLinks":["Blog","Services"]},{"week":6,"title":"Keyword Research Tools Compared","keyword":"keyword research tools","wordCount":2000,"type":"Cluster","cluster":"SEO Tools","internalLinks":["Blog","Services"]},{"week":8,"title":"SEO ROI Report 2024","keyword":"seo roi statistics","wordCount":1500,"type":"Report","cluster":"SEO Strategy","internalLinks":["About","Services"]}]}`,
    900
  );
}

// ─── Call 5: Checklist + Internal Linking ─────────────────────────────────────
export async function runChecklistCall(
  url: string,
  industry: string
): Promise<{ checklist: Checklist; linking: InternalLinking } | null> {
  return callLLM<{ checklist: Checklist; linking: InternalLinking }>(
    url,
    industry,
    `You are an SEO action planner. Return exactly 8 prioritized checklist tasks AND an internal linking plan with 2 clusters and 4 immediate actions. Task max 10 words. Category must be: Technical|On-Page|Content|Internal Links|Schema. Priority: URGENT|HIGH|MEDIUM|LOW. Phase: Week 1-3|Week 4-8|Week 9-12.`,
    `{"checklist":{"items":[{"id":"c1","category":"Technical","task":"Fix all broken links and 404 errors","priority":"URGENT","phase":"Week 1-3","impact":"Improves crawlability and UX","done":false},{"id":"c2","category":"Metadata","task":"Rewrite title tags with target keywords","priority":"HIGH","phase":"Week 1-3","impact":"Boosts CTR from search results","done":false},{"id":"c3","category":"Content","task":"Create pillar page for main topic cluster","priority":"HIGH","phase":"Week 1-3","impact":"Establishes topical authority","done":false},{"id":"c4","category":"Technical","task":"Implement XML sitemap and submit to GSC","priority":"HIGH","phase":"Week 1-3","impact":"Faster indexation of all pages","done":false},{"id":"c5","category":"On-Page","task":"Add target keyword to H1 on all pages","priority":"MEDIUM","phase":"Week 4-8","impact":"Stronger relevance signals","done":false},{"id":"c6","category":"Internal Links","task":"Add 3 internal links from homepage","priority":"MEDIUM","phase":"Week 4-8","impact":"Distributes PageRank effectively","done":false},{"id":"c7","category":"Schema","task":"Implement LocalBusiness schema markup","priority":"MEDIUM","phase":"Week 4-8","impact":"Enables rich results in SERP","done":false},{"id":"c8","category":"Content","task":"Publish 2 cluster articles per month","priority":"LOW","phase":"Week 9-12","impact":"Builds long-tail keyword coverage","done":false}]},"linking":{"clusters":[{"name":"SEO Audit","pillar":"Complete SEO Audit Guide","articles":["Technical SEO Checklist","On-Page SEO Guide","SEO Tools Comparison"]},{"name":"Local SEO","pillar":"Local SEO Strategy Guide","articles":["Google My Business Setup","Local Citation Building","Local Keyword Research"]}],"immediateActions":[{"from":"Homepage","to":"Services","anchor":"our SEO services","placement":"Hero section"},{"from":"Blog","to":"Services","anchor":"professional SEO audit","placement":"Last paragraph"},{"from":"About","to":"Services","anchor":"get started today","placement":"CTA section"},{"from":"Services","to":"Blog","anchor":"read our SEO guides","placement":"Bottom of page"}]}}`,
    1100
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export type AuditProgress = {
  stage: string;
  step: number;
  total: number;
};

export type AuditResult = {
  overallScore: number;
  overview: Overview;
  keywords: Keywords;
  metadata: Metadata;
  schemaData: SchemaData;
  calendar: ContentCalendar;
  checklist: Checklist;
  linking: InternalLinking;
};

export async function runFullAudit(
  url: string,
  industry: string,
  onProgress?: (p: AuditProgress) => void
): Promise<AuditResult> {
  const report = (stage: string, step: number) =>
    onProgress?.({ stage, step, total: 5 });

  report("Scoring 8 SEO dimensions...", 1);
  const overview = await runOverviewCall(url, industry);
  if (!overview) throw new Error("Failed to generate SEO overview scores");

  report("Mapping keyword opportunities...", 2);
  const keywords = await runKeywordsCall(url, industry);
  if (!keywords) throw new Error("Failed to generate keyword opportunities");

  report("Rewriting metadata & schema...", 3);
  const metaSchema = await runMetadataSchemaCall(url, industry);
  if (!metaSchema) throw new Error("Failed to generate metadata and schema");

  report("Building content calendar...", 4);
  const calendar = await runCalendarCall(url, industry);
  if (!calendar) throw new Error("Failed to generate content calendar");

  report("Building action checklist...", 5);
  const checklistResult = await runChecklistCall(url, industry);
  if (!checklistResult) throw new Error("Failed to generate checklist");

  return {
    overallScore: overview.overallScore,
    overview,
    keywords,
    metadata: metaSchema.metadata,
    schemaData: metaSchema.schemaData,
    calendar,
    checklist: checklistResult.checklist,
    linking: checklistResult.linking,
  };
}
