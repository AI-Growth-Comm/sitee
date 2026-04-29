import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  History,
  FileText,
  User,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  BarChart2,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Mini score badge ─────────────────────────────────────────────────────────
function MiniScore({ score }: { score: number }) {
  const color = score >= 70 ? "#4ade80" : score >= 45 ? "#fbbf24" : "#f87171";
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold tabular-nums shrink-0"
      style={{ background: `${color}22`, color, border: `2px solid ${color}55` }}
    >
      {score}
    </span>
  );
}

// ─── Section types ────────────────────────────────────────────────────────────
type Section = "overview" | "history" | "reports" | "profile";

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",      icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "history",   label: "Audit History", icon: <History className="w-4 h-4" /> },
  { id: "reports",   label: "Reports",       icon: <FileText className="w-4 h-4" /> },
  { id: "profile",   label: "Profile",       icon: <User className="w-4 h-4" /> },
];

// ─── Typed hub data ───────────────────────────────────────────────────────────
type HubAudit = {
  id: number;
  url: string;
  industry: string;
  customIndustry?: string | null;
  overallScore: number;
  createdAt: Date;
  status: string;
};
type HubReport = {
  id: number;
  title: string;
  clientName: string;
  auditId: number;
  createdAt: Date;
};
type HubUser = {
  name: string | null;
  email: string | null;
};
type HubData = {
  auditsUsed: number;
  auditsLimit: number;
  recentAudits: HubAudit[];
  savedReports: HubReport[];
  user: HubUser | null;
};

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({ data, onNavigate }: { data: HubData; onNavigate: (p: string) => void }) {
  const lastAudit = data.recentAudits[0];
  const pct = Math.round((data.auditsUsed / data.auditsLimit) * 100);
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Welcome back{data.user?.name ? `, ${data.user.name.split(" ")[0]}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground">Here is a summary of your Sitee activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Usage card */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audits Used</p>
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {data.auditsUsed}
            <span className="text-base font-normal text-muted-foreground"> / {data.auditsLimit}</span>
          </p>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{data.auditsLimit - data.auditsUsed} audits remaining</p>
        </div>

        {/* Last audit card */}
        {lastAudit ? (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 sm:col-span-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Audit</p>
            <div className="flex items-center gap-3">
              <MiniScore score={lastAudit.overallScore} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{lastAudit.url.replace(/^https?:\/\//, "")}</p>
                <p className="text-xs text-muted-foreground">
                  {lastAudit.customIndustry || lastAudit.industry} · {new Date(lastAudit.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate(`/audit/${lastAudit.id}`)} className="gap-1.5 shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> View
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 sm:col-span-2 text-center">
            <p className="text-sm text-muted-foreground">No audits yet. Run your first audit to get started.</p>
          </div>
        )}
      </div>

      <Button onClick={() => onNavigate("/")} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
        <Plus className="w-4 h-4" /> New Audit
      </Button>
    </div>
  );
}

// ─── Audit History Section ────────────────────────────────────────────────────
function HistorySection({ audits, onNavigate }: { audits: HubAudit[]; onNavigate: (p: string) => void }) {
  if (audits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <History className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">No audits yet. Run your first audit from the home page.</p>
        <Button onClick={() => onNavigate("/")} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" /> New Audit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Audit History</h2>
        <Button onClick={() => onNavigate("/")} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5" /> New Audit
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Industry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3"><MiniScore score={audit.overallScore} /></td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-foreground truncate">{audit.url.replace(/^https?:\/\//, "")}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {audit.customIndustry || audit.industry}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onNavigate(`/audit/${audit.id}`)} className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
                        Results
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onNavigate(`/audit/${audit.id}/report`)} className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
                        Report
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Reports Section ──────────────────────────────────────────────────────────
function ReportsSection({ reports, onNavigate }: { reports: HubReport[]; onNavigate: (p: string) => void }) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">No saved reports yet. Generate a report from any completed audit.</p>
        <Button onClick={() => onNavigate("/")} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" /> New Audit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Saved Reports</h2>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/reports")} className="gap-1.5 text-xs">
          View All
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => onNavigate(`/reports/${report.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm line-clamp-2">{report.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{report.clientName}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs mt-auto"
              onClick={(e) => { e.stopPropagation(); onNavigate(`/reports/${report.id}`); }}
            >
              <ExternalLink className="w-3 h-3" /> View Report
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────
function ProfileSection({ data }: { data: HubData }) {
  const pct = Math.round((data.auditsUsed / data.auditsLimit) * 100);
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-semibold text-foreground">Profile</h2>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{data.user?.name ?? "User"}</p>
            <p className="text-sm text-muted-foreground">{data.user?.email ?? ""}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Usage</p>
        <div className="flex items-end justify-between mb-1">
          <span className="text-sm text-foreground">Audits</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {data.auditsUsed} / {data.auditsLimit}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{data.auditsLimit - data.auditsUsed} audits remaining on your current plan.</p>
      </div>
    </div>
  );
}

// ─── Main UserHub Component ───────────────────────────────────────────────────
export default function UserHub() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const summaryQuery = trpc.hub.summary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => navigate("/"),
  });

  // Redirect guests to home
  if (!loading && !isAuthenticated) {
    navigate("/");
    return null;
  }

  if (loading || summaryQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 spin-border" />
          <p className="text-sm text-muted-foreground">Loading your hub...</p>
        </div>
      </div>
    );
  }

  const rawData = summaryQuery.data;
  const data: HubData | null = rawData
    ? {
        auditsUsed: rawData.auditsUsed,
        auditsLimit: rawData.auditsLimit,
        recentAudits: (rawData.recentAudits as HubAudit[]) ?? [],
        savedReports: (rawData.savedReports as HubReport[]) ?? [],
        user: rawData.user ? { name: rawData.user.name ?? null, email: rawData.user.email ?? null } : null,
      }
    : null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col shrink-0 bg-card border-r border-border transition-all duration-200 ${
          sidebarOpen ? "w-52" : "w-14"
        }`}
      >
        {/* Logo row */}
        <div className={`flex items-center h-14 border-b border-border px-3 gap-2 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground text-sm">Sitee</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              } ${!sidebarOpen ? "justify-center" : ""}`}
            >
              {item.icon}
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom: theme + logout */}
        <div className="border-t border-border p-2 space-y-0.5">
          <button
            onClick={toggleTheme}
            title={!sidebarOpen ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ${!sidebarOpen ? "justify-center" : ""}`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {sidebarOpen && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            title={!sidebarOpen ? "Sign out" : undefined}
            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors ${!sidebarOpen ? "justify-center" : ""}`}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-14 flex items-center px-6 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground capitalize">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="hidden sm:block truncate max-w-[120px]">{user.name ?? user.email}</span>
            </div>
          )}
        </header>

        {/* Section content */}
        <div className="p-6">
          {!data ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground text-sm">Failed to load hub data. Please refresh.</p>
            </div>
          ) : (
            <>
              {activeSection === "overview" && <OverviewSection data={data} onNavigate={navigate} />}
              {activeSection === "history"  && <HistorySection  audits={data.recentAudits} onNavigate={navigate} />}
              {activeSection === "reports"  && <ReportsSection  reports={data.savedReports} onNavigate={navigate} />}
              {activeSection === "profile"  && <ProfileSection  data={data} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
