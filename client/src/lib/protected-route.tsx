import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  console.log(`ProtectedRoute: path=${path}, location=${location}, user=${!!user}, isLoading=${isLoading}`);

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          console.log("ProtectedRoute: No user found, redirecting to /auth");
          return <Redirect to="/auth" />;
        }

        console.log("ProtectedRoute: User found, rendering component");
        return <Component />;
      }}
    </Route>
  );
}
