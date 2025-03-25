import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calendar, RefreshCw, Building2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/shifts", label: "Směny", icon: <Calendar className="h-5 w-5" /> },
    { path: "/exchanges", label: "Výměny", icon: <RefreshCw className="h-5 w-5" /> },
    { path: "/workplaces", label: "Objekty", icon: <Building2 className="h-5 w-5" /> },
    { path: "/more", label: "Více", icon: <MoreHorizontal className="h-5 w-5" /> },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-10 md:hidden">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path === "/more" ? "/workers" : item.path}>
            <a className={cn(
              "flex flex-col items-center py-2 px-3",
              location === item.path || (item.path === "/more" && (location === "/workers" || location === "/reports")) 
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
