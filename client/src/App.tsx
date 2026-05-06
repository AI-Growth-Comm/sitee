import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useParams } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import UserDashboard from "./pages/UserHub";
import AuditTeaser from "./pages/AuditTeaser";
import Pricing from "./pages/Pricing";

// Redirect /audit/:id  →  /dashboard?auditId=:id
function AuditRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Redirect to={`/dashboard?auditId=${id}`} />;
}

// Redirect /audit/:id/report  →  /dashboard?reportAuditId=:id
function ReportRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Redirect to={`/dashboard?reportAuditId=${id}`} />;
}

// Redirect /report/:id  →  /dashboard?savedReportId=:id
function SavedReportRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Redirect to={`/dashboard?savedReportId=${id}`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hub" component={UserDashboard} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/pricing" component={Pricing} />
      {/* Teaser stays standalone — shown to guests before sign-in */}
      <Route path="/audit/:id/teaser" component={AuditTeaser} />
      {/* All other audit/report routes redirect into the dashboard */}
      <Route path="/audit/:id/report" component={ReportRedirect} />
      <Route path="/audit/:id" component={AuditRedirect} />
      <Route path="/reports"><Redirect to="/dashboard?section=reports" /></Route>
      <Route path="/report/:id" component={SavedReportRedirect} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="bottom-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
