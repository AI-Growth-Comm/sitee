import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, CheckCircle, Lock, Zap, Loader2, AlertCircle, TrendingUp, Key,
} from "lucide-react";

// ─── Score Arc ────────────────────────────────────────────────────────────────
function ScoreArc({ score, size = 160 }: { score: number; size?: number }) {
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = arc * (score / 100);
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="8"
        className="text-muted/30"
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={-circ * 0.125}
        strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={-circ * 0.125}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="22" fontWeight="700">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="currentColor" fontSize="9" className="fill-muted-foreground">/100</text>
    </svg>
  );
}

// ─── Blurred placeholder block ─────────────────────────────────────────────────
function BlurredSection({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div className="relative rounded-xl border border-border bg-card overflow-hidden">
      <div className="blur-sm pointer-events-none select-none p-4 space-y-2">
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 bg-muted rounded flex-1" style={{ opacity: 1 - i * 0.2 }} />
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-12" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-[2px]">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

const UNLOCK_FEATURES = [
  "Full 8-dimension SEO breakdown",
  "All keyword opportunities with intent & difficulty",
  "Metadata rewrites for all key pages",
  "Schema markup recommendations",
  "90-day content plan",
  "12-task prioritized action checklist",
  "AI search (GEO/AEO) readiness score",
];

export default function AuditTeaser() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const auditId = parseInt(params.id ?? "0", 10);

  const { data, isLoading, error } = trpc.audit.get.useQuery(
    { id: auditId },
    { enabled: !!auditId, retry: false }
  );

  const [loginUrl] = useState(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sitee_return_to", `/audit/${auditId}`);
    }
    return getLoginUrl();
  });

  // If user is now signed in, redirect to full results
  useEffect(() => {
    if (data && !data.isTeaser) {
      navigate(`/audit/${auditId}`, { replace: true });
    }
  }, [data, auditId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-foreground font-semibold">Audit not found</p>
          <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
        </div>
      </div>
    );
  }

  if (!data.isTeaser) return null;

  const { teaserData, audit } = data;
  const { overallScore, summary, keyInsight, seoMaturity, dimensions, keywords, keywordStrategy } = teaserData;
  const scoreLabel = overallScore >= 70 ? "Strong Foundation" : overallScore >= 45 ? "Needs Improvement" : "Needs Attention";
  const scoreColor = overallScore >= 70 ? "text-emerald-400" : overallScore >= 45 ? "text-amber-400" : "text-red-400";
  const maturityColor = seoMaturity === "High" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : seoMaturity === "Medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b border-border/50 px-6 py-3 flex items-center gap-3 sticky top-0 z-20 bg-background/95 backdrop-blur">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">New Audit</span>
        </button>
        <div className="flex items-center gap-2 ml-1">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Sitee</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">
            {audit.url.replace(/^https?:\/\//, "")}
          </p>
        </div>
        <a
          href={loginUrl}
          className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-3 h-3" /> Unlock Free
        </a>
      </header>

      <main className="container py-8 max-w-4xl mx-auto space-y-6">

        {/* Score + summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-6 gap-3">
            <ScoreArc score={overallScore} size={160} />
            <p className={`text-sm font-semibold ${scoreColor}`}>{scoreLabel}</p>
            {seoMaturity && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${maturityColor}`}>
                {seoMaturity} Maturity
              </span>
            )}
          </div>
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col justify-center gap-4">
            {summary && (
              <p className="text-foreground leading-relaxed text-sm">{summary}</p>
            )}
            {keyInsight && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{keyInsight}</p>
              </div>
            )}
          </div>
        </div>

        {/* 4 dimension bars */}
        {dimensions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">SEO Dimension Scores</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dimensions.map((dim: any) => {
                const pct = typeof dim.score === "number" ? (dim.score > 10 ? dim.score : dim.score * 10) : 0;
                const barColor = pct >= 70 ? "#4ade80" : pct >= 45 ? "#fbbf24" : "#f87171";
                const textColor = pct >= 70 ? "text-emerald-400" : pct >= 45 ? "text-amber-400" : "text-red-400";
                return (
                  <div key={dim.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-foreground">{dim.name}</span>
                      <span className={`text-sm font-bold tabular-nums ${textColor}`}>
                        {dim.score > 10 ? dim.score : `${dim.score}/10`}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                    </div>
                    {dim.status && (
                      <p className="text-xs text-muted-foreground mt-1">{dim.status}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4 keyword rows */}
        {keywords.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keyword Opportunities</p>
            </div>
            {keywordStrategy && (
              <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
                <p className="text-xs text-muted-foreground">{keywordStrategy}</p>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Keyword</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">Volume</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">Intent</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw: any, i: number) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{kw.keyword}</td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums hidden sm:table-cell">{kw.volume?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      {kw.intent && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{kw.intent}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                        kw.priority === "URGENT" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                        kw.priority === "HIGH" ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
                        "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}>{kw.priority}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Blurred locked sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BlurredSection label="Metadata Rewrites (sign in to unlock)" rows={4} />
          <BlurredSection label="Schema Markup (sign in to unlock)" rows={4} />
          <BlurredSection label="90-Day Content Calendar (sign in to unlock)" rows={3} />
          <BlurredSection label="Action Checklist (sign in to unlock)" rows={5} />
        </div>

        {/* Sign-in wall card */}
        <div className="rounded-2xl overflow-hidden shadow-xl border border-primary/20">
          <div className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] p-8 md:p-10">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div>
                <p className="text-white/80 text-sm font-medium mb-2 uppercase tracking-wider">Your full results are ready</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                  Your score is <span className="font-extrabold">{overallScore}/100</span> — unlock everything free.
                </h2>
                <p className="text-white/80 mt-2 text-sm md:text-base">
                  Create your free account to access the complete audit in seconds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-lg mx-auto">
                {UNLOCK_FEATURES.map((feat) => (
                  <div key={feat} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-white/90 shrink-0" />
                    <span className="text-white/90 text-sm">{feat}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={loginUrl}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0D9488] font-bold px-6 py-3 rounded-xl hover:bg-white/95 transition-all shadow-md text-sm"
                >
                  <Zap className="w-4 h-4" />
                  Unlock My Full Results — It&apos;s Free
                </a>
              </div>

              <p className="text-white/60 text-xs">
                Already have an account?{" "}
                <a href={loginUrl} className="text-white/90 underline hover:text-white">Sign in</a>
                {" · "}
                <a href="/pricing" className="text-white/90 underline hover:text-white">Compare plans</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
