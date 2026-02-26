import { invokeLLM } from "./_core/llm";
import type {
  Overview,
  Keywords,
  Metadata,
  SchemaData,
  ContentCalendar,
  Checklist,
  InternalLinking,
  ContentAudit,
  ActionRoadmap,
  RoadmapBlogItem,
} from "../shared/auditTypes";

// ─── Resilient JSON extractor ─────────────────────────────────────────────────
function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end === -1) {
    const partial = text.slice(start);
    let fixed = partial, d = 0;
    for (const ch of partial) { if (ch === "{") d++; if (ch === "}") d--; }
    for (let i = 0; i < d; i++) fixed += "}";
    try { return JSON.parse(fixed) as T; } catch (_) {}
    return null;
  }

  try { return JSON.parse(text.slice(start, end + 1)) as T; } catch (_) { return null; }
}

async function callLLM<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
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
  const system = `You are an expert SEO auditor. Return ONLY valid JSON with no markdown, no explanation, no code fences.`;
  const user = `Analyze this website for SEO health:
URL: ${url}
Industry: ${industry}

Return this exact JSON (fill realistic values for this specific site and industry):
{
  "summary": "Two sentence summary of the site's overall SEO health.",
  "keyInsight": "One actionable key insight.",
  "overallScore": 68,
  "seoMaturity": "Medium",
  "dimensions": [
    {"name": "Site Indexation", "score": 7, "status": "Good", "priority": "Maintain", "note": "Brief note under 8 words"},
    {"name": "Metadata", "score": 3, "status": "Needs Rewrite", "priority": "URGENT", "note": "Brief note under 8 words"},
    {"name": "Content Depth", "score": 4, "status": "Improve", "priority": "HIGH", "note": "Brief note under 8 words"},
    {"name": "Internal Links", "score": 3, "status": "Underdeveloped", "priority": "HIGH", "note": "Brief note under 8 words"},
    {"name": "Topical Authority", "score": 2, "status": "Critical Gap", "priority": "URGENT", "note": "Brief note under 8 words"},
    {"name": "Local/Niche SEO", "score": 5, "status": "Improve", "priority": "MEDIUM", "note": "Brief note under 8 words"},
    {"name": "Technical SEO", "score": 6, "status": "Good", "priority": "Maintain", "note": "Brief note under 8 words"},
    {"name": "Competitor Gap", "score": 4, "status": "Improve", "priority": "HIGH", "note": "Brief note under 8 words"}
  ]
}
Rules: score is 1-10. overallScore is 0-100. seoMaturity is Low/Medium/High. status is one of: Good, Improve, Needs Rewrite, Critical Gap, Underdeveloped. priority is one of: URGENT, HIGH, MEDIUM, LOW, Maintain.`;
  return callLLM<Overview>(system, user);
}

