import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScoreArc, MiniScoreRing } from "@/components/audit/ScoreArc";
import { RadarChartView, BarChartView } from "@/components/audit/AuditCharts";
import { PriorityBadge, IntentBadge, CategoryBadge, TypeBadge } from "@/components/audit/Badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Zap, Copy, Check, Download, RotateCcw,
  ChevronDown, ChevronUp, ExternalLink, Link2, AlertCircle,
  Moon, Sun, FileText, BookOpen
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type {
  Overview, Keywords, Metadata, SchemaData,
  ContentCalendar, Checklist, InternalLinking
} from "../../../shared/auditTypes";

const TABS = ["Overview", "Keywords", "Metadata", "Schema", "Calendar", "Checklist", "Linking", "History"] as const;
type Tab = typeof TABS[number];

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ overview, linking }: { overview: Overview; linking: InternalLinking | null }) {
  const dims = overview.dimensions ?? [];
  return (
    <div className="space-y-6">
      {/* Score + summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-6">
          <ScoreArc score={overview.overallScore} size={160} />
        </div>
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col justify-center gap-4">
          <p className="text-foreground leading-relaxed">{overview.summary}</p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">💡 Key Insight</p>
            <p className="text-sm text-foreground">{overview.keyInsight}</p>
          </div>
        </div>
      </div>

      {/* Dimension score cards */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">8 SEO Dimensions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dims.map((dim) => {
            const color = dim.score >= 70 ? "text-green-400" : dim.score >= 45 ? "text-amber-400" : "text-red-400";
            const borderColor = dim.score >= 70 ? "border-green-500/20" : dim.score >= 45 ? "border-amber-500/20" : "border-red-500/20";
            const barColor = dim.score >= 70 ? "#4ade80" : dim.score >= 45 ? "#fbbf24" : "#f87171";
            return (
              <div key={dim.name} className={`bg-card border ${borderColor} rounded-lg p-3`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground truncate pr-1">{dim.name}</span>
                  <span className={`text-lg font-bold tabular-nums shrink-0 ${color}`}>{dim.score}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">{dim.note}</p>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${dim.score}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Radar View</h3>
          <RadarChartView dimensions={dims} />
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Score Breakdown</h3>
          <BarChartView dimensions={dims} />
        </div>
      </div>

      {/* Topical clusters summary */}
      {linking && linking.clusters.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Topical Clusters <span className="text-blue-400 normal-case font-normal">(see Linking tab for full detail)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linking.clusters.map((cluster) => (
              <div key={cluster.name} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="font-semibold text-foreground">{cluster.name}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md shrink-0">Pillar</span>
                    <span className="text-sm text-foreground truncate">{cluster.pillar}</span>
                  </div>
                  {cluster.articles.slice(0, 2).map((article, i) => (
                    <div key={i} className="flex items-center gap-2 pl-1">
                      <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-md shrink-0">Article</span>
                      <span className="text-sm text-muted-foreground truncate">{article}</span>
                    </div>
                  ))}
                  {cluster.articles.length > 2 && (
                    <p className="text-xs text-muted-foreground pl-1">+{cluster.articles.length - 2} more articles</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Keywords Tab ─────────────────────────────────────────────────────────────
function KeywordsTab({ keywords }: { keywords: Keywords }) {
  const [filter, setFilter] = useState<string>("ALL");
  const filters = ["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"];
  const filtered = filter === "ALL"
    ? keywords.opportunities
    : keywords.opportunities.filter((k) => k.priority === filter);

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Keyword Strategy</p>
        <p className="text-foreground leading-relaxed">{keywords.strategy}</p>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Filter by priority:</span>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/50"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} keywords</span>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Keyword</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Volume</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider w-36">Difficulty</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Intent</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Content Type</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">Cluster</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No keywords match this filter.</td>
                </tr>
              ) : (
                filtered.map((kw, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{kw.keyword}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums text-sm">{kw.volume}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${kw.difficulty}%`,
                              backgroundColor: kw.difficulty >= 60 ? "#f87171" : kw.difficulty >= 40 ? "#fbbf24" : "#4ade80",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-6 shrink-0">{kw.difficulty}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><IntentBadge intent={kw.intent} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={kw.priority} /></td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-sm">{kw.contentType}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-sm">{kw.cluster}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Metadata Tab ─────────────────────────────────────────────────────────────
function MetadataTab({ metadata }: { metadata: Metadata }) {
  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Overall Assessment</p>
        <p className="text-foreground leading-relaxed">{metadata.note}</p>
      </div>
      <div className="space-y-4">
        {metadata.pages.map((page, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">{page.page}</p>
                {page.url && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {page.url}
                  </p>
                )}
              </div>
              <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-md font-semibold shrink-0">
                ⚠ {page.issue}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-red-400 font-semibold">Current Title</p>
                    <span className={`text-xs tabular-nums font-mono ${page.currentTitle.length > 60 ? "text-red-400" : "text-muted-foreground"}`}>
                      {page.currentTitle.length} chars
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{page.currentTitle || <em className="text-muted-foreground">Missing</em>}</p>
                </div>
                <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-red-400 font-semibold">Current Description</p>
                    <span className={`text-xs tabular-nums font-mono ${page.currentDesc.length > 160 ? "text-red-400" : "text-muted-foreground"}`}>
                      {page.currentDesc.length} chars
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{page.currentDesc || <em className="text-muted-foreground">Missing</em>}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-green-400 font-semibold">✓ Optimized Title</p>
                    <span className={`text-xs tabular-nums font-mono ${page.titleChars <= 60 ? "text-green-400" : "text-amber-400"}`}>
                      {page.titleChars} chars
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{page.optimizedTitle}</p>
                </div>
                <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-green-400 font-semibold">✓ Optimized Description</p>
                    <span className={`text-xs tabular-nums font-mono ${page.descChars <= 160 ? "text-green-400" : "text-amber-400"}`}>
                      {page.descChars} chars
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{page.optimizedDesc}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Schema Tab ───────────────────────────────────────────────────────────────
function SchemaTab({ schemaData }: { schemaData: SchemaData }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  const handleCopy = (code: string, i: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied((prev) => ({ ...prev, [i]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [i]: false })), 2000);
    });
  };

  const formatCode = (code: string) => {
    try { return JSON.stringify(JSON.parse(code), null, 2); }
    catch { return code; }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Schema Recommendation</p>
        <p className="text-foreground leading-relaxed">{schemaData.recommendation}</p>
      </div>
      <div className="space-y-4">
        {schemaData.schemas.map((schema, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-foreground">{schema.type}</span>
                {schema.page && (
                  <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">{schema.page}</span>
                )}
                <PriorityBadge priority={schema.priority} />
              </div>
              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors shrink-0"
              >
                {expanded[i] ? "Hide Code" : "View Code"}
                {expanded[i] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {expanded[i] && (
              <div className="border-t border-border">
                <div className="flex justify-between items-center px-4 py-2 bg-muted/30">
                  <span className="text-xs text-muted-foreground font-mono">JSON-LD</span>
                  <button
                    onClick={() => handleCopy(schema.code, i)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-card border border-border rounded-lg hover:border-blue-500/50 transition-all"
                  >
                    {copied[i] ? (
                      <><Check className="w-3.5 h-3.5 text-green-400" /> <span className="text-green-400">Copied!</span></>
                    ) : (
                      <><Copy className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Copy</span></>
                    )}
                  </button>
                </div>
                <pre className="bg-background/80 p-4 text-xs text-green-300 overflow-x-auto font-mono leading-relaxed max-h-96">
                  {formatCode(schema.code)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────
function CalendarTab({ calendar }: { calendar: ContentCalendar }) {
  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">90-Day Strategy</p>
        <p className="text-foreground leading-relaxed">{calendar.strategy}</p>
      </div>
      <div className="space-y-3">
        {calendar.items.map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 hover:border-blue-500/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-lg flex flex-col items-center justify-center">
                <span className="text-xs text-blue-400 font-medium">Week</span>
                <span className="text-xl font-bold text-blue-400 tabular-nums">{item.week}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap mb-2">
                  <h4 className="font-semibold text-foreground leading-snug">{item.title}</h4>
                  <TypeBadge type={item.type} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">🎯 <span>{item.keyword}</span></span>
                  <span className="flex items-center gap-1">📝 <span>{item.wordCount.toLocaleString()} words</span></span>
                  <span className="flex items-center gap-1">🗂️ <span>{item.cluster}</span></span>
                </div>
                {item.internalLinks?.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">Links to:</span>
                    {item.internalLinks.map((link, j) => (
                      <span key={j} className="text-xs bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground">{link}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Checklist Tab ────────────────────────────────────────────────────────────
function ChecklistTab({
  checklist,
  auditId,
  checklistDoneMap,
  onToggle,
  onExportCsv,
}: {
  checklist: Checklist;
  auditId: number;
  checklistDoneMap: Record<string, boolean>;
  onToggle: (itemId: string, done: boolean) => void;
  onExportCsv: () => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [phaseFilter, setPhaseFilter] = useState("ALL");

  const items = checklist.items.map((item) => ({
    ...item,
    done: checklistDoneMap[item.id] ?? item.done,
  }));

  const filtered = items.filter((item) => {
    if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false;
    if (phaseFilter !== "ALL" && item.phase !== phaseFilter) return false;
    return true;
  });

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const categories = ["Technical", "On-Page", "Content", "Internal Links", "Schema"];

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-semibold text-foreground">{doneCount} of {total} tasks done</span>
            <span className="text-muted-foreground ml-2 text-sm">({pct}% complete)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 border-border text-muted-foreground hover:text-foreground hover:border-blue-500/50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
        <Progress value={pct} className="h-2" />
        {pct === 100 && (
          <p className="text-xs text-green-400 mt-2 font-medium">🎉 All tasks complete!</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((f) => (
          <button
            key={f}
            onClick={() => setPriorityFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              priorityFilter === f ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/50"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="w-px bg-border mx-1 self-stretch" />
        {["ALL", "Week 1-3", "Week 4-8", "Week 9-12"].map((f) => (
          <button
            key={f}
            onClick={() => setPhaseFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              phaseFilter === f ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tasks grouped by category */}
      {categories.map((cat) => {
        const catItems = filtered.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge category={cat} />
              <span className="text-xs text-muted-foreground">
                {catItems.filter((i) => i.done).length}/{catItems.length} done
              </span>
            </div>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 bg-card border rounded-lg px-4 py-3 transition-all cursor-pointer ${
                    item.done ? "border-border/30 opacity-60" : "border-border hover:border-blue-500/30"
                  }`}
                  onClick={() => onToggle(item.id, !item.done)}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) => { e.stopPropagation(); onToggle(item.id, e.target.checked); }}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-blue-500 cursor-pointer shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.task}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.impact}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={item.priority} />
                    <span className="text-xs text-muted-foreground hidden sm:block">{item.phase}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          No tasks match the selected filters.
        </div>
      )}
    </div>
  );
}

// ─── Internal Linking Tab ─────────────────────────────────────────────────────
function LinkingTab({ linking }: { linking: InternalLinking }) {
  return (
    <div className="space-y-6">
      {/* Topical clusters */}
      {linking.clusters.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Topical Clusters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linking.clusters.map((cluster, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="font-semibold text-foreground">{cluster.name}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md shrink-0 mt-0.5">Pillar</span>
                    <span className="text-sm text-foreground">{cluster.pillar}</span>
                  </div>
                  {cluster.articles.map((article, j) => (
                    <div key={j} className="flex items-start gap-2 pl-1">
                      <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-md shrink-0 mt-0.5">Article</span>
                      <span className="text-sm text-muted-foreground">{article}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Immediate link actions */}
      {linking.immediateActions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Immediate Link Opportunities
          </h3>
          <div className="space-y-3">
            {linking.immediateActions.map((action, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Link2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                      <span className="text-muted-foreground truncate">{action.from}</span>
                      <span className="text-muted-foreground shrink-0">→</span>
                      <span className="text-foreground font-medium truncate">{action.to}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        <span className="text-muted-foreground">Anchor text: </span>
                        <span className="text-blue-400 font-medium">"{action.anchor}"</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Placement: </span>
                        <span className="text-foreground">{action.placement}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ onRerun }: { onRerun: (url: string, industry: string, customIndustry?: string | null) => void }) {
  const { isAuthenticated } = useAuth();
  const history = trpc.audit.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const [, navigate] = useLocation();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">Sign in to view history</p>
          <p className="text-sm text-muted-foreground">Your audit history is saved when you're signed in.</p>
        </div>
      </div>
    );
  }

  if (history.isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  const allAudits = history.data ?? [];
  // Show completed audits first, then failed ones; hide pending/running
  const audits = allAudits.filter(a => a.status === "complete" || a.status === "failed");

  if (audits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-muted-foreground">No audit history yet.</p>
        <p className="text-sm text-muted-foreground">Run your first audit to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {audits.map((audit) => {
        const isFailed = audit.status === "failed";
        const score = audit.overallScore;
        const color = isFailed ? "text-red-400" : score >= 70 ? "text-green-400" : score >= 45 ? "text-amber-400" : "text-red-400";
        const bgColor = isFailed ? "bg-red-500/10 border-red-500/20" : score >= 70 ? "bg-green-500/10 border-green-500/20" : score >= 45 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
        return (
          <div key={audit.id} className={`flex items-center gap-4 bg-card border rounded-xl px-5 py-4 transition-all ${isFailed ? "border-red-500/20 opacity-70" : "border-border hover:border-blue-500/30"}`}>
            <div className={`w-12 h-12 rounded-xl ${bgColor} border flex items-center justify-center shrink-0`}>
              {isFailed ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <span className={`text-base font-bold tabular-nums ${color}`}>{score}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">
                  {audit.url.replace(/^https?:\/\//, "")}
                </p>
                {isFailed && (
                  <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5 shrink-0">Failed</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {audit.industry === "Other" && (audit as any).customIndustry
                  ? `${(audit as any).customIndustry} (Other)`
                  : audit.industry} · {new Date(audit.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isFailed && (
                <button
                  onClick={() => navigate(`/audit/${audit.id}`)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 border border-blue-500/30 rounded-lg px-3 py-1.5 hover:bg-blue-500/10"
                >
                  View <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onRerun(audit.url, audit.industry, (audit as any).customIndustry)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-blue-500/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-run
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AuditDashboard() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const auditId = parseInt(params.id ?? "0", 10);

  const auditQuery = trpc.audit.get.useQuery(
    { id: auditId },
    { enabled: !!auditId, refetchOnWindowFocus: false }
  );

  const toggleChecklist = trpc.audit.toggleChecklist.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const exportCsv = trpc.audit.exportCsv.useQuery(
    { id: auditId },
    { enabled: false }
  );

  const [localDoneMap, setLocalDoneMap] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback(
    (itemId: string, done: boolean) => {
      setLocalDoneMap((prev) => ({ ...prev, [itemId]: done }));
      if (isAuthenticated) {
        toggleChecklist.mutate({ auditId, itemId, done });
      }
    },
    [auditId, isAuthenticated, toggleChecklist]
  );

  const handleExportCsv = async () => {
    const result = await exportCsv.refetch();
    if (result.data?.csv) {
      const blob = new Blob([result.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sitee-checklist-${auditId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error("Failed to export CSV");
    }
  };

  const handleRerun = (url: string, industry: string, customIndustry?: string | null) => {
    let path = `/?url=${encodeURIComponent(url)}&industry=${encodeURIComponent(industry)}`;
    if (industry === "Other" && customIndustry) {
      path += `&customIndustry=${encodeURIComponent(customIndustry)}`;
    }
    navigate(path);
  };

  if (auditQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 spin-border" />
          <p className="text-muted-foreground">Loading audit...</p>
        </div>
      </div>
    );
  }

  if (auditQuery.error || !auditQuery.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 font-medium">{auditQuery.error?.message ?? "Audit not found"}</p>
          <Button onClick={() => navigate("/")} variant="outline" className="border-border">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { audit, checklistDoneMap: serverDoneMap } = auditQuery.data;
  const mergedDoneMap = { ...serverDoneMap, ...localDoneMap };

  const overview = audit.overview as Overview | null;
  const keywords = audit.keywords as Keywords | null;
  const metadata = audit.metadata as Metadata | null;
  const schemaData = audit.schemaData as SchemaData | null;
  const calendar = audit.calendar as ContentCalendar | null;
  const checklist = audit.checklist as Checklist | null;
  const linking = audit.linking as InternalLinking | null;

  // Determine which tabs have data
  const tabHasData: Record<Tab, boolean> = {
    Overview: !!overview,
    Keywords: !!keywords,
    Metadata: !!metadata,
    Schema: !!schemaData,
    Calendar: !!calendar,
    Checklist: !!checklist,
    Linking: !!linking,
    History: true,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top nav */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container flex items-center gap-3 h-14">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 border border-border rounded-lg px-3 py-1.5 hover:border-blue-500/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">New Audit</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground hidden sm:block">Sitee</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">
              {audit.url.replace(/^https?:\/\//, "")}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {audit.industry === "Other" && (audit as any).customIndustry
                ? (audit as any).customIndustry
                : audit.industry}
            </span>
            <MiniScoreRing score={audit.overallScore} size={40} />
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {/* Generate Report button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/audit/${auditId}/report`)}
              className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 hidden sm:flex"
            >
              <FileText className="w-3.5 h-3.5" />
              Report
            </Button>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/reports")}
                className="gap-1.5 text-muted-foreground hover:text-foreground hidden md:flex"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Saved
              </Button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-border overflow-x-auto scrollbar-none">
          <div className="container flex gap-0 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 relative ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {!tabHasData[tab] && tab !== "History" && (
                  <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="container py-6">
        {activeTab === "Overview" && overview && <OverviewTab overview={overview} linking={linking} />}
        {activeTab === "Keywords" && keywords && <KeywordsTab keywords={keywords} />}
        {activeTab === "Metadata" && metadata && <MetadataTab metadata={metadata} />}
        {activeTab === "Schema" && schemaData && <SchemaTab schemaData={schemaData} />}
        {activeTab === "Calendar" && calendar && <CalendarTab calendar={calendar} />}
        {activeTab === "Checklist" && checklist && (
          <ChecklistTab
            checklist={checklist}
            auditId={auditId}
            checklistDoneMap={mergedDoneMap}
            onToggle={handleToggle}
            onExportCsv={handleExportCsv}
          />
        )}
        {activeTab === "Linking" && linking && <LinkingTab linking={linking} />}
        {activeTab === "History" && <HistoryTab onRerun={(url, ind, ci) => handleRerun(url, ind, ci)} />}

        {/* Fallback for missing data */}
        {activeTab !== "History" && !tabHasData[activeTab] && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No data available for {activeTab}</p>
            <p className="text-sm text-muted-foreground">This section may not have been generated for this audit.</p>
          </div>
        )}
      </main>
    </div>
  );
}
