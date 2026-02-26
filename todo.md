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
