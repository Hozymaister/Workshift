import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";
import {
  Users,
  User as UserIcon,
  Loader2,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  BarChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Link } from "wouter";

type SafeUser = Omit<User, "password">;

export default function WorkersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const { data: workers, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/workers"],
  });

  // Filter out current user from the list
  const filteredWorkers = workers?.filter(worker => worker.id !== user?.id);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Pracovníci" />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Pracovníci</h2>
              <p className="mt-1 text-sm text-slate-500">Seznam všech pracovníků v systému</p>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Seznam pracovníků</CardTitle>
              <CardDescription>Přehled všech pracovníků a jejich rolí</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredWorkers && filteredWorkers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jméno</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 bg-slate-200">
                              <AvatarFallback className="text-slate-600 text-xs">
                                {getInitials(worker.firstName, worker.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{worker.firstName} {worker.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-slate-700">
                            <Mail className="h-4 w-4 mr-2" />
                            <span>{worker.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={worker.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                            <div className="flex items-center">
                              {worker.role === "admin" ? (
                                <ShieldCheck className="h-3 w-3 mr-1" />
                              ) : (
                                <ShieldAlert className="h-3 w-3 mr-1" />
                              )}
                              <span>{worker.role === "admin" ? "Správce" : "Pracovník"}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" className="text-primary" asChild>
                              <Link href={`/shifts?userId=${worker.id}`}>
                                <Calendar className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Směny</span>
                              </Link>
                            </Button>
                            {isAdmin && (
                              <Button variant="outline" size="sm" className="text-amber-600" asChild>
                                <Link href={`/reports?userId=${worker.id}`}>
                                  <BarChart className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Výkazy</span>
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium">Žádní pracovníci</h3>
                  <p className="mt-1">V systému nejsou žádní další pracovníci</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Current User Card */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Váš profil</CardTitle>
              <CardDescription>Informace o vašem uživatelském účtu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Avatar className="h-16 w-16 bg-primary text-white text-lg">
                  <AvatarFallback>
                    {user && getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <div className="flex items-center text-slate-500">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <Badge className={user?.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                      <div className="flex items-center">
                        {user?.role === "admin" ? (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <ShieldAlert className="h-3 w-3 mr-1" />
                        )}
                        <span>{user?.role === "admin" ? "Správce" : "Pracovník"}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
                
                <div className="ml-auto space-x-2">
                  <Button variant="outline" className="text-primary" asChild>
                    <Link href="/shifts">
                      <Calendar className="h-4 w-4 mr-2" />
                      Moje směny
                    </Link>
                  </Button>
                  <Button variant="outline" className="text-amber-600" asChild>
                    <Link href="/reports">
                      <BarChart className="h-4 w-4 mr-2" />
                      Moje výkazy
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <MobileNavigation />
      </main>
    </div>
  );
}
