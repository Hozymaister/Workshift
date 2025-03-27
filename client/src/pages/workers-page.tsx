import { useState, useEffect } from "react";
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
  Search,
  Phone,
  Edit,
  PlusCircle,
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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Link } from "wouter";
import { WorkerForm, SafeUser } from "@/components/workers/worker-form";

export default function WorkersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "company";
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredWorkers, setFilteredWorkers] = useState<SafeUser[]>([]);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<SafeUser | undefined>(undefined);
  
  const { data: workers, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/workers"],
  });

  // Filtrování pracovníků podle vyhledávacího dotazu a odstranění aktuálního uživatele ze seznamu
  useEffect(() => {
    if (workers) {
      const filtered = workers
        .filter(worker => worker.id !== user?.id)
        .filter(worker => {
          if (!searchQuery) return true;
          
          const fullName = `${worker.firstName} ${worker.lastName}`.toLowerCase();
          const query = searchQuery.toLowerCase();
          
          return (
            fullName.includes(query) ||
            worker.email.toLowerCase().includes(query) ||
            worker.phone?.toLowerCase().includes(query) ||
            worker.personalId?.toLowerCase().includes(query)
          );
        });
      
      setFilteredWorkers(filtered);
    }
  }, [workers, searchQuery, user]);

  const handleAddWorker = () => {
    setWorkerToEdit(undefined);
    setShowWorkerForm(true);
  };

  const handleEditWorker = (worker: SafeUser) => {
    setWorkerToEdit(worker);
    setShowWorkerForm(true);
  };

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

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
            
            {isAdmin && (
              <Button 
                onClick={handleAddWorker}
                className="mt-4 md:mt-0 bg-gradient-to-r from-primary to-primary/80"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Přidat pracovníka
              </Button>
            )}
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Seznam pracovníků</CardTitle>
                  <CardDescription>Přehled všech pracovníků a jejich rolí</CardDescription>
                </div>
                
                <div className="w-full sm:w-64 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Hledat pracovníky..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
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
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Mzda</TableHead>
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
                            <div>
                              <span className="font-medium block">{worker.firstName} {worker.lastName}</span>
                              {worker.personalId && (
                                <span className="text-xs text-slate-500">RČ: {worker.personalId}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-slate-700">
                              <Mail className="h-4 w-4 mr-2" />
                              <span>{worker.email}</span>
                            </div>
                            {worker.phone && (
                              <div className="flex items-center text-slate-700">
                                <Phone className="h-4 w-4 mr-2" />
                                <span>{worker.phone}</span>
                                {worker.phone && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-green-600 ml-2"
                                    onClick={() => handleCall(worker.phone || "")}
                                  >
                                    <Phone className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={worker.role === "company" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                            <div className="flex items-center">
                              {worker.role === "company" ? (
                                <ShieldCheck className="h-3 w-3 mr-1" />
                              ) : (
                                <ShieldAlert className="h-3 w-3 mr-1" />
                              )}
                              <span>{worker.role === "company" ? "Firma" : "Pracovník"}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {worker.hourlyWage ? `${worker.hourlyWage} Kč/h` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-slate-500 hover:text-primary"
                                onClick={() => handleEditWorker(worker)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
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
                  <p className="mt-1">
                    {searchQuery 
                      ? "Žádný pracovník neodpovídá zadanému vyhledávání"
                      : "V systému nejsou žádní další pracovníci"}
                  </p>
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
                    <Badge className={user?.role === "company" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                      <div className="flex items-center">
                        {user?.role === "company" ? (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <ShieldAlert className="h-3 w-3 mr-1" />
                        )}
                        <span>{user?.role === "company" ? "Firma" : "Pracovník"}</span>
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
      
      {/* Formulář pro přidání/úpravu pracovníka */}
      {showWorkerForm && (
        <WorkerForm
          isOpen={showWorkerForm}
          onClose={() => setShowWorkerForm(false)}
          workerToEdit={workerToEdit}
        />
      )}
    </div>
  );
}
