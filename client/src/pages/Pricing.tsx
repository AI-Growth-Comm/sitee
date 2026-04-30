import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Check, Zap, Moon, Sun, X,
} from "lucide-react";

// ─── Plan data ─────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Perfect for trying Sitee",
    cta: "Get Started Free",
    highlight: false,
    badge: null,
    features: [
      { label: "3 audits per month", included: true },
      { label: "8-dimension SEO score", included: true },
      { label: "6 keyword opportunities", included: true },
      { label: "Metadata rewrites (2 pages)", included: true },
      { label: "Schema markup (1 type)", included: true },
      { label: "30-day content calendar", included: true },
      { label: "Action checklist (5 tasks)", included: true },
      { label: "Internal links analysis", included: true },
      { label: "Full 90-day content plan", included: false },
      { label: "Unlimited saved reports", included: false },
      { label: "AI search (GEO/AEO) score", included: false },
      { label: "CSV / PDF export", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "per month",
    tagline: "For serious content teams",
    cta: "Start Pro Free Trial",
    highlight: true,
    badge: "Most Popular",
    features: [
      { label: "25 audits per month", included: true },
      { label: "8-dimension SEO score", included: true },
      { label: "All keyword opportunities", included: true },
      { label: "Metadata rewrites (all pages)", included: true },
      { label: "Schema markup (all types)", included: true },
      { label: "Full 90-day content plan", included: true },
      { label: "Action checklist (all tasks)", included: true },
      { label: "Internal links analysis", included: true },
      { label: "AI search (GEO/AEO) score", included: true },
      { label: "Unlimited saved reports", included: true },
      { label: "CSV / PDF export", included: true },
      { label: "Priority support", included: false },
      { label: "White-label reports", included: false },
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: "$99",
    period: "per month",
    tagline: "For agencies & consultants",
    cta: "Contact Sales",
    highlight: false,
    badge: null,
    features: [
      { label: "Unlimited audits", included: true },
      { label: "8-dimension SEO score", included: true },
      { label: "All keyword opportunities", included: true },
      { label: "Metadata rewrites (all pages)", included: true },
      { label: "Schema markup (all types)", included: true },
      { label: "Full 90-day content plan", included: true },
      { label: "Action checklist (all tasks)", included: true },
      { label: "Internal links analysis", included: true },
      { label: "AI search (GEO/AEO) score", included: true },
      { label: "Unlimited saved reports", included: true },
      { label: "CSV / PDF export", included: true },
      { label: "Priority support", included: true },
      { label: "White-label reports", included: true },
    ],
  },
] as const;

// ─── Feature comparison rows ───────────────────────────────────────────────────
const COMPARE_ROWS = [
  { label: "Audits per month",      free: "3",         pro: "25",           agency: "Unlimited" },
  { label: "SEO dimensions scored", free: "8",         pro: "8",            agency: "8" },
  { label: "Keyword opportunities", free: "6",         pro: "All",          agency: "All" },
  { label: "Metadata rewrites",     free: "2 pages",   pro: "All pages",    agency: "All pages" },
  { label: "Schema markup",         free: "1 type",    pro: "All types",    agency: "All types" },
  { label: "Content calendar",      free: "30 days",   pro: "90 days",      agency: "90 days" },
  { label: "Action checklist",      free: "5 tasks",   pro: "All tasks",    agency: "All tasks" },
  { label: "AI search score",       free: "—",         pro: "Included",     agency: "Included" },
  { label: "Saved reports",         free: "—",         pro: "Unlimited",    agency: "Unlimited" },
  { label: "CSV / PDF export",      free: "—",         pro: "Included",     agency: "Included" },
  { label: "Priority support",      free: "—",         pro: "—",            agency: "Included" },
  { label: "White-label reports",   free: "—",         pro: "—",            agency: "Included" },
];

export default function Pricing() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const loginUrl = getLoginUrl();

  function getPlanCta(plan: typeof PLANS[number]) {
    if (plan.id === "free") return isAuthenticated ? () => navigate("/dashboard") : () => window.location.href = loginUrl;
    if (plan.id === "agency") return () => window.location.href = "mailto:hello@trysitee.com?subject=Agency%20Plan";
    return () => window.location.href = loginUrl;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-primary/40"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Sitee</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {isAuthenticated ? (
            <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 bg-primary text-primary-foreground">
              Dashboard
            </Button>
          ) : (
            <Button size="sm" onClick={() => window.location.href = loginUrl} className="gap-1.5 bg-primary text-primary-foreground">
              <Zap className="w-3.5 h-3.5" /> Sign In Free
            </Button>
          )}
        </div>
      </header>

      <main className="container py-16 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center space-y-4 mb-14">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when you need more audits, deeper insights, or client-ready reports.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-7 flex flex-col gap-6 transition-all ${
                plan.highlight
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-border bg-card"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-1.5">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </div>

              <Button
                onClick={getPlanCta(plan)}
                className={`w-full font-semibold ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-card border border-border text-foreground hover:bg-muted"
                }`}
                variant={plan.highlight ? "default" : "outline"}
              >
                {plan.cta}
              </Button>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat.label} className="flex items-start gap-2.5">
                    {feat.included ? (
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feat.included ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {feat.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Full feature comparison</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-muted-foreground font-medium w-1/2">Feature</th>
                    <th className="text-center px-4 py-3.5 text-muted-foreground font-medium">Free</th>
                    <th className="text-center px-4 py-3.5 text-primary font-semibold bg-primary/5">Pro</th>
                    <th className="text-center px-4 py-3.5 text-muted-foreground font-medium">Agency</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr key={row.label} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-5 py-3 text-foreground font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.free}</td>
                      <td className="px-4 py-3 text-center font-medium text-primary bg-primary/5">{row.pro}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.agency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20 space-y-6">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently asked questions</h2>
          {[
            {
              q: "Do I need a credit card to start?",
              a: "No. The Free plan requires only a Manus account — no credit card needed.",
            },
            {
              q: "What counts as one audit?",
              a: "Each time you run a full AI-powered SEO analysis on a URL, that counts as one audit. Re-running the same URL counts as a new audit.",
            },
            {
              q: "Can I cancel at any time?",
              a: "Yes. Pro and Agency plans are billed monthly with no long-term commitment. Cancel any time from your account settings.",
            },
            {
              q: "What is the AI search (GEO/AEO) score?",
              a: "GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization) measure how well your site is positioned to appear in AI-generated answers from tools like ChatGPT, Perplexity, and Google AI Overviews.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="border border-border rounded-xl p-5">
              <p className="font-semibold text-foreground mb-2">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] p-10 text-center space-y-5">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Ready to grow your site?</h2>
          <p className="text-white/80 max-w-md mx-auto">
            Run your first free audit in under 60 seconds — no credit card, no setup.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-white text-[#0D9488] font-bold px-8 py-3 rounded-xl hover:bg-white/95 shadow-md text-sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            Run a Free Audit
          </Button>
        </div>
      </main>
    </div>
  );
}