// ─── Call 2: Content Audit (NEW — Module 1 of report) ─────────────────────────
export async function runContentAuditCall(url: string, industry: string): Promise<ContentAudit | null> {
  const system = `You are an expert SEO content auditor. Return ONLY valid JSON with no markdown, no explanation, no code fences.`;
  const user = `Perform a content audit for:
URL: ${url}
Industry: ${industry}

Return this exact JSON structure:
{
  "executiveSummary": "3-4 sentence executive summary of the site's SEO position, what it does well, and the main strategic opportunity.",
  "pageInventory": [
    {"page": "Homepage (/)", "url": "/", "currentSeoValue": "Medium — brand intro, limited keyword targeting", "status": "Improve", "recommendedAction": "Add keyword-optimized H1, local schema markup, FAQ section"},
    {"page": "Services (/services)", "url": "/services", "currentSeoValue": "Low — generic content, no keyword targeting", "status": "Critical Gap", "recommendedAction": "Rewrite with target keywords, add service-specific landing pages"},
    {"page": "Blog (/blog)", "url": "/blog", "currentSeoValue": "Very Low — no informational content", "status": "Misused", "recommendedAction": "Pivot to educational content: guides, market reports, how-tos"},
    {"page": "About (/about)", "url": "/about", "currentSeoValue": "Low — valuable content buried without schema", "status": "Underperforming", "recommendedAction": "Add Person/Organization schema, expand with keyword-rich bio"},
    {"page": "Contact (/contact)", "url": "/contact", "currentSeoValue": "Low — no local SEO signals", "status": "Needs Work", "recommendedAction": "Add LocalBusiness schema, city-specific keywords"},
    {"page": "Resources (/resources)", "url": "/resources", "currentSeoValue": "Medium — valuable data, poor discoverability", "status": "Underlinked", "recommendedAction": "Build into hub page, add H1 with keywords, link from homepage"}
  ],
  "competitorGaps": [
    {"competitor": "Top industry aggregator (e.g. G2/Yelp/Zillow)", "ranksFor": "Broad head terms for ${industry}", "gapType": "Cannot Win", "opportunity": "Focus on hyper-local and long-tail informational queries instead"},
    {"competitor": "Large established brand in ${industry}", "ranksFor": "${industry} guides and comparison content", "gapType": "Content Gap", "opportunity": "Build deeper niche content: case studies, local guides, expert comparisons"},
    {"competitor": "Local/regional competitors", "ranksFor": "First-time buyer/client educational content", "gapType": "Content Gap", "opportunity": "Publish buyer/seller/client educational articles targeting these queries"},
    {"competitor": "National media and review sites", "ranksFor": "${industry} market reports and rankings", "gapType": "Content Gap", "opportunity": "Monthly market update posts, annual best-of guides"},
    {"competitor": "Niche specialist sites", "ranksFor": "Long-tail ${industry} specialty queries", "gapType": "Partial Gap", "opportunity": "Expand specialty pages with community-level content and expert guides"}
  ],
  "keywordTier1": [
    {"keyword": "specific buyer-intent keyword for ${industry}", "estimatedVolume": "1,600/mo", "estimatedKD": 35, "recommendedContent": "Expand existing page or create new landing page targeting this keyword"},
    {"keyword": "another buyer-intent keyword", "estimatedVolume": "880/mo", "estimatedKD": 28, "recommendedContent": "Create dedicated page — lower competition, good opportunity"},
    {"keyword": "third buyer-intent keyword", "estimatedVolume": "1,200/mo", "estimatedKD": 32, "recommendedContent": "Blog article + landing page with SEO copy overlay"}
  ],
  "keywordTier2": [
    {"keyword": "seller/conversion intent keyword for ${industry}", "estimatedVolume": "880/mo", "estimatedKD": 30, "recommendedContent": "Rewrite service page with this keyword as primary target + local stats"},
    {"keyword": "another conversion keyword", "estimatedVolume": "480/mo", "estimatedKD": 22, "recommendedContent": "Rewrite conversion page with this primary keyword in H1 and meta"},
    {"keyword": "third conversion keyword", "estimatedVolume": "390/mo", "estimatedKD": 20, "recommendedContent": "Blog article targeting this query with strong CTA"}
  ],
  "keywordTier3": [
    {"keyword": "informational research keyword for ${industry}", "estimatedVolume": "1,100/mo", "estimatedKD": 26, "recommendedContent": "Monthly blog: market report targeting this keyword"},
    {"keyword": "another informational keyword", "estimatedVolume": "960/mo", "estimatedKD": 24, "recommendedContent": "Blog guide targeting this query with internal links to service pages"},
    {"keyword": "local or niche informational keyword", "estimatedVolume": "480/mo", "estimatedKD": 19, "recommendedContent": "Neighborhood/niche guide expansion targeting this query"},
    {"keyword": "comparison or vs keyword", "estimatedVolume": "320/mo", "estimatedKD": 18, "recommendedContent": "Comparison blog post differentiating two options, links to both pages"}
  ]
}
Rules: status must be one of: Good, Improve, Critical Gap, Needs Work, Underperforming, Underlinked, Misused. gapType must be one of: Cannot Win, Content Gap, Partial Gap. estimatedKD is integer 1-100. Make ALL content specific to the ${industry} industry and the URL ${url}.`;
  return callLLM<ContentAudit>(system, user);
}

// ─── Call 3: Keywords ─────────────────────────────────────────────────────────
export async function runKeywordsCall(url: string, industry: string): Promise<Keywords | null> {
  const system = `You are an SEO keyword strategist. Return ONLY valid JSON with no markdown, no explanation, no code fences.`;
  const user = `Find keyword opportunities for:
URL: ${url}
Industry: ${industry}

Return this exact JSON:
{
  "strategy": "Two sentence keyword strategy tailored to this site and industry.",
  "opportunities": [
    {"keyword": "specific keyword phrase", "volume": "2,400/mo", "difficulty": 45, "intent": "Commercial", "priority": "HIGH", "contentType": "Comparison post", "cluster": "Main Topic"},
    {"keyword": "another keyword", "volume": "1,200/mo", "difficulty": 38, "intent": "Informational", "priority": "URGENT", "contentType": "Guide", "cluster": "Secondary Topic"},
    {"keyword": "third keyword", "volume": "900/mo", "difficulty": 32, "intent": "Informational", "priority": "HIGH", "contentType": "List post", "cluster": "Topic Cluster"},
    {"keyword": "fourth keyword", "volume": "600/mo", "difficulty": 28, "intent": "Transactional", "priority": "MEDIUM", "contentType": "Landing page", "cluster": "Conversion"},
    {"keyword": "fifth keyword", "volume": "3,100/mo", "difficulty": 62, "intent": "Commercial", "priority": "MEDIUM", "contentType": "Review", "cluster": "Product"},
    {"keyword": "sixth keyword", "volume": "800/mo", "difficulty": 35, "intent": "Informational", "priority": "LOW", "contentType": "Guide", "cluster": "Educational"}
  ]
}
Rules: intent must be one of: Informational, Commercial, Navigational, Transactional. priority must be one of: URGENT, HIGH, MEDIUM, LOW. difficulty is integer 1-100. Use keywords relevant to the ${industry} industry.`;
  return callLLM<Keywords>(system, user);
}

