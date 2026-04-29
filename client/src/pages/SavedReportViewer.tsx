import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import type {
  ActionRoadmap,
  AuditData,
  CalendarItem,
  ChecklistItem,
  ContentAudit,
  InternalLinking,
  Keywords,
  Metadata,
  Overview,
  SchemaData,
} from "@shared/auditTypes";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Loader2,
  Search,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";

// Re-export the same section components from ReportViewer
// We import the full page sections inline here to keep this file self-contained

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-500";
  if (score >= 45) return "text-amber-500";
  return "text-red-500";
}

function ScoreArc({ score, size = 120 }: { score: number; size?: number }) {
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = arc * (score / 100);
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="drop-shadow-lg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="8"
        className="text-muted/30"
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={-circ * 0.125}
        strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={-circ * 0.125}
        strokeLinecap="round" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="22" fontWeight="700">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="currentColor" fontSize="9" className="fill-muted-foreground">/100</text>
    </svg>
  );
}

export default function SavedReportViewer() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const reportId = parseInt(params.id ?? "0", 10);
  const [activeSection, setActiveSection] = useState<"cover" | "module1" | "module2" | "module3" | "module4">("cover");

  const { data, isLoading, error } = trpc.report.get.useQuery(
    { id: reportId },
    { enabled: !!reportId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading saved report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-foreground font-semibold">Report not found</p>
          <Button onClick={() => navigate("/reports")} variant="outline">View All Reports</Button>
        </div>
      </div>
    );
  }

  const { report, audit, checklistDoneMap } = data;
  const overview = audit.overview as Overview | null;
  const score = audit.overallScore;
  const maturity = overview?.seoMaturity ?? "Medium";
  const maturityColor = maturity === "High" ? "text-emerald-500" : maturity === "Medium" ? "text-amber-500" : "text-red-500";

  const navItems = [
    { id: "cover", label: "Cover & Scorecard", icon: FileText },
    { id: "module1", label: "Module 1: Content Audit", icon: Search },
    { id: "module2", label: "Module 2: Metadata", icon: Globe },
    { id: "module3", label: "Module 3: Internal Linking", icon: Link2 },
    { id: "module4", label: "Module 4: Action Roadmap", icon: ClipboardList },
  ] as const;

  // We redirect to the audit-based report viewer but with client name from the saved report
  // This page is a thin wrapper that navigates to the full viewer
  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/reports")} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">All Reports</span>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm text-foreground hidden sm:block">{report.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/audit/${audit.id}`)}>
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 print:px-8 print:py-4">
        <div className="flex gap-6 print:block">
          {/* Sidebar Nav */}
          <div className="w-56 flex-shrink-0 print:hidden">
            <div className="sticky top-20 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">Report Sections</p>
              {navItems.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                    activeSection === id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content — redirect to the full ReportViewer with saved report context */}
          <div className="flex-1 min-w-0">
            {/* Cover page with saved client name */}
            <div className={activeSection === "cover" ? "block" : "hidden print:block"}>
              <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-background to-primary/5 p-8 mb-8 print:mb-6">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg text-foreground">Sitee</span>
                    <span className="text-muted-foreground text-sm ml-2">AI-Powered SEO Audit</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Strategic SEO Audit Report</p>
                      <h1 className="text-3xl font-bold text-foreground mb-2 print:text-2xl">{report.title}</h1>
                      <p className="text-muted-foreground mb-6">Prepared for: <span className="text-foreground font-medium">{report.clientName}</span></p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="w-4 h-4 flex-shrink-0" />
                          <span className="text-primary truncate">{audit.url}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <BookOpen className="w-4 h-4 flex-shrink-0" />
                          <span>Industry: <span className="text-foreground">{audit.industry}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>Saved: <span className="text-foreground">{new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="w-4 h-4 flex-shrink-0" />
                          <span>SEO Maturity: <span className={`font-semibold ${maturityColor}`}>{maturity}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-4">
                      <ScoreArc score={score} size={140} />
                      <div className="text-center">
                        <p className={`text-lg font-bold ${scoreColor(score)}`}>
                          {score >= 70 ? "Strong SEO Foundation" : score >= 45 ? "Developing SEO" : "Needs Immediate Attention"}
                        </p>
                        <p className="text-sm text-muted-foreground">Overall SEO Score</p>
                      </div>
                    </div>
                  </div>
                  {overview && (
                    <div className="mt-8">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current State Scorecard</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {overview.dimensions.map((d) => (
                          <div key={d.name} className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                              <span className={`text-sm font-bold ${d.score >= 7 ? "text-emerald-500" : d.score >= 5 ? "text-amber-500" : "text-red-500"}`}>{d.score}/10</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${d.score >= 7 ? "bg-emerald-500" : d.score >= 5 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${d.score * 10}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{d.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* For other sections, redirect to the full report viewer */}
            {activeSection !== "cover" && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6 text-center space-y-4">
                  <FileText className="w-10 h-10 text-primary mx-auto" />
                  <div>
                    <p className="font-semibold text-foreground">View Full Report</p>
                    <p className="text-sm text-muted-foreground mt-1">Open the complete interactive report with all 4 modules.</p>
                  </div>
                  <Button onClick={() => navigate(`/audit/${audit.id}/report`)} className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Open Full Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
