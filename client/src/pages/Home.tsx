import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { INDUSTRIES } from "../../../shared/auditTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Zap, BarChart3, Clock, ChevronRight, LogIn } from "lucide-react";

const STAGE_MESSAGES = [
  "📊 Scoring 8 SEO dimensions...",
  "🔍 Mapping keyword opportunities...",
  "✏️ Rewriting metadata & schema...",
  "📅 Building content calendar...",
  "✅ Building action checklist...",
];

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [url, setUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const recentAudits = trpc.audit.recent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const runAudit = trpc.audit.run.useMutation({
    onSuccess: (data) => {
      setLoading(false);
      navigate(`/audit/${data.auditId}`);
    },
    onError: (err) => {
      setLoading(false);
      toast.error(err.message || "Audit failed. Please try again.");
    },
  });

  // Cycle through stage messages during loading
  useEffect(() => {
    if (!loading) { setStage(0); return; }
    let i = 0;
    const interval = setInterval(() => {
      i = Math.min(i + 1, STAGE_MESSAGES.length - 1);
      setStage(i);
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAudit = () => {
    if (!url.trim()) return;
    if (!industry) { toast.error("Please select an industry"); return; }
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) normalizedUrl = "https://" + normalizedUrl;
    setLoading(true);
    runAudit.mutate({ url: normalizedUrl, industry });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAudit();
  };

  const prefillAudit = (recentUrl: string, recentIndustry: string) => {
    setUrl(recentUrl);
    setIndustry(recentIndustry);
    urlInputRef.current?.focus();
  };

  // Loading overlay
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-8 max-w-md w-full px-6">
          {/* Spinner */}
          <div className="relative">
            <div className="w-20 h-20 spin-border" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          {/* Stage text */}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground mb-2">
              {STAGE_MESSAGES[stage]}
            </p>
            <p className="text-sm text-muted-foreground">
              Analyzing <span className="text-blue-400 font-medium">{url}</span>
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2">
            {STAGE_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  i <= stage ? "bg-blue-500" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Skeleton cards */}
          <div className="w-full grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg shimmer" />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Usually takes 15–25 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">RankIQ</span>
            <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.name?.split(" ")[0] ?? "User"}
              </span>
            ) : (
              <a href={getLoginUrl()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <LogIn className="w-4 h-4" />
                Sign in to save audits
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
            <Zap className="w-3.5 h-3.5" />
            Powered by Claude AI · No API keys required
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
            SEO Audit in{" "}
            <span className="text-blue-400">Under 60 Seconds</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Enter any URL and get a complete strategic SEO audit — health score, keyword opportunities, metadata rewrites, schema markup, and a 90-day content plan.
          </p>
        </div>

        {/* Input card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={urlInputRef}
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="w-48 h-12 bg-background border-border text-foreground">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind} className="text-foreground hover:bg-accent">
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAudit}
                disabled={!url.trim() || !industry}
                className="h-12 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40"
              >
                <Zap className="w-4 h-4 mr-2" />
                Run SEO Audit
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: BarChart3, label: "8 SEO Dimensions", sub: "Scored 0–100" },
              { icon: Search, label: "6 Keywords", sub: "With volume & intent" },
              { icon: Clock, label: "15–25 Seconds", sub: "Full audit time" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-4 text-center">
                <Icon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audits */}
        {recentAudits.data && recentAudits.data.length > 0 && (
          <div className="max-w-2xl mx-auto mt-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Recent Audits
            </h2>
            <div className="flex flex-col gap-2">
              {recentAudits.data.map((audit) => {
                const score = audit.overallScore;
                const color = score >= 70 ? "text-green-400" : score >= 45 ? "text-amber-400" : "text-red-400";
                return (
                  <button
                    key={audit.id}
                    onClick={() => prefillAudit(audit.url, audit.industry)}
                    className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3 hover:border-blue-500/50 hover:bg-accent/50 transition-all text-left group"
                  >
                    <div className={`text-2xl font-bold tabular-nums ${color} w-12 shrink-0`}>
                      {score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{audit.url}</p>
                      <p className="text-xs text-muted-foreground">{audit.industry}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
