import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, Calendar, RefreshCw, Building2, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
    { path: "/shifts", label: "Moje směny", icon: <Calendar className="mr-3 h-5 w-5" /> },
    { path: "/exchanges", label: "Výměny směn", icon: <RefreshCw className="mr-3 h-5 w-5" /> },
    { path: "/workplaces", label: "Pracovní objekty", icon: <Building2 className="mr-3 h-5 w-5" /> },
    { path: "/workers", label: "Pracovníci", icon: <Users className="mr-3 h-5 w-5" /> },
    { path: "/reports", label: "Výkazy práce", icon: <FileText className="mr-3 h-5 w-5" /> },
  ];

  return (
    <nav className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-800 text-white">
      <div className="flex flex-col h-full">
        <div className="px-4 py-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold">ShiftManager</h1>
          <p className="text-slate-400 text-sm">Správa směn a pracovníků</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-6">
            {user && (
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 bg-primary text-white">
                  <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{`${user.firstName} ${user.lastName}`}</p>
                  <p className="text-sm text-slate-400">{user.role === "admin" ? "Správce" : "Pracovník"}</p>
                </div>
              </div>
            )}
          </div>
          
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <a className={cn(
                    "flex items-center px-4 py-2 text-slate-300 rounded-md",
                    location === item.path ? "bg-slate-700" : "hover:bg-slate-700"
                  )}>
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 border-t border-slate-700">
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
    </nav>
  );
}
