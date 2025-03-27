import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// Typ pro atribut requiredRoles - pole povolených rolí
type Role = "admin" | "worker" | "company";

// Komponent pro ochranu cest, které vyžadují přihlášení a specifické role
export function ProtectedRoute({
  path,
  component: Component,
  requiredRoles,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRoles?: Role[]; // Nepovinný parametr - pokud není uveden, přístup mají všechny role
}) {
  // Použití useAuth hooku na vrchní úrovni komponenty pro získání stavu přihlášení
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Efekt pro zobrazení toastu v případě nedostatečného oprávnění
  useEffect(() => {
    // Kontrola, zda má uživatel potřebné oprávnění
    if (user && requiredRoles && requiredRoles.length > 0) {
      if (!user.role || !requiredRoles.includes(user.role as Role)) {
        toast({
          title: "Přístup odepřen",
          description: "Pro přístup k této stránce nemáte dostatečná oprávnění.",
          variant: "destructive",
        });
      }
    }
  }, [user, requiredRoles, toast]);

  // Rendering komponenty na základě stavu přihlášení a role
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

        // Kontrola role, pokud jsou specifikovány požadované role
        if (requiredRoles && requiredRoles.length > 0) {
          // Role musí být definovaná a musí být v poli požadovaných rolí
          if (!user.role || !requiredRoles.includes(user.role as Role)) {
            // Přesměrování na dashboard
            return <Redirect to="/" />;
          }
        }

        // Zobrazení požadované komponenty, pokud je uživatel přihlášen a má potřebnou roli
        return <Component />;
      }}
    </Route>
  );
}
