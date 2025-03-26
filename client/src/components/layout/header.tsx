import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Menu, Home, Calendar, Users, BarChart3, ClipboardList, FileText, User, LogOut, Settings } from "lucide-react";
import { MobileMenu } from "./mobile-menu";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Header({ title }: { title: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/auth');
      }
    });
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  // Základní navigační položky
  const commonNavItems = [
    { path: '/', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { path: '/shifts', label: 'Směny', icon: <Calendar className="h-4 w-4" /> },
    { path: '/shift-table', label: 'Tabulka směn', icon: <ClipboardList className="h-4 w-4" /> },
  ];
  
  // Položky menu pouze pro správce
  const adminNavItems = [
    { path: '/workplaces', label: 'Pracoviště', icon: <BarChart3 className="h-4 w-4" /> },
    { path: '/workers', label: 'Pracovníci', icon: <Users className="h-4 w-4" /> },
    { path: '/invoice', label: 'Fakturace', icon: <FileText className="h-4 w-4" /> },
  ];
  
  // Kombinujeme položky podle role uživatele
  const navItems = user?.role === "admin" 
    ? [...commonNavItems, ...adminNavItems] 
    : commonNavItems;

  return (
    <>
      {/* Mobilní header */}
      <header className="bg-white shadow md:hidden">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-600 hover:text-slate-900"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="ml-4 text-lg font-medium">{title}</h1>
          </div>
          <div className="flex items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative p-1 text-slate-600 hover:text-slate-900 mr-2"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-xs">
                    3
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <div className="p-2 border-b">
                  <h3 className="font-medium">Oznámení</h3>
                </div>
                <div className="py-2">
                  <div className="px-3 py-2 hover:bg-slate-100 cursor-pointer">
                    <p className="text-sm font-medium">Nový požadavek na výměnu směny</p>
                    <p className="text-xs text-slate-500">Před 5 minutami</p>
                  </div>
                  <div className="px-3 py-2 hover:bg-slate-100 cursor-pointer">
                    <p className="text-sm font-medium">Byla přidána nová směna</p>
                    <p className="text-xs text-slate-500">Před 2 hodinami</p>
                  </div>
                  <div className="px-3 py-2 hover:bg-slate-100 cursor-pointer">
                    <p className="text-sm font-medium">Přidán nový dokument</p>
                    <p className="text-xs text-slate-500">Dnes, 10:45</p>
                  </div>
                </div>
                <div className="p-2 border-t text-center">
                  <Button variant="link" className="text-xs">Zobrazit všechna oznámení</Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 bg-primary text-white cursor-pointer">
                    <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profil</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Nastavení</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Odhlásit se</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Desktop navigační lišta - viditelná pouze na desktopu */}
      <div className="hidden md:flex bg-white py-2 px-8 shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                      isActive(item.path) 
                        ? "bg-primary text-white" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
            
            <div className="flex items-center space-x-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="relative p-1 text-slate-600 hover:text-slate-900"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    <Badge className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-xs">
                      3
                    </Badge>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <div className="p-2 border-b">
                    <h3 className="font-medium">Oznámení</h3>
                  </div>
                  <div className="py-2">
                    <div className="px-3 py-2 hover:bg-slate-100 cursor-pointer">
                      <p className="text-sm font-medium">Nový požadavek na výměnu směny</p>
                      <p className="text-xs text-slate-500">Před 5 minutami</p>
                    </div>
                    <div className="px-3 py-2 hover:bg-slate-100 cursor-pointer">
                      <p className="text-sm font-medium">Byla přidána nová směna</p>
                      <p className="text-xs text-slate-500">Před 2 hodinami</p>
                    </div>
                    <div className="px-3 py-2 hover:bg-slate-100 cursor-pointer">
                      <p className="text-sm font-medium">Přidán nový dokument</p>
                      <p className="text-xs text-slate-500">Dnes, 10:45</p>
                    </div>
                  </div>
                  <div className="p-2 border-t text-center">
                    <Button variant="link" className="text-xs">Zobrazit všechna oznámení</Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                      <span className="text-sm font-medium text-slate-700">
                        {user.firstName} {user.lastName}
                      </span>
                      <Avatar className="h-8 w-8 bg-primary text-white">
                        <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profil</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Nastavení</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Odhlásit se</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
    </>
  );
}
