import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
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
import { Search, Zap, BarChart3, ChevronRight, LogIn, FileText, Target, Calendar, Moon, Sun, BookOpen } from "lucide-react";

const STAGE_MESSAGES = [
  "📊 Scoring 8 SEO dimensions...",
  "🔍 Mapping keyword opportunities...",
  "✏️ Rewriting metadata & schema markup...",
  "📅 Building 90-day content calendar...",
  "✅ Creating prioritized action checklist...",
];

export default function Home() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Support pre-fill from re-run navigation
  const searchParams = new URLSearchParams(search);
  const prefillUrl = searchParams.get("url") ?? "";
  const prefillIndustry = searchParams.get("industry") ?? "";

  const prefillCustomIndustry = searchParams.get("customIndustry") ?? "";
  const [url, setUrl] = useState(prefillUrl);
  const [industry, setIndustry] = useState(prefillIndustry);
  const [customIndustry, setCustomIndustry] = useState(prefillCustomIndustry);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Update state if prefill changes (e.g., from re-run)
  useEffect(() => {
    if (prefillUrl) setUrl(prefillUrl);
    if (prefillIndustry) setIndustry(prefillIndustry);
    if (prefillCustomIndustry) setCustomIndustry(prefillCustomIndustry);
  }, [prefillUrl, prefillIndustry, prefillCustomIndustry]);

  // Focus the custom input when Other is selected
  useEffect(() => {
    if (industry === "Other") {
      setTimeout(() => customInputRef.current?.focus(), 50);
    }
  }, [industry]);

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
    }, 5000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAudit = () => {
    if (!url.trim()) { toast.error("Please enter a URL"); return; }
    if (!industry) { toast.error("Please select an industry"); return; }
    if (industry === "Other" && !customIndustry.trim()) {
      toast.error("Please enter your business name or type");
      customInputRef.current?.focus();
      return;
    }
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) normalizedUrl = "https://" + normalizedUrl;
    setLoading(true);
    runAudit.mutate({
      url: normalizedUrl,
      industry,
      customIndustry: industry === "Other" ? customIndustry.trim() : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAudit();
  };

  const prefillAudit = (recentUrl: string, recentIndustry: string, recentCustomIndustry?: string | null) => {
    setUrl(recentUrl);
    setIndustry(recentIndustry);
    if (recentCustomIndustry) setCustomIndustry(recentCustomIndustry);
    urlInputRef.current?.focus();
  };

  // Loading overlay
  if (loading) {
    const progressPct = ((stage + 1) / STAGE_MESSAGES.length) * 100;
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-8 max-w-md w-full px-6">
          {/* Animated spinner with icon */}
          <div className="relative">
            <div className="w-20 h-20 spin-border" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          {/* Stage text */}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground mb-2 transition-all">
              {STAGE_MESSAGES[stage]}
            </p>
            <p className="text-sm text-muted-foreground">
              Analyzing{" "}
              <span className="text-blue-400 font-medium break-all">
                {url.replace(/^https?:\/\//, "")}
              </span>
            </p>
          </div>

          {/* Real progress bar */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Step {stage + 1} of {STAGE_MESSAGES.length}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Shimmer skeleton cards */}
          <div className="w-full grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg shimmer"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Usually takes 20–40 seconds</p>
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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Sitee</span>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">AI-Powered SEO</Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0 text-muted-foreground hover:text-foreground"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/reports")}
                  className="gap-1.5 text-muted-foreground hover:text-foreground hidden md:flex"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Saved Reports</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/hub")}
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <span className="font-medium">{user?.name?.split(" ")[0] ?? "My Hub"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <a
                href={getLoginUrl()}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-primary/50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
            <Zap className="w-3.5 h-3.5" />
            5 AI calls · No API keys required
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Strategic SEO Audit in{" "}
            <span className="text-blue-400">Under 60 Seconds</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Enter any URL and get a complete AI-powered SEO audit — health score, keyword opportunities, metadata rewrites, schema markup, content calendar, and a prioritized action checklist.
          </p>
        </div>

        {/* Input card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={urlInputRef}
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500/50"
                    autoFocus
                  />
                </div>
                <Select value={industry} onValueChange={(val) => { setIndustry(val); if (val !== "Other") setCustomIndustry(""); }}>
                  <SelectTrigger className="sm:w-48 h-12 bg-background border-border text-foreground">
                    <SelectValue placeholder="Select industry" />
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
              {/* Custom business name input — shown only when Other is selected */}
              {industry === "Other" && (
                <div className="relative">
                  <Input
                    ref={customInputRef}
                    type="text"
                    placeholder="e.g. Pet Grooming, Wedding Photography, Auto Repair..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-12 bg-background border-blue-500/50 text-foreground placeholder:text-muted-foreground focus:border-blue-500 ring-1 ring-blue-500/20"
                    maxLength={100}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {customIndustry.length}/100
                  </span>
                </div>
              )}
              <Button
                onClick={handleAudit}
                disabled={!url.trim() || !industry || (industry === "Other" && !customIndustry.trim())}
                className="h-12 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-all"
              >
                <Zap className="w-4 h-4 mr-2" />
                Run SEO Audit
              </Button>
            </div>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { icon: BarChart3, label: "8 SEO Dimensions", sub: "Scored 0–100" },
              { icon: Target, label: "6 Keywords", sub: "Volume & intent" },
              { icon: FileText, label: "Metadata Rewrites", sub: "4 pages optimized" },
              { icon: Calendar, label: "90-Day Calendar", sub: "5 content items" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-3 text-center">
                <Icon className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audits */}
        {recentAudits.data && recentAudits.data.length > 0 && (
          <div className="max-w-2xl mx-auto mt-10">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {isAuthenticated ? "Your Recent Audits" : "Recent Audits"}
            </h2>
            <div className="flex flex-col gap-2">
              {recentAudits.data.map((audit) => {
                const score = audit.overallScore;
                const color =
                  score >= 70 ? "text-green-400" : score >= 45 ? "text-amber-400" : "text-red-400";
                const bgColor =
                  score >= 70
                    ? "bg-green-500/10 border-green-500/20"
                    : score >= 45
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-red-500/10 border-red-500/20";
                return (
                  <button
                    key={audit.id}
                    onClick={() => prefillAudit(audit.url, audit.industry, (audit as any).customIndustry)}
                    className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3 hover:border-blue-500/50 hover:bg-accent/30 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-lg ${bgColor} border flex items-center justify-center shrink-0`}>
                      <span className={`text-sm font-bold tabular-nums ${color}`}>{score}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {audit.url.replace(/^https?:\/\//, "")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {audit.industry === "Other" && (audit as any).customIndustry
                          ? `${(audit as any).customIndustry} (Other)`
                          : audit.industry} · {new Date(audit.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block group-hover:text-blue-400 transition-colors">
                        Click to re-audit
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* What you get section */}
        <div className="max-w-2xl mx-auto mt-14">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5 text-center">
            What's included in every audit
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "SEO Health Score", desc: "Overall score + 8 dimension breakdown with radar chart" },
              { title: "Keyword Opportunities", desc: "6 keywords with volume, difficulty, intent & content type" },
              { title: "Metadata Rewrites", desc: "Current vs optimized titles & descriptions for 4 pages" },
              { title: "Schema Markup", desc: "JSON-LD code ready to copy for 2+ schema types" },
              { title: "90-Day Content Plan", desc: "5 content items with keywords, word counts & clusters" },
              { title: "Action Checklist", desc: "12 prioritized tasks grouped by phase — exportable as CSV" },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-3 bg-card/50 border border-border/50 rounded-lg p-4">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
