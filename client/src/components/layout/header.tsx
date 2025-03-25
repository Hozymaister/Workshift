import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Menu } from "lucide-react";
import { MobileMenu } from "./mobile-menu";
import { Badge } from "@/components/ui/badge";

export function Header({ title }: { title: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <>
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
            {user && (
              <Avatar className="h-8 w-8 bg-primary text-white">
                <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </header>

      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
    </>
  );
}
