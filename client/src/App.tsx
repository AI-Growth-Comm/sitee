import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AuditDashboard from "./pages/AuditDashboard";
import ReportViewer from "./pages/ReportViewer";
import SavedReports from "./pages/SavedReports";
import SavedReportViewer from "./pages/SavedReportViewer";
import UserDashboard from "./pages/UserHub";
import AuditTeaser from "./pages/AuditTeaser";
import Pricing from "./pages/Pricing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hub" component={UserDashboard} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/audit/:id/teaser" component={AuditTeaser} />
      <Route path="/audit/:id">{() => <AuditDashboard />}</Route>
      <Route path="/audit/:id/report">{() => <ReportViewer />}</Route>
      <Route path="/pricing" component={Pricing} />
      <Route path="/reports" component={SavedReports} />
      <Route path="/report/:id" component={SavedReportViewer} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* switchable enables the useTheme hook to toggle between light and dark */}
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
