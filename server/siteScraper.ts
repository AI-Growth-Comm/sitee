/**
 * siteScraper.ts — Extracts real site data from a URL for use in audit LLM prompts.
 *
 * Strategy:
 *  1. Fetch the homepage HTML with a realistic browser User-Agent
 *  2. Parse title, meta description, canonical, H1s, nav links, body text snippets
 *  3. Attempt to fetch /sitemap.xml for page discovery
 *  4. Attempt to fetch 2-3 key sub-pages found in nav
 *  5. Return a structured SiteContext object used by all LLM calls
 */

export interface PageSnapshot {
  url: string;
  title: string;
  metaDesc: string;
  h1: string;
  h2s: string[];
  bodyText: string; // first ~600 chars of visible text
}

export interface SiteContext {
  baseUrl: string;
  homepage: PageSnapshot;
  discoveredPages: string[]; // actual URLs found in nav/sitemap
  subPages: PageSnapshot[];  // snapshots of up to 3 sub-pages
  sitemapFound: boolean;
  robotsTxt: string;
  scrapeError?: string;
  scrapedAt: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractMeta(html: string, name: string): string {
  // Try name= and property= variants
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim().slice(0, 300);
  }
  return "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim().slice(0, 200) ?? "";
}

function extractH1s(html: string): string[] {
  const results: string[] = [];
  const re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && results.length < 3) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) results.push(text.slice(0, 150));
  }
  return results;
}

function extractH2s(html: string): string[] {
  const results: string[] = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && results.length < 6) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) results.push(text.slice(0, 150));
  }
  return results;
}

function extractBodyText(html: string): string {
  // Remove script, style, nav, header, footer blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text.slice(0, 800);
}

function extractNavLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();

  // Extract all <a href> values
  const re = /<a[^>]+href=["']([^"'#?]+)["']/gi;
  let m: RegExpExecArray | null;
  const base = new URL(baseUrl);

  while ((m = re.exec(html)) !== null) {
    let href = m[1].trim();
    if (!href || href === "/" || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    try {
      const resolved = new URL(href, baseUrl);
      // Only same-domain links
      if (resolved.hostname !== base.hostname) continue;
      const path = resolved.pathname;
      if (path === "/" || path === "") continue;
      // Skip image/asset paths
      if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js|ico|woff|ttf)$/i.test(path)) continue;
      const clean = `${resolved.origin}${path}`;
      if (!seen.has(clean)) {
        seen.add(clean);
        links.push(clean);
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return links.slice(0, 20);
}

function parseSnapshot(url: string, html: string): PageSnapshot {
  return {
    url,
    title: extractTitle(html),
    metaDesc: extractMeta(html, "description") || extractMeta(html, "og:description"),
    h1: extractH1s(html)[0] ?? "",
    h2s: extractH2s(html),
    bodyText: extractBodyText(html),
  };
}

async function fetchRobotsTxt(baseUrl: string): Promise<string> {
  try {
    const url = new URL("/robots.txt", baseUrl).toString();
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}

async function fetchSitemap(baseUrl: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return urls;
    const xml = await res.text();
    const re = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
    let m: RegExpExecArray | null;
    const base = new URL(baseUrl);
    while ((m = re.exec(xml)) !== null && urls.length < 30) {
      try {
        const u = new URL(m[1]);
        if (u.hostname === base.hostname) urls.push(u.toString());
      } catch { /* skip */ }
    }
  } catch { /* sitemap not found */ }
  return urls;
}

export async function scrapeSite(rawUrl: string): Promise<SiteContext> {
  // Normalize URL
  let baseUrl = rawUrl.trim();
  if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
  // Strip trailing slash for consistency
  baseUrl = baseUrl.replace(/\/$/, "");

  const scrapedAt = new Date().toISOString();

  // 1. Fetch homepage
  const homepageHtml = await fetchHtml(baseUrl);
  if (!homepageHtml) {
    return {
      baseUrl,
      homepage: { url: baseUrl, title: "", metaDesc: "", h1: "", h2s: [], bodyText: "" },
      discoveredPages: [],
      subPages: [],
      sitemapFound: false,
      robotsTxt: "",
      scrapeError: "Could not fetch homepage — site may block crawlers or require JavaScript rendering",
      scrapedAt,
    };
  }

  const homepage = parseSnapshot(baseUrl, homepageHtml);

  // 2. Discover pages from nav links
  const navLinks = extractNavLinks(homepageHtml, baseUrl);

  // 3. Try sitemap
  const sitemapPages = await fetchSitemap(baseUrl);
  const sitemapFound = sitemapPages.length > 0;

  // Merge nav + sitemap pages, deduplicate
  const merged = navLinks.concat(sitemapPages);
  const seenAll = new Set<string>();
  const allDiscovered: string[] = [];
  for (const u of merged) {
    if (!seenAll.has(u)) { seenAll.add(u); allDiscovered.push(u); }
    if (allDiscovered.length >= 25) break;
  }

  // 4. Fetch up to 3 sub-pages (prioritize nav links)
  const pagesToFetch = navLinks.slice(0, 3);
  const subPages: PageSnapshot[] = [];

  for (const pageUrl of pagesToFetch) {
    const html = await fetchHtml(pageUrl);
    if (html) {
      subPages.push(parseSnapshot(pageUrl, html));
    }
  }

  // 5. robots.txt
  const robotsTxt = await fetchRobotsTxt(baseUrl);

  return {
    baseUrl,
    homepage,
    discoveredPages: allDiscovered,
    subPages,
    sitemapFound,
    robotsTxt,
    scrapedAt,
  };
}

/**
 * Format SiteContext into a concise text block for LLM prompts.
 * Keeps it under ~1500 tokens.
 */
export function formatSiteContextForPrompt(ctx: SiteContext): string {
  const lines: string[] = [];

  lines.push("=== REAL SITE DATA (use this — do NOT invent) ===");
  lines.push(`Base URL: ${ctx.baseUrl}`);
  lines.push(`Scraped at: ${ctx.scrapedAt}`);

  if (ctx.scrapeError) {
    lines.push(`Scrape note: ${ctx.scrapeError}`);
  }

  lines.push("\n--- Homepage ---");
  lines.push(`Title: ${ctx.homepage.title || "(none found)"}`);
  lines.push(`Meta Description: ${ctx.homepage.metaDesc || "(none found)"}`);
  lines.push(`H1: ${ctx.homepage.h1 || "(none found)"}`);
  if (ctx.homepage.h2s.length > 0) {
    lines.push(`H2s: ${ctx.homepage.h2s.join(" | ")}`);
  }
  if (ctx.homepage.bodyText) {
    lines.push(`Visible text snippet: ${ctx.homepage.bodyText.slice(0, 400)}`);
  }

  if (ctx.discoveredPages.length > 0) {
    lines.push(`\n--- Discovered Pages (${ctx.discoveredPages.length} total) ---`);
    lines.push(ctx.discoveredPages.slice(0, 15).join("\n"));
  }

  if (ctx.subPages.length > 0) {
    lines.push("\n--- Sub-page Snapshots ---");
    for (const p of ctx.subPages) {
      lines.push(`\nPage: ${p.url}`);
      lines.push(`  Title: ${p.title || "(none)"}`);
      lines.push(`  Meta: ${p.metaDesc || "(none)"}`);
      lines.push(`  H1: ${p.h1 || "(none)"}`);
      if (p.bodyText) lines.push(`  Text: ${p.bodyText.slice(0, 200)}`);
    }
  }

  if (ctx.sitemapFound) {
    lines.push("\nSitemap: Found (XML sitemap present)");
  } else {
    lines.push("\nSitemap: Not found");
  }

  lines.push("\n=== END SITE DATA ===");
  return lines.join("\n");
}
