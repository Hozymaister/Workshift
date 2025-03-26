import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calendar, RefreshCw, Building2, MoreHorizontal, Receipt, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Základní navigační položky pro všechny
  const commonNavItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/shifts", label: "Směny", icon: <Calendar className="h-5 w-5" /> },
    { path: "/shift-table", label: "Tabulka", icon: <Table className="h-5 w-5" /> },
  ];
  
  // Položky menu pro administrátory
  const adminItems = [
    { path: "/workplaces", label: "Objekty", icon: <Building2 className="h-5 w-5" /> },
    { path: "/invoice", label: "Faktura", icon: <Receipt className="h-5 w-5" /> }
  ];
  
  // Společná položka "Více" pro všechny
  const moreItem = [
    { path: "/more", label: "Více", icon: <MoreHorizontal className="h-5 w-5" /> }
  ];
  
  // Vybereme položky podle role a omezíme na 4 položky pro lepší zobrazení
  let navItems;
  if (user?.role === "admin") {
    // Pro admina: Dashboard, Směny, Tabulka a Faktura (místo Více)
    navItems = [...commonNavItems, adminItems[1]];
  } else {
    // Pro ostatní: Dashboard, Směny, Tabulka a Více
    navItems = [...commonNavItems, ...moreItem];
  }

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-10 md:hidden">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path === "/more" ? "/workers" : item.path}>
            <a className={cn(
              "flex flex-col items-center py-2 px-3",
              location === item.path || (item.path === "/more" && (location === "/workers" || location === "/reports" || location === "/invoice")) 
                ? "text-primary" 
                : "text-slate-600"
            )}>
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
