# RankIQ TODO

## Database & Backend
- [x] Extend drizzle schema: audits table with JSONB-like columns
- [x] Extend drizzle schema: checklist_progress table
- [x] Run db:push to apply migrations
- [x] AI audit engine: 5 sequential LLM calls with tryParse resilient parser
- [x] tRPC router: runAudit mutation (creates audit, streams progress)
- [x] tRPC router: getAudit query
- [x] tRPC router: listAudits query (history, max 20)
- [x] tRPC router: updateChecklistItem mutation
- [x] tRPC router: exportCSV query

## Landing Page
- [x] URL input with Enter key + button trigger
- [x] Industry dropdown (10 options)
- [x] Recent audits panel (last 3, click to pre-fill)
- [x] Disable button when URL field is empty

## Loading State
- [x] Full-screen loading overlay with animated spinner
- [x] Stage text updates for each of 5 AI calls
- [x] Shimmer skeleton cards

## Dashboard — 7 Tabs
- [x] Sticky top nav: logo, URL, mini score ring, New Audit button
- [x] Tab bar: Overview / Keywords / Metadata / Schema / Calendar / Checklist / History

### Overview Tab
- [x] Score arc SVG (0–100, color coded: ≥70 green, 45–69 amber, <45 red)
- [x] 2-sentence AI summary + 1-sentence key insight
- [x] 8 dimension score cards
- [x] Radar chart (Recharts)
- [x] Horizontal bar chart (Recharts, color coded)
- [x] Topical clusters panel (pillar + 3 supporting articles)

### Keywords Tab
- [x] 2-sentence keyword strategy text
- [x] Filter pills: ALL / URGENT / HIGH / MEDIUM / LOW
- [x] Table: Keyword, Volume, KD bar, Intent badge, Priority badge, Content Type

### Metadata Tab
- [x] 1-sentence overall assessment
- [x] 4 pages: current title (red bg) vs optimized title (green bg)
- [x] Current desc vs optimized desc with character counts
- [x] Issue badge per page

### Schema Tab
- [x] 2 schema types with type name, target page, priority badge
- [x] View Code toggle expanding JSON-LD block
- [x] Copy button with 2-sec "✓ Copied!" confirmation

### Calendar Tab
- [x] 5 calendar items: week number, title, type badge, word count, keyword, cluster, internal links

### Checklist Tab
- [x] Progress bar (X of N done, percentage)
- [x] CSV export button
- [x] Priority filter + Phase filter
- [x] 8 tasks grouped by category
- [x] Checkbox (persistent via DB), priority badge, phase, impact note
- [x] Done = strikethrough

### History Tab
- [x] All saved audits (max 20): score ring, URL, industry, date
- [x] Re-run button

## Error Handling
- [x] Fixed bottom-center toast on errors with × dismiss
- [x] Actual API error text surfaced

## Polish
- [x] Responsive design
- [x] Dark theme with professional SEO tool aesthetic
- [x] Vitest tests for audit router

## Bug Fixes & Improvements (v2)
- [x] Fix AI engine: remove prefill trick, use proper system prompts and robust JSON extraction
- [x] Fix CSS @import order (Google Fonts moved to index.html link tag)
- [x] History tab: show Failed badge for failed audits, hide View button for failed
- [x] History tab: filter out pending/running audits
- [x] Re-run button pre-fills URL and industry via query params
- [x] Recent audits panel shows global audits for guests
- [x] Add Linking tab (8th tab) with topical clusters and immediate link opportunities
- [x] Loading overlay: real progress bar with step counter and percentage

## Report Generation & Saving (v3)
- [x] Extend AI engine: add Executive Summary with Current State Scorecard
- [x] Extend AI engine: add Content Audit & Page Inventory table
- [x] Extend AI engine: add Competitor Landscape & Content Gap Analysis table
- [x] Extend AI engine: add Long-Tail Keyword Opportunity Matrix (Tier 1/2/3)
- [x] Extend AI engine: add Topical Cluster Architecture (Pillar 1 & 2 with linking behavior)
- [x] Extend AI engine: add Immediate Internal Linking Actions table
- [x] Extend AI engine: add Neighborhood/Page Cross-Linking Map
- [x] Extend AI engine: add 90-Day Priority Action Roadmap (Phase 1/2/3)
- [x] Extend AI engine: add KPIs & Success Metrics table
- [x] Extend shared types for all new sections
- [x] Update DB schema: add reports table (savedAt, title, auditId, pdfUrl)
- [x] Run db:push for new reports table
- [x] Build Report Viewer page (/audit/:id/report) with all 4 modules
- [x] Report cover page: client URL, industry, audit date, maturity level
- [x] Module 1: Executive Summary + Current State Scorecard
- [x] Module 1: Content Audit & Page Inventory table
- [x] Module 1: Competitor Landscape & Content Gap Analysis
- [x] Module 1: Long-Tail Keyword Matrix (Tier 1/2/3)
- [x] Module 2: Metadata Rewrites (current vs optimized, all pages)
- [x] Module 3: Internal Linking Architecture
- [x] Module 3: Topical Cluster Architecture (Pillar 1 & 2)
- [x] Module 3: Immediate Internal Linking Actions table
- [x] Module 3: Cross-Linking Map
- [x] Module 4: 90-Day Priority Action Roadmap (Phase 1/2/3)
- [x] Module 4: KPIs & Success Metrics table
- [x] PDF export of full report (browser print-to-PDF via dedicated print stylesheet)
- [x] Save report button: saves report record to DB with timestamp
- [x] Saved Reports page (/reports): list all saved reports, view/delete
- [x] Add "View Report" button to audit dashboard
- [x] Light/Dark theme toggle in nav (sun/moon icon)
- [x] Theme toggle persists via localStorage
- [x] Update all pages to support both light and dark themes

## "Other" Industry & Custom Business Name (v4)
- [x] Add "Other" as last option in industry dropdown
- [x] Show custom business name text input when "Other" is selected
- [x] Validate: business name required when industry is "Other"
- [x] Pass customIndustry field through tRPC audit.run mutation
- [x] Update DB schema: add customIndustry column to audits table
- [x] Run db:push for customIndustry column
- [x] Update AI engine: use customIndustry as the industry context in all 7 LLM calls
- [x] Show custom business name in dashboard nav and report cover page
- [x] Pre-fill business name on Re-run from history

## Sitee v5 Updates
- [x] Update index.css with full Sitee color variable set (primary, accent, success, warning, error, bg, surface, border, text, muted)
- [x] Update <title> in index.html to "Sitee — Know your site. Grow your business."
- [x] Replace remaining "RankIQ" strings with "Sitee" in client/src/
- [x] Add hub.summary protectedProcedure to routers.ts (auditsUsed, auditsLimit, recentAudits×5, savedReports×5)
- [x] Build UserHub.tsx at /hub (collapsible sidebar, 4 sections: Overview, Audit History, Reports, Profile)
- [x] Add /hub route to App.tsx
- [x] Rename "Linking" tab to "Internal Links" in AuditDashboard.tsx
- [x] Add floating sticky "View Report" button bottom-right to AuditDashboard
- [x] Tab bar overflow-x-auto on mobile in AuditDashboard
- [x] OAuth callback redirect to /hub after sign-in
- [x] Sign out redirects to /
- [x] Add Sign In link (LogIn icon) to Home.tsx nav for guests
- [x] Show user first name + hub link in Home.tsx nav when signed in

## Guest Teaser Conversion Flow (v6)
- [x] Add claimed and guestToken columns to drizzle/schema.ts
- [x] Apply DB columns (confirmed present via direct SQL)
- [x] Update audit.run to generate guestToken cookie for guests and save to DB
- [x] Update audit.get to return isTeaser:true with partial data for guests
- [x] Add audit.claim publicProcedure (sets userId + claimed=true)
- [x] Build AuditTeaser.tsx at /audit/:id/teaser (score ring, 2 dims, 2 keywords, blurred sections, sign-in wall)
- [x] Update OAuth callback to auto-claim guest audit and redirect to /audit/:id
- [x] Update Home.tsx to route guests to /teaser, signed-in users to /audit/:id
- [x] Add /audit/:id/teaser route to App.tsx (before /audit/:id)
- [x] Fix AuditDashboard.tsx and ReportViewer.tsx to handle isTeaser union type
- [x] All 15 tests passing

## UX Polish & Pricing (v7)
- [x] Fix UserHub setState-in-render bug (navigate called during render)
- [x] Expand AuditTeaser: show 4 dimensions, 4 keywords, full summary (more free content)
- [x] Polish audit→report navigation: consistent teal branding, breadcrumb, back button
- [x] Polish SavedReports / SavedReportViewer flow: consistent nav, back to hub
- [x] Build Pricing.tsx at /pricing (3-tier: Free/Pro/Agency, feature comparison table)
- [x] Link /pricing from Home nav and teaser sign-in wall

