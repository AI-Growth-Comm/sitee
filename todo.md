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
