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

// ─── Resilient JSON extractor ─────────────────────────────────────────────────
// Handles: markdown fences, prose prefix, partially truncated output
function extractJson<T>(raw: string): T | null {
  if (!raw) return null;

  // 1. Strip markdown code fences
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 2. Find the outermost { ... } block
  const start = text.indexOf("{");
  if (start === -1) return null;

  // 3. Walk to find the matching closing brace
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    // Try to close any open braces/brackets at the end
    const partial = text.slice(start);
    let fixed = partial;
    let d = 0;
    for (const ch of partial) {
      if (ch === "{") d++;
      if (ch === "}") d--;
    }
    for (let i = 0; i < d; i++) fixed += "}";
    try { return JSON.parse(fixed) as T; } catch (_) {}
    return null;
  }

  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch (_) {
    return null;
  }
}

// ─── Core LLM caller ─────────────────────────────────────────────────────────
async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T | null> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return null;
    return extractJson<T>(content);
  } catch (err) {
    console.error("[AuditEngine] LLM call failed:", err);
    return null;
  }
}

// ─── Call 1: Overview ─────────────────────────────────────────────────────────
export async function runOverviewCall(url: string, industry: string): Promise<Overview | null> {
  const system = `You are an expert SEO auditor. When given a website URL and industry, you analyze the site and return a structured JSON SEO health overview. You MUST return ONLY valid JSON with no markdown, no explanation, no code fences. Return the JSON object directly.`;

  const user = `Analyze this website for SEO health:
URL: ${url}
Industry: ${industry}

Return this exact JSON structure (fill in realistic values based on the URL and industry):
{
  "summary": "Two sentence summary of the site's SEO health.",
  "keyInsight": "One actionable key insight for improvement.",
  "overallScore": 68,
  "dimensions": [
    {"name": "Indexation", "score": 75, "note": "Brief note under 8 words"},
    {"name": "Metadata", "score": 60, "note": "Brief note under 8 words"},
    {"name": "Content Depth", "score": 70, "note": "Brief note under 8 words"},
    {"name": "Internal Links", "score": 55, "note": "Brief note under 8 words"},
    {"name": "Topical Authority", "score": 65, "note": "Brief note under 8 words"},
    {"name": "Local/Niche SEO", "score": 50, "note": "Brief note under 8 words"},
    {"name": "Technical SEO", "score": 72, "note": "Brief note under 8 words"},
    {"name": "Competitor Gap", "score": 45, "note": "Brief note under 8 words"}
  ]
}`;

  return callLLM<Overview>(system, user);
}

// ─── Call 2: Keywords ─────────────────────────────────────────────────────────
export async function runKeywordsCall(url: string, industry: string): Promise<Keywords | null> {
  const system = `You are an SEO keyword strategist. When given a website URL and industry, you return exactly 6 keyword opportunities as valid JSON. You MUST return ONLY valid JSON with no markdown, no explanation, no code fences.`;

  const user = `Find keyword opportunities for:
URL: ${url}
Industry: ${industry}

Return this exact JSON structure:
{
  "strategy": "Two sentence keyword strategy tailored to this site and industry.",
  "opportunities": [
    {
      "keyword": "specific keyword phrase",
      "volume": "2,400/mo",
      "difficulty": 45,
      "intent": "Commercial",
      "priority": "HIGH",
      "contentType": "Comparison post",
      "cluster": "Main Topic"
    },
    {
      "keyword": "another keyword",
      "volume": "1,200/mo",
      "difficulty": 38,
      "intent": "Informational",
      "priority": "URGENT",
      "contentType": "Guide",
      "cluster": "Secondary Topic"
    },
    {
      "keyword": "third keyword",
      "volume": "900/mo",
      "difficulty": 32,
      "intent": "Informational",
      "priority": "HIGH",
      "contentType": "List post",
      "cluster": "Topic Cluster"
    },
    {
      "keyword": "fourth keyword",
      "volume": "600/mo",
      "difficulty": 28,
      "intent": "Transactional",
      "priority": "MEDIUM",
      "contentType": "Landing page",
      "cluster": "Conversion"
    },
    {
      "keyword": "fifth keyword",
      "volume": "3,100/mo",
      "difficulty": 62,
      "intent": "Commercial",
      "priority": "MEDIUM",
      "contentType": "Review",
      "cluster": "Product"
    },
    {
      "keyword": "sixth keyword",
      "volume": "800/mo",
      "difficulty": 35,
      "intent": "Informational",
      "priority": "LOW",
      "contentType": "Guide",
      "cluster": "Educational"
    }
  ]
}

Rules: intent must be one of: Informational, Commercial, Navigational, Transactional. priority must be one of: URGENT, HIGH, MEDIUM, LOW. difficulty is integer 1-100. Use keywords relevant to the ${industry} industry.`;

  return callLLM<Keywords>(system, user);
}

