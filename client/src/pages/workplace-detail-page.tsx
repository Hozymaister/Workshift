import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Workplace, User, Shift } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Building,
  Building2,
  Warehouse,
  Calendar,
  Music,
  ShoppingCart,
  Clock,
  Users,
  ChevronLeft,
  FileSpreadsheet,
  Crown,
  Trophy,
  Clock8,
  ArrowUpRight,
  Loader2,
  ClipboardList,
  Plus,
  Search,
  UserPlus,
  Download,
  Save,
  Check,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkplaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Převedení ID na číslo
  const workplaceId = parseInt(id);
  
  // Stavy pro dialogy a správu
  const [assignWorkersOpen, setAssignWorkersOpen] = useState(false);
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [selectedWorkers, setSelectedWorkers] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Získání dat o pracovišti
  const { data: workplace, isLoading: isLoadingWorkplace } = useQuery<Workplace>({
    queryKey: ["/api/workplaces", workplaceId],
    enabled: !isNaN(workplaceId),
  });
  
  // Získání dat o vedoucím pracoviště (pokud existuje)
  const { data: manager, isLoading: isLoadingManager } = useQuery<User>({
    queryKey: ["/api/users", workplace?.managerId],
    enabled: !isNaN(workplaceId) && workplace?.managerId !== null && workplace?.managerId !== undefined,
  });
  
  // Získání směn pro pracoviště
  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", workplaceId],
    queryFn: async () => {
      const response = await fetch(`/api/shifts?workplaceId=${workplaceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shifts");
      }
      return response.json();
    },
    enabled: !isNaN(workplaceId),
  });
  
  // Získání všech uživatelů
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !isNaN(workplaceId),
  });
  
  // Statistika pracovníků podle odpracovaných hodin
  const [topWorker, setTopWorker] = useState<{user: User, hours: number} | null>(null);
  const [workerStats, setWorkerStats] = useState<{user: User, hours: number}[]>([]);
  
  // Mutace pro přidání směny
  const addShiftMutation = useMutation<any, Error, any>({
    mutationFn: async (shiftData: any) => {
      return apiRequest(
        shiftToEdit ? 'PATCH' : 'POST',
        `/api/shifts${shiftToEdit ? `/${shiftToEdit.id}` : ''}`,
        shiftData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", workplaceId] });
      setAddShiftOpen(false);
      setShiftToEdit(null);
      toast({
        title: shiftToEdit ? "Směna byla upravena" : "Směna byla přidána",
        description: shiftToEdit 
          ? "Změny byly úspěšně uloženy" 
          : "Nová směna byla úspěšně přidána do systému",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat nebo upravit směnu. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    }
  });
  
  // Mutace pro odstranění směny
  const deleteShiftMutation = useMutation<any, Error, number>({
    mutationFn: async (shiftId: number) => {
      return apiRequest(
        'DELETE',
        `/api/shifts/${shiftId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", workplaceId] });
      toast({
        title: "Směna byla odstraněna",
        description: "Směna byla úspěšně odstraněna ze systému",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit směnu. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    }
  });
  
  // Mutace pro přiřazení pracovníků
  const assignWorkersMutation = useMutation<any, Error, number[]>({
    mutationFn: async (userIds: number[]) => {
      return apiRequest(
        'POST',
        `/api/workplaces/${workplaceId}/assign-workers`,
        { userIds }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", workplaceId] });
      setAssignWorkersOpen(false);
      setSelectedWorkers([]);
      toast({
        title: "Pracovníci přiřazeni",
        description: "Vybraní pracovníci byli úspěšně přiřazeni k pracovišti",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se přiřadit pracovníky k pracovišti. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    }
  });
  
  // Funkce pro export směn do CSV
  const exportShiftsToCSV = () => {
    if (!shifts || shifts.length === 0) return;
    
    const headers = ['Datum', 'Pracovník', 'Začátek', 'Konec', 'Hodin'];
    
    const rows = shifts.map(shift => {
      const shiftUser = users?.find(u => u.id === shift.userId);
      const userName = shiftUser 
        ? `${shiftUser.firstName} ${shiftUser.lastName}` 
        : "Neznámý pracovník";
      
      return [
        shift.date ? safeDate(shift.date)?.toLocaleDateString('cs-CZ') || 'Bez data' : 'Bez data',
        userName,
        shift.startTime || '',
        shift.endTime || '',
        shift.hours?.toString() || "0"
      ];
    });
    
    // Vytvoření CSV obsahu
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Vytvoření a stažení souboru
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `směny-${workplace?.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export dokončen",
      description: "Seznam směn byl úspěšně exportován do CSV souboru",
      variant: "default",
    });
  };
  
  // Výpočet statistik pracovníků
  useEffect(() => {
    if (shifts && users && shifts.length > 0 && users.length > 0) {
      // Vytvoření mapy pro sledování odpracovaných hodin podle uživatele
      const hoursMap = new Map<number, number>();
      
      // Procházení směn a sčítání odpracovaných hodin
      shifts.forEach(shift => {
        if (shift.userId) {
          // Bezpečné získání hodin ze směny
          const hours = typeof shift.hours === 'number' ? shift.hours : 0;
          const currentHours = hoursMap.get(shift.userId) || 0;
          hoursMap.set(shift.userId, currentHours + hours);
        }
      });
      
      // Vytvoření pole se statistikami
      const stats: {user: User, hours: number}[] = [];
      
      // Přidání odpracovaných hodin k uživatelům
      hoursMap.forEach((hours, userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
          stats.push({ user, hours });
        }
      });
      
      // Seřazení podle odpracovaných hodin (sestupně)
      stats.sort((a, b) => b.hours - a.hours);
      
      // Nastavení statistik
      setWorkerStats(stats);
      
      // Nastavení nejlepšího pracovníka
      if (stats.length > 0) {
        setTopWorker(stats[0]);
      }
    }
  }, [shifts, users]);
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warehouse":
        return <Warehouse className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      case "club":
        return <Music className="h-4 w-4" />;
      case "office":
        return <Building className="h-4 w-4" />;
      case "shop":
        return <ShoppingCart className="h-4 w-4" />;
      case "other":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };
  
  const getTypeName = (type: string) => {
    switch (type) {
      case "warehouse":
        return "Sklad";
      case "event":
        return "Event";
      case "club":
        return "Klub";
      case "office":
        return "Kancelář";
      case "shop":
        return "Prodejna";
      case "other":
        return "Jiný";
      default:
        return "Neznámý";
    }
  };
  
  const getWorkplaceTypeBgClass = (type: string | undefined) => {
    if (!type) return "bg-slate-100 text-slate-700";
    
    switch (type.toLowerCase()) {
      case "warehouse":
      case "sklad":
        return "bg-orange-100 text-orange-700";
      case "office":
      case "kancelář":
        return "bg-blue-100 text-blue-700";
      case "event":
        return "bg-green-100 text-green-700";
      case "club":
      case "kultura":
        return "bg-purple-100 text-purple-700";
      case "shop":
      case "prodejna":
        return "bg-pink-100 text-pink-700";
      case "other":
      case "jiný":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };
  
  const formatHours = (hours: number): string => {
    return hours.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };
  
  // Pomocná funkce pro bezpečnou konverzi na Datum
  const safeDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    return new Date(dateStr);
  };
  
  return (
    <div className="flex flex-col md:flex-row min-h-full bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title="Detail pracoviště" />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate("/workplaces")}
              className="mb-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Zpět na seznam pracovišť
            </Button>
            
            {isLoadingWorkplace ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workplace ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{workplace.name}</h1>
                    <div className="mt-1 flex items-center gap-4">
                      <Badge className={cn("font-normal", getWorkplaceTypeBgClass(workplace.type))}>
                        <span className="flex items-center">
                          {getTypeIcon(workplace.type)}
                          <span className="ml-1">{getTypeName(workplace.type)}</span>
                        </span>
                      </Badge>
                      
                      {workplace.address && (
                        <div className="text-sm text-slate-500 flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-slate-400" />
                          {workplace.address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {workplace.notes && (
                  <div className="mt-4 bg-white p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center mb-2 text-slate-700">
                      <ClipboardList className="h-4 w-4 mr-2 text-slate-500" />
                      <span className="font-medium">Poznámky:</span>
                    </div>
                    <p className="text-slate-600">{workplace.notes}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                  {/* Karty */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-medium">Vedoucí pracoviště</CardTitle>
                      <CardDescription>Správce odpovědný za provoz</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingManager ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : manager ? (
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4">
                            <Crown className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-medium">{manager.firstName} {manager.lastName}</h3>
                            <p className="text-sm text-slate-500">{manager.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500">
                          <Crown className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm">Pro toto pracoviště není nastaven vedoucí</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-medium">Nejlepší pracovník</CardTitle>
                      <CardDescription>Podle odpracovaných hodin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingShifts || isLoadingUsers ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : topWorker ? (
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-4">
                            <Trophy className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-medium">{topWorker.user.firstName} {topWorker.user.lastName}</h3>
                            <p className="text-sm text-slate-500 flex items-center">
                              <Clock8 className="h-4 w-4 mr-1 text-amber-500" />
                              <span>{formatHours(topWorker.hours)} hodin</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500">
                          <Trophy className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm">Žádný pracovník zatím nemá odpracované hodiny</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-medium">Statistiky pracoviště</CardTitle>
                      <CardDescription>Shrnutí aktivity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-center text-slate-500 mb-1">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="text-xs">Pracovníci</span>
                          </div>
                          <p className="text-2xl font-semibold">
                            {workerStats.length}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-center text-slate-500 mb-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span className="text-xs">Směny</span>
                          </div>
                          <p className="text-2xl font-semibold">
                            {shifts?.length || 0}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-center text-slate-500 mb-1">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="text-xs">Celkem hodin</span>
                          </div>
                          <p className="text-2xl font-semibold">
                            {shifts?.reduce((total, shift) => total + (shift.hours || 0), 0).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || "0.0"}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-center text-slate-500 mb-1">
                            <FileSpreadsheet className="h-4 w-4 mr-1" />
                            <span className="text-xs">Směny tento měsíc</span>
                          </div>
                          <p className="text-2xl font-semibold">
                            {shifts?.filter(s => {
                              if (!s.date) return false;
                              const today = new Date();
                              const shiftDate = safeDate(s.date);
                              if (!shiftDate) return false;
                              return shiftDate.getMonth() === today.getMonth() &&
                                     shiftDate.getFullYear() === today.getFullYear();
                            }).length || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-8">
                  <Tabs defaultValue="workers">
                    <TabsList>
                      <TabsTrigger value="workers">Pracovníci</TabsTrigger>
                      <TabsTrigger value="shifts">Historie směn</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="workers" className="mt-4">
                      <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle>Pracovníci na pracovišti</CardTitle>
                            <CardDescription>Seznam pracovníků seřazený podle odpracovaných hodin</CardDescription>
                          </div>
                          {(user?.role === "admin" || user?.role === "company") && (
                            <Button onClick={() => setAssignWorkersOpen(true)} variant="outline" size="sm" className="ml-auto">
                              <UserPlus className="h-4 w-4 mr-2" />
                              Přidat pracovníky
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent>
                          {isLoadingShifts || isLoadingUsers ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : workerStats.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Jméno</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Pozice</TableHead>
                                  <TableHead className="text-right">Odpracováno hodin</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {workerStats.map((stat, index) => (
                                  <TableRow key={stat.user.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center">
                                        {index === 0 && (
                                          <Badge className="mr-2 bg-amber-100 text-amber-700 border-none">
                                            <Trophy className="h-3 w-3 mr-1" />
                                            TOP
                                          </Badge>
                                        )}
                                        {stat.user.firstName} {stat.user.lastName}
                                      </div>
                                    </TableCell>
                                    <TableCell>{stat.user.email}</TableCell>
                                    <TableCell>
                                      {stat.user.role === "admin" ? (
                                        <Badge variant="default">Admin</Badge>
                                      ) : stat.user.role === "company" ? (
                                        <Badge variant="secondary">Firma</Badge>
                                      ) : (
                                        <Badge variant="outline">Pracovník</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end font-medium">
                                        <Clock8 className="h-4 w-4 mr-1 text-slate-400" />
                                        {formatHours(stat.hours)}
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
                              <p className="mt-1">Na tomto pracovišti zatím nikdo nepracoval</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="shifts" className="mt-4">
                      <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                          <div>
                            <CardTitle>Historie směn</CardTitle>
                            <CardDescription>Přehled všech směn na tomto pracovišti</CardDescription>
                          </div>
                          <div className="flex space-x-2">
                            {shifts && shifts.length > 0 && (
                              <Button onClick={() => exportShiftsToCSV()} variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Exportovat
                              </Button>
                            )}
                            {(user?.role === "admin" || user?.role === "company") && (
                              <Button onClick={() => setAddShiftOpen(true)} variant="default" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Přidat směnu
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {isLoadingShifts ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : shifts && shifts.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Datum</TableHead>
                                  <TableHead>Pracovník</TableHead>
                                  <TableHead>Čas od-do</TableHead>
                                  <TableHead className="text-right">Hodin</TableHead>
                                  {(user?.role === "admin" || user?.role === "company") && (
                                    <TableHead className="text-right">Akce</TableHead>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {shifts
                                  .filter(s => s.date !== null)
                                  .sort((a, b) => {
                                    // Bezpečné porovnání dat (b může být novější než a)
                                    if (!a.date) return 1; // a je null, takže b je "větší" (novější)
                                    if (!b.date) return -1; // b je null, takže a je "větší" (novější)
                                    
                                    const dateA = safeDate(a.date);
                                    const dateB = safeDate(b.date);
                                    
                                    if (!dateA) return 1;
                                    if (!dateB) return -1;
                                    
                                    return dateB.getTime() - dateA.getTime();
                                  })
                                  .map((shift) => {
                                    const shiftUser = users?.find(u => u.id === shift.userId);
                                    return (
                                      <TableRow key={shift.id}>
                                        <TableCell>
                                          {shift.date ? safeDate(shift.date)?.toLocaleDateString('cs-CZ') || 'Bez data' : 'Bez data'}
                                        </TableCell>
                                        <TableCell>
                                          {shiftUser ? (
                                            `${shiftUser.firstName} ${shiftUser.lastName}`
                                          ) : (
                                            "Neznámý pracovník"
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-slate-600">
                                            {shift.startTime} - {shift.endTime}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {shift.hours?.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || "0.0"}
                                        </TableCell>
                                        {(user?.role === "admin" || user?.role === "company") && (
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => {
                                                  setShiftToEdit(shift);
                                                  setAddShiftOpen(true);
                                                }}
                                              >
                                                Upravit
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                  if (confirm('Opravdu chcete odstranit tuto směnu?')) {
                                                    deleteShiftMutation.mutate(shift.id);
                                                  }
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8 text-slate-500">
                              <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                              <h3 className="text-lg font-medium">Žádné směny</h3>
                              <p className="mt-1">Pro toto pracoviště zatím nebyly vytvořeny žádné směny</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Building2 className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-medium">Pracoviště nenalezeno</h3>
                <p className="mt-2">Požadované pracoviště neexistuje nebo k němu nemáte přístup</p>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/workplaces")}
                  className="mt-4"
                >
                  Zpět na seznam pracovišť
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <MobileNavigation />
      </main>
    </div>
  );
}