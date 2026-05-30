import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle, Brain, Trash2 } from "lucide-react";
// ─── Types ────────────────────────────────────────────────────────────────────

type Rating = "accurate" | "partial" | "inaccurate";

interface SectionFlag {
  rating: Rating;
  notes: string;
}

interface SectionFlags {
  [section: string]: SectionFlag;
}

const SECTIONS = [
  { key: "keywords", label: "Keywords", icon: "🔑" },
  { key: "metadata", label: "Metadata (Titles & Descriptions)", icon: "📄" },
  { key: "calendar", label: "Content Calendar", icon: "📅" },
  { key: "checklist", label: "Action Checklist", icon: "✅" },
  { key: "linking", label: "Internal Linking", icon: "🔗" },
  { key: "overview", label: "SEO Overview & Scores", icon: "📊" },
  { key: "contentAudit", label: "Content Audit & Page Inventory", icon: "📋" },
  { key: "roadmap", label: "90-Day Roadmap", icon: "🗺️" },
];

const RATING_COLORS: Record<Rating, string> = {
  accurate: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  partial: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  inaccurate: "bg-red-500/20 text-red-300 border-red-500/40",
};

const RATING_LABELS: Record<Rating, string> = {
  accurate: "✓ Accurate",
  partial: "~ Partially Accurate",
  inaccurate: "✗ Inaccurate",
};

// ─── Audit List View ──────────────────────────────────────────────────────────

function AuditListView({ onSelect }: { onSelect: (id: number) => void }) {
  const { data: audits, isLoading } = trpc.quality.listAudits.useQuery();
  const { data: reviews } = trpc.quality.listReviews.useQuery();

  const reviewedIds = new Set((reviews ?? []).map((r) => r.auditId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading audits...
      </div>
    );
  }

  if (!audits || audits.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">No completed audits yet.</p>
        <p className="text-sm mt-1">Run an audit first, then come back to review it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {audits.length} completed audit{audits.length !== 1 ? "s" : ""} — {reviewedIds.size} reviewed
        </p>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Reviewed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Pending</span>
        </div>
      </div>
      {audits.map((audit) => (
        <div
          key={audit.id}
          onClick={() => onSelect(audit.id)}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/30 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${reviewedIds.has(audit.id) ? "bg-emerald-500" : "bg-amber-500"}`} />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate text-foreground">{audit.url}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {audit.industry} · Score: {audit.overallScore}/100 · {new Date(audit.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <Badge variant="outline" className="text-xs">
              {reviewedIds.has(audit.id) ? "Reviewed" : "Pending Review"}
            </Badge>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Flag Card ────────────────────────────────────────────────────────

function SectionFlagCard({
  sectionKey,
  label,
  icon,
  value,
  onChange,
}: {
  sectionKey: string;
  label: string;
  icon: string;
  value: SectionFlag;
  onChange: (v: SectionFlag) => void;
}) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-2">
          <span>{icon}</span>
          {label}
        </span>
        {value.rating && (
          <Badge className={`text-xs border ${RATING_COLORS[value.rating]}`}>
            {RATING_LABELS[value.rating]}
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        {(["accurate", "partial", "inaccurate"] as Rating[]).map((r) => (
          <button
            key={r}
            onClick={() => onChange({ ...value, rating: r })}
            className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${
              value.rating === r
                ? RATING_COLORS[r] + " border-current"
                : "border-border text-muted-foreground hover:border-current hover:text-foreground"
            }`}
          >
            {r === "accurate" ? "✓ Accurate" : r === "partial" ? "~ Partial" : "✗ Wrong"}
          </button>
        ))}
      </div>
      <Textarea
        placeholder={`Notes on ${label.toLowerCase()} accuracy (optional)...`}
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        className="text-xs resize-none min-h-[60px]"
        rows={2}
      />
    </div>
  );
}

// ─── Site Context Viewer ──────────────────────────────────────────────────────

function SiteContextViewer({ siteContext }: { siteContext: any }) {
  const [expanded, setExpanded] = useState(false);

  if (!siteContext) {
    return (
      <div className="border border-amber-500/30 bg-amber-500/10 rounded-lg p-4 text-sm text-amber-300">
        <strong>⚠ No site data was scraped</strong> — this audit was generated without real site context.
        The LLM had only the URL and industry label to work with, which explains generic results.
      </div>
    );
  }

  const ctx = siteContext as {
    homepage: { title: string; metaDesc: string; h1: string; h2s: string[]; bodyText: string };
    discoveredPages: string[];
    subPages: { url: string; title: string; metaDesc: string; h1: string }[];
    sitemapFound: boolean;
    scrapeError?: string;
    scrapedAt: string;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          🌐 Real Site Data Scraped at Audit Time
          {ctx.scrapeError && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs border">Partial</Badge>}
          {!ctx.scrapeError && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs border">OK</Badge>}
        </span>
        <span className="text-muted-foreground">{expanded ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {expanded && (
        <div className="p-4 space-y-4 text-xs">
          {ctx.scrapeError && (
            <div className="text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2">
              ⚠ Scrape note: {ctx.scrapeError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground font-medium mb-1">Homepage Data</p>
              <div className="space-y-1 text-foreground/80">
                <p><span className="text-muted-foreground">Title:</span> {ctx.homepage.title || "(none)"}</p>
                <p><span className="text-muted-foreground">Meta Desc:</span> {ctx.homepage.metaDesc || "(none)"}</p>
                <p><span className="text-muted-foreground">H1:</span> {ctx.homepage.h1 || "(none)"}</p>
                {ctx.homepage.h2s?.length > 0 && (
                  <p><span className="text-muted-foreground">H2s:</span> {ctx.homepage.h2s.join(", ")}</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-1">Discovered Pages ({ctx.discoveredPages?.length ?? 0})</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {(ctx.discoveredPages ?? []).slice(0, 15).map((p: string, i: number) => (
                  <p key={i} className="text-foreground/70 truncate">{p}</p>
                ))}
              </div>
            </div>
          </div>
          {ctx.subPages?.length > 0 && (
            <div>
              <p className="text-muted-foreground font-medium mb-2">Sub-page Snapshots</p>
              <div className="space-y-2">
                {ctx.subPages.map((p: any, i: number) => (
                  <div key={i} className="bg-muted/20 rounded p-2">
                    <p className="font-medium text-foreground/80 truncate">{p.url}</p>
                    <p><span className="text-muted-foreground">Title:</span> {p.title || "(none)"}</p>
                    <p><span className="text-muted-foreground">Meta:</span> {p.metaDesc || "(none)"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-muted-foreground">
            Sitemap: {ctx.sitemapFound ? "✓ Found" : "✗ Not found"} · Scraped: {new Date(ctx.scrapedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Review Form ──────────────────────────────────────────────────────────────

type AIAnalysis = {
  overallAccuracy: number;
  overallSummary: string;
  sections: Record<string, { rating: string; reasoning: string }>;
};

const RATING_ICON: Record<string, React.ReactNode> = {
  accurate: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
  partial: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
  inaccurate: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
};

const RATING_BG: Record<string, string> = {
  accurate: "border-emerald-500/30 bg-emerald-500/5",
  partial: "border-amber-500/30 bg-amber-500/5",
  inaccurate: "border-red-500/30 bg-red-500/5",
};

function AuditReviewForm({ auditId, onBack }: { auditId: number; onBack: () => void }) {
  const { data, isLoading } = trpc.quality.getAuditForReview.useQuery({ auditId });
  const utils = trpc.useUtils();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const analyzeAccuracy = trpc.quality.analyzeAccuracy.useMutation({
    onSuccess: (result) => {
      setAiAnalysis(result);
      // Auto-populate section flags from AI result
      const newFlags: SectionFlags = {};
      for (const [key, val] of Object.entries(result.sections)) {
        newFlags[key] = { rating: val.rating as Rating, notes: val.reasoning };
      }
      setFlags(newFlags);
      setAccuracy(result.overallAccuracy);
      toast.success("AI analysis complete — sections pre-filled from AI verdict.");
    },
    onError: (err) => toast.error(err.message),
  });

  const [flags, setFlags] = useState<SectionFlags>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.key, { rating: "partial" as Rating, notes: "" }]))
  );
  const [accuracy, setAccuracy] = useState(50);
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Pre-fill from existing review
  if (data?.review && !initialized) {
    const existing = data.review;
    if (existing.sectionFlags) {
      setFlags(existing.sectionFlags as SectionFlags);
    }
    setAccuracy(existing.overallAccuracy);
    setNotes(existing.notes ?? "");
    setInitialized(true);
  }

  const submitReview = trpc.quality.submitReview.useMutation({
    onSuccess: () => {
      toast.success("Review saved — accuracy review has been recorded.");
      utils.quality.listReviews.invalidate();
      utils.quality.listAudits.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = () => {
    submitReview.mutate({
      auditId,
      sectionFlags: flags,
      overallAccuracy: accuracy,
      notes,
    });
  };

  const accuracyColor =
    accuracy >= 70 ? "text-emerald-400" : accuracy >= 40 ? "text-amber-400" : "text-red-400";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading audit data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Audit not found.
        <Button variant="ghost" onClick={onBack} className="ml-2">← Back</Button>
      </div>
    );
  }

  const { audit, review } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1">
            ← Back to audit list
          </button>
          <h2 className="font-semibold text-lg truncate">{audit.url}</h2>
          <p className="text-sm text-muted-foreground">
            {audit.industry} · Score: {audit.overallScore}/100 · {new Date(audit.createdAt).toLocaleDateString()}
            {review && <span className="ml-2 text-emerald-400">· Previously reviewed</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => analyzeAccuracy.mutate({ auditId })}
            disabled={analyzeAccuracy.isPending}
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          >
            {analyzeAccuracy.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Run AI Analysis</>
            )}
          </Button>
          <Button onClick={handleSubmit} disabled={submitReview.isPending}>
            {submitReview.isPending ? "Saving..." : review ? "Update Review" : "Save Review"}
          </Button>
        </div>
      </div>

      {/* AI Analysis Result */}
      {aiAnalysis && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Accuracy Analysis
              <span className={`ml-auto text-2xl font-bold ${
                aiAnalysis.overallAccuracy >= 70 ? "text-emerald-400" :
                aiAnalysis.overallAccuracy >= 40 ? "text-amber-400" : "text-red-400"
              }`}>{aiAnalysis.overallAccuracy}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground/90 leading-relaxed">{aiAnalysis.overallSummary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SECTIONS.map((sec) => {
                const result = aiAnalysis.sections[sec.key];
                if (!result) return null;
                return (
                  <div key={sec.key} className={`p-3 rounded-lg border ${RATING_BG[result.rating] ?? "border-border bg-muted/20"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {RATING_ICON[result.rating]}
                      <span className="text-xs font-semibold text-foreground">{sec.icon} {sec.label}</span>
                      <span className={`ml-auto text-xs font-medium capitalize ${
                        result.rating === "accurate" ? "text-emerald-400" :
                        result.rating === "partial" ? "text-amber-400" : "text-red-400"
                      }`}>{result.rating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{result.reasoning}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground italic">AI analysis has been applied to the section ratings below. Review and adjust before saving.</p>
          </CardContent>
        </Card>
      )}

      {/* Auto-generated quality insight (from background pipeline) */}
      <AutoInsightsBanner auditId={auditId} />

      {/* Site Context */}
      <SiteContextViewer siteContext={(audit as any).siteContext} />

      {/* Overall Accuracy Slider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Overall Audit Accuracy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Slider
              min={0}
              max={100}
              step={5}
              value={[accuracy]}
              onValueChange={([v]) => setAccuracy(v)}
              className="flex-1"
            />
            <span className={`text-2xl font-bold w-16 text-right ${accuracyColor}`}>
              {accuracy}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            0% = completely wrong/hallucinated · 50% = partially relevant · 100% = highly accurate and site-specific
          </p>
        </CardContent>
      </Card>

      {/* Section Flags */}
      <div>
        <h3 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
          Section-by-Section Review
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SECTIONS.map((section) => (
            <SectionFlagCard
              key={section.key}
              sectionKey={section.key}
              label={section.label}
              icon={section.icon}
              value={flags[section.key] ?? { rating: "partial", notes: "" }}
              onChange={(v) => setFlags((prev) => ({ ...prev, [section.key]: v }))}
            />
          ))}
        </div>
      </div>

      {/* Overall Notes */}
      <div>
        <h3 className="font-medium text-sm mb-2 text-muted-foreground uppercase tracking-wide">
          Overall Review Notes
        </h3>
        <Textarea
          placeholder="Describe what was wrong with this audit, what was hallucinated, what was accurate, and any patterns you noticed..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[120px]"
        />
      </div>

      {/* Audit Data Preview */}
      <div>
        <h3 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wide">
          Generated Audit Data (for reference)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Keywords */}
          {(audit as any).keywords && (
            <Card className="text-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🔑 Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">{(audit as any).keywords.strategy}</p>
                <div className="space-y-1">
                  {((audit as any).keywords.opportunities ?? []).slice(0, 4).map((k: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-foreground/80 truncate">{k.keyword}</span>
                      <span className="text-muted-foreground ml-2 flex-shrink-0">{k.volume}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          {(audit as any).metadata && (
            <Card className="text-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">📄 Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">{(audit as any).metadata.note}</p>
                <div className="space-y-2">
                  {((audit as any).metadata.pages ?? []).slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="border-l-2 border-border pl-2">
                      <p className="font-medium">{p.page} ({p.url})</p>
                      <p className="text-muted-foreground">Current: {p.currentTitle || "(none)"}</p>
                      <p className="text-[#00AEEF]">→ {p.optimizedTitle}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal Linking */}
          {(audit as any).linking && (
            <Card className="text-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🔗 Internal Linking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {((audit as any).linking.immediateActions ?? []).slice(0, 4).map((a: any, i: number) => (
                    <div key={i}>
                      <span className="text-foreground/80">{a.from}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="text-foreground/80">{a.to}</span>
                      <span className="text-muted-foreground"> ({a.anchor})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendar */}
          {(audit as any).calendar && (
            <Card className="text-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">📅 Content Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">{(audit as any).calendar.strategy}</p>
                <div className="space-y-1">
                  {((audit as any).calendar.items ?? []).slice(0, 4).map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground flex-shrink-0">Wk {item.week}:</span>
                      <span className="text-foreground/80">{item.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={submitReview.isPending} size="lg">
          {submitReview.isPending ? "Saving..." : review ? "Update Review" : "Save Review"}
        </Button>
      </div>
    </div>
  );
}

// ─── Auto Quality Insights Banner ────────────────────────────────────────────

function AutoInsightsBanner({ auditId }: { auditId: number }) {
  const { data: insight, isLoading } = trpc.quality.getInsights.useQuery({ auditId });
  if (isLoading) return null;
  if (!insight) {
    return (
      <div className="border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Brain className="w-4 h-4 flex-shrink-0" />
        Auto-analysis pending — runs in background after audit completion.
      </div>
    );
  }
  const sections = (insight.sectionResults ?? {}) as Record<string, { rating: string; reasoning: string; suggestedFix?: string }>;
  const failingSections = Object.entries(sections).filter(([, s]) => s.rating === "inaccurate" || s.rating === "partial");
  return (
    <div className="border border-[#00AEEF]/30 bg-[#00AEEF]/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#00AEEF]" />
          <span className="text-sm font-semibold text-[#00AEEF]">Auto-Generated Quality Insight</span>
          <span className="text-xs text-muted-foreground">({new Date(insight.createdAt).toLocaleDateString()})</span>
        </div>
        <span className={`text-xl font-bold ${
          insight.overallAccuracy >= 70 ? "text-emerald-400" :
          insight.overallAccuracy >= 40 ? "text-amber-400" : "text-red-400"
        }`}>{insight.overallAccuracy}%</span>
      </div>
      {insight.overallSummary && <p className="text-sm text-foreground/90 leading-relaxed">{insight.overallSummary}</p>}
      {failingSections.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Issues found ({failingSections.length} sections):</p>
          <div className="flex flex-wrap gap-1">
            {failingSections.map(([key, s]) => (
              <span key={key} className={`text-xs px-2 py-0.5 rounded border ${
                s.rating === "inaccurate" ? "bg-red-500/20 text-red-300 border-red-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}>{s.rating === "inaccurate" ? "✗" : "~"} {key}</span>
            ))}
          </div>
        </div>
      )}
      {insight.criteriaExtracted > 0 && (
        <p className="text-xs text-emerald-400">✓ {insight.criteriaExtracted} improvement criteria extracted and applied to future audits for this domain.</p>
      )}
    </div>
  );
}

// ─── Learned Criteria View ────────────────────────────────────────────────────

function LearnedCriteriaView() {
  const { data: audits } = trpc.quality.listAudits.useQuery();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const rawDomains = (audits ?? []).map(a => {
    try { return new URL(a.url.startsWith("http") ? a.url : `https://${a.url}`).hostname.replace(/^www\./, ""); }
    catch { return a.url; }
  });
  const domains = Array.from(new Set(rawDomains)).sort();
  const { data: criteria, isLoading } = trpc.quality.getCriteriaForDomain.useQuery(
    { domain: selectedDomain ?? "" },
    { enabled: !!selectedDomain }
  );
  const dismiss = trpc.quality.dismissCriteria.useMutation({
    onSuccess: () => { utils.quality.getCriteriaForDomain.invalidate(); toast.success("Criterion dismissed."); },
    onError: (err) => toast.error(err.message),
  });
  const activeCriteria = (criteria ?? []).filter(c => c.active);
  const dismissedCriteria = (criteria ?? []).filter(c => !c.active);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-[#00AEEF]" />
        <div>
          <h3 className="font-semibold text-sm">Learned Criteria</h3>
          <p className="text-xs text-muted-foreground">Issues extracted from past audits — automatically injected into future runs to prevent repeating mistakes.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audits found. Run an audit first.</p>
        ) : domains.map(domain => (
          <button key={domain} onClick={() => setSelectedDomain(domain)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedDomain === domain ? "bg-[#00AEEF]/20 border-[#00AEEF]/60 text-[#00AEEF]" : "border-border text-muted-foreground hover:border-foreground/40"
            }`}>{domain}</button>
        ))}
      </div>
      {selectedDomain && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading criteria...</div>
          ) : activeCriteria.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active criteria for {selectedDomain}</p>
              <p className="text-xs mt-1">Criteria are extracted automatically after each audit analysis.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{activeCriteria.length} active criteria for <strong>{selectedDomain}</strong> — injected into every new audit for this domain.</p>
              <div className="space-y-2">
                {activeCriteria.map(c => (
                  <div key={c.id} className={`border rounded-lg p-3 flex items-start gap-3 ${
                    c.severity === "high" ? "border-red-500/30 bg-red-500/5" : c.severity === "medium" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/20"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase ${
                          c.severity === "high" ? "text-red-400" : c.severity === "medium" ? "text-amber-400" : "text-muted-foreground"
                        }`}>{c.severity}</span>
                        <span className="text-xs text-muted-foreground">{c.sectionName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-foreground/90 mb-1">{c.description}</p>
                      {c.suggestedFix && (
                        <p className="text-xs text-[#00AEEF] flex items-start gap-1">
                          <span className="flex-shrink-0">→ Fix:</span><span>{c.suggestedFix}</span>
                        </p>
                      )}
                    </div>
                    <button onClick={() => dismiss.mutate({ criteriaId: c.id })} disabled={dismiss.isPending}
                      className="flex-shrink-0 p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors" title="Dismiss">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {dismissedCriteria.length > 0 && <p className="text-xs text-muted-foreground">{dismissedCriteria.length} dismissed criteria (no longer applied).</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Review History ───────────────────────────────────────────────────────────
function ReviewHistory() {
  const { data: reviews, isLoading } = trpc.quality.listReviews.useQuery();
  const { data: audits } = trpc.quality.listAudits.useQuery();

  const auditMap = new Map((audits ?? []).map((a) => [a.id, a]));

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-3xl mb-2">📋</p>
        <p>No reviews submitted yet.</p>
      </div>
    );
  }

  const avgAccuracy = Math.round(reviews.reduce((sum, r) => sum + r.overallAccuracy, 0) / reviews.length);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Reviews Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className={`text-2xl font-bold ${avgAccuracy >= 70 ? "text-emerald-400" : avgAccuracy >= 40 ? "text-amber-400" : "text-red-400"}`}>
              {avgAccuracy}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Avg Accuracy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {reviews.filter((r) => r.overallAccuracy >= 70).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">High Quality (≥70%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((review) => {
          const audit = auditMap.get(review.auditId);
          const flags = (review.sectionFlags ?? {}) as SectionFlags;
          const inaccurateSections = Object.entries(flags)
            .filter(([, v]) => v.rating === "inaccurate")
            .map(([k]) => SECTIONS.find((s) => s.key === k)?.label ?? k);

          return (
            <div key={review.id} className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{audit?.url ?? `Audit #${review.auditId}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {audit?.industry} · Reviewed {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className={`text-xl font-bold ${review.overallAccuracy >= 70 ? "text-emerald-400" : review.overallAccuracy >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    {review.overallAccuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground">accuracy</p>
                </div>
              </div>
              {inaccurateSections.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {inaccurateSections.map((s) => (
                    <Badge key={s} className="text-xs bg-red-500/20 text-red-300 border border-red-500/40">
                      ✗ {s}
                    </Badge>
                  ))}
                </div>
              )}
              {review.notes && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{review.notes}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

type Tab = "audits" | "history";

export default function AuditQualityPanel() {
  const [tab, setTab] = useState<Tab>("audits");
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Quality Control</h1>
        <p className="text-muted-foreground mt-1">
          Review audit accuracy, flag incorrect sections, and track quality trends over time.
        </p>
      </div>

      {/* Root cause info banner */}
      <div className="border border-[#00AEEF]/30 bg-[#00AEEF]/10 rounded-lg p-4 text-sm">
        <p className="font-semibold text-[#00AEEF] mb-1">🔍 Why audits may be inaccurate</p>
        <div className="text-foreground/80 space-y-1">
          <p>
            <strong>JavaScript-heavy sites (Wix, Squarespace, Webflow):</strong> The scraper fetches raw HTML — if the site renders content via JavaScript, the scraper may get little or no visible text. In this case, the LLM has limited real data to work with.
          </p>
          <p>
            <strong>Sites that block crawlers:</strong> Some sites return 403/429 errors or serve bot-detection pages. The scrape note in the site data section will indicate this.
          </p>
          <p>
            <strong>Industry mismatch:</strong> If the wrong industry was selected, all recommendations will be off-target. Always verify the industry label matches the actual business.
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      {!selectedAuditId && (
        <div className="flex gap-1 border-b border-border">
          {([["audits", "Review Audits"], ["history", "Review History"], ["criteria", "Learned Criteria"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-[#00AEEF] text-[#00AEEF]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {selectedAuditId ? (
        <AuditReviewForm auditId={selectedAuditId} onBack={() => setSelectedAuditId(null)} />
      ) : tab === "audits" ? (
        <AuditListView onSelect={setSelectedAuditId} />
      ) : tab === "history" ? (
        <ReviewHistory />
      ) : (
        <LearnedCriteriaView />
      )}
    </div>
  );
}
