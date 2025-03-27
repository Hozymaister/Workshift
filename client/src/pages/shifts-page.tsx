import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { ShiftForm } from "@/components/shifts/shift-form";
import { ExchangeForm } from "@/components/shifts/exchange-form";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shift, Workplace } from "@shared/schema";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Table as TableIcon, 
  Clock, Users, Building, Calendar, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, getMonth, getYear } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  calculateDuration, 
  formatDuration, 
  calculateMonthlyHours, 
  calculateTotalHours,
  formatTotalHours 
} from "@/lib/utils";

interface ShiftWithDetails extends Shift {
  workplace?: {
    id: number;
    name: string;
    type: string;
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export default function ShiftsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<ShiftWithDetails | undefined>(undefined);
  const [shiftToDelete, setShiftToDelete] = useState<number | null>(null);
  const [isExchangeFormOpen, setIsExchangeFormOpen] = useState(false);
  const [shiftToExchange, setShiftToExchange] = useState<ShiftWithDetails | undefined>(undefined);
  
  const { data: shifts, isLoading } = useQuery<ShiftWithDetails[]>({
    queryKey: ["/api/shifts", { userId: user?.id }],
  });
  
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Úspěch",
        description: "Směna byla úspěšně smazána.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Smazání směny selhalo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleEditShift = (shift: ShiftWithDetails) => {
    setShiftToEdit(shift);
    setIsShiftFormOpen(true);
  };
  
  const handleDeleteShift = (id: number) => {
    deleteShiftMutation.mutate(id);
    setShiftToDelete(null);
  };

