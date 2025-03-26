import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ShiftsPage from "@/pages/shifts-page";
import ShiftTablePage from "@/pages/shift-table-page";
import ExchangesPage from "@/pages/exchanges-page";
import WorkplacesPage from "@/pages/workplaces-page";
import WorkersPage from "@/pages/workers-page";
import ReportsPage from "@/pages/reports-page";
import InvoicePage from "@/pages/invoice-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/shifts" component={ShiftsPage} />
      <ProtectedRoute path="/shift-table" component={ShiftTablePage} /> {/* Nová trasa pro tabulku směn */}
      <ProtectedRoute path="/exchanges" component={ExchangesPage} />
      <ProtectedRoute path="/workplaces" component={WorkplacesPage} />
      <ProtectedRoute path="/workers" component={WorkersPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/invoice" component={InvoicePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <AuthProvider>
        <Router />
      </AuthProvider>
      <Toaster />
    </>
  );
}

export default App;
