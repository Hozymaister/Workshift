import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, LayoutDashboard, Calendar, RefreshCw, Building2, Users, FileText, LogOut, Receipt, Table, Book, ScanLine, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation
      setMenuVisible(true);
    } else {
      setMenuVisible(false);
    }
  }, [isOpen]);

  const handleLogout = () => {
    logoutMutation.mutate();
    onClose();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Základní navigační položky
  const commonNavItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
    { path: "/shifts", label: "Moje směny", icon: <Calendar className="mr-3 h-5 w-5" /> },
    { path: "/shift-table", label: "Tabulka směn", icon: <Table className="mr-3 h-5 w-5" /> },
    { path: "/exchanges", label: "Výměny směn", icon: <RefreshCw className="mr-3 h-5 w-5" /> },
    { path: "/reports", label: "Výkazy práce", icon: <FileText className="mr-3 h-5 w-5" /> },
  ];
  
  // Položky menu pouze pro firmy
  const companyNavItems = [
    { path: "/workplaces", label: "Pracovní objekty", icon: <Building2 className="mr-3 h-5 w-5" /> },
    { path: "/workers", label: "Pracovníci", icon: <Users className="mr-3 h-5 w-5" /> },
    { path: "/invoices", label: "Fakturace", icon: <Receipt className="mr-3 h-5 w-5" /> },
    { path: "/customers", label: "Adresář zákazníků", icon: <Book className="mr-3 h-5 w-5" /> },
    { path: "/scan", label: "Skenování dokumentů", icon: <ScanLine className="mr-3 h-5 w-5" /> },
  ];
  
  // Kombinujeme položky podle role uživatele
  const navItems = user?.role === "company" 
    ? [...commonNavItems, ...companyNavItems] 
    : commonNavItems;

  if (!menuVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-slate-800 bg-opacity-75 z-40 md:hidden transition-opacity duration-200",
      isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className={cn(
        "fixed inset-y-0 left-0 max-w-xs w-full bg-slate-800 shadow-xl p-4 overflow-y-auto transition-transform duration-200",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Menu</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {user && (
          <div className="mb-6">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 bg-primary text-white">
                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-white">{`${user.firstName} ${user.lastName}`}</p>
                <p className="text-sm text-slate-400">{user.role === "company" ? "Firma" : "Pracovník"}</p>
              </div>
            </div>
          </div>
        )}
        
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <div 
                  className={cn(
                    "flex items-center px-4 py-2 text-slate-300 rounded-md cursor-pointer",
                    location === item.path ? "bg-slate-700" : "hover:bg-slate-700"
                  )}
                  onClick={onClose}
                >
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="pt-6 mt-6 border-t border-slate-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Odhlásit se
          </Button>
        </div>
      </div>
    </div>
  );
}
