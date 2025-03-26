import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calendar, RefreshCw, Building2, MoreHorizontal, Receipt, Table, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { MobileMenu } from "./mobile-menu";

export function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Základní navigační položky pro všechny
  const commonNavItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/shifts", label: "Směny", icon: <Calendar className="h-5 w-5" /> },
    { path: "/shift-table", label: "Tabulka", icon: <Table className="h-5 w-5" /> },
  ];
  
  // Administrátorské položky pro dolní navigaci
  const adminBottomItems = [
    { path: "/invoice", label: "Faktura", icon: <Receipt className="h-5 w-5" /> }
  ];
  
  // Společná položka "Více" pro všechny - otevře mobilní menu s plným seznamem
  const moreItem = {
    label: "Více",
    icon: <MoreHorizontal className="h-5 w-5" />,
    action: () => setMobileMenuOpen(true)
  };
  
  // Vybereme položky podle role a omezíme na 4 položky pro lepší zobrazení
  let navItems;
  if (user?.role === "admin") {
    // Pro admina: Dashboard, Směny, Tabulka a Faktura
    navItems = [...commonNavItems, adminBottomItems[0]];
  } else {
    // Pro ostatní: Dashboard, Směny, Tabulka
    navItems = [...commonNavItems];
  }

  const handleCloseMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-10 md:hidden">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex flex-col items-center py-2 px-3 cursor-pointer",
                location === item.path ? "text-primary" : "text-slate-600"
              )}>
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </div>
            </Link>
          ))}
          
          {/* Tlačítko "Více" pro otevření plného menu */}
          <div 
            className="flex flex-col items-center py-2 px-3 text-slate-600 cursor-pointer"
            onClick={moreItem.action}
          >
            {moreItem.icon}
            <span className="text-xs mt-1">{moreItem.label}</span>
          </div>
        </div>
      </div>
      
      <MobileMenu isOpen={mobileMenuOpen} onClose={handleCloseMobileMenu} />
    </>
  );
}
