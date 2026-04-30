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
      // Guests go to teaser; signed-in users go directly to full results
      if (isAuthenticated) {
        navigate(`/audit/${data.auditId}`);
      } else {
        navigate(`/audit/${data.auditId}/teaser`);
      }
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
                  onClick={() => navigate("/pricing")}
                  className="gap-1.5 text-muted-foreground hover:text-foreground hidden md:flex"
                >
                  <span>Pricing</span>
                </Button>
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
                  onClick={() => navigate("/dashboard")}
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <span className="font-medium">{user?.name?.split(" ")[0] ?? "Dashboard"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block px-2 py-1"
                >
                  Pricing
                </button>
                <a
                  href={getLoginUrl()}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-primary/50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </a>
              </>
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

        {/* ── Section 1: How Sitee Helps Your Business ── */}
        <section className="max-w-4xl mx-auto mt-24">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-4">For Business Owners</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How Sitee Helps Your Business Grow Online</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you run a local shop, an e-commerce store, or a professional services firm, Sitee gives you the exact SEO fixes that drive more customers to your website — without hiring an agency.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔍",
                title: "Find Hidden Revenue Keywords",
                desc: "Discover the exact search terms your ideal customers type into Google, ChatGPT, and Perplexity. Sitee maps keyword volume, competition, and buyer intent so you target terms that convert — not just traffic.",
              },
              {
                icon: "⚡",
                title: "Fix Critical SEO Problems Fast",
                desc: "Missing meta descriptions, broken schema markup, thin content — Sitee identifies every issue and gives you copy-paste fixes. Most clients resolve their top 10 issues in under an hour.",
              },
              {
                icon: "📈",
                title: "Outrank Competitors in 90 Days",
                desc: "Sitee's AI builds a 90-day content calendar tailored to your industry, filling the topical gaps your competitors haven't covered yet. Consistent publishing is the #1 driver of long-term organic growth.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-6 space-y-3 hover:border-blue-500/40 transition-colors">
                <div className="text-3xl">{icon}</div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: AI Search Optimization (AEO/GEO) ── */}
        <section className="max-w-4xl mx-auto mt-24">
          <div className="bg-gradient-to-br from-blue-500/5 via-background to-purple-500/5 border border-blue-500/20 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-4">AEO &amp; GEO</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Optimize for the AI Search Era</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                ChatGPT, Claude, Gemini, Perplexity, Grok, and Manus all crawl and index the web differently from Google. Sitee audits your site against the signals that AI answer engines actually use — so your business gets cited, not ignored.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "Answer Engine Optimization (AEO)", desc: "Structure your content so ChatGPT, Claude, and Gemini quote your site as a trusted source in their answers. Sitee checks FAQ schema, structured data, and E-E-A-T signals." },
                { label: "Generative Engine Optimization (GEO)", desc: "Perplexity, Grok, and Manus use retrieval-augmented generation. Sitee ensures your pages have the factual density, citation-ready formatting, and topical authority these models prefer." },
                { label: "Google AI Overviews", desc: "Google's AI Overviews pull from pages with clear headings, concise answers, and proper schema. Sitee rewrites your metadata and adds the JSON-LD markup that earns featured placement." },
                { label: "Bing Copilot & Microsoft AI", desc: "Bing's AI crawler rewards pages with high readability scores and structured data. Sitee's content audit flags readability issues and suggests rewrites that satisfy both human readers and AI models." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3 bg-background/60 border border-border/60 rounded-xl p-5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: Problems We Solve ── */}
        <section className="max-w-4xl mx-auto mt-24">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-4">Common Problems</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">The SEO Problems Costing You Customers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most small business websites have the same 5 critical SEO issues. Sitee finds and fixes all of them in a single audit.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                problem: "Your site doesn't appear in Google's top 10 for your core services",
                solution: "Sitee identifies the exact keywords you should rank for, rewrites your page titles and meta descriptions, and builds a content plan to close the gap within 90 days.",
                icon: "❌",
              },
              {
                problem: "AI assistants never mention your business when users ask relevant questions",
                solution: "Sitee adds FAQ schema, improves your E-E-A-T signals, and restructures your content so ChatGPT, Perplexity, and Gemini can extract and cite your answers.",
                icon: "🤖",
              },
              {
                problem: "You updated your site but rankings didn't improve",
                solution: "Content alone isn't enough. Sitee audits your technical SEO, internal linking structure, and schema markup — the invisible factors that determine whether Google trusts your updates.",
                icon: "📉",
              },
              {
                problem: "You don't know which pages to fix first",
                solution: "Sitee's prioritized action checklist ranks every fix by impact and effort, so you always work on the highest-ROI task next. No more guessing.",
                icon: "🗂️",
              },
            ].map(({ problem, solution, icon }) => (
              <div key={problem} className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Problem</p>
                    <p className="text-sm text-foreground font-medium">{problem}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:border-l md:border-border md:pl-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">Sitee Solution</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Update Your Site for New AI Standards ── */}
        <section className="max-w-4xl mx-auto mt-24">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-4">AI Standards 2025</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Update Your Site Fast for the New AI Web</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every major AI platform — Google, ChatGPT, Claude, Gemini, Perplexity, Grok, and Manus — now crawls the web with its own ranking signals. Here is exactly what each one looks for, and how Sitee helps you meet those standards.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Platform</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Ranking Signal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">What Sitee Fixes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { platform: "Google AI Overviews", signal: "Structured data, E-E-A-T, featured snippet formatting", fix: "Adds JSON-LD schema, rewrites meta tags, improves heading hierarchy" },
                  { platform: "ChatGPT / OpenAI", signal: "Factual density, citation-ready content, clear authorship", fix: "Improves content depth, adds author schema, structures FAQs" },
                  { platform: "Claude (Anthropic)", signal: "Readability, logical structure, trustworthy sources", fix: "Rewrites thin content, adds internal links, improves readability score" },
                  { platform: "Gemini (Google)", signal: "Multimodal content, page experience, Core Web Vitals", fix: "Flags image alt text, page speed issues, and mobile usability gaps" },
                  { platform: "Perplexity AI", signal: "Topical authority, fresh content, direct answers", fix: "Builds 90-day content calendar, adds FAQ schema, improves freshness signals" },
                  { platform: "Grok (xAI)", signal: "Real-time relevance, social proof, trending topics", fix: "Identifies trending keywords, suggests timely content angles" },
                  { platform: "Manus AI", signal: "Task-completion content, structured workflows, clear CTAs", fix: "Restructures pages for task-oriented queries, improves CTA clarity" },
                ].map(({ platform, signal, fix }) => (
                  <tr key={platform} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{platform}</td>
                    <td className="px-4 py-3 text-muted-foreground">{signal}</td>
                    <td className="px-4 py-3 text-blue-400">{fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 5: Social Proof / Results ── */}
        <section className="max-w-4xl mx-auto mt-24">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider mb-4">Results</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What a Sitee Audit Delivers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              In under 60 seconds, Sitee generates a complete strategic SEO package that would take an agency days to produce.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: "60s", label: "Average audit time" },
              { stat: "8", label: "SEO dimensions scored" },
              { stat: "90", label: "Day content calendar" },
              { stat: "12+", label: "Prioritized action items" },
            ].map(({ stat, label }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                <p className="text-3xl font-extrabold text-blue-400 mb-1">{stat}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: "I ran a Sitee audit on my plumbing business website and fixed the top 5 issues in one afternoon. Two weeks later I was ranking on page 1 for \"emergency plumber [city]\".",
                author: "Mike T.",
                role: "Plumbing Business Owner",
              },
              {
                quote: "Our agency uses Sitee to deliver client audits in minutes instead of days. The AI-generated reports are professional enough to send directly to clients.",
                author: "Sarah K.",
                role: "Digital Marketing Agency",
              },
              {
                quote: "The schema markup Sitee generated got our FAQ section appearing in Google's AI Overviews within 3 weeks. That alone was worth it.",
                author: "David L.",
                role: "E-commerce Store Owner",
              },
            ].map(({ quote, author, role }) => (
              <div key={author} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{author}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQs ── */}
        <section className="max-w-3xl mx-auto mt-24 mb-8">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full uppercase tracking-wider mb-4">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "What is SEO and why does my business need it?",
                a: "Search Engine Optimization (SEO) is the process of improving your website so it appears higher in Google, Bing, and AI search results when potential customers search for your products or services. Without SEO, your website is essentially invisible — even if it looks great. Sitee audits your site and gives you a step-by-step plan to get found.",
              },
              {
                q: "How is Sitee different from other SEO tools?",
                a: "Most SEO tools give you data — Sitee gives you a complete action plan. In 60 seconds, you get an 8-dimension health score, keyword opportunities with intent mapping, copy-paste metadata rewrites, JSON-LD schema markup, a 90-day content calendar, and a prioritized checklist. No SEO expertise required.",
              },
              {
                q: "Does Sitee optimize for ChatGPT, Gemini, and other AI search engines?",
                a: "Yes. Sitee is built for the AI search era. It audits your site against the signals used by ChatGPT, Claude, Gemini, Perplexity, Grok, Manus, and Google AI Overviews — including structured data, E-E-A-T, topical authority, and answer-ready content formatting. This is called Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO).",
              },
              {
                q: "How quickly will I see results after implementing Sitee's recommendations?",
                a: "Technical fixes (meta tags, schema markup, internal links) can show results in 2–4 weeks as Google re-crawls your pages. Content improvements typically take 60–90 days to reflect in rankings. AI search visibility (ChatGPT citations, Perplexity answers) can improve faster — often within 2–3 weeks of adding proper structured data.",
              },
              {
                q: "Do I need to be a developer to use Sitee's recommendations?",
                a: "No. Sitee is designed for business owners, marketers, and content teams — not developers. Metadata rewrites are copy-paste ready. Schema markup is formatted as JSON-LD you can drop into your CMS. The action checklist is plain English with clear instructions. For technical changes, Sitee tells you exactly what to ask your developer.",
              },
              {
                q: "Is my audit data private and secure?",
                a: "Yes. Each account's audit data is completely private and isolated — no other user can access your audits or reports. Sitee does not share your website data with third parties. Guest audits (without an account) are anonymized and not linked to any personal information.",
              },
            ].map(({ q, a }, i) => (
              <details key={i} className="group bg-card border border-border rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-semibold text-foreground">{q}</span>
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform shrink-0">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="max-w-2xl mx-auto mt-16 mb-8 text-center">
          <div className="bg-gradient-to-br from-blue-500/10 via-background to-purple-500/5 border border-blue-500/20 rounded-2xl p-10 space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Ready to Rank Higher?</h2>
            <p className="text-muted-foreground">Run your first free SEO audit in 60 seconds. No credit card. No setup. Just results.</p>
            <Button
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => urlInputRef.current?.focus(), 400); }}
              className="h-12 px-8 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              <Zap className="w-4 h-4" /> Start Free Audit
            </Button>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/30">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Sitee</span>
            <span>· AI-Powered SEO Audits</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors">Pricing</button>
            <a href="mailto:hello@trysitee.com" className="hover:text-foreground transition-colors">Contact</a>
            <span>© {new Date().getFullYear()} Sitee</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