// ─── Call 3: Metadata + Schema ────────────────────────────────────────────────
export async function runMetadataSchemaCall(
  url: string,
  industry: string
): Promise<{ metadata: Metadata; schemaData: SchemaData } | null> {
  const system = `You are an SEO metadata and schema markup expert. When given a website URL and industry, you return metadata rewrites and schema recommendations as valid JSON. You MUST return ONLY valid JSON with no markdown, no explanation, no code fences.`;

  const user = `Create metadata rewrites and schema recommendations for:
URL: ${url}
Industry: ${industry}

Return this exact JSON structure:
{
  "metadata": {
    "note": "One sentence overall metadata assessment for this site.",
    "pages": [
      {
        "page": "Homepage",
        "url": "/",
        "currentTitle": "Generic title that likely exists",
        "currentDesc": "Generic description that likely exists",
        "optimizedTitle": "Keyword-Rich Title Under 55 Chars",
        "optimizedDesc": "Compelling description with keyword and CTA, under 140 chars, drives clicks.",
        "titleChars": 38,
        "descChars": 95,
        "issue": "No keyword"
      },
      {
        "page": "About",
        "url": "/about",
        "currentTitle": "About Us",
        "currentDesc": "Learn about our company and team.",
        "optimizedTitle": "About [Company] | Industry Experts Since Year",
        "optimizedDesc": "Meet our expert team. We help ${industry} businesses achieve their goals with proven strategies.",
        "titleChars": 42,
        "descChars": 98,
        "issue": "Too short"
      },
      {
        "page": "Services",
        "url": "/services",
        "currentTitle": "Our Services",
        "currentDesc": "Check out what we offer.",
        "optimizedTitle": "Services | Specific Service for ${industry}",
        "optimizedDesc": "Comprehensive ${industry} services including strategy, execution, and results tracking. Get started today.",
        "titleChars": 44,
        "descChars": 102,
        "issue": "Generic"
      },
      {
        "page": "Blog",
        "url": "/blog",
        "currentTitle": "Blog",
        "currentDesc": "Read our latest posts.",
        "optimizedTitle": "${industry} Blog | Tips, Guides & Insights",
        "optimizedDesc": "Expert ${industry} tips, guides, and case studies to help you grow. Updated weekly with actionable advice.",
        "titleChars": 40,
        "descChars": 101,
        "issue": "Missing"
      }
    ]
  },
  "schemaData": {
    "recommendation": "One sentence schema recommendation for this site and industry.",
    "schemas": [
      {
        "type": "Organization",
        "page": "Homepage",
        "priority": "HIGH",
        "code": "{\"@context\":\"https://schema.org\",\"@type\":\"Organization\",\"name\":\"Company Name\",\"url\":\"${url}\",\"logo\":\"${url}/logo.png\",\"sameAs\":[\"https://twitter.com/company\",\"https://linkedin.com/company/company\"]}"
      },
      {
        "type": "Article",
        "page": "Blog posts",
        "priority": "MEDIUM",
        "code": "{\"@context\":\"https://schema.org\",\"@type\":\"Article\",\"headline\":\"Article Title\",\"author\":{\"@type\":\"Person\",\"name\":\"Author Name\"},\"publisher\":{\"@type\":\"Organization\",\"name\":\"Company Name\"},\"datePublished\":\"2024-01-01\",\"image\":\"${url}/image.jpg\"}"
      }
    ]
  }
}

Rules: issue must be one of: No keyword, Too long, Too short, Missing, Generic. titleChars must equal length of optimizedTitle. descChars must equal length of optimizedDesc. Make content specific to the ${industry} industry.`;

  return callLLM<{ metadata: Metadata; schemaData: SchemaData }>(system, user);
}

