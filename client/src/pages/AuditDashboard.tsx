import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScoreArc, MiniScoreRing } from "@/components/audit/ScoreArc";
import { RadarChartView, BarChartView } from "@/components/audit/AuditCharts";
import { PriorityBadge, IntentBadge, CategoryBadge, TypeBadge, ScoreBadge } from "@/components/audit/Badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Zap, Copy, Check, Download, RotateCcw,
  ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import type {
  Overview, Keywords, Metadata, SchemaData,
  ContentCalendar, Checklist, InternalLinking, AuditData
} from "../../../shared/auditTypes";

const TABS = ["Overview", "Keywords", "Metadata", "Schema", "Calendar", "Checklist", "History"] as const;
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
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col justify-center gap-3">
          <p className="text-foreground leading-relaxed">{overview.summary}</p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-sm text-blue-300 font-medium">💡 Key Insight</p>
            <p className="text-sm text-foreground mt-1">{overview.keyInsight}</p>
          </div>
        </div>
      </div>

      {/* Dimension score cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">8 SEO Dimensions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dims.map((dim) => {
            const color = dim.score >= 70 ? "text-green-400" : dim.score >= 45 ? "text-amber-400" : "text-red-400";
            const bg = dim.score >= 70 ? "bg-green-500/5 border-green-500/20" : dim.score >= 45 ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20";
            return (
              <div key={dim.name} className={`bg-card border ${bg} rounded-lg p-3`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground truncate">{dim.name}</span>
                  <span className={`text-lg font-bold tabular-nums ${color}`}>{dim.score}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{dim.note}</p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${dim.score}%`,
                      backgroundColor: dim.score >= 70 ? "#4ade80" : dim.score >= 45 ? "#fbbf24" : "#f87171",
                    }}
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
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Radar View</h3>
          <RadarChartView dimensions={dims} />
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Score Breakdown</h3>
          <BarChartView dimensions={dims} />
        </div>
      </div>

      {/* Topical clusters */}
      {linking && linking.clusters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Topical Clusters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linking.clusters.map((cluster) => (
              <div key={cluster.name} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="font-semibold text-foreground">{cluster.name}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md">Pillar</span>
                    <span className="text-sm text-foreground">{cluster.pillar}</span>
                  </div>
                  {cluster.articles.map((article, i) => (
                    <div key={i} className="flex items-center gap-2 pl-2">
                      <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-md">Article</span>
                      <span className="text-sm text-muted-foreground">{article}</span>
                    </div>
                  ))}
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
        <p className="text-foreground">{keywords.strategy}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-blue-500/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Keyword</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Volume</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium w-32">KD</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Intent</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Priority</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Content Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((kw, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{kw.keyword}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{kw.volume}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${kw.difficulty}%`,
                          backgroundColor: kw.difficulty >= 60 ? "#f87171" : kw.difficulty >= 40 ? "#fbbf24" : "#4ade80",
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-6">{kw.difficulty}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><IntentBadge intent={kw.intent} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={kw.priority} /></td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{kw.contentType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Metadata Tab ─────────────────────────────────────────────────────────────
function MetadataTab({ metadata }: { metadata: Metadata }) {
  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-foreground">{metadata.note}</p>
      </div>
      <div className="space-y-4">
        {metadata.pages.map((page, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{page.page}</span>
                <span className="text-xs text-muted-foreground">{page.url}</span>
              </div>
              <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-medium">
                {page.issue}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-medium mb-1">Current Title ({page.currentTitle.length} chars)</p>
                  <p className="text-sm text-foreground">{page.currentTitle}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-medium mb-1">Current Description ({page.currentDesc.length} chars)</p>
                  <p className="text-sm text-foreground">{page.currentDesc}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-xs text-green-400 font-medium mb-1">Optimized Title ({page.titleChars} chars)</p>
                  <p className="text-sm text-foreground">{page.optimizedTitle}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-xs text-green-400 font-medium mb-1">Optimized Description ({page.descChars} chars)</p>
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
    navigator.clipboard.writeText(code);
    setCopied((prev) => ({ ...prev, [i]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [i]: false })), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-foreground">{schemaData.recommendation}</p>
      </div>
      <div className="space-y-4">
        {schemaData.schemas.map((schema, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">{schema.type}</span>
                <span className="text-xs text-muted-foreground">{schema.page}</span>
                <PriorityBadge priority={schema.priority} />
              </div>
              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Code {expanded[i] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {expanded[i] && (
              <div className="mt-3">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => handleCopy(schema.code, i)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 bg-muted rounded-lg"
                  >
                    {copied[i] ? (
                      <><Check className="w-3.5 h-3.5 text-green-400" /> <span className="text-green-400">✓ Copied!</span></>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy</>
                    )}
                  </button>
                </div>
                <pre className="bg-background border border-border rounded-lg p-4 text-xs text-green-300 overflow-x-auto font-mono leading-relaxed">
                  {(() => {
                    try { return JSON.stringify(JSON.parse(schema.code), null, 2); }
                    catch { return schema.code; }
                  })()}
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
        <p className="text-foreground">{calendar.strategy}</p>
      </div>
      <div className="space-y-3">
        {calendar.items.map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-lg flex flex-col items-center justify-center">
                <span className="text-xs text-blue-400 font-medium">Week</span>
                <span className="text-xl font-bold text-blue-400 tabular-nums">{item.week}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h4 className="font-semibold text-foreground">{item.title}</h4>
                  <TypeBadge type={item.type} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>🎯 {item.keyword}</span>
                  <span>📝 {item.wordCount.toLocaleString()} words</span>
                  <span>🗂️ {item.cluster}</span>
                </div>
                {item.internalLinks?.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Internal links:</span>
                    {item.internalLinks.map((link, j) => (
                      <span key={j} className="bg-muted border border-border px-2 py-0.5 rounded">{link}</span>
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
            <span className="font-semibold text-foreground">{doneCount} of {total} done</span>
            <span className="text-muted-foreground ml-2">({pct}%)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 border-border text-muted-foreground hover:text-foreground"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((f) => (
          <button
            key={f}
            onClick={() => setPriorityFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              priorityFilter === f ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="w-px bg-border mx-1" />
        {["ALL", "Week 1-3", "Week 4-8", "Week 9-12"].map((f) => (
          <button
            key={f}
            onClick={() => setPhaseFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              phaseFilter === f ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
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
              <span className="text-xs text-muted-foreground">{catItems.length} tasks</span>
            </div>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 bg-card border rounded-lg px-4 py-3 transition-all ${
                    item.done ? "border-border/30 opacity-60" : "border-border hover:border-blue-500/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) => onToggle(item.id, e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-blue-500 cursor-pointer shrink-0"
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
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ onRerun }: { onRerun: (url: string, industry: string) => void }) {
  const { isAuthenticated } = useAuth();
  const history = trpc.audit.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const [, navigate] = useLocation();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground mb-4">Sign in to view your audit history</p>
      </div>
    );
  }

  if (history.isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 shimmer rounded-lg" />)}</div>;
  }

  const audits = history.data ?? [];

  if (audits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No audit history yet. Run your first audit!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {audits.map((audit) => {
        const score = audit.overallScore;
        const color = score >= 70 ? "text-green-400" : score >= 45 ? "text-amber-400" : "text-red-400";
        return (
          <div key={audit.id} className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 hover:border-blue-500/30 transition-all">
            <MiniScoreRing score={score} size={44} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{audit.url}</p>
              <p className="text-sm text-muted-foreground">
                {audit.industry} · {new Date(audit.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/audit/${audit.id}`)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                View <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRerun(audit.url, audit.industry)}
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
      a.download = `rankiq-checklist-${auditId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleRerun = (url: string, industry: string) => {
    navigate("/");
    // Pre-fill handled by Home page via recent audits
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
        <div className="text-center">
          <p className="text-red-400 mb-4">{auditQuery.error?.message ?? "Audit not found"}</p>
          <Button onClick={() => navigate("/")} variant="outline">
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

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top nav */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container flex items-center gap-4 h-14">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">New Audit</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground hidden sm:block">RankIQ</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{audit.url}</p>
          </div>
          <div className="shrink-0">
            <MiniScoreRing score={audit.overallScore} size={40} />
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-border overflow-x-auto">
          <div className="container flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="container py-6">
        {activeTab === "Overview" && overview && (
          <OverviewTab overview={overview} linking={linking} />
        )}
        {activeTab === "Keywords" && keywords && (
          <KeywordsTab keywords={keywords} />
        )}
        {activeTab === "Metadata" && metadata && (
          <MetadataTab metadata={metadata} />
        )}
        {activeTab === "Schema" && schemaData && (
          <SchemaTab schemaData={schemaData} />
        )}
        {activeTab === "Calendar" && calendar && (
          <CalendarTab calendar={calendar} />
        )}
        {activeTab === "Checklist" && checklist && (
          <ChecklistTab
            checklist={checklist}
            auditId={auditId}
            checklistDoneMap={mergedDoneMap}
            onToggle={handleToggle}
            onExportCsv={handleExportCsv}
          />
        )}
        {activeTab === "History" && (
          <HistoryTab onRerun={handleRerun} />
        )}

        {/* Fallback for missing data */}
        {((activeTab === "Overview" && !overview) ||
          (activeTab === "Keywords" && !keywords) ||
          (activeTab === "Metadata" && !metadata) ||
          (activeTab === "Schema" && !schemaData) ||
          (activeTab === "Calendar" && !calendar) ||
          (activeTab === "Checklist" && !checklist)) && (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">No data available for this section.</p>
          </div>
        )}
      </main>
    </div>
  );
}