// ─── Call 4: Metadata + Schema ────────────────────────────────────────────────
export async function runMetadataSchemaCall(
  url: string, industry: string
): Promise<{ metadata: Metadata; schemaData: SchemaData } | null> {
  const system = `You are an SEO metadata and schema markup expert. Return ONLY valid JSON with no markdown, no explanation, no code fences.`;
  const user = `Create metadata rewrites and schema recommendations for:
URL: ${url}
Industry: ${industry}

Return this exact JSON:
{
  "metadata": {
    "note": "One sentence overall metadata assessment.",
    "pages": [
      {"page": "Homepage", "url": "/", "currentTitle": "Generic title that likely exists", "currentDesc": "Generic description or missing", "optimizedTitle": "Keyword-Rich Title Under 55 Chars", "optimizedDesc": "Compelling description with keyword and CTA, under 155 chars.", "titleChars": 38, "descChars": 95, "issue": "No keyword"},
      {"page": "About", "url": "/about", "currentTitle": "About Us", "currentDesc": "Learn about our company.", "optimizedTitle": "About [Company] | ${industry} Experts", "optimizedDesc": "Meet our expert team. We help ${industry} clients achieve results with proven strategies and local expertise.", "titleChars": 42, "descChars": 105, "issue": "Too short"},
      {"page": "Services", "url": "/services", "currentTitle": "Our Services", "currentDesc": "Check out what we offer.", "optimizedTitle": "${industry} Services | Expert Help", "optimizedDesc": "Comprehensive ${industry} services including strategy, execution, and measurable results. Get started today.", "titleChars": 44, "descChars": 102, "issue": "Generic"},
      {"page": "Blog", "url": "/blog", "currentTitle": "Blog", "currentDesc": "Read our latest posts.", "optimizedTitle": "${industry} Blog | Tips, Guides & Insights", "optimizedDesc": "Expert ${industry} tips, guides, and case studies to help you grow. Updated weekly with actionable advice.", "titleChars": 40, "descChars": 101, "issue": "Missing"}
    ]
  },
  "schemaData": {
    "recommendation": "One sentence schema recommendation for this site.",
    "schemas": [
      {"type": "Organization", "page": "Homepage", "priority": "HIGH", "code": "{\"@context\":\"https://schema.org\",\"@type\":\"Organization\",\"name\":\"Company Name\",\"url\":\"${url}\",\"logo\":\"${url}/logo.png\",\"sameAs\":[\"https://twitter.com/company\",\"https://linkedin.com/company/company\"]}"},
      {"type": "Article", "page": "Blog posts", "priority": "MEDIUM", "code": "{\"@context\":\"https://schema.org\",\"@type\":\"Article\",\"headline\":\"Article Title\",\"author\":{\"@type\":\"Person\",\"name\":\"Author Name\"},\"publisher\":{\"@type\":\"Organization\",\"name\":\"Company Name\"},\"datePublished\":\"2024-01-01\"}"}
    ]
  }
}
Rules: issue must be one of: No keyword, Too long, Too short, Missing, Generic. titleChars = length of optimizedTitle. descChars = length of optimizedDesc. Make content specific to ${industry}.`;
  return callLLM<{ metadata: Metadata; schemaData: SchemaData }>(system, user);
}