// ─── Call 4: Content Calendar ─────────────────────────────────────────────────
export async function runCalendarCall(
  url: string,
  industry: string
): Promise<ContentCalendar | null> {
  const system = `You are a content strategist specializing in SEO-driven content calendars. When given a website URL and industry, you return a 90-day content plan as valid JSON. You MUST return ONLY valid JSON with no markdown, no explanation, no code fences.`;

  const user = `Create a 90-day SEO content calendar for:
URL: ${url}
Industry: ${industry}

Return this exact JSON structure with exactly 5 content items:
{
  "strategy": "Two sentence content strategy tailored to this site and industry.",
  "items": [
    {
      "week": 1,
      "title": "Complete Guide to [Main Topic] in ${industry}",
      "keyword": "main topic keyword",
      "wordCount": 2500,
      "type": "Pillar",
      "cluster": "Main Cluster",
      "internalLinks": ["Services", "About"]
    },
    {
      "week": 2,
      "title": "How to [Specific Task] for ${industry} Businesses",
      "keyword": "how to keyword",
      "wordCount": 1200,
      "type": "How-To",
      "cluster": "Secondary Cluster",
      "internalLinks": ["Services", "Blog"]
    },
    {
      "week": 4,
      "title": "[Industry] Checklist: 10 Steps to [Goal]",
      "keyword": "checklist keyword",
      "wordCount": 1800,
      "type": "Guide",
      "cluster": "Practical Guides",
      "internalLinks": ["Blog", "Services"]
    },
    {
      "week": 6,
      "title": "Best [Tools/Strategies] for ${industry} in 2024",
      "keyword": "comparison keyword",
      "wordCount": 2000,
      "type": "Cluster",
      "cluster": "Tools & Resources",
      "internalLinks": ["Blog", "Services"]
    },
    {
      "week": 8,
      "title": "${industry} Trends Report: What's Working Now",
      "keyword": "trends keyword",
      "wordCount": 1500,
      "type": "Report",
      "cluster": "Industry Insights",
      "internalLinks": ["About", "Services"]
    }
  ]
}

Rules: type must be one of: Pillar, Cluster, How-To, Guide, Report. week must be 1-12. wordCount must be 800-3000. internalLinks must be array of exactly 2 strings. Make all content specific to the ${industry} industry.`;

  return callLLM<ContentCalendar>(system, user);
}