  const handleExchangeShift = (shift: ShiftWithDetails) => {
    setShiftToExchange(shift);
    setIsExchangeFormOpen(true);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "PPP", { locale: cs });
  };
  
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };
  
  const sortedShifts = shifts?.sort((a, b) => {
    // Bezpečné zpracování null hodnot při řazení
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1; // Null data na konec
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const [_, navigate] = useLocation();
  
  // Získat všechny pracoviště
  const { data: workplaces = [] } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"],
  });

  // Získat aktuální měsíc a rok
  const currentDate = new Date();
  const currentMonth = getMonth(currentDate);
  const currentYear = getYear(currentDate);

  // Výpočet hodin za aktuální měsíc
  const currentMonthHours = calculateMonthlyHours(shifts || [], currentYear, currentMonth);

  // Získat statistiky podle pracovníka
  const getStatsPerUser = () => {
    if (!shifts) return [];
    
    const userMap = new Map<number, {
      id: number,
      name: string,
      shifts: ShiftWithDetails[],
      totalHours: number
    }>();
    
    shifts.forEach(shift => {
      if (!shift.user) return;
      
      const userId = shift.user.id;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          name: `${shift.user.firstName} ${shift.user.lastName}`,
          shifts: [],
          totalHours: 0
        });
      }
      
      const userData = userMap.get(userId)!;
      userData.shifts.push(shift);
      
      if (shift.startTime && shift.endTime) {
        userData.totalHours += calculateDuration(shift.startTime, shift.endTime);
      }
    });
    
    return Array.from(userMap.values());
  };
  
  // Získat statistiky podle pracoviště
  const getStatsPerWorkplace = () => {
    if (!shifts) return [];
    
    const workplaceMap = new Map<number, {
      id: number,
      name: string,
      type: string | undefined,
      shifts: ShiftWithDetails[],
      totalHours: number,
      users: Map<number, {
        id: number,
        name: string,
        hours: number
      }>
    }>();
    
    shifts.forEach(shift => {
      if (!shift.workplace) return;
      
      const workplaceId = shift.workplace.id;
      
      if (!workplaceMap.has(workplaceId)) {
        workplaceMap.set(workplaceId, {
          id: workplaceId,
          name: shift.workplace.name,
          type: shift.workplace.type,
          shifts: [],
          totalHours: 0,
          users: new Map()
        });
      }
      
      const workplaceData = workplaceMap.get(workplaceId)!;
      workplaceData.shifts.push(shift);
      
      if (shift.startTime && shift.endTime) {
        const shiftHours = calculateDuration(shift.startTime, shift.endTime);
        workplaceData.totalHours += shiftHours;
        
        if (shift.user) {
          const userId = shift.user.id;
          
          if (!workplaceData.users.has(userId)) {
            workplaceData.users.set(userId, {
              id: userId,
              name: `${shift.user.firstName} ${shift.user.lastName}`,
              hours: 0
            });
          }
          
          const userData = workplaceData.users.get(userId)!;
          userData.hours += shiftHours;
        }
      }
    });
    
    return Array.from(workplaceMap.values());
  };
  
  // Statistiky připravené k renderování
  const userStats = getStatsPerUser();
  const workplaceStats = getStatsPerWorkplace();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Moje směny" />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Moje směny</h2>
              <p className="mt-1 text-sm text-slate-500">Přehled a správa vašich směn</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate("/shift-table")} 
                className="inline-flex items-center"
              >
                <TableIcon className="mr-2 h-4 w-4" />
                Tabulkový přehled
              </Button>
              
              {user?.role === "company" && (
                <Button onClick={() => {
                  setShiftToEdit(undefined);
                  setIsShiftFormOpen(true);
                }} className="inline-flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Nová směna
                </Button>
              )}
            </div>
          </div>
          
          {/* Karty s přehledem */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Tento měsíc
                </CardTitle>
                <CardDescription>
                  {format(new Date(currentYear, currentMonth), 'LLLL yyyy', { locale: cs })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatDuration(currentMonthHours)}
                </div>
                <p className="text-sm text-gray-500 mt-1">Odpracovaných hodin</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-amber-500" />
                  Pracoviště
                </CardTitle>
                <CardDescription>
                  Celkem {workplaceStats.length} aktivních
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatDuration(workplaceStats.reduce((acc, wp) => acc + wp.totalHours, 0))}
                </div>
                <p className="text-sm text-gray-500 mt-1">Celkem hodin na všech pracovištích</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Pracovníci
                </CardTitle>
                <CardDescription>
                  Celkem {userStats.length} aktivních
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatDuration(userStats.reduce((acc, usr) => acc + usr.totalHours, 0))}
                </div>
                <p className="text-sm text-gray-500 mt-1">Celkem odpracováno všemi pracovníky</p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="shifts" className="mb-8">
            <TabsList className="mb-4">
              <TabsTrigger value="shifts" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Seznam směn
              </TabsTrigger>
              <TabsTrigger value="stats-workplace" className="flex items-center gap-2">
                <Building className="h-4 w-4" /> Podle pracoviště
              </TabsTrigger>
              <TabsTrigger value="stats-worker" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Podle pracovníka
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="shifts">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Seznam všech směn</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : sortedShifts && sortedShifts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Objekt</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Čas</TableHead>
                          <TableHead>Hodin</TableHead>
                          <TableHead>Pracovník</TableHead>
                          <TableHead className="text-right">Akce</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedShifts.map((shift) => (
                          <TableRow key={shift.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {shift.workplace?.name || "Neznámý objekt"}
                                {shift.workplace?.type && (
                                  <Badge variant="outline" className="text-xs">
                                    {shift.workplace.type}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{shift.date ? formatDate(shift.date.toString()) : "Neznámé datum"}</TableCell>
                            <TableCell>
                              {shift.startTime ? formatTime(shift.startTime.toString()) : "??:??"} - 
                              {shift.endTime ? formatTime(shift.endTime.toString()) : "??:??"}
                            </TableCell>
                            <TableCell>
                              {shift.startTime && shift.endTime ? 
                                formatDuration(calculateDuration(shift.startTime, shift.endTime)) 
                                : "?"}
                            </TableCell>
                            <TableCell>
                              {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : "Neobsazeno"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {user?.role === "company" && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditShift(shift)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-600"
                                      onClick={() => setShiftToDelete(shift.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-blue-500 hover:text-blue-600"
                                  onClick={() => handleExchangeShift(shift)}
                                  title="Požádat o výměnu směny"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Celkem:</TableCell>
                          <TableCell className="font-bold">
                            {formatDuration(calculateTotalHours(sortedShifts || []))}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Nemáte žádné směny
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats-workplace">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Statistika podle pracoviště</CardTitle>
                  <CardDescription>
                    Přehled odpracovaných hodin na jednotlivých pracovištích
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {workplaceStats.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pracoviště</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Počet směn</TableHead>
                          <TableHead>Celkem hodin</TableHead>
                          <TableHead>Pracovníci</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workplaceStats.map((workplace) => (
                          <TableRow key={workplace.id}>
                            <TableCell className="font-medium">{workplace.name}</TableCell>
                            <TableCell>
                              {workplace.type && (
                                <Badge variant="outline">{workplace.type}</Badge>
                              )}
                            </TableCell>
                            <TableCell>{workplace.shifts.length}</TableCell>
                            <TableCell>
                              <span className="font-semibold">{formatDuration(workplace.totalHours)}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {Array.from(workplace.users.values()).map(user => (
                                  <div key={user.id} className="text-xs flex justify-between">
                                    <span>{user.name}</span>
                                    <span className="font-semibold">{formatDuration(user.hours)}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Celkem:</TableCell>
                          <TableCell className="font-bold">
                            {formatDuration(workplaceStats.reduce((acc, wp) => acc + wp.totalHours, 0))}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Žádná data pro zobrazení
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats-worker">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Statistika podle pracovníka</CardTitle>
                  <CardDescription>
                    Přehled odpracovaných hodin jednotlivými pracovníky
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userStats.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pracovník</TableHead>
                          <TableHead>Počet směn</TableHead>
                          <TableHead>Celkem hodin</TableHead>
                          <TableHead>Tento měsíc</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userStats.map((userData) => {
                          // Počítáme hodiny za aktuální měsíc pro daného pracovníka
                          const userMonthlyHours = calculateMonthlyHours(
                            userData.shifts, 
                            currentYear, 
                            currentMonth
                          );
                          
                          return (
                            <TableRow key={userData.id}>
                              <TableCell className="font-medium">{userData.name}</TableCell>
                              <TableCell>{userData.shifts.length}</TableCell>
                              <TableCell>
                                <span className="font-semibold">{formatDuration(userData.totalHours)}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold">{formatDuration(userMonthlyHours)}</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2} className="text-right font-medium">Celkem:</TableCell>
                          <TableCell className="font-bold">
                            {formatDuration(userStats.reduce((acc, usr) => acc + usr.totalHours, 0))}
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatDuration(currentMonthHours)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Žádná data pro zobrazení
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <ShiftForm
          open={isShiftFormOpen}
          onClose={() => {
            setIsShiftFormOpen(false);
            setShiftToEdit(undefined);
          }}
          shiftToEdit={shiftToEdit}
        />
        
        <AlertDialog open={shiftToDelete !== null} onOpenChange={() => setShiftToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Opravdu chcete smazat tuto směnu?</AlertDialogTitle>
              <AlertDialogDescription>
                Tato akce je nevratná. Směna bude trvale smazána.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-500 hover:bg-red-600"
                onClick={() => shiftToDelete && handleDeleteShift(shiftToDelete)}
                disabled={deleteShiftMutation.isPending}
              >
                {deleteShiftMutation.isPending ? "Mazání..." : "Smazat"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {shiftToExchange && (
          <ExchangeForm
            open={isExchangeFormOpen}
            onClose={() => {
              setIsExchangeFormOpen(false);
              setShiftToExchange(undefined);
            }}
            shift={shiftToExchange}
          />
        )}
        
        <MobileNavigation />
      </main>
    </div>
  );
}