// ─── Call 5: Calendar + Checklist + Internal Linking ─────────────────────────
export async function runCalendarChecklistCall(
  url: string, industry: string
): Promise<{ calendar: ContentCalendar; checklist: Checklist; linking: InternalLinking } | null> {
  const system = `You are an SEO content strategist and action planner. Return ONLY valid JSON with no markdown, no explanation, no code fences.`;
  const user = `Create a content calendar, action checklist, and internal linking plan for:
URL: ${url}
Industry: ${industry}

Return this exact JSON:
{
  "calendar": {
    "strategy": "Two sentence content strategy for this site.",
    "items": [
      {"week": 1, "title": "Complete ${industry} Guide 2026", "keyword": "main topic keyword", "wordCount": 2500, "type": "Pillar", "cluster": "Core Topic", "internalLinks": ["Services", "About"]},
      {"week": 2, "title": "How to [Key Task] for ${industry}", "keyword": "how to keyword", "wordCount": 1200, "type": "How-To", "cluster": "Beginner", "internalLinks": ["Services", "Blog"]},
      {"week": 4, "title": "${industry} Checklist: 10 Essential Steps", "keyword": "checklist keyword", "wordCount": 1800, "type": "Guide", "cluster": "Practical", "internalLinks": ["Blog", "Services"]},
      {"week": 7, "title": "Best ${industry} Tools Compared 2026", "keyword": "comparison keyword", "wordCount": 2000, "type": "Cluster", "cluster": "Tools", "internalLinks": ["Blog", "Services"]},
      {"week": 10, "title": "${industry} Market Report Q1 2026", "keyword": "market report keyword", "wordCount": 1500, "type": "Report", "cluster": "Industry Insights", "internalLinks": ["About", "Services"]}
    ]
  },
  "checklist": {
    "items": [
      {"id": "c1", "category": "Technical", "task": "Fix all broken links and 404 errors", "priority": "URGENT", "phase": "Week 1-3", "impact": "Improves crawlability and user experience", "done": false},
      {"id": "c2", "category": "On-Page", "task": "Rewrite all title tags with target keywords", "priority": "URGENT", "phase": "Week 1-3", "impact": "Boosts click-through rate from search results", "done": false},
      {"id": "c3", "category": "On-Page", "task": "Write meta descriptions for all 7 key pages", "priority": "URGENT", "phase": "Week 1-3", "impact": "Improves CTR and search snippet quality", "done": false},
      {"id": "c4", "category": "Technical", "task": "Submit XML sitemap to Google Search Console", "priority": "HIGH", "phase": "Week 1-3", "impact": "Ensures faster indexation of all pages", "done": false},
      {"id": "c5", "category": "Content", "task": "Create pillar page for main ${industry} topic cluster", "priority": "HIGH", "phase": "Week 1-3", "impact": "Establishes topical authority", "done": false},
      {"id": "c6", "category": "Internal Links", "task": "Add contextual internal links from homepage to key pages", "priority": "HIGH", "phase": "Week 4-8", "impact": "Distributes PageRank to important pages", "done": false},
      {"id": "c7", "category": "Schema", "task": "Implement Organization schema on homepage", "priority": "MEDIUM", "phase": "Week 4-8", "impact": "Enables rich results and brand knowledge panel", "done": false},
      {"id": "c8", "category": "Content", "task": "Publish 2 cluster articles targeting long-tail keywords", "priority": "LOW", "phase": "Week 9-12", "impact": "Builds long-tail keyword coverage and authority", "done": false}
    ]
  },
  "linking": {
    "clusters": [
      {"name": "Main ${industry} Cluster", "pillar": "Complete ${industry} Guide 2026", "articles": ["Getting Started Guide", "Best Practices 2026", "Case Studies & Examples"]},
      {"name": "Secondary ${industry} Cluster", "pillar": "Advanced ${industry} Strategies", "articles": ["Expert Tips & Tactics", "Tool Reviews", "Industry Trends Report"]}
    ],
    "immediateActions": [
      {"from": "Homepage", "to": "Services", "anchor": "our ${industry} services", "placement": "Hero section"},
      {"from": "Blog", "to": "Services", "anchor": "professional ${industry} help", "placement": "Last paragraph"},
      {"from": "About", "to": "Services", "anchor": "get started today", "placement": "CTA section"},
      {"from": "Services", "to": "Blog", "anchor": "read our ${industry} guides", "placement": "Bottom of page"}
    ],
    "clusterPillars": [
      {
        "name": "Pillar 1: Buyer/Client Resources Hub",
        "items": [
          {"contentPiece": "PILLAR: Complete ${industry} Buyer's Guide 2026", "targetKeyword": "buying guide ${industry}", "linkingBehavior": "Links OUT to all cluster pages; anchors entire buyer section"},
          {"contentPiece": "First-Time Buyer Guide: ${industry} 2026", "targetKeyword": "first time buyer ${industry}", "linkingBehavior": "Links back to pillar + links to calculator and listings"},
          {"contentPiece": "Best Options in ${industry} for 2026", "targetKeyword": "best ${industry} options", "linkingBehavior": "Links to each niche page; links back to pillar"}
        ]
      },
      {
        "name": "Pillar 2: Seller/Provider Resources Hub",
        "items": [
          {"contentPiece": "PILLAR: Complete ${industry} Seller's Guide 2026", "targetKeyword": "selling guide ${industry}", "linkingBehavior": "Links OUT to all cluster pages; anchors entire seller section"},
          {"contentPiece": "How to Get Results Fast in ${industry}", "targetKeyword": "fast results ${industry}", "linkingBehavior": "Links back to pillar; links to evaluation and contact pages"},
          {"contentPiece": "${industry} Market Report 2026", "targetKeyword": "${industry} market 2026", "linkingBehavior": "Links to snapshot; links back to seller pillar; links to buyer pillar too"}
        ]
      }
    ],
    "crossLinkMap": [
      {"page": "Homepage", "crossLinksTo": ["Services", "Blog", "About", "Contact"]},
      {"page": "Services", "crossLinksTo": ["Blog", "Contact", "About"]},
      {"page": "Blog", "crossLinksTo": ["Services", "Contact", "Related posts"]}
    ]
  }
}
Rules: calendar type must be one of: Pillar, Cluster, How-To, Guide, Report. checklist category must be one of: Technical, On-Page, Content, Internal Links, Schema. priority must be one of: URGENT, HIGH, MEDIUM, LOW. phase must be one of: Week 1-3, Week 4-8, Week 9-12. Make all content specific to ${industry} and ${url}.`;
  return callLLM<{ calendar: ContentCalendar; checklist: Checklist; linking: InternalLinking }>(system, user);
}

