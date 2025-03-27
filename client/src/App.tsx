import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import { OnboardingProvider } from "@/hooks/use-onboarding";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ShiftsPage from "@/pages/shifts-page";
import ShiftTablePage from "@/pages/shift-table-page";
import ExchangesPage from "@/pages/exchanges-page";
import WorkplacesPage from "@/pages/workplaces-page";
import WorkplaceDetailPage from "@/pages/workplace-detail-page";
import WorkersPage from "@/pages/workers-page";
import ReportsPage from "@/pages/reports-page";
import InvoicePage from "@/pages/invoice-page";
import CustomersPage from "@/pages/customers-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import ScanPage from "@/pages/scan";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Cesty pro všechny role */}
      <ProtectedRoute path="/shifts" component={ShiftsPage} />
      <ProtectedRoute path="/shift-table" component={ShiftTablePage} />
      <ProtectedRoute path="/exchanges" component={ExchangesPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      
      {/* Cesty pouze pro adminy a společnosti */}
      <ProtectedRoute 
        path="/workplaces/:id" 
        component={WorkplaceDetailPage} 
        requiredRoles={["admin", "company"]} 
      />
      <ProtectedRoute 
        path="/workplaces" 
        component={WorkplacesPage} 
        requiredRoles={["admin", "company"]} 
      />
      <ProtectedRoute 
        path="/workers" 
        component={WorkersPage} 
        requiredRoles={["admin", "company"]} 
      />
      <ProtectedRoute 
        path="/invoice" 
        component={InvoicePage} 
        requiredRoles={["admin", "company"]} 
      />
      <ProtectedRoute 
        path="/customers" 
        component={CustomersPage} 
        requiredRoles={["admin", "company"]} 
      />
      <ProtectedRoute 
        path="/scan" 
        component={ScanPage} 
        requiredRoles={["admin", "company"]} 
      />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <AuthProvider>
        <LanguageProvider>
          <OnboardingProvider>
            <Router />
            <Toaster />
          </OnboardingProvider>
        </LanguageProvider>
      </AuthProvider>
    </>
  );
}

export default App;
