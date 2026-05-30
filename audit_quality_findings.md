# Audit Quality Investigation — visitcobleslanding.com

## What the site actually is
- **Cobles Landing** — Family-owned multi-purpose campground (since 2020)
- Located in United States (NC area based on phone prefix 704)
- Services: Campground, Nature Trails, RV Parking, Fishing Pond, Event Space Rental, Beekeeping
- Nav pages: Home, About, Rates, Forms, Events, Beekeeping, Shop, Photos, Contact
- Built on Wix (JavaScript-heavy SPA — very little crawlable text)
- Social: Facebook, Instagram

## Root Causes of Poor Audit Quality

### 1. NO WEB SCRAPING — The #1 Problem
The audit engine (`auditEngine.ts`) sends ONLY the URL string and industry label to the LLM.
It does NOT:
- Fetch the actual page HTML
- Extract page titles, meta descriptions, H1s, nav links
- Discover internal pages
- Read any actual content from the site

The LLM is being asked to "analyze" a site it has never seen. It hallucinates generic industry content.

### 2. Wix SPA — Scraping is harder
The site is built on Wix, which renders content via JavaScript. A simple `fetch()` of the HTML
returns almost no readable text (confirmed: markdown extraction returned only 1042 chars).
The actual content is in JS bundles and dynamic renders.

### 3. Generic Fallback Templates Dominate
All 6 LLM prompts use `${industry}` template variables as examples in the JSON structure itself.
The LLM often pattern-matches to these examples rather than generating site-specific content.
For example, the metadata prompt literally shows "Blog (/blog)" and "Services (/services)" as
example pages — but visitcobleslanding.com has none of those pages.

### 4. No Page Discovery
The engine doesn't know what pages actually exist on the site. It invents pages like /services,
/blog, /about that don't exist on this campground site. The real pages are /rates, /events,
/beekeeping, /shop, /photos.

### 5. Industry Mismatch
If the user selected a generic industry like "Tourism" or "Other", the LLM defaults to
generic business advice rather than campground/outdoor recreation specific guidance.

## What Needs to Be Fixed

### Engine Improvements
1. Add real web scraping: fetch HTML, extract title, meta desc, H1, nav links, visible text
2. Use a headless-friendly approach: try multiple fetch strategies (direct, with user-agent)
3. Discover actual pages from nav links
4. Pass scraped data as context to ALL LLM calls
5. Improve prompts to use actual site data, not just URL+industry

### Quality Control Panel
Build an admin panel where:
- Any audit can be reviewed for accuracy
- Admins can flag sections as "Accurate", "Partially Accurate", or "Inaccurate"
- Notes can be added explaining what was wrong
- A quality score (0-100) is tracked per audit
- The panel shows the raw scraped data vs what the LLM generated
- Flagged audits can trigger a re-run with improved context
