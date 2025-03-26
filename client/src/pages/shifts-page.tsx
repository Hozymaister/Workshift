import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { ShiftForm } from "@/components/shifts/shift-form";
import { ExchangeForm } from "@/components/shifts/exchange-form";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shift } from "@shared/schema";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Table as TableIcon } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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
              
              {user?.role === "admin" && (
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
                      <TableHead>Pracovník</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.workplace?.name || "Neznámý objekt"}</TableCell>
                        <TableCell>{shift.date ? formatDate(shift.date.toString()) : "Neznámé datum"}</TableCell>
                        <TableCell>
                          {shift.startTime ? formatTime(shift.startTime.toString()) : "??:??"} - 
                          {shift.endTime ? formatTime(shift.endTime.toString()) : "??:??"}
                        </TableCell>
                        <TableCell>
                          {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : "Neobsazeno"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {user?.role === "admin" && (
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
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Nemáte žádné směny
                </div>
              )}
            </CardContent>
          </Card>
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
