import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Moon,
  Plus,
  Sun,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-500";
  if (score >= 45) return "text-amber-500";
  return "text-red-500";
}

function ScoreMini({ score }: { score: number }) {
  const r = 18;
  const cx = 24;
  const cy = 24;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = arc * (score / 100);
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={48} height={48} viewBox="0 0 48 48">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="4"
        className="text-muted/30"
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={-circ * 0.125}
        strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={-circ * 0.125}
        strokeLinecap="round" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">{score}</text>
    </svg>
  );
}

export default function SavedReports() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const utils = trpc.useUtils();

  const { data: reports, isLoading } = trpc.report.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.report.delete.useMutation({
    onSuccess: () => {
      toast.success("Report deleted");
      utils.report.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Sign in to view saved reports</h2>
          <p className="text-muted-foreground text-sm">Your saved SEO reports will appear here after you sign in.</p>
          <Button onClick={() => window.location.href = getLoginUrl()} className="w-full">
            Sign In
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/hub")} className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">My Hub</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Saved Reports</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0 text-muted-foreground hover:text-foreground"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button onClick={() => navigate("/")} className="gap-2" size="sm">
              <Plus className="w-4 h-4" />
              New Audit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No saved reports yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Run an SEO audit and click "Save Report" to save a professional report here for future reference.
            </p>
            <Button onClick={() => navigate("/")} className="gap-2">
              <Plus className="w-4 h-4" />
              Run Your First Audit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Saved Reports</h1>
                <p className="text-sm text-muted-foreground mt-1">{reports.length} report{reports.length !== 1 ? "s" : ""} saved</p>
              </div>
            </div>

            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-border hover:border-primary/30 transition-colors group">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-4">
                      {/* Score mini ring — we don't have score here, so show icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{report.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Client: <span className="text-foreground">{report.clientName}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => navigate(`/audit/${report.auditId}`)}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Dashboard
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => navigate(`/report/${report.id}`)}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Report
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                if (confirm("Delete this report?")) {
                                  deleteMutation.mutate({ id: report.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(report.createdAt).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            Audit #{report.auditId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