// ─── Call 5: Checklist + Internal Linking ─────────────────────────────────────
export async function runChecklistCall(
  url: string,
  industry: string
): Promise<{ checklist: Checklist; linking: InternalLinking } | null> {
  const system = `You are an SEO action planner. When given a website URL and industry, you return a prioritized action checklist and internal linking plan as valid JSON. You MUST return ONLY valid JSON with no markdown, no explanation, no code fences.`;

  const user = `Create an SEO action checklist and internal linking plan for:
URL: ${url}
Industry: ${industry}

Return this exact JSON structure:
{
  "checklist": {
    "items": [
      {"id": "c1", "category": "Technical", "task": "Fix all broken links and 404 errors", "priority": "URGENT", "phase": "Week 1-3", "impact": "Improves crawlability and user experience", "done": false},
      {"id": "c2", "category": "On-Page", "task": "Rewrite title tags with target keywords", "priority": "HIGH", "phase": "Week 1-3", "impact": "Boosts click-through rate from search results", "done": false},
      {"id": "c3", "category": "Content", "task": "Create pillar page for main topic cluster", "priority": "HIGH", "phase": "Week 1-3", "impact": "Establishes topical authority in ${industry}", "done": false},
      {"id": "c4", "category": "Technical", "task": "Submit XML sitemap to Google Search Console", "priority": "HIGH", "phase": "Week 1-3", "impact": "Ensures faster indexation of all pages", "done": false},
      {"id": "c5", "category": "On-Page", "task": "Add target keyword to H1 on all key pages", "priority": "MEDIUM", "phase": "Week 4-8", "impact": "Strengthens relevance signals for Google", "done": false},
      {"id": "c6", "category": "Internal Links", "task": "Add 3 internal links from homepage to key pages", "priority": "MEDIUM", "phase": "Week 4-8", "impact": "Distributes PageRank to important pages", "done": false},
      {"id": "c7", "category": "Schema", "task": "Implement Organization schema on homepage", "priority": "MEDIUM", "phase": "Week 4-8", "impact": "Enables rich results and brand knowledge panel", "done": false},
      {"id": "c8", "category": "Content", "task": "Publish 2 cluster articles targeting long-tail keywords", "priority": "LOW", "phase": "Week 9-12", "impact": "Builds long-tail keyword coverage and authority", "done": false}
    ]
  },
  "linking": {
    "clusters": [
      {
        "name": "Main Topic Cluster",
        "pillar": "Complete Guide to Main Topic",
        "articles": ["Subtopic Article 1", "Subtopic Article 2", "Subtopic Article 3"]
      },
      {
        "name": "Secondary Topic Cluster",
        "pillar": "Secondary Topic Strategy Guide",
        "articles": ["Secondary Article 1", "Secondary Article 2", "Secondary Article 3"]
      }
    ],
    "immediateActions": [
      {"from": "Homepage", "to": "Services", "anchor": "our ${industry} services", "placement": "Hero section"},
      {"from": "Blog", "to": "Services", "anchor": "professional ${industry} help", "placement": "Last paragraph"},
      {"from": "About", "to": "Services", "anchor": "get started today", "placement": "CTA section"},
      {"from": "Services", "to": "Blog", "anchor": "read our ${industry} guides", "placement": "Bottom of page"}
    ]
  }
}

Rules: category must be one of: Technical, On-Page, Content, Internal Links, Schema. priority must be one of: URGENT, HIGH, MEDIUM, LOW. phase must be one of: Week 1-3, Week 4-8, Week 9-12. Make all tasks specific to the ${industry} industry and the website at ${url}.`;

  return callLLM<{ checklist: Checklist; linking: InternalLinking }>(system, user);
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

// Fallback data generators for graceful degradation
function makeOverviewFallback(url: string, industry: string): Overview {
  return {
    summary: `Initial SEO analysis for ${url} in the ${industry} sector. Multiple improvement opportunities identified across technical and content dimensions.`,
    keyInsight: `Focus on metadata optimization and content depth to achieve quick ranking gains in the ${industry} market.`,
    overallScore: 52,
    dimensions: [
      { name: "Indexation", score: 60, note: "Needs sitemap verification" },
      { name: "Metadata", score: 45, note: "Titles missing keywords" },
      { name: "Content Depth", score: 55, note: "Thin content on key pages" },
      { name: "Internal Links", score: 40, note: "Sparse internal linking" },
      { name: "Topical Authority", score: 50, note: "Limited topic coverage" },
      { name: "Local/Niche SEO", score: 45, note: "Local signals weak" },
      { name: "Technical SEO", score: 65, note: "Core vitals acceptable" },
      { name: "Competitor Gap", score: 35, note: "Missing key topics" },
    ],
  };
}

export async function runFullAudit(
  url: string,
  industry: string,
  onProgress?: (p: AuditProgress) => void
): Promise<AuditResult> {
  const report = (stage: string, step: number) =>
    onProgress?.({ stage, step, total: 5 });

  // Run all 5 calls with individual error handling
  report("Scoring 8 SEO dimensions...", 1);
  let overview = await runOverviewCall(url, industry);
  if (!overview) {
    console.warn("[AuditEngine] Overview call failed, using fallback");
    overview = makeOverviewFallback(url, industry);
  }

  report("Mapping keyword opportunities...", 2);
  let keywords = await runKeywordsCall(url, industry);
  if (!keywords) {
    console.warn("[AuditEngine] Keywords call failed, using fallback");
    keywords = {
      strategy: `Focus on long-tail ${industry} keywords with lower competition to build initial organic traffic.`,
      opportunities: [
        { keyword: `${industry} services`, volume: "1,200/mo", difficulty: 45, intent: "Commercial" as const, priority: "HIGH" as const, contentType: "Service page", cluster: "Core Services" },
        { keyword: `best ${industry} tips`, volume: "800/mo", difficulty: 32, intent: "Informational" as const, priority: "URGENT" as const, contentType: "Guide", cluster: "Educational" },
        { keyword: `${industry} guide 2024`, volume: "600/mo", difficulty: 28, intent: "Informational" as const, priority: "HIGH" as const, contentType: "Pillar post", cluster: "Guides" },
        { keyword: `${industry} for beginners`, volume: "400/mo", difficulty: 22, intent: "Informational" as const, priority: "MEDIUM" as const, contentType: "How-To", cluster: "Beginner" },
        { keyword: `${industry} pricing`, volume: "900/mo", difficulty: 38, intent: "Commercial" as const, priority: "MEDIUM" as const, contentType: "Pricing page", cluster: "Commercial" },
        { keyword: `${industry} near me`, volume: "2,100/mo", difficulty: 35, intent: "Navigational" as const, priority: "LOW" as const, contentType: "Local page", cluster: "Local" },
      ],
    };
  }

  report("Rewriting metadata & schema...", 3);
  let metaSchema = await runMetadataSchemaCall(url, industry);
  if (!metaSchema) {
    console.warn("[AuditEngine] Metadata/Schema call failed, using fallback");
    const domain = url.replace(/https?:\/\//, "").replace(/\/.*/, "");
    metaSchema = {
      metadata: {
        note: `Metadata across all pages needs optimization with ${industry}-specific keywords to improve search visibility.`,
        pages: [
          { page: "Homepage", url: "/", currentTitle: "Welcome", currentDesc: "We offer great services.", optimizedTitle: `${industry} Services | ${domain}`, optimizedDesc: `Expert ${industry} services that drive results. Get started today with a free consultation.`, titleChars: 40, descChars: 95, issue: "No keyword" as const },
          { page: "About", url: "/about", currentTitle: "About Us", currentDesc: "Learn about us.", optimizedTitle: `About Us | ${industry} Experts`, optimizedDesc: `Meet our experienced ${industry} team. We've helped hundreds of businesses achieve their goals.`, titleChars: 32, descChars: 90, issue: "Too short" as const },
          { page: "Services", url: "/services", currentTitle: "Services", currentDesc: "Our services.", optimizedTitle: `${industry} Services | Proven Results`, optimizedDesc: `Comprehensive ${industry} services tailored to your business. See how we can help you grow.`, titleChars: 38, descChars: 88, issue: "Generic" as const },
          { page: "Blog", url: "/blog", currentTitle: "Blog", currentDesc: "Read our blog.", optimizedTitle: `${industry} Blog | Tips & Guides`, optimizedDesc: `Expert ${industry} tips, guides, and insights. Updated weekly with actionable advice for businesses.`, titleChars: 34, descChars: 96, issue: "Missing" as const },
        ],
      },
      schemaData: {
        recommendation: `Implement Organization and Article schema markup to improve rich results in ${industry} searches.`,
        schemas: [
          { type: "Organization", page: "Homepage", priority: "HIGH" as const, code: `{"@context":"https://schema.org","@type":"Organization","name":"${domain}","url":"${url}","description":"${industry} services"}` },
          { type: "Article", page: "Blog posts", priority: "MEDIUM" as const, code: `{"@context":"https://schema.org","@type":"Article","headline":"Article Title","author":{"@type":"Person","name":"Author"},"datePublished":"2024-01-01"}` },
        ],
      },
    };
  }

  report("Building content calendar...", 4);
  let calendar = await runCalendarCall(url, industry);
  if (!calendar) {
    console.warn("[AuditEngine] Calendar call failed, using fallback");
    calendar = {
      strategy: `Build topical authority in ${industry} through a mix of pillar content and supporting cluster articles published consistently over 90 days.`,
      items: [
        { week: 1, title: `Complete ${industry} Guide for 2024`, keyword: `${industry} guide`, wordCount: 2500, type: "Pillar" as const, cluster: "Core Topic", internalLinks: ["Services", "About"] },
        { week: 2, title: `How to Get Started with ${industry}`, keyword: `how to ${industry}`, wordCount: 1200, type: "How-To" as const, cluster: "Beginner", internalLinks: ["Services", "Blog"] },
        { week: 4, title: `${industry} Checklist: 10 Essential Steps`, keyword: `${industry} checklist`, wordCount: 1800, type: "Guide" as const, cluster: "Practical", internalLinks: ["Blog", "Services"] },
        { week: 6, title: `Best ${industry} Tools Compared`, keyword: `${industry} tools`, wordCount: 2000, type: "Cluster" as const, cluster: "Tools", internalLinks: ["Blog", "Services"] },
        { week: 8, title: `${industry} Trends Report 2024`, keyword: `${industry} trends`, wordCount: 1500, type: "Report" as const, cluster: "Insights", internalLinks: ["About", "Services"] },
      ],
    };
  }

  report("Building action checklist...", 5);
  let checklistResult = await runChecklistCall(url, industry);
  if (!checklistResult) {
    console.warn("[AuditEngine] Checklist call failed, using fallback");
    checklistResult = {
      checklist: {
        items: [
          { id: "c1", category: "Technical", task: "Fix broken links and 404 errors", priority: "URGENT" as const, phase: "Week 1-3", impact: "Improves crawlability and user experience", done: false },
          { id: "c2", category: "On-Page", task: "Rewrite title tags with target keywords", priority: "HIGH" as const, phase: "Week 1-3", impact: "Boosts click-through rate from search", done: false },
          { id: "c3", category: "Content", task: `Create pillar page for ${industry} main topic`, priority: "HIGH" as const, phase: "Week 1-3", impact: "Establishes topical authority", done: false },
          { id: "c4", category: "Technical", task: "Submit XML sitemap to Google Search Console", priority: "HIGH" as const, phase: "Week 1-3", impact: "Faster indexation of all pages", done: false },
          { id: "c5", category: "On-Page", task: "Add target keyword to H1 on all pages", priority: "MEDIUM" as const, phase: "Week 4-8", impact: "Strengthens relevance signals", done: false },
          { id: "c6", category: "Internal Links", task: "Add internal links from homepage to key pages", priority: "MEDIUM" as const, phase: "Week 4-8", impact: "Distributes PageRank effectively", done: false },
          { id: "c7", category: "Schema", task: "Implement Organization schema on homepage", priority: "MEDIUM" as const, phase: "Week 4-8", impact: "Enables rich results in SERP", done: false },
          { id: "c8", category: "Content", task: "Publish 2 cluster articles per month", priority: "LOW" as const, phase: "Week 9-12", impact: "Builds long-tail keyword coverage", done: false },
        ],
      },
      linking: {
        clusters: [
          { name: `${industry} Core`, pillar: `Complete ${industry} Guide`, articles: ["Getting Started Guide", "Best Practices", "Case Studies"] },
          { name: `${industry} Advanced`, pillar: `Advanced ${industry} Strategies`, articles: ["Expert Tips", "Tool Reviews", "Industry Trends"] },
        ],
        immediateActions: [
          { from: "Homepage", to: "Services", anchor: `our ${industry} services`, placement: "Hero section" },
          { from: "Blog", to: "Services", anchor: "professional help", placement: "Last paragraph" },
          { from: "About", to: "Services", anchor: "get started today", placement: "CTA section" },
          { from: "Services", to: "Blog", anchor: "read our guides", placement: "Bottom of page" },
        ],
      },
    };
  }

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
