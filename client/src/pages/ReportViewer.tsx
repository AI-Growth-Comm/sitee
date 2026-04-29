import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import type {
  ActionRoadmap,
  AuditData,
  CalendarItem,
  ChecklistItem,
  CompetitorGap,
  ContentAudit,
  InternalLinking,
  KpiRow,
  Keywords,
  Metadata,
  Overview,
  PageInventoryItem,
  RoadmapPhase,
  SchemaData,
} from "@shared/auditTypes";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Loader2,
  Moon,
  Save,
  Search,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-500";
  if (score >= 45) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    LOW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Maintain: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return map[p] ?? "bg-muted text-muted-foreground";
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Good: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Improve: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "Critical Gap": "bg-red-500/20 text-red-400 border-red-500/30",
    "Needs Work": "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Underperforming: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Underlinked: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Misused: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
}

// ─── Score Arc ────────────────────────────────────────────────────────────────
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
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="22" fontWeight="700">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="currentColor" fontSize="9" className="fill-muted-foreground">/100</text>
    </svg>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, number, title, subtitle }: {
  icon: React.ElementType; number: string; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-6 print:mb-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center print:w-10 print:h-10">
        <Icon className="w-6 h-6 text-primary print:w-5 print:h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">{number}</p>
        <h2 className="text-2xl font-bold text-foreground print:text-xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
function CoverPage({ audit, clientName, reportTitle }: {
  audit: AuditData; clientName: string; reportTitle: string;
}) {
  const overview = audit.overview as Overview | null;
  const score = audit.overallScore;
  const maturity = overview?.seoMaturity ?? "Medium";
  const maturityColor = maturity === "High" ? "text-emerald-500" : maturity === "Medium" ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-background to-primary/5 p-8 mb-8 print:mb-6 print:rounded-none print:border-0">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary/3 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        {/* Logo row */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">RankIQ</span>
          <span className="text-muted-foreground text-sm ml-2">AI-Powered SEO Audit</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Strategic SEO Audit Report</p>
            <h1 className="text-3xl font-bold text-foreground mb-2 print:text-2xl">{reportTitle}</h1>
            <p className="text-muted-foreground mb-6">Prepared for: <span className="text-foreground font-medium">{clientName}</span></p>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <a href={audit.url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline truncate">{audit.url}</a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4 flex-shrink-0" />
                <span>Industry: <span className="text-foreground">{audit.industry}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Audit Date: <span className="text-foreground">{new Date(audit.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4 flex-shrink-0" />
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

        {/* Current State Scorecard */}
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
  );
}

// ─── Module 1: Content Audit ──────────────────────────────────────────────────
function ContentAuditSection({ data }: { data: ContentAudit }) {
  return (
    <div className="space-y-8 print:space-y-6">
      <SectionHeader icon={FileText} number="Module 1" title="Content Audit & Page Inventory"
        subtitle="Current content performance, competitor gaps, and keyword opportunities" />

      {/* Executive Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5">
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Executive Summary</p>
          <p className="text-foreground leading-relaxed">{data.executiveSummary}</p>
        </CardContent>
      </Card>

      {/* Page Inventory */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" /> Page Inventory & SEO Status
        </h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Page</TableHead>
                <TableHead className="font-semibold">Current SEO Value</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.pageInventory.map((item: PageInventoryItem, i: number) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{item.page}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]">{item.currentSeoValue}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px]">{item.recommendedAction}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Competitor Gaps */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" /> Competitor Landscape & Content Gap Analysis
        </h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Competitor</TableHead>
                <TableHead className="font-semibold">Ranks For</TableHead>
                <TableHead className="font-semibold">Gap Type</TableHead>
                <TableHead className="font-semibold">Your Opportunity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.competitorGaps.map((gap: CompetitorGap, i: number) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{gap.competitor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{gap.ranksFor}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      gap.gapType === "Cannot Win" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      gap.gapType === "Content Gap" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }`}>{gap.gapType}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{gap.opportunity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Keyword Tiers */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" /> Long-Tail Keyword Opportunity Matrix
        </h3>
        <div className="grid gap-6">
          {[
            { tier: "Tier 1", label: "Buyer-Intent Keywords", items: data.keywordTier1, color: "emerald" },
            { tier: "Tier 2", label: "Seller / Conversion-Intent Keywords", items: data.keywordTier2, color: "amber" },
            { tier: "Tier 3", label: "Informational / Research Keywords", items: data.keywordTier3, color: "blue" },
          ].map(({ tier, label, items, color }) => (
            <div key={tier}>
              <div className={`flex items-center gap-2 mb-2`}>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>{tier}</span>
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Keyword</TableHead>
                      <TableHead className="font-semibold">Est. Volume</TableHead>
                      <TableHead className="font-semibold">KD</TableHead>
                      <TableHead className="font-semibold">Recommended Content</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{item.keyword}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.estimatedVolume}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${item.estimatedKD >= 60 ? "bg-red-500" : item.estimatedKD >= 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${item.estimatedKD}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{item.estimatedKD}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.recommendedContent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Module 2: Metadata ───────────────────────────────────────────────────────
function MetadataSection({ metadata, keywords }: { metadata: Metadata; keywords: Keywords | null }) {
  return (
    <div className="space-y-8 print:space-y-6">
      <SectionHeader icon={Search} number="Module 2" title="Metadata Rewrites & Keyword Strategy"
        subtitle="Optimized title tags, meta descriptions, and keyword targeting" />

      {/* Keyword Strategy */}
      {keywords && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5">
            <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">Keyword Strategy</p>
            <p className="text-foreground leading-relaxed">{keywords.strategy}</p>
          </CardContent>
        </Card>
      )}

      {/* Overall note */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm font-semibold text-muted-foreground mb-2">Overall Assessment</p>
          <p className="text-foreground">{metadata.note}</p>
        </CardContent>
      </Card>

      {/* Metadata pages */}
      <div className="space-y-4">
        {metadata.pages.map((page, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{page.page}</CardTitle>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priorityBadge(page.issue === "No keyword" || page.issue === "Missing" ? "URGENT" : page.issue === "Generic" ? "HIGH" : "MEDIUM")}`}>
                  {page.issue}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{page.url}</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Current</p>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Title</p>
                      <p className="text-sm font-medium text-foreground">{page.currentTitle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                      <p className="text-sm text-foreground">{page.currentDesc}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Optimized</p>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-muted-foreground">Title</p>
                        <span className={`text-xs ${page.titleChars > 55 ? "text-red-400" : "text-emerald-400"}`}>{page.titleChars} chars</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{page.optimizedTitle}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-muted-foreground">Description</p>
                        <span className={`text-xs ${page.descChars > 155 ? "text-red-400" : "text-emerald-400"}`}>{page.descChars} chars</span>
                      </div>
                      <p className="text-sm text-foreground">{page.optimizedDesc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Module 3: Internal Linking ───────────────────────────────────────────────
function InternalLinkingSection({ linking, schema }: { linking: InternalLinking; schema: SchemaData | null }) {
  return (
    <div className="space-y-8 print:space-y-6">
      <SectionHeader icon={Link2} number="Module 3" title="Internal Linking Architecture"
        subtitle="Topical cluster structure, immediate actions, and cross-linking map" />

      {/* Topical Clusters */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Topical Cluster Architecture
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {linking.clusters.map((cluster, i) => (
            <Card key={i} className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary">{cluster.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5">
                  <p className="text-xs font-semibold text-primary mb-0.5">PILLAR</p>
                  <p className="text-sm font-medium text-foreground">{cluster.pillar}</p>
                </div>
                <div className="space-y-1">
                  {cluster.articles.map((article, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                      {article}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cluster Pillars (detailed) */}
      {linking.clusterPillars && linking.clusterPillars.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Pillar & Cluster Linking Behavior
          </h3>
          <div className="space-y-4">
            {linking.clusterPillars.map((pillar, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{pillar.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Content Piece</TableHead>
                          <TableHead className="font-semibold">Target Keyword</TableHead>
                          <TableHead className="font-semibold">Linking Behavior</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pillar.items.map((item, j) => (
                          <TableRow key={j} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-sm">{item.contentPiece}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.targetKeyword}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.linkingBehavior}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Immediate Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" /> Immediate Internal Linking Actions
        </h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">From Page</TableHead>
                <TableHead className="font-semibold">To Page</TableHead>
                <TableHead className="font-semibold">Anchor Text</TableHead>
                <TableHead className="font-semibold">Placement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linking.immediateActions.map((action, i) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{action.from}</TableCell>
                  <TableCell className="text-sm text-foreground">{action.to}</TableCell>
                  <TableCell className="text-sm text-primary italic">"{action.anchor}"</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{action.placement}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cross-Link Map */}
      {linking.crossLinkMap && linking.crossLinkMap.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" /> Neighborhood Cross-Linking Map
          </h3>
          <div className="grid md:grid-cols-3 gap-3">
            {linking.crossLinkMap.map((entry, i) => (
              <Card key={i} className="border-border">
                <CardContent className="pt-4">
                  <p className="text-sm font-semibold text-foreground mb-2">{entry.page}</p>
                  <p className="text-xs text-muted-foreground mb-2">Cross-links to:</p>
                  <div className="flex flex-wrap gap-1">
                    {entry.crossLinksTo.map((link, j) => (
                      <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                        {link}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Schema */}
      {schema && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Schema Markup Recommendations
          </h3>
          <Card className="border-primary/20 bg-primary/5 mb-4">
            <CardContent className="pt-4">
              <p className="text-foreground">{schema.recommendation}</p>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            {schema.schemas.map((s, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{s.type} Schema</CardTitle>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priorityBadge(s.priority)}`}>{s.priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Target: {s.page}</p>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono whitespace-pre-wrap">
                    {(() => { try { return JSON.stringify(JSON.parse(s.code), null, 2); } catch { return s.code; } })()}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module 4: Action Roadmap ─────────────────────────────────────────────────
function ActionRoadmapSection({ roadmap, calendar, checklist, checklistDoneMap, auditId }: {
  roadmap: ActionRoadmap;
  calendar: { strategy: string; items: CalendarItem[] } | null;
  checklist: { items: ChecklistItem[] } | null;
  checklistDoneMap: Record<string, boolean>;
  auditId: number;
}) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const toggleMutation = trpc.audit.toggleChecklist.useMutation({
    onSuccess: () => utils.audit.get.invalidate({ id: auditId }),
  });

  const items = checklist?.items ?? [];
  const doneCount = items.filter((it) => checklistDoneMap[it.id] ?? it.done).length;

  return (
    <div className="space-y-8 print:space-y-6">
      <SectionHeader icon={ClipboardList} number="Module 4" title="90-Day Priority Action Roadmap"
        subtitle="Phased implementation plan, content calendar, and KPI targets" />

      {/* Phases */}
      <div className="space-y-4">
        {roadmap.phases.map((phase: RoadmapPhase, i: number) => {
          const phaseColors = ["border-red-500/30 bg-red-500/5", "border-amber-500/30 bg-amber-500/5", "border-emerald-500/30 bg-emerald-500/5"];
          const numColors = ["bg-red-500", "bg-amber-500", "bg-emerald-500"];
          return (
            <Card key={i} className={`border ${phaseColors[i] ?? "border-border"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${numColors[i] ?? "bg-primary"} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {i + 1}
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{phase.phase}</CardTitle>
                    <p className="text-xs text-muted-foreground">{phase.subtitle}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {phase.actions.map((action, j) => (
                    <div key={j} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border flex-shrink-0 mt-0.5 ${priorityBadge(action.priority)}`}>
                        {action.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{action.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.platform}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Phase 2 Blog Plan */}
      {roadmap.phase2Blog && roadmap.phase2Blog.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Phase 2 Blog Plan (Pillar Articles)
          </h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Article Title</TableHead>
                  <TableHead className="font-semibold">Target Keyword</TableHead>
                  <TableHead className="font-semibold">Cluster</TableHead>
                  <TableHead className="font-semibold">Est. Words</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roadmap.phase2Blog.map((item, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{item.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.targetKeyword}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{item.cluster}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.estimatedWords.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Phase 3 Blog Plan */}
      {roadmap.phase3Blog && roadmap.phase3Blog.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Phase 3 Blog Plan (Cluster Articles)
          </h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Article Title</TableHead>
                  <TableHead className="font-semibold">Target Keyword</TableHead>
                  <TableHead className="font-semibold">Cluster</TableHead>
                  <TableHead className="font-semibold">Est. Words</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roadmap.phase3Blog.map((item, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{item.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.targetKeyword}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{item.cluster}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.estimatedWords.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Content Calendar */}
      {calendar && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> 90-Day Content Calendar
          </h3>
          <Card className="border-primary/20 bg-primary/5 mb-4">
            <CardContent className="pt-4">
              <p className="text-foreground">{calendar.strategy}</p>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {calendar.items.map((item: CalendarItem, i: number) => {
              const typeColors: Record<string, string> = {
                Pillar: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                Cluster: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                "How-To": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                Guide: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                Report: "bg-red-500/20 text-red-400 border-red-500/30",
              };
              return (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border hover:bg-muted/30">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                    <span className="text-xs text-muted-foreground">Week</span>
                    <span className="text-lg font-bold text-primary">{item.week}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[item.type] ?? "bg-muted text-muted-foreground"}`}>{item.type}</span>
                      <span className="text-xs text-muted-foreground">{item.cluster}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>🔑 {item.keyword}</span>
                      <span>📝 {item.wordCount.toLocaleString()} words</span>
                      <span>🔗 {item.internalLinks.join(", ")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      {checklist && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" /> SEO Action Checklist
          </h3>
          <div className="mb-3 flex items-center gap-3">
            <Progress value={(doneCount / items.length) * 100} className="h-2 flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{doneCount}/{items.length} done</span>
          </div>
          <div className="space-y-2">
            {items.map((item: ChecklistItem) => {
              const done = checklistDoneMap[item.id] ?? item.done;
              return (
                <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${done ? "border-emerald-500/20 bg-emerald-500/5 opacity-60" : "border-border hover:bg-muted/30"}`}>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) { toast.error("Sign in to track progress"); return; }
                      toggleMutation.mutate({ auditId, itemId: item.id, done: !done });
                    }}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground hover:border-primary"}`}
                  >
                    {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.task}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.impact}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${priorityBadge(item.priority)}`}>{item.priority}</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">{item.phase}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> KPIs & Success Metrics
        </h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Metric</TableHead>
                <TableHead className="font-semibold">Baseline (Today)</TableHead>
                <TableHead className="font-semibold">30-Day Target</TableHead>
                <TableHead className="font-semibold">90-Day Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roadmap.kpis.map((kpi: KpiRow, i: number) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{kpi.metric}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{kpi.baseline}</TableCell>
                  <TableCell className="text-sm text-amber-400">{kpi.target30Day}</TableCell>
                  <TableCell className="text-sm text-emerald-400 font-medium">{kpi.target90Day}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Section Fallback ────────────────────────────────────────────────────────
function SectionFallback({ url, industry, onRerun }: { url: string; industry: string; onRerun: () => void }) {
  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardContent className="pt-8 pb-8 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <p className="text-foreground font-semibold text-lg mb-2">This section requires a new audit</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          This audit was run before the full report engine was deployed. Re-run the audit to generate all 4 report modules including Content Audit, Competitor Gaps, and Action Roadmap.
        </p>
        <Button onClick={onRerun} className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Re-run Audit for Full Report
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Save Report Dialog ───────────────────────────────────────────────────────
function SaveReportDialog({ auditId, auditUrl }: { auditId: number; auditUrl: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`SEO Audit Report — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`);
  const [clientName, setClientName] = useState("");
  const utils = trpc.useUtils();

  const saveMutation = trpc.report.save.useMutation({
    onSuccess: () => {
      toast.success("Report saved successfully!");
      setOpen(false);
      utils.report.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Save className="w-4 h-4" />
          Save Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save SEO Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="report-title">Report Title</Label>
            <Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SEO Audit Report — January 2026" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="client-name">Client / Company Name</Label>
            <Input id="client-name" value={clientName} onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Corp" className="mt-1" />
          </div>
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium text-foreground mb-1">Audit URL</p>
            <p className="truncate">{auditUrl}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={!title.trim() || !clientName.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ auditId, title: title.trim(), clientName: clientName.trim() })}>
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Report Viewer Page ──────────────────────────────────────────────────
export default function ReportViewer() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const auditId = parseInt(params.id ?? "0", 10);
  const [activeSection, setActiveSection] = useState<"cover" | "module1" | "module2" | "module3" | "module4">("cover");

  const { data, isLoading, error } = trpc.audit.get.useQuery(
    { id: auditId },
    { enabled: !!auditId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading report...</p>
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
          <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
        </div>
      </div>
    );
  }

  const { audit, checklistDoneMap } = data;
  const overview = audit.overview as Overview | null;
  const contentAudit = audit.contentAudit as ContentAudit | null;
  const keywords = audit.keywords as Keywords | null;
  const metadata = audit.metadata as Metadata | null;
  const schemaData = audit.schemaData as SchemaData | null;
  const calendar = audit.calendar as { strategy: string; items: CalendarItem[] } | null;
  const checklist = audit.checklist as { items: ChecklistItem[] } | null;
  const linking = audit.linking as InternalLinking | null;
  const roadmap = audit.roadmap as ActionRoadmap | null;

  const navItems = [
    { id: "cover", label: "Cover & Scorecard", icon: FileText },
    { id: "module1", label: "Module 1: Content Audit", icon: Search },
    { id: "module2", label: "Module 2: Metadata", icon: Globe },
    { id: "module3", label: "Module 3: Internal Linking", icon: Link2 },
    { id: "module4", label: "Module 4: Action Roadmap", icon: ClipboardList },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/audit/${auditId}`)} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground hidden sm:block">SEO Report</span>
              <span className="text-xs text-muted-foreground hidden md:block">— {audit.url}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0 text-muted-foreground hover:text-foreground print:hidden"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" className="gap-2 print:hidden"
              onClick={() => window.print()}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
            {isAuthenticated && (
              <SaveReportDialog auditId={auditId} auditUrl={audit.url} />
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/audit/${auditId}`)}>
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

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-12 print:space-y-8">
            {/* Cover — always shown in print */}
            <div className={activeSection === "cover" ? "block" : "hidden print:block"}>
              <CoverPage
                audit={audit as unknown as AuditData}
                clientName="Client"
                reportTitle={`${audit.industry} SEO Audit — ${audit.url}`}
              />
            </div>

            {/* Module 1 */}
            <div className={activeSection === "module1" ? "block" : "hidden print:block"}>
              {contentAudit ? (
                <ContentAuditSection data={contentAudit} />
              ) : (
                <SectionFallback url={audit.url} industry={audit.industry} onRerun={() => navigate(`/?url=${encodeURIComponent(audit.url)}&industry=${encodeURIComponent(audit.industry)}`)} />
              )}
            </div>

            {/* Module 2 */}
            <div className={activeSection === "module2" ? "block" : "hidden print:block"}>
              {metadata ? (
                <MetadataSection metadata={metadata} keywords={keywords} />
              ) : (
                <SectionFallback url={audit.url} industry={audit.industry} onRerun={() => navigate(`/?url=${encodeURIComponent(audit.url)}&industry=${encodeURIComponent(audit.industry)}`)} />
              )}
            </div>

            {/* Module 3 */}
            <div className={activeSection === "module3" ? "block" : "hidden print:block"}>
              {linking ? (
                <InternalLinkingSection linking={linking} schema={schemaData} />
              ) : (
                <SectionFallback url={audit.url} industry={audit.industry} onRerun={() => navigate(`/?url=${encodeURIComponent(audit.url)}&industry=${encodeURIComponent(audit.industry)}`)} />
              )}
            </div>

            {/* Module 4 */}
            <div className={activeSection === "module4" ? "block" : "hidden print:block"}>
              {roadmap ? (
                <ActionRoadmapSection
                  roadmap={roadmap}
                  calendar={calendar}
                  checklist={checklist}
                  checklistDoneMap={checklistDoneMap}
                  auditId={auditId}
                />
              ) : (
                <SectionFallback url={audit.url} industry={audit.industry} onRerun={() => navigate(`/?url=${encodeURIComponent(audit.url)}&industry=${encodeURIComponent(audit.industry)}`)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
