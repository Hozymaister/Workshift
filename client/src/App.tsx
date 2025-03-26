import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
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
import CustomersPage from "@/pages/customers-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import ScanPage from "@/pages/scan-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/shifts" component={ShiftsPage} />
      <ProtectedRoute path="/shift-table" component={ShiftTablePage} />
      <ProtectedRoute path="/exchanges" component={ExchangesPage} />
      <ProtectedRoute path="/workplaces" component={WorkplacesPage} />
      <ProtectedRoute path="/workers" component={WorkersPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/invoice" component={InvoicePage} />
      <ProtectedRoute path="/customers" component={CustomersPage} />
      <ProtectedRoute path="/scan" component={ScanPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <LanguageProvider>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </LanguageProvider>
      <Toaster />
    </>
  );
}

export default App;
