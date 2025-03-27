import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

// Komponent pro ochranu cest, které vyžadují přihlášení
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Použití useAuth hooku na vrchní úrovni komponenty pro získání stavu přihlášení
  const { user, isLoading } = useAuth();

  // Rendering komponenty na základě stavu přihlášení
  return (
    <Route path={path}>
      {() => {
        // Zobrazení stavu načítání
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // Přesměrování na přihlašovací stránku, pokud uživatel není přihlášen
        if (!user) {
          return <Redirect to="/auth" />;
        }

        // Zobrazení požadované komponenty, pokud je uživatel přihlášen
        return <Component />;
      }}
    </Route>
  );
}
