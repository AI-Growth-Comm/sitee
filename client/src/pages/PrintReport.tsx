/**
 * PrintReport.tsx
 *
 * A dedicated print-optimized view of the full SEO audit report.
 * Opened in a new browser tab via window.open() from ReportViewer.
 * Uses @page CSS rules, CSS counters, and pure SVG/CSS charts — no external JS.
 *
 * Route: /print-report?auditId=X  (or savedReportId=X)
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// ─── SVG Circular Score Gauge ─────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const dashOffset = circ * (1 - pct);
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ display: "block" }}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke={color} strokeWidth="12"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="70" y="65" textAnchor="middle" fontSize="26" fontWeight="700" fill="#2d3748">{score}</text>
      <text x="70" y="83" textAnchor="middle" fontSize="11" fill="#718096">out of 100</text>
    </svg>
  );
}

// ─── Horizontal Progress Bar ──────────────────────────────────────────────────

function ProgressBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px", color: "#4a5568" }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color }}>{value}/{max}</span>
      </div>
      <div style={{ background: "#e2e8f0", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ─── Print Styles (injected into <head> of new window) ───────────────────────

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: 8.5in 11in portrait;
    margin: 0.75in 0.75in 0.9in 0.75in;
    counter-increment: page;
  }

  @page :first {
    margin: 0;
  }

  body {
    font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    color: #2d3748;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Running header (all pages except first) ── */
  @page :not(:first) {
    @top-left {
      content: "Sitemizer — AI-Powered SEO Audit";
      font-size: 8pt;
      color: #718096;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4pt;
      font-family: 'Inter', sans-serif;
    }
    @top-right {
      content: attr(data-date);
      font-size: 8pt;
      color: #718096;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4pt;
      font-family: 'Inter', sans-serif;
    }
    @bottom-left {
      content: "Confidential — Prepared by Sitemizer";
      font-size: 8pt;
      color: #a0aec0;
      font-family: 'Inter', sans-serif;
    }
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #718096;
      font-family: 'Inter', sans-serif;
    }
  }

  /* ── Page break helpers ── */
  .page-break { page-break-before: always; break-before: page; }
  .no-break { page-break-inside: avoid; break-inside: avoid; }

  /* ── Cover page ── */
  .cover {
    width: 8.5in;
    height: 11in;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0091ff 100%);
    color: #fff;
    padding: 0;
    page-break-after: always;
    break-after: page;
  }
  .cover-top-bar {
    background: rgba(255,255,255,0.08);
    padding: 20px 48px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cover-logo-mark {
    width: 36px; height: 36px;
    background: #0091ff;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 800; color: #fff;
  }
  .cover-logo-text { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
  .cover-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 64px;
  }
  .cover-tag {
    display: inline-block;
    background: rgba(0,145,255,0.3);
    border: 1px solid rgba(0,145,255,0.5);
    color: #93c5fd;
    font-size: 10pt;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 20px;
    margin-bottom: 28px;
    width: fit-content;
  }
  .cover-title {
    font-size: 38pt;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 12px;
  }
  .cover-subtitle {
    font-size: 14pt;
    color: rgba(255,255,255,0.65);
    margin-bottom: 48px;
  }
  .cover-divider {
    width: 60px; height: 4px;
    background: #0091ff;
    border-radius: 2px;
    margin-bottom: 40px;
  }
  .cover-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    max-width: 480px;
  }
  .cover-meta-item label {
    display: block;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    margin-bottom: 4px;
  }
  .cover-meta-item span {
    font-size: 12pt;
    font-weight: 600;
    color: #fff;
  }
  .cover-bottom {
    padding: 24px 64px;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 9pt;
    color: rgba(255,255,255,0.4);
  }

  /* ── Content pages ── */
  .content-page { padding: 0; }

  /* ── Section headers ── */
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid #0091ff;
  }
  .section-icon {
    width: 36px; height: 36px;
    background: #eff6ff;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .section-title { font-size: 16pt; font-weight: 700; color: #1a202c; }
  .section-subtitle { font-size: 10pt; color: #718096; margin-top: 2px; }
  .module-tag {
    font-size: 8pt; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: #0091ff;
    margin-bottom: 8px;
  }

  /* ── Cards ── */
  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 18px 20px;
    margin-bottom: 16px;
  }
  .card-blue {
    background: #eff6ff;
    border-color: #bfdbfe;
  }
  .card-title {
    font-size: 11pt; font-weight: 700; color: #1a202c;
    margin-bottom: 8px;
  }
  .card-body { font-size: 10pt; color: #4a5568; line-height: 1.6; }

  /* ── Scorecard grid ── */
  .scorecard-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  .score-cell {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    text-align: center;
  }
  .score-cell .score-val {
    font-size: 22pt; font-weight: 800;
    line-height: 1;
    margin-bottom: 4px;
  }
  .score-cell .score-label {
    font-size: 8.5pt; color: #718096; font-weight: 500;
  }
  .score-green { color: #22c55e; }
  .score-amber { color: #f59e0b; }
  .score-red { color: #ef4444; }

  /* ── Tables ── */
  table {
    width: 100%; border-collapse: collapse;
    font-size: 9.5pt;
    margin-bottom: 16px;
  }
  thead tr { background: #f7fafc; }
  th {
    text-align: left; padding: 8px 12px;
    font-size: 8.5pt; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    color: #4a5568;
    border-bottom: 2px solid #e2e8f0;
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #f0f4f8;
    color: #2d3748;
    vertical-align: top;
  }
  tr:last-child td { border-bottom: none; }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 8pt; font-weight: 600;
  }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-amber { background: #fef9c3; color: #854d0e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-blue { background: #dbeafe; color: #1e40af; }

  /* ── Two-column layout ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  /* ── Roadmap timeline ── */
  .timeline-phase {
    border-left: 3px solid #0091ff;
    padding-left: 16px;
    margin-bottom: 20px;
  }
  .timeline-phase h4 {
    font-size: 11pt; font-weight: 700; color: #1a202c;
    margin-bottom: 8px;
  }
  .timeline-item {
    display: flex; align-items: flex-start; gap: 8px;
    margin-bottom: 6px; font-size: 9.5pt; color: #4a5568;
  }
  .timeline-bullet {
    width: 6px; height: 6px; border-radius: 50%;
    background: #0091ff; flex-shrink: 0; margin-top: 5px;
  }

  /* ── Keyword tier ── */
  .keyword-tier-label {
    font-size: 8.5pt; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: #0091ff;
    background: #eff6ff; border: 1px solid #bfdbfe;
    padding: 3px 10px; border-radius: 12px;
    display: inline-block; margin-bottom: 8px;
  }

  /* ── Exec summary box ── */
  .exec-summary {
    background: #eff6ff;
    border-left: 4px solid #0091ff;
    border-radius: 0 8px 8px 0;
    padding: 16px 20px;
    margin-bottom: 20px;
    font-size: 10.5pt;
    color: #1e3a5f;
    line-height: 1.7;
  }
  .exec-summary strong { color: #0f172a; }

  /* ── Print-only header/footer fallback (for browsers that don't support @page named strings) ── */
  .print-header {
    display: none;
  }
  @media print {
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 20px;
      font-size: 8pt;
      color: #718096;
    }
    .print-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 20px;
      font-size: 8pt;
      color: #a0aec0;
    }
  }
`;

// ─── Print Window Renderer ────────────────────────────────────────────────────

function buildPrintHTML(audit: any, reportTitle: string, clientName: string): string {
  const url = audit.url ?? "";
  const score = audit.overallScore ?? 0;
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const industry = audit.industry ?? "General";

  const overview = (audit.overview ?? {}) as any;
  const keywords = (audit.keywords ?? {}) as any;
  const metadata = (audit.metadata ?? {}) as any;
  const calendar = (audit.calendar ?? {}) as any;
  const checklist = (audit.checklist ?? {}) as any;
  const linking = (audit.linking ?? {}) as any;
  const roadmap = (audit.roadmap ?? {}) as any;
  const contentAudit = (audit.contentAudit ?? {}) as any;

  const scoreColor = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  // Build scorecard from overview dimensions
  const dims = overview.dimensions ?? [];
  const dimRows = dims.slice(0, 7).map((d: any) => {
    const pct = Math.round((d.score / 10) * 100);
    const col = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:10pt;margin-bottom:3px">
        <span>${d.name}</span><span style="font-weight:700;color:${col}">${d.score}/10</span>
      </div>
      <div style="background:#e2e8f0;border-radius:4px;height:7px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:4px"></div>
      </div>
    </div>`;
  }).join("");

  // Keywords table
  const kwRows = (keywords.opportunities ?? []).slice(0, 10).map((k: any) => {
    const tier = k.tier ?? "Tier 2";
    const tierClass = tier === "Tier 1" ? "badge-green" : tier === "Tier 2" ? "badge-blue" : "badge-amber";
    return `<tr>
      <td>${k.keyword ?? ""}</td>
      <td>${k.volume ?? "—"}</td>
      <td>${k.difficulty ?? "—"}</td>
      <td><span class="badge ${tierClass}">${tier}</span></td>
      <td style="font-size:8.5pt">${k.content ?? ""}</td>
    </tr>`;
  }).join("");

  // Metadata table
  const metaRows = (metadata.pages ?? []).slice(0, 6).map((p: any) => `<tr>
    <td style="font-weight:600">${p.page ?? ""}</td>
    <td style="font-size:8.5pt;color:#718096">${p.currentTitle ?? "(none)"}</td>
    <td style="font-size:8.5pt;color:#0091ff">${p.optimizedTitle ?? ""}</td>
    <td><span class="badge ${(p.titleChars ?? 0) > 60 ? "badge-red" : "badge-green"}">${p.titleChars ?? 0} ch</span></td>
  </tr>`).join("");

  // Checklist items
  const checkItems = (checklist.items ?? []).slice(0, 12).map((item: any) => {
    const prio = item.priority ?? "medium";
    const cls = prio === "critical" ? "badge-red" : prio === "high" ? "badge-amber" : "badge-blue";
    return `<tr>
      <td style="font-weight:600;font-size:9.5pt">${item.task ?? ""}</td>
      <td><span class="badge ${cls}">${prio}</span></td>
      <td style="font-size:8.5pt">${item.category ?? ""}</td>
      <td style="font-size:8.5pt">${item.impact ?? ""}</td>
    </tr>`;
  }).join("");

  // Internal linking
  const linkRows = (linking.immediateActions ?? []).slice(0, 8).map((a: any) => `<tr>
    <td style="font-size:9pt">${a.from ?? ""}</td>
    <td style="font-size:9pt">${a.to ?? ""}</td>
    <td style="font-size:9pt;color:#0091ff">${a.anchor ?? ""}</td>
    <td style="font-size:8.5pt">${a.reason ?? ""}</td>
  </tr>`).join("");

  // Roadmap phases
  const phase1Items = (roadmap.phase1 ?? []).slice(0, 5).map((t: any) =>
    `<div class="timeline-item"><div class="timeline-bullet"></div><span>${typeof t === "string" ? t : t.task ?? JSON.stringify(t)}</span></div>`
  ).join("");
  const phase2Items = (roadmap.phase2 ?? []).slice(0, 5).map((t: any) =>
    `<div class="timeline-item"><div class="timeline-bullet"></div><span>${typeof t === "string" ? t : t.task ?? JSON.stringify(t)}</span></div>`
  ).join("");
  const phase3Items = (roadmap.phase3 ?? []).slice(0, 5).map((t: any) =>
    `<div class="timeline-item"><div class="timeline-bullet"></div><span>${typeof t === "string" ? t : t.task ?? JSON.stringify(t)}</span></div>`
  ).join("");

  // Content calendar
  const calItems = (calendar.items ?? []).slice(0, 8).map((item: any) => `<tr>
    <td style="font-weight:600;font-size:9pt">Week ${item.week ?? ""}</td>
    <td style="font-size:9pt">${item.title ?? ""}</td>
    <td style="font-size:8.5pt">${item.type ?? ""}</td>
    <td style="font-size:8.5pt">${item.goal ?? ""}</td>
  </tr>`).join("");

  // Page inventory
  const pageRows = (contentAudit.pageInventory ?? []).slice(0, 8).map((p: any) => {
    const status = p.status ?? "medium";
    const cls = status === "optimized" ? "badge-green" : status === "needs-work" ? "badge-amber" : "badge-red";
    return `<tr>
      <td style="font-weight:600;font-size:9pt">${p.page ?? ""}</td>
      <td style="font-size:8.5pt">${p.currentSeoValue ?? ""}</td>
      <td><span class="badge ${cls}">${status}</span></td>
      <td style="font-size:8.5pt">${p.recommendedAction ?? ""}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} — ${url}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ COVER PAGE -->
<div class="cover">
  <div class="cover-top-bar">
    <div class="cover-logo-mark">S</div>
    <span class="cover-logo-text">Sitemizer</span>
  </div>
  <div class="cover-body">
    <div class="cover-tag">Strategic SEO Audit Report</div>
    <h1 class="cover-title">${reportTitle}</h1>
    <p class="cover-subtitle">Powered by AI · ${industry} Industry</p>
    <div class="cover-divider"></div>
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <label>Prepared For</label>
        <span>${clientName || "Client"}</span>
      </div>
      <div class="cover-meta-item">
        <label>Website</label>
        <span style="font-size:10pt;word-break:break-all">${url}</span>
      </div>
      <div class="cover-meta-item">
        <label>Report Date</label>
        <span>${date}</span>
      </div>
      <div class="cover-meta-item">
        <label>SEO Maturity</label>
        <span>${overview.seoMaturity ?? (score >= 70 ? "Established" : score >= 40 ? "Developing" : "Foundational")}</span>
      </div>
      <div class="cover-meta-item">
        <label>Overall SEO Score</label>
        <span style="color:${scoreColor};font-size:20pt;font-weight:800">${score}/100</span>
      </div>
    </div>
  </div>
  <div class="cover-bottom">
    <span>Confidential — Prepared by Sitemizer AI</span>
    <span>${date}</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ TABLE OF CONTENTS -->
<div class="content-page page-break">
  <div class="print-header">
    <span>Sitemizer — AI-Powered SEO Audit</span>
    <span>${date}</span>
  </div>
  <div style="padding:24px 0">
    <div class="module-tag">Report Contents</div>
    <div class="section-header">
      <div class="section-icon">📌</div>
      <div>
        <div class="section-title">Table of Contents</div>
        <div class="section-subtitle">Strategic SEO Audit Report for ${url}</div>
      </div>
    </div>
    <div style="margin-top:24px">
      ${[
        { module: "Overview", title: "Executive Summary & Scorecard", desc: "Overall performance snapshot, dimension breakdown, and key insights" },
        { module: "Module 1", title: "Content Audit & Keyword Strategy", desc: "Page inventory, competitor gaps, and long-tail keyword opportunity matrix" },
        { module: "Module 2", title: "Metadata & Schema Optimization", desc: "Title tags, meta descriptions, and structured data recommendations" },
        { module: "Module 3", title: "Internal Linking Strategy", desc: "Link architecture, topical clusters, linking map, and anchor text recommendations" },
        { module: "Module 4", title: "90-Day Action Roadmap", desc: "Prioritized implementation plan across three phases with KPIs and content calendar" },
      ].map((item, i) => `
        <div class="no-break" style="display:flex;align-items:flex-start;gap:20px;padding:16px 0;border-bottom:1px solid #e2e8f0">
          <div style="flex-shrink:0;width:80px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0091ff;padding-top:3px">${item.module}</div>
          <div style="flex:1">
            <div style="font-size:13pt;font-weight:700;color:#1a202c;margin-bottom:4px">${item.title}</div>
            <div style="font-size:9.5pt;color:#718096">${item.desc}</div>
          </div>
          <div style="flex-shrink:0;font-size:9pt;color:#a0aec0;padding-top:3px">Page ${i + 3}</div>
        </div>
      `).join("")}
    </div>
    <div style="margin-top:32px;padding:20px;background:#f7fafc;border-radius:10px;border-left:4px solid #0091ff">
      <div style="font-size:9pt;font-weight:700;color:#2d3748;margin-bottom:6px">About This Report</div>
      <div style="font-size:9pt;color:#718096">This AI-powered SEO audit was generated by Sitemizer on ${date} for <strong>${url}</strong>. The analysis covers content quality, keyword opportunities, metadata optimization, internal linking architecture, and a prioritized 90-day action plan. All recommendations are based on current best practices for search engine optimization and AI-driven content strategy.</div>
    </div>
  </div>
  <div class="print-footer">
    <span>Confidential — Prepared by Sitemizer</span>
    <span>Table of Contents</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ PAGE 3: EXECUTIVE SUMMARY + SCORECARD -->
<div class="content-page">
  <div class="print-header">
    <span>Sitemizer — AI-Powered SEO Audit</span>
    <span>${date}</span>
  </div>

  <div class="module-tag">Overview</div>
  <div class="section-header">
    <div class="section-icon">📊</div>
    <div>
      <div class="section-title">Executive Summary & Scorecard</div>
      <div class="section-subtitle">Overall performance snapshot and dimension breakdown</div>
    </div>
  </div>

  <div class="two-col no-break" style="margin-bottom:24px;align-items:start">
    <div>
      <div class="exec-summary">
        ${overview.summary ?? overview.keyInsight ?? "This audit provides a comprehensive analysis of your site's current SEO performance."}
      </div>
      <div class="card card-blue no-break">
        <div class="card-title">Key Opportunity</div>
        <div class="card-body">${overview.keyInsight ?? overview.topOpportunity ?? "See detailed modules below for specific recommendations."}</div>
      </div>
    </div>
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#718096;margin-bottom:8px">Overall SEO Score</div>
      <svg width="160" height="90" viewBox="0 0 160 90" style="display:block;margin:0 auto;overflow:visible">
        <!-- Track arc: semi-circle from 180° to 0° -->
        <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke="#e2e8f0" stroke-width="14" stroke-linecap="round"/>
        <!-- Value arc -->
        <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke="${scoreColor}" stroke-width="14" stroke-linecap="round"
          stroke-dasharray="${Math.PI * 64}"
          stroke-dashoffset="${Math.PI * 64 * (1 - score / 100)}"/>
        <text x="80" y="68" text-anchor="middle" font-size="28" font-weight="800" fill="#2d3748">${score}</text>
        <text x="80" y="84" text-anchor="middle" font-size="10" fill="#718096">out of 100</text>
      </svg>
      <div style="font-size:9pt;color:${scoreColor};font-weight:700;margin-top:4px">
        ${score >= 70 ? "Good — Optimize to Grow" : score >= 40 ? "Needs Improvement" : "Critical Issues Found"}
      </div>
      <div style="font-size:8pt;color:#718096;margin-top:2px">${overview.seoMaturity ?? ""}</div>
    </div>
  </div>

  <div class="no-break">
    <div class="card-title" style="margin-bottom:14px">Dimension Scorecard</div>
    ${dimRows || `<div class="card-body">Run the audit to generate dimension scores.</div>`}
  </div>

  <div class="print-footer">
    <span>Confidential — Prepared by Sitemizer</span>
    <span>Page 2</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ MODULE 1: CONTENT AUDIT -->
<div class="content-page page-break">
  <div class="print-header">
    <span>Sitemizer — AI-Powered SEO Audit</span>
    <span>${date}</span>
  </div>

  <div class="module-tag">Module 1</div>
  <div class="section-header">
    <div class="section-icon">📋</div>
    <div>
      <div class="section-title">Content Audit & Page Inventory</div>
      <div class="section-subtitle">Current content performance, competitor gaps, and keyword opportunities</div>
    </div>
  </div>

  ${contentAudit.executiveSummary ? `<div class="exec-summary">${contentAudit.executiveSummary}</div>` : ""}

  ${pageRows ? `
  <div class="no-break">
    <div class="card-title" style="margin-bottom:10px">Page Inventory & SEO Status</div>
    <table>
      <thead><tr><th>Page</th><th>Current SEO Value</th><th>Status</th><th>Recommended Action</th></tr></thead>
      <tbody>${pageRows}</tbody>
    </table>
  </div>` : ""}

  ${(contentAudit.competitorGaps ?? []).length > 0 ? `
  <div class="no-break" style="margin-top:16px">
    <div class="card-title" style="margin-bottom:10px">Competitor Landscape & Content Gap Analysis</div>
    <table>
      <thead><tr><th>Competitor</th><th>Ranks For</th><th>Gap Type</th><th>Your Opportunity</th></tr></thead>
      <tbody>
        ${(contentAudit.competitorGaps ?? []).slice(0, 6).map((g: any) => {
          const gapClass = g.gapType === "Cannot Win" ? "badge-red" : g.gapType === "Content Gap" ? "badge-amber" : "badge-blue";
          return `<tr>
            <td style="font-size:9pt">${g.competitor ?? ""}</td>
            <td style="font-size:8.5pt">${g.ranksFor ?? ""}</td>
            <td><span class="badge ${gapClass}">${g.gapType ?? ""}</span></td>
            <td style="font-size:8.5pt">${g.opportunity ?? ""}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="print-footer">
    <span>Confidential — Prepared by Sitemizer</span>
    <span>Module 1 of 4</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ MODULE 1b: KEYWORDS -->
<div class="content-page page-break">
  <div class="print-header">
    <span>Sitemizer — AI-Powered SEO Audit</span>
    <span>${date}</span>
  </div>

  <div class="module-tag">Module 1 (continued)</div>
  <div class="section-header">
    <div class="section-icon">🔑</div>
    <div>
      <div class="section-title">Long-Tail Keyword Opportunity Matrix</div>
      <div class="section-subtitle">${keywords.strategy ?? "Targeted keyword opportunities by intent and difficulty"}</div>
    </div>
  </div>

  ${kwRows ? `
  <table class="no-break">
    <thead><tr><th>Keyword</th><th>Est. Volume</th><th>KD</th><th>Tier</th><th>Recommended Content</th></tr></thead>
    <tbody>${kwRows}</tbody>
  </table>` : `<div class="card card-body">No keyword data available.</div>`}

  <div class="print-footer">
    <span>Confidential — Prepared by Sitemizer</span>
    <span>Module 1 of 4</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ MODULE 2: METADATA -->
<div class="content-page page-break">
  <div class="print-header">
    <span>Sitemizer — AI-Powered SEO Audit</span>
    <span>${date}</span>
  </div>

  <div class="module-tag">Module 2</div>
  <div class="section-header">
    <div class="section-icon">📄</div>
    <div>
      <div class="section-title">Metadata & Schema Optimization</div>
      <div class="section-subtitle">Title tags, meta descriptions, and structured data recommendations</div>
    </div>
  </div>

  ${metadata.note ? `<div class="exec-summary">${metadata.note}</div>` : ""}

  ${metaRows ? `
  <div class="no-break">
    <div class="card-title" style="margin-bottom:10px">Page-Level Metadata Recommendations</div>
    <table>
      <thead><tr><th>Page</th><th>Current Title</th><th>Optimized Title</th><th>Length</th></tr></thead>
      <tbody>${metaRows}</tbody>
    </table>
  </div>` : ""}

  ${(audit.schemaData?.recommendations ?? []).length > 0 ? `
  <div class="no-break" style="margin-top:16px">
    <div class="card-title" style="margin-bottom:10px">Schema Markup Recommendations</div>
    <div class="three-col">
      ${(audit.schemaData.recommendations ?? []).slice(0, 6).map((r: any) => `
        <div class="card no-break">
          <div class="card-title" style="font-size:10pt">${r.type ?? ""}</div>
          <div class="card-body">${r.description ?? r.benefit ?? ""}</div>
        </div>
      `).join("")}
    </div>
  </div>` : ""}

  <div class="print-footer">
    <span>Confidential — Prepared by Sitemizer</span>
    <span>Module 2 of 4</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ MODULE 3: INTERNAL LINKING -->
<div class="content-page page-break">
  <div class="print-header">
    <span>Sitemizer — AI-Powered SEO Audit</span>
    <span>${date}</span>
  </div>

  <div class="module-tag">Module 3</div>
  <div class="section-header">
    <div class="section-icon">🔗</div>
    <div>
      <div class="section-title">Internal Linking Strategy</div>
      <div class="section-subtitle">Link architecture, topical clusters, and anchor text recommendations</div>
    </div>
  </div>

  <div class="two-col no-break" style="margin-bottom:20px">
    <div class="card">
      <div class="card-title">Link Architecture Overview</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
        <div style="text-align:center">
          <div style="font-size:22pt;font-weight:800;color:#0091ff">${linking.totalInternalLinks ?? 0}</div>
          <div style="font-size:8.5pt;color:#718096">Total Internal Links</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:22pt;font-weight:800;color:#0091ff">${(linking.topicalClusters ?? []).length}</div>
          <div style="font-size:8.5pt;color:#718096">Topical Clusters</div>
        </div>
      </div>
    </div>
    <div class="card card-blue">
      <div class="card-title">Link Strategy</div>
      <div class="card-body">${linking.strategy ?? "Improve internal linking to distribute page authority and improve crawlability."}</div>
    </div>
  </div>

  ${(linking.topicalClusters ?? []).length > 0 ? `
  <div class="no-break" style="margin-bottom:20px">
    <div class="card-title" style="margin-bottom:12px">Topical Cluster Architecture</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
      ${(linking.topicalClusters ?? []).slice(0, 4).map((cluster: any) => `
        <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <div style="background:#0091ff;color:#fff;padding:8px 12px;font-size:9.5pt;font-weight:700">
            📄 ${cluster.pillar ?? cluster.topic ?? "Pillar Page"}
          </div>
          <div style="padding:10px 12px">
            ${(cluster.supportingArticles ?? cluster.supporting ?? []).slice(0, 3).map((a: any) =>
              `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #f0f4f8;font-size:8.5pt;color:#4a5568">
                <div style="width:6px;height:6px;border-radius:50%;background:#0091ff;flex-shrink:0"></div>
                ${typeof a === "string" ? a : a.title ?? a.article ?? JSON.stringify(a)}
              </div>`
            ).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  </div>` : ""}

  ${linkRows ? `
  <div class="no-break">
    <div class="card-title" style="margin-bottom:10px">Immediate Linking Actions</div>
    <table>
      <thead><tr><th>From Page</th><th>Link To</th><th>Anchor Text</th><th>Reason</th></tr></thead>
      <tbody>${linkRows}</tbody>
    </table>
  </div>` : ""}

  <div class="print-footer">
    <span>Confidential — Prepared by Sitemizer</span>
    <span>Module 3 of 4</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ MODULE 4: ACTION ROADMAP -->
<div class="content-page page-break">
  <div class="print-header">
    <span>Sitemizer — AI-Powered SEO Audit</span>
    <span>${date}</span>
  </div>

  <div class="module-tag">Module 4</div>
  <div class="section-header">
    <div class="section-icon">🗺️</div>
    <div>
      <div class="section-title">90-Day Action Roadmap</div>
      <div class="section-subtitle">Prioritized implementation plan across three phases</div>
    </div>
  </div>

  <div class="two-col" style="margin-bottom:20px">
    <div>
      <div class="timeline-phase no-break">
        <h4>📅 Phase 1 — Days 1–30: Quick Wins</h4>
        ${phase1Items || `<div class="timeline-item"><div class="timeline-bullet"></div><span>No phase 1 tasks available.</span></div>`}
      </div>
      <div class="timeline-phase no-break">
        <h4>📅 Phase 2 — Days 31–60: Build Authority</h4>
        ${phase2Items || `<div class="timeline-item"><div class="timeline-bullet"></div><span>No phase 2 tasks available.</span></div>`}
      </div>
      <div class="timeline-phase no-break">
        <h4>📅 Phase 3 — Days 61–90: Scale & Measure</h4>
        ${phase3Items || `<div class="timeline-item"><div class="timeline-bullet"></div><span>No phase 3 tasks available.</span></div>`}
      </div>
    </div>
    <div>
      ${checkItems ? `
      <div class="card-title" style="margin-bottom:10px">Priority Action Checklist</div>
      <table class="no-break">
        <thead><tr><th>Task</th><th>Priority</th><th>Category</th><th>Impact</th></tr></thead>
        <tbody>${checkItems}</tbody>
      </table>` : ""}
    </div>
  </div>

  ${calItems ? `
  <div class="no-break page-break">
    <div class="module-tag" style="margin-top:0">Content Calendar</div>
    <div class="section-header" style="margin-top:8px">
      <div class="section-icon">📅</div>
      <div>
        <div class="section-title">Content Calendar</div>
        <div class="section-subtitle">${calendar.strategy ?? "Planned content for the next 12 weeks"}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Week</th><th>Content Title</th><th>Type</th><th>Goal</th></tr></thead>
      <tbody>${calItems}</tbody>
    </table>
  </div>` : ""}

  <div class="print-footer">
    <span>Confidential — Prepared by Sitemizer</span>
    <span>Module 4 of 4</span>
  </div>
</div>

</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrintReport() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const auditId = params.get("auditId") ? parseInt(params.get("auditId")!) : null;
  const savedReportId = params.get("savedReportId") ? parseInt(params.get("savedReportId")!) : null;
  const triggered = useRef(false);

  // Fetch audit data
  const { data: auditData } = trpc.audit.get.useQuery(
    { id: auditId! },
    { enabled: !!auditId }
  );
  const { data: reportData } = trpc.report.get.useQuery(
    { id: savedReportId! },
    { enabled: !!savedReportId }
  );

  const audit = auditData ?? reportData?.audit;
  const reportTitle = reportData?.report?.title ?? "Strategic SEO Audit Report";
  const clientName = reportData?.report?.clientName ?? "";

  useEffect(() => {
    if (!audit || triggered.current) return;
    triggered.current = true;

    const html = buildPrintHTML(audit, reportTitle, clientName);
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Auto-trigger print dialog after fonts load
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 800);
    };
  }, [audit, reportTitle, clientName]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#4a5568" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🖨️</div>
        <p style={{ fontSize: "16px", fontWeight: 600 }}>Opening print dialog...</p>
        <p style={{ fontSize: "12px", marginTop: "8px", color: "#a0aec0" }}>
          {audit ? "Report ready — print dialog should open automatically." : "Loading report data..."}
        </p>
      </div>
    </div>
  );
}