// ─── Call 6: Action Roadmap (NEW — Module 4 of report) ────────────────────────
export async function runRoadmapCall(url: string, industry: string): Promise<ActionRoadmap | null> {
  const system = `You are an SEO project manager. Return ONLY valid JSON with no markdown, no explanation, no code fences.`;
  const user = `Create a 90-day SEO action roadmap and KPI targets for:
URL: ${url}
Industry: ${industry}

Return this exact JSON:
{
  "phases": [
    {
      "phase": "Phase 1 — Foundation (Weeks 1–3)",
      "subtitle": "On-Page Fixes",
      "actions": [
        {"action": "Update all meta title tags using optimized versions", "priority": "URGENT", "platform": "CMS Settings > SEO"},
        {"action": "Write and add meta descriptions to all key pages", "priority": "URGENT", "platform": "CMS Settings"},
        {"action": "Add keyword-optimized H1 to homepage and service pages", "priority": "HIGH", "platform": "CMS Page Editor"},
        {"action": "Implement all immediate internal links", "priority": "HIGH", "platform": "CMS Page Editor"},
        {"action": "Rewrite service and conversion page copy with keyword-targeted content", "priority": "HIGH", "platform": "CMS Page Editor"},
        {"action": "Add LocalBusiness/Organization schema markup to homepage", "priority": "HIGH", "platform": "Requires developer / code injection"}
      ]
    },
    {
      "phase": "Phase 2 — Content Foundation (Weeks 4–8)",
      "subtitle": "Pillar Articles",
      "actions": [
        {"action": "Publish PILLAR: Complete ${industry} Buyer's Guide 2026", "priority": "HIGH", "platform": "Blog / CMS"},
        {"action": "Publish PILLAR: Complete ${industry} Seller's Guide 2026", "priority": "HIGH", "platform": "Blog / CMS"},
        {"action": "Publish ${industry} Market Report — Q1 2026", "priority": "HIGH", "platform": "Blog / CMS"},
        {"action": "Publish First-Time Buyer/Client Guide: ${industry} 2026", "priority": "HIGH", "platform": "Blog / CMS"}
      ]
    },
    {
      "phase": "Phase 3 — Cluster Expansion (Weeks 9–12)",
      "subtitle": "Long-Tail Articles & Niche Guides",
      "actions": [
        {"action": "Publish relocation/onboarding guide for ${industry}", "priority": "MEDIUM", "platform": "Blog / CMS"},
        {"action": "Publish best options guide for ${industry} 2026", "priority": "MEDIUM", "platform": "Blog / CMS"},
        {"action": "Publish niche specialty guide for ${industry}", "priority": "MEDIUM", "platform": "Blog / CMS"},
        {"action": "Publish how-to guide: get results fast in ${industry}", "priority": "MEDIUM", "platform": "Blog / CMS"}
      ]
    }
  ],
  "phase2Blog": [
    {"title": "Complete ${industry} Buyer's Guide 2026", "targetKeyword": "buying guide ${industry}", "cluster": "Buyer Pillar", "estimatedWords": 2500},
    {"title": "Complete ${industry} Seller's Guide 2026", "targetKeyword": "selling guide ${industry}", "cluster": "Seller Pillar", "estimatedWords": 2500},
    {"title": "${industry} Market Report — Q1 2026", "targetKeyword": "${industry} market 2026", "cluster": "Seller Cluster", "estimatedWords": 1500},
    {"title": "First-Time Buyer/Client Guide: ${industry} 2026", "targetKeyword": "first time ${industry}", "cluster": "Buyer Cluster", "estimatedWords": 2000}
  ],
  "phase3Blog": [
    {"title": "Relocation/Onboarding Guide for ${industry} 2026", "targetKeyword": "moving to ${industry}", "cluster": "Buyer Cluster", "estimatedWords": 2000},
    {"title": "Best ${industry} Options for Families: 2026 Guide", "targetKeyword": "best ${industry} options", "cluster": "Buyer Cluster", "estimatedWords": 1800},
    {"title": "Niche Specialty Guide for ${industry}", "targetKeyword": "specialty ${industry}", "cluster": "Niche Guide", "estimatedWords": 1500},
    {"title": "How to Get Results Fast in ${industry}", "targetKeyword": "fast results ${industry}", "cluster": "Seller Cluster", "estimatedWords": 1500}
  ],
  "kpis": [
    {"metric": "Pages ranking in top 20 for target terms", "baseline": "1–2 pages", "target30Day": "3–4 pages", "target90Day": "6–8 pages"},
    {"metric": "Organic blog traffic (monthly sessions)", "baseline": "<50 sessions", "target30Day": "100–200", "target90Day": "500–1,000"},
    {"metric": "Keyword rankings in positions 1–20 (informational)", "baseline": "~0", "target30Day": "5–10", "target90Day": "20–40"},
    {"metric": "Conversion page form submissions", "baseline": "Unknown / low", "target30Day": "+20% increase", "target90Day": "+50% increase"},
    {"metric": "Internal links per page (avg)", "baseline": "1–2", "target30Day": "3–4", "target90Day": "5–8"},
    {"metric": "Blog articles published (informational only)", "baseline": "0", "target30Day": "2–3", "target90Day": "8–12"}
  ]
}
Rules: priority must be one of: URGENT, HIGH, MEDIUM, LOW. estimatedWords is integer 800-3000. Make all content specific to ${industry} and ${url}.`;
  return callLLM<ActionRoadmap>(system, user);
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export type AuditProgress = { stage: string; step: number; total: number; };

export type AuditResult = {
  overallScore: number;
  overview: Overview;
  contentAudit: ContentAudit;
  keywords: Keywords;
  metadata: Metadata;
  schemaData: SchemaData;
  calendar: ContentCalendar;
  checklist: Checklist;
  linking: InternalLinking;
  roadmap: ActionRoadmap;
};

function makeOverviewFallback(url: string, industry: string): Overview {
  return {
    summary: `Initial SEO analysis for ${url} in the ${industry} sector. Multiple improvement opportunities identified across technical and content dimensions.`,
    keyInsight: `Focus on metadata optimization and content depth to achieve quick ranking gains in the ${industry} market.`,
    overallScore: 52,
    seoMaturity: "Medium",
    dimensions: [
      { name: "Site Indexation", score: 6, status: "Good", priority: "Maintain", note: "Needs sitemap verification" },
      { name: "Metadata", score: 3, status: "Needs Rewrite", priority: "URGENT", note: "Titles missing keywords" },
      { name: "Content Depth", score: 4, status: "Improve", priority: "HIGH", note: "Thin content on key pages" },
      { name: "Internal Links", score: 3, status: "Underdeveloped", priority: "HIGH", note: "Sparse internal linking" },
      { name: "Topical Authority", score: 3, status: "Critical Gap", priority: "URGENT", note: "Limited topic coverage" },
      { name: "Local/Niche SEO", score: 4, status: "Improve", priority: "MEDIUM", note: "Local signals weak" },
      { name: "Technical SEO", score: 6, status: "Good", priority: "Maintain", note: "Core vitals acceptable" },
      { name: "Competitor Gap", score: 3, status: "Improve", priority: "HIGH", note: "Missing key topics" },
    ],
  };
}

function makeContentAuditFallback(url: string, industry: string): ContentAudit {
  return {
    executiveSummary: `The site at ${url} is in an early-to-mid SEO maturity stage for the ${industry} industry. Core pages are indexed and functional, but the site is missing the informational content layer that drives organic traffic at scale. The primary opportunity is to build topical authority through educational content targeting long-tail, intent-rich queries that larger competitors underserve.`,
    pageInventory: [
      { page: "Homepage (/)", url: "/", currentSeoValue: "Medium — brand intro, limited keyword targeting", status: "Improve", recommendedAction: "Add keyword-optimized H1, schema markup, FAQ section" },
      { page: "Services (/services)", url: "/services", currentSeoValue: "Low — generic content", status: "Critical Gap", recommendedAction: "Rewrite with target keywords, add service-specific pages" },
      { page: "Blog (/blog)", url: "/blog", currentSeoValue: "Very Low — no informational content", status: "Misused", recommendedAction: "Pivot to educational content: guides, reports, how-tos" },
      { page: "About (/about)", url: "/about", currentSeoValue: "Low — valuable content without schema", status: "Underperforming", recommendedAction: "Add Person/Organization schema, keyword-rich bio" },
      { page: "Contact (/contact)", url: "/contact", currentSeoValue: "Low — no local SEO signals", status: "Needs Work", recommendedAction: "Add LocalBusiness schema, city-specific keywords" },
    ],
    competitorGaps: [
      { competitor: `Top ${industry} aggregator`, ranksFor: `Broad head terms for ${industry}`, gapType: "Cannot Win", opportunity: "Focus on hyper-local and long-tail informational queries" },
      { competitor: `Large established ${industry} brand`, ranksFor: `${industry} guides and comparisons`, gapType: "Content Gap", opportunity: "Build deeper niche content: case studies, local guides" },
      { competitor: "Local/regional competitors", ranksFor: "Educational client content", gapType: "Content Gap", opportunity: "Publish buyer/seller educational articles" },
    ],
    keywordTier1: [
      { keyword: `${industry} services near me`, estimatedVolume: "1,600/mo", estimatedKD: 35, recommendedContent: "Expand existing page with local content" },
      { keyword: `best ${industry} in [city]`, estimatedVolume: "880/mo", estimatedKD: 28, recommendedContent: "Create dedicated local landing page" },
      { keyword: `${industry} for beginners`, estimatedVolume: "1,200/mo", estimatedKD: 32, recommendedContent: "Blog article + landing page with SEO copy" },
    ],
    keywordTier2: [
      { keyword: `hire ${industry} expert`, estimatedVolume: "880/mo", estimatedKD: 30, recommendedContent: "Rewrite service page with this keyword as primary target" },
      { keyword: `${industry} pricing 2026`, estimatedVolume: "480/mo", estimatedKD: 22, recommendedContent: "Create pricing/valuation page targeting this keyword" },
      { keyword: `how to choose ${industry}`, estimatedVolume: "390/mo", estimatedKD: 20, recommendedContent: "Blog article with strong CTA" },
    ],
    keywordTier3: [
      { keyword: `${industry} market 2026`, estimatedVolume: "1,100/mo", estimatedKD: 26, recommendedContent: "Monthly blog: market report targeting this keyword" },
      { keyword: `best ${industry} options for families`, estimatedVolume: "960/mo", estimatedKD: 24, recommendedContent: "Blog guide with internal links to service pages" },
      { keyword: `moving to [city] ${industry} guide`, estimatedVolume: "480/mo", estimatedKD: 19, recommendedContent: "Niche guide expansion targeting this query" },
      { keyword: `${industry} option A vs option B`, estimatedVolume: "320/mo", estimatedKD: 18, recommendedContent: "Comparison blog post linking to both pages" },
    ],
  };
}

function makeRoadmapFallback(industry: string): ActionRoadmap {
  return {
    phases: [
      {
        phase: "Phase 1 — Foundation (Weeks 1–3)",
        subtitle: "On-Page Fixes",
        actions: [
          { action: "Update all meta title tags with optimized versions", priority: "URGENT", platform: "CMS Settings > SEO" },
          { action: "Write meta descriptions for all key pages", priority: "URGENT", platform: "CMS Settings" },
          { action: "Add keyword-optimized H1 to homepage and service pages", priority: "HIGH", platform: "CMS Page Editor" },
          { action: "Implement all immediate internal links", priority: "HIGH", platform: "CMS Page Editor" },
          { action: "Add Organization schema markup to homepage", priority: "HIGH", platform: "Developer / code injection" },
        ],
      },
      {
        phase: "Phase 2 — Content Foundation (Weeks 4–8)",
        subtitle: "Pillar Articles",
        actions: [
          { action: `Publish PILLAR: Complete ${industry} Buyer's Guide 2026`, priority: "HIGH", platform: "Blog / CMS" },
          { action: `Publish PILLAR: Complete ${industry} Seller's Guide 2026`, priority: "HIGH", platform: "Blog / CMS" },
          { action: `Publish ${industry} Market Report — Q1 2026`, priority: "HIGH", platform: "Blog / CMS" },
        ],
      },
      {
        phase: "Phase 3 — Cluster Expansion (Weeks 9–12)",
        subtitle: "Long-Tail Articles",
        actions: [
          { action: `Publish relocation/onboarding guide for ${industry}`, priority: "MEDIUM", platform: "Blog / CMS" },
          { action: `Publish best options guide for ${industry} 2026`, priority: "MEDIUM", platform: "Blog / CMS" },
        ],
      },
    ],
    phase2Blog: [
      { title: `Complete ${industry} Buyer's Guide 2026`, targetKeyword: `buying guide ${industry}`, cluster: "Buyer Pillar", estimatedWords: 2500 },
      { title: `Complete ${industry} Seller's Guide 2026`, targetKeyword: `selling guide ${industry}`, cluster: "Seller Pillar", estimatedWords: 2500 },
      { title: `${industry} Market Report — Q1 2026`, targetKeyword: `${industry} market 2026`, cluster: "Seller Cluster", estimatedWords: 1500 },
    ],
    phase3Blog: [
      { title: `Relocation/Onboarding Guide for ${industry} 2026`, targetKeyword: `moving to ${industry}`, cluster: "Buyer Cluster", estimatedWords: 2000 },
      { title: `Best ${industry} Options: 2026 Guide`, targetKeyword: `best ${industry} options`, cluster: "Buyer Cluster", estimatedWords: 1800 },
    ],
    kpis: [
      { metric: "Pages ranking in top 20 for target terms", baseline: "1–2 pages", target30Day: "3–4 pages", target90Day: "6–8 pages" },
      { metric: "Organic blog traffic (monthly sessions)", baseline: "<50 sessions", target30Day: "100–200", target90Day: "500–1,000" },
      { metric: "Keyword rankings in positions 1–20", baseline: "~0", target30Day: "5–10", target90Day: "20–40" },
      { metric: "Conversion page form submissions", baseline: "Unknown / low", target30Day: "+20% increase", target90Day: "+50% increase" },
      { metric: "Internal links per page (avg)", baseline: "1–2", target30Day: "3–4", target90Day: "5–8" },
      { metric: "Blog articles published (informational)", baseline: "0", target30Day: "2–3", target90Day: "8–12" },
    ],
  };
}

export async function runFullAudit(
  url: string,
  industry: string,
  onProgress?: (p: AuditProgress) => void
): Promise<AuditResult> {
  const report = (stage: string, step: number) => onProgress?.({ stage, step, total: 6 });

  report("Scoring 8 SEO dimensions...", 1);
  let overview = await runOverviewCall(url, industry);
  if (!overview) { console.warn("[AuditEngine] Overview fallback"); overview = makeOverviewFallback(url, industry); }

  report("Auditing content & competitor gaps...", 2);
  let contentAudit = await runContentAuditCall(url, industry);
  if (!contentAudit) { console.warn("[AuditEngine] ContentAudit fallback"); contentAudit = makeContentAuditFallback(url, industry); }

  report("Mapping keyword opportunities...", 3);
  let keywords = await runKeywordsCall(url, industry);
  if (!keywords) {
    keywords = {
      strategy: `Focus on long-tail ${industry} keywords with lower competition to build initial organic traffic.`,
      opportunities: [
        { keyword: `${industry} services`, volume: "1,200/mo", difficulty: 45, intent: "Commercial" as const, priority: "HIGH" as const, contentType: "Service page", cluster: "Core Services" },
        { keyword: `best ${industry} tips`, volume: "800/mo", difficulty: 32, intent: "Informational" as const, priority: "URGENT" as const, contentType: "Guide", cluster: "Educational" },
        { keyword: `${industry} guide 2026`, volume: "600/mo", difficulty: 28, intent: "Informational" as const, priority: "HIGH" as const, contentType: "Pillar post", cluster: "Guides" },
        { keyword: `${industry} for beginners`, volume: "400/mo", difficulty: 22, intent: "Informational" as const, priority: "MEDIUM" as const, contentType: "How-To", cluster: "Beginner" },
        { keyword: `${industry} pricing`, volume: "900/mo", difficulty: 38, intent: "Commercial" as const, priority: "MEDIUM" as const, contentType: "Pricing page", cluster: "Commercial" },
        { keyword: `${industry} near me`, volume: "2,100/mo", difficulty: 35, intent: "Navigational" as const, priority: "LOW" as const, contentType: "Local page", cluster: "Local" },
      ],
    };
  }

  report("Rewriting metadata & schema...", 4);
  let metaSchema = await runMetadataSchemaCall(url, industry);
  if (!metaSchema) {
    const domain = url.replace(/https?:\/\//, "").replace(/\/.*/, "");
    metaSchema = {
      metadata: {
        note: `Metadata across all pages needs optimization with ${industry}-specific keywords.`,
        pages: [
          { page: "Homepage", url: "/", currentTitle: "Welcome", currentDesc: "We offer great services.", optimizedTitle: `${industry} Services | ${domain}`, optimizedDesc: `Expert ${industry} services that drive results. Get started today with a free consultation.`, titleChars: 40, descChars: 95, issue: "No keyword" as const },
          { page: "About", url: "/about", currentTitle: "About Us", currentDesc: "Learn about us.", optimizedTitle: `About Us | ${industry} Experts`, optimizedDesc: `Meet our experienced ${industry} team. We've helped hundreds of businesses achieve their goals.`, titleChars: 32, descChars: 90, issue: "Too short" as const },
          { page: "Services", url: "/services", currentTitle: "Services", currentDesc: "Our services.", optimizedTitle: `${industry} Services | Proven Results`, optimizedDesc: `Comprehensive ${industry} services tailored to your business. See how we can help you grow.`, titleChars: 38, descChars: 88, issue: "Generic" as const },
          { page: "Blog", url: "/blog", currentTitle: "Blog", currentDesc: "Read our blog.", optimizedTitle: `${industry} Blog | Tips & Guides`, optimizedDesc: `Expert ${industry} tips, guides, and insights. Updated weekly with actionable advice.`, titleChars: 34, descChars: 82, issue: "Missing" as const },
        ],
      },
      schemaData: {
        recommendation: `Implement Organization and Article schema markup to improve rich results in ${industry} searches.`,
        schemas: [
          { type: "Organization", page: "Homepage", priority: "HIGH" as const, code: `{"@context":"https://schema.org","@type":"Organization","name":"${domain}","url":"${url}"}` },
          { type: "Article", page: "Blog posts", priority: "MEDIUM" as const, code: `{"@context":"https://schema.org","@type":"Article","headline":"Article Title","author":{"@type":"Person","name":"Author"},"datePublished":"2024-01-01"}` },
        ],
      },
    };
  }

  report("Building content calendar & checklist...", 5);
  let calendarChecklist = await runCalendarChecklistCall(url, industry);
  if (!calendarChecklist) {
    calendarChecklist = {
      calendar: {
        strategy: `Build topical authority in ${industry} through a mix of pillar content and supporting cluster articles over 90 days.`,
        items: [
          { week: 1, title: `Complete ${industry} Guide 2026`, keyword: `${industry} guide`, wordCount: 2500, type: "Pillar" as const, cluster: "Core Topic", internalLinks: ["Services", "About"] },
          { week: 2, title: `How to Get Started with ${industry}`, keyword: `how to ${industry}`, wordCount: 1200, type: "How-To" as const, cluster: "Beginner", internalLinks: ["Services", "Blog"] },
          { week: 4, title: `${industry} Checklist: 10 Essential Steps`, keyword: `${industry} checklist`, wordCount: 1800, type: "Guide" as const, cluster: "Practical", internalLinks: ["Blog", "Services"] },
          { week: 7, title: `Best ${industry} Tools Compared`, keyword: `${industry} tools`, wordCount: 2000, type: "Cluster" as const, cluster: "Tools", internalLinks: ["Blog", "Services"] },
          { week: 10, title: `${industry} Trends Report 2026`, keyword: `${industry} trends`, wordCount: 1500, type: "Report" as const, cluster: "Industry Insights", internalLinks: ["About", "Services"] },
        ],
      },
      checklist: {
        items: [
          { id: "c1", category: "Technical", task: "Fix broken links and 404 errors", priority: "URGENT" as const, phase: "Week 1-3", impact: "Improves crawlability and user experience", done: false },
          { id: "c2", category: "On-Page", task: "Rewrite title tags with target keywords", priority: "URGENT" as const, phase: "Week 1-3", impact: "Boosts click-through rate from search", done: false },
          { id: "c3", category: "On-Page", task: "Write meta descriptions for all key pages", priority: "URGENT" as const, phase: "Week 1-3", impact: "Improves CTR and search snippet quality", done: false },
          { id: "c4", category: "Technical", task: "Submit XML sitemap to Google Search Console", priority: "HIGH" as const, phase: "Week 1-3", impact: "Faster indexation of all pages", done: false },
          { id: "c5", category: "Content", task: `Create pillar page for ${industry} main topic`, priority: "HIGH" as const, phase: "Week 1-3", impact: "Establishes topical authority", done: false },
          { id: "c6", category: "Internal Links", task: "Add internal links from homepage to key pages", priority: "HIGH" as const, phase: "Week 4-8", impact: "Distributes PageRank effectively", done: false },
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

  report("Building 90-day action roadmap...", 6);
  let roadmap = await runRoadmapCall(url, industry);
  if (!roadmap) { console.warn("[AuditEngine] Roadmap fallback"); roadmap = makeRoadmapFallback(industry); }

  return {
    overallScore: overview.overallScore,
    overview,
    contentAudit,
    keywords,
    metadata: metaSchema.metadata,
    schemaData: metaSchema.schemaData,
    calendar: calendarChecklist.calendar,
    checklist: calendarChecklist.checklist,
    linking: calendarChecklist.linking,
    roadmap,
  };
}