## Hub Shell Refactor (v8) — superseded by v10 inline hub implementation
- [x] Update hub.summary to return full audit history (implemented in v10 via allAudits field)
- [x] Add hub sub-routes: /dashboard handles inline navigation via inlineView state
- [x] Build HubShell layout with persistent sidebar + dynamic main area (UserHub.tsx)
- [x] Build inline NewAudit panel (form + loading + results inside hub) (NewAuditPanel)
- [x] Adapt AuditDashboard → embedded inside dashboard via inlineView state
- [x] Adapt ReportViewer → embedded inside dashboard via inlineView state
- [x] Adapt SavedReports + SavedReportViewer → hub sections (Reports tab in HistorySection)
- [x] Keep standalone /audit/:id and /audit/:id/report routes for backward compat

## Hub Shell Option A (v9) — superseded by v10 inline hub implementation
- [x] Rewrite UserHub.tsx: inline audit/report/saved-report rendering with selectedAuditId state
- [x] TypeScript check + tests + checkpoint

## New Sprint (v10)
- [x] Fix data isolation: audit.list, hub.summary, report.list must be strictly scoped to ctx.user.id — no guest/cross-account leakage
- [x] Rename all "hub" → "dashboard": routes (/hub → /dashboard), nav labels, component names, UI text, server router key
- [x] Add inline "New Audit" panel inside the Dashboard (URL input + industry select + loading + redirect to results — no home page redirect)
- [x] Expand home page: add 5 SEO/AEO/GEO content sections (How we help, AI standards, Problems solved, Fast updates, Who it's for)
- [x] Add 6 FAQs accordion to home page
- [x] Add full SEO meta tags + OG tags + JSON-LD to index.html

## Brand Color Update (Sitemizer)
- [x] Update CSS variables in index.css to Sitemizer electric blue (#00AEEF = oklch(0.70 0.17 215))
- [x] Fix AuditTeaser.tsx: replace hardcoded teal gradient from-[#0D9488] to-[#0F766E] with from-[#00AEEF] to-[#0090C8]
- [x] Fix AuditTeaser.tsx: replace hardcoded text-[#0D9488] with text-[#00AEEF] on CTA button
- [x] Fix Pricing.tsx: replace hardcoded teal gradient from-[#0D9488] to-[#0F766E] with from-[#00AEEF] to-[#0090C8]
- [x] Fix Pricing.tsx: replace hardcoded text-[#0D9488] with text-[#00AEEF] on CTA button

## Audit Engine Accuracy Improvements
- [x] Add real web scraping to auditEngine.ts: fetch HTML, extract title, meta desc, H1s, nav links, body text, page count
- [x] Implement multi-strategy scraping: direct fetch with browser user-agent, fallback to text extraction
- [x] Discover actual site pages from nav links and sitemap
- [x] Pass scraped site context (title, meta, pages, content snippets) to ALL 6 LLM calls
- [x] Rewrite LLM prompts to use actual scraped data, not just URL+industry placeholders
- [x] Add siteContext field to auditEngine result for storage and display in QC panel

## Audit Quality Control Panel
- [x] Add auditReviews table to schema: auditId, reviewerId, sectionFlags (JSON), overallAccuracy, notes, createdAt
- [x] Run db:push for auditReviews table
- [x] Add admin tRPC procedures: quality.getAuditForReview, quality.submitReview, quality.listReviews
- [x] Build AuditQualityPanel.tsx: inline view in dashboard (admin only) showing scraped context vs LLM output
- [x] Section-by-section accuracy flags: Keywords, Metadata, Calendar, Recommendations, Internal Links
- [x] Per-section rating: Accurate / Partially Accurate / Inaccurate + notes field
- [x] Overall accuracy score display and history
- [x] Re-run button that uses improved scraping context (via New Audit panel with same URL)
- [x] Add Quality Control nav item to dashboard sidebar (admin only)

## Domain-Scoped Audit History (v11)
- [x] Add audit.listByDomain tRPC query: filter audits by normalized domain, scoped to ctx.user.id
- [x] Add audit.domainStats tRPC query: return total audit count for a given domain
- [x] Update AuditDashboard History tab: pass current audit URL, filter list to same domain only
- [x] Show "X audits for this domain" count at top of History tab
- [x] Normalize domain comparison (strip www., protocol, trailing slash)

## Quality Control AI Analysis (v12)
- [x] Add quality.analyzeAccuracy tRPC mutation: send audit data + scraped context to LLM, get section-by-section accuracy verdict with reasoning
- [x] Update AuditQualityPanel: "Run AI Analysis" button that calls the mutation and shows AI verdict per section
- [x] Show overall AI-computed accuracy score and summary in the panel
- [x] Display AI reasoning text per section (why it rated accurate/partial/inaccurate)

## Audit History Delete Button (v12)
- [x] Add audit.delete tRPC mutation (protected, owner-only, soft or hard delete)
- [x] Add delete icon button to each row in HistorySection (UserHub) and HistoryTab (AuditDashboard)
- [x] Confirm before delete (inline confirm or toast with undo)
- [x] Remove deleted audit from list optimistically

## SEO Report Page Redesign (v12)
- [x] Redesign ReportViewer to match screenshot: left sidebar with module nav, top breadcrumb bar with Print/Save/Dashboard actions, clean white card layout
- [x] Left sidebar: Cover & Scorecard, Module 1: Content Audit, Module 2: Metadata, Module 3: Internal Linking, Module 4: Action Roadmap
- [x] Top bar: Back to Results, site URL, theme toggle, Print/PDF, Save Report, Dashboard buttons
- [x] Module content: clean section headers with icons, tables with proper borders, keyword badges

## Reports + Audit Unification (v12)
- [x] Merge Reports nav item into Audit History: tabbed view (Audit History / Saved Reports) inside single section
- [x] Reports sidebar nav now routes to Audit History with Reports tab pre-selected
- [x] Save Report invalidates dashboard cache so Reports tab reflects new saves

## Self-Improving Audit Quality System (v13)
- [x] Add auditCriteria table: id, domain, sectionName, issueType, description, severity, learnedFrom (auditId), createdAt
- [x] Add qualityInsights table: id, auditId, sectionResults (JSON), overallAccuracy, overallSummary, criteriaExtracted, createdAt
- [x] Run db:push for new tables (auditCriteria + qualityInsights)
- [x] Auto-trigger quality analysis after every audit completes (post-audit hook in audit.run via qualityLearningEngine.ts)
- [x] Extract failure patterns from analysis: store per-section issues in auditCriteria table
- [x] Flag known issues in future audits: before LLM calls, query auditCriteria for same domain and inject as "known issues to avoid" context
- [x] Add quality.getInsights tRPC query: return auto-generated insight for a specific auditId
- [x] Show AutoInsightsBanner in Quality Control review form showing auto-analysis results
- [x] Add quality.getCriteriaForDomain tRPC query: admin view of all learned criteria for a domain
- [x] Show learned criteria list in Quality Control panel (Learned Criteria tab) with dismiss button

## Professional PDF Report Template (v13)
- [x] Build PrintReport.tsx: self-contained print view with @page CSS, cover page, TOC, scorecard, 4 modules
- [x] Cover page: Sitemizer logo, report title, client URL, industry, generation date, maturity level
- [x] Running header/footer with CSS counters (Page X of Y), brand notice
- [x] SVG semi-circular gauge for overall score
- [x] CSS horizontal progress bars for 7 dimension scores
- [x] Pure CSS/SVG keyword tier tables, metadata comparison, internal linking map
- [x] 90-Day roadmap phase cards, content calendar table
- [x] Wire Print/PDF button in ReportViewer to open PrintReport.tsx in a new window and trigger window.print()
- [x] Add print stylesheet: page-break-before on modules, page-break-inside: avoid on cards/tables

## Six Platform Fixes (v14)
- [ ] Fix PrintReport: pass real audit data from ReportViewer/SavedReportViewer into PDF template
- [ ] Restrict unlimited plan to frankb4435@gmail.com; seed/auto-promote that email to admin+unlimited on login
- [ ] Enforce free plan 1-audit limit: block New Audit if user has ≥1 audit and is on free plan
- [ ] Require sign-in to start any audit (gate the audit form behind auth)
- [ ] Lock Quality Control page to frankb4435@gmail.com only (not just role=admin)
- [ ] Enforce full sign-out: clear all cookies/session on logout, redirect to home
- [ ] Move dark mode toggle from sidebar footer to Profile page
- [ ] Add user dropdown in top-right header with avatar, name, and Sign Out option
- [ ] Remove dark mode toggle and sign-out button from sidebar footer
