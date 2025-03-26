import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { format, addMonths, subMonths, getMonth, getYear, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { Shift, Workplace, User } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Download, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Building, 
  Users, 
  User as UserIcon, 
  UserCircle,
  DollarSign,
  Crown,
  MapPin,
  Phone,
  Mail,
  Info,
  Edit,
  Save,
  Loader2,
  BarChart2,
  Warehouse,
  Music,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  calculateDuration, 
  formatDuration, 
  calculateMonthlyHours, 
  calculateTotalHours,
  formatTotalHours,
  formatCurrency
} from "@/lib/utils";

// Rozšířené rozhraní pro směny s doplněnými vztahy
interface ShiftWithDetails extends Shift {
  workplace?: Workplace;
  user?: User;
}

interface UserWithStats {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null | undefined;
  phone: string | null | undefined;
  hourlyWage: number | null | undefined;
  personalId: string | null | undefined;
  position?: string;
  shifts: ShiftWithDetails[];
  totalHours: number;
  monthlyHours: number;
}

interface EditWorkplaceFormData {
  name: string;
  type: string;
  address: string;
  notes: string;
  managerId: number | null;
  // Přidané údaje o firmě
  companyName: string;
  companyId: string;    // IČO
  companyVatId: string; // DIČ
  companyAddress: string;
}

export default function WorkplaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const workplaceId = parseInt(id);
  const { toast } = useToast();
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Období pro filtrování
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedMonth = getMonth(selectedDate);
  const selectedYear = getYear(selectedDate);
  
  // Dialog pro přepočet mzdy
  const [wageDialogOpen, setWageDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [hourlyWage, setHourlyWage] = useState(150);
  
  // Dialog pro editaci pracoviště
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditWorkplaceFormData>({
    name: "",
    type: "",
    address: "",
    notes: "",
    managerId: null,
    companyName: "",
    companyId: "",
    companyVatId: "",
    companyAddress: ""
  });
  
  // Získání dat o pracovišti
  const { 
    data: workplace, 
    isLoading: workplaceLoading,
    error: workplaceError
  } = useQuery<Workplace>({
    queryKey: [`/api/workplaces/${workplaceId}`],
    enabled: !!workplaceId,
  });
  
  // Nastavení dat pro editaci při načtení pracoviště
  useEffect(() => {
    if (workplace) {
      setEditForm({
        name: workplace.name || "",
        type: workplace.type || "",
        address: workplace.address || "",
        notes: workplace.notes || "",
        managerId: workplace.managerId || null
      });
    }
  }, [workplace]);
  
  // Získání směn pro pracoviště
  const { 
    data: shifts = [], 
    isLoading: shiftsLoading 
  } = useQuery<ShiftWithDetails[]>({
    queryKey: [`/api/shifts`, { workplaceId }],
    enabled: !!workplaceId,
  });
  
  // Získání všech pracovníků
  const { 
    data: allUsers = [], 
    isLoading: usersLoading 
  } = useQuery<User[]>({
    queryKey: [`/api/workers`],
  });
  
  // Filtrování směn podle vybraného měsíce a roku
  const filteredShifts = shifts.filter(shift => {
    if (!shift.date) return false;
    const shiftDate = typeof shift.date === 'string' ? parseISO(shift.date) : shift.date;
    return getMonth(shiftDate) === selectedMonth && getYear(shiftDate) === selectedYear;
  });
  
  // Mutace pro aktualizaci pracoviště
  const updateWorkplaceMutation = useMutation({
    mutationFn: async (formData: EditWorkplaceFormData) => {
      await apiRequest("PATCH", `/api/workplaces/${workplaceId}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workplaces/${workplaceId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      toast({
        title: "Úspěch",
        description: "Pracoviště bylo úspěšně aktualizováno.",
      });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: `Aktualizace pracoviště selhala: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Vytvoření statistik uživatelů
  const getUserStats = (): UserWithStats[] => {
    if (!shifts || !allUsers) return [];
    
    const userMap = new Map<number, UserWithStats>();
    
    // Inicializace statistik pro všechny uživatele
    allUsers.forEach(user => {
      if (user && user.id) {
        userMap.set(user.id, {
          id: user.id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email,
          phone: user.phone,
          hourlyWage: user.hourlyWage,
          personalId: user.personalId,
          position: user.notes || undefined, // Využijeme pole notes pro pozici
          shifts: [],
          totalHours: 0,
          monthlyHours: 0
        });
      }
    });
    
    // Přidání směn a výpočet hodin
    shifts.forEach(shift => {
      if (!shift.user || !shift.user.id) return;
      
      const userId = shift.user.id;
      
      if (!userMap.has(userId)) return;
      
      const userData = userMap.get(userId)!;
      userData.shifts.push(shift);
      
      if (shift.startTime && shift.endTime) {
        const shiftHours = calculateDuration(shift.startTime, shift.endTime);
        userData.totalHours += shiftHours;
        
        // Kontrola, zda směna je v aktuálním měsíci
        if (shift.date) {
          const shiftDate = typeof shift.date === 'string' ? parseISO(shift.date) : shift.date;
          if (getMonth(shiftDate) === selectedMonth && getYear(shiftDate) === selectedYear) {
            userData.monthlyHours += shiftHours;
          }
        }
      }
    });
    
    // Odfiltrování uživatelů bez směn na tomto pracovišti
    return Array.from(userMap.values())
      .filter(user => user.shifts.length > 0)
      .sort((a, b) => b.monthlyHours - a.monthlyHours); // Seřazení podle počtu hodin
  };
  
  const userStats = getUserStats();
  const top3Users = userStats.slice(0, 3);
  
  // Celkové hodiny za vybraný měsíc
  const totalMonthlyHours = filteredShifts.reduce((total, shift) => {
    if (!shift.startTime || !shift.endTime) return total;
    return total + calculateDuration(shift.startTime, shift.endTime);
  }, 0);
  
  // Celkové hodiny všech směn
  const totalAllHours = shifts.reduce((total, shift) => {
    if (!shift.startTime || !shift.endTime) return total;
    return total + calculateDuration(shift.startTime, shift.endTime);
  }, 0);
  
  // Navigace po měsících
  const handlePreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };
  
  const handleCurrentMonth = () => {
    setSelectedDate(new Date());
  };
  
  // Export dat
  const exportToCSV = () => {
    // Příprava dat pro export
    const dataRows = userStats.map(user => [
      `${user.firstName} ${user.lastName}`,
      user.monthlyHours.toString(),
      formatDuration(user.monthlyHours),
      (user.hourlyWage ? user.hourlyWage : 0).toString(),
      (user.hourlyWage ? formatCurrency(user.monthlyHours * user.hourlyWage) : '0 Kč')
    ]);
    
    // Hlavička CSV
    const header = ["Jméno", "Hodiny (číslo)", "Hodiny (formát)", "Hodinová sazba", "Celková mzda"];
    
    // Sestavení CSV obsahu
    const csvContent = [
      "sep=,",
      `Export pracoviště: ${workplace?.name || 'Neznámé pracoviště'}`,
      `Období: ${format(selectedDate, 'LLLL yyyy', { locale: cs })}`,
      `Celkem hodin: ${formatDuration(totalMonthlyHours)}`,
      "",
      header.join(","),
      ...dataRows.map(row => row.join(","))
    ].join("\n");
    
    // Vytvoření blobu a stažení
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `export-${workplace?.name}-${format(selectedDate, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handler pro aktualizaci pracoviště
  const handleUpdateWorkplace = () => {
    updateWorkplaceMutation.mutate(editForm);
  };
  
  // Helper pro získání ikony podle typu pracoviště
  const getTypeIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'office':
      case 'kancelář':
        return <Building className="h-3 w-3 text-blue-500" />;
      case 'warehouse':
      case 'sklad':
        return <Warehouse className="h-3 w-3 text-orange-500" />;
      case 'culture':
      case 'kultura':
        return <Music className="h-3 w-3 text-purple-500" />;
      default:
        return <Building className="h-3 w-3 text-gray-500" />;
    }
  };
  
  // Helper pro získání přeloženého názvu typu
  const getTypeName = (type: string) => {
    switch(type.toLowerCase()) {
      case 'office':
        return 'Kancelář';
      case 'kancelář':
        return 'Kancelář';
      case 'warehouse':
        return 'Sklad';
      case 'sklad':
        return 'Sklad';
      case 'culture':
        return 'Kultura';
      case 'kultura':
        return 'Kultura';
      default:
        return type;
    }
  };
  
  // Helper pro zjištění, zda je uživatel manažerem
  const getManagerName = (managerId: number | null | undefined) => {
    if (!managerId) return "Není nastaven";
    const manager = allUsers.find(u => u.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : "Neznámý manažer";
  };
  
  // Řadit uživatele podle počtu hodin
  const sortedUsersByHours = [...userStats].sort((a, b) => b.monthlyHours - a.monthlyHours);
  
  if (workplaceLoading || shiftsLoading || usersLoading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 md:ml-64 pb-16 md:pb-0">
          <Header title="Detail pracoviště" />
          <div className="py-6 px-4 sm:px-6 lg:px-8 flex justify-center items-center min-h-[60vh]">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-slate-600">Načítání dat pracoviště...</p>
            </div>
          </div>
          <MobileNavigation />
        </main>
      </div>
    );
  }
  
  if (workplaceError || !workplace) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 md:ml-64 pb-16 md:pb-0">
          <Header title="Detail pracoviště" />
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
              <h2 className="text-lg font-medium text-red-800">Pracoviště nenalezeno</h2>
              <p className="mt-2 text-sm text-red-600">
                Nepodařilo se načíst informace o pracovišti. Pracoviště buď neexistuje nebo došlo k chybě.
              </p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => navigate("/workplaces")}
              >
                Zpět na seznam pracovišť
              </Button>
            </div>
          </div>
          <MobileNavigation />
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        <Header title={`Detail pracoviště - ${workplace.name}`} />
        
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {/* Hlavička s informacemi o pracovišti */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{workplace.name}</h2>
                
                <div className="flex items-center gap-2">
                  {workplace.type && (
                    <Badge variant="outline" className="text-sm">
                      <span className="flex items-center">
                        {getTypeIcon(workplace.type)}
                        <span className="ml-1">{getTypeName(workplace.type)}</span>
                      </span>
                    </Badge>
                  )}
                  
                  {workplace.managerId && (
                    <Badge variant="outline" className="text-sm text-amber-700 bg-amber-50 hover:bg-amber-100">
                      <Crown className="h-3 w-3 mr-1 text-amber-500" />
                      <span>Správce</span>
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Detail a správa pracoviště
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate("/workplaces")} 
                className="inline-flex items-center"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Zpět na seznam
              </Button>
              
              {user?.role === "admin" && (
                <Button
                  onClick={() => setEditDialogOpen(true)}
                  className="inline-flex items-center"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Upravit pracoviště
                </Button>
              )}
            </div>
          </div>
          
          {/* Základní informace o pracovišti */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Základní informace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Adresa:</p>
                    <p className="text-sm text-slate-600">{workplace.address || "Není uvedena"}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Crown className="h-5 w-5 text-slate-400 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Vedoucí pracoviště:</p>
                    <p className="text-sm text-slate-600">{getManagerName(workplace.managerId)}</p>
                  </div>
                </div>
                {workplace.notes && (
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-slate-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Poznámky:</p>
                      <p className="text-sm text-slate-600">{workplace.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Odpracované hodiny
                </CardTitle>
                <CardDescription>
                  {format(selectedDate, 'LLLL yyyy', { locale: cs })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatDuration(totalMonthlyHours)}
                </div>
                <p className="text-sm text-gray-500 mt-1">Za vybrané období</p>
                <div className="mt-3 text-sm">
                  <span className="text-slate-600">Celkem všech hodin: </span>
                  <span className="font-medium">{formatDuration(totalAllHours)}</span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <Button size="sm" variant="outline" onClick={handlePreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCurrentMonth}>
                    Aktuální měsíc
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  TOP pracovníci měsíce
                </CardTitle>
                <CardDescription>
                  Nejvíce odpracovaných hodin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {top3Users.length > 0 ? (
                    top3Users.map((user, index) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs mr-2 ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-slate-400' : 
                            'bg-amber-700'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{user.firstName} {user.lastName}</span>
                        </div>
                        <span className="text-sm font-bold">
                          {formatDuration(user.monthlyHours)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-slate-500">
                      Žádní pracovníci nemají odpracované hodiny v tomto měsíci
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Hlavní obsah - záložky */}
          <Tabs defaultValue="workers" className="mb-8">
            <TabsList className="mb-4">
              <TabsTrigger value="workers" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Pracovníci
              </TabsTrigger>
              <TabsTrigger value="shifts" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Směny
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Statistiky
              </TabsTrigger>
            </TabsList>
            
            {/* Karta pracovníků */}
            <TabsContent value="workers">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Seznam pracovníků</CardTitle>
                    <CardDescription>
                      Pracovníci na pracovišti {workplace.name} a jejich odpracované hodiny
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {userStats.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jméno</TableHead>
                          <TableHead>Kontakt</TableHead>
                          <TableHead>Pozice</TableHead>
                          <TableHead>Celkem hodin</TableHead>
                          <TableHead>Tento měsíc</TableHead>
                          <TableHead>Akce</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedUsersByHours.map((userData) => (
                          <TableRow key={userData.id}>
                            <TableCell className="font-medium">
                              {userData.firstName} {userData.lastName}
                              {workplace.managerId === userData.id && (
                                <Badge variant="secondary" className="ml-2">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Vedoucí
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                {userData.email && (
                                  <div className="text-xs flex items-center">
                                    <Mail className="h-3 w-3 mr-1 text-slate-400" />
                                    <span>{userData.email}</span>
                                  </div>
                                )}
                                {userData.phone && (
                                  <div className="text-xs flex items-center mt-1">
                                    <Phone className="h-3 w-3 mr-1 text-slate-400" />
                                    <span>{userData.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {userData.position || <span className="text-slate-400">-</span>}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">{formatDuration(userData.totalHours)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">{formatDuration(userData.monthlyHours)}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUserId(userData.id);
                                    setHourlyWage(userData.hourlyWage || 150);
                                    setWageDialogOpen(true);
                                  }}
                                  title="Přepočet mzdy"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/workers/${userData.id}`)}
                                  title="Detail pracovníka"
                                >
                                  <UserIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Na tomto pracovišti zatím nepracují žádní pracovníci
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Karta směn */}
            <TabsContent value="shifts">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Seznam směn za období</CardTitle>
                      <CardDescription>
                        {format(selectedDate, 'LLLL yyyy', { locale: cs })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handlePreviousMonth}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Předchozí
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCurrentMonth}>
                        Aktuální
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleNextMonth}>
                        Další <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredShifts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Čas</TableHead>
                          <TableHead>Pracovník</TableHead>
                          <TableHead>Odpracováno</TableHead>
                          <TableHead>Poznámka</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShifts.map((shift) => {
                          const hours = shift.startTime && shift.endTime 
                            ? calculateDuration(shift.startTime, shift.endTime)
                            : 0;
                            
                          return (
                            <TableRow key={shift.id}>
                              <TableCell>
                                {shift.date 
                                  ? format(new Date(shift.date), 'dd.MM.yyyy', { locale: cs })
                                  : "Neznámé datum"}
                              </TableCell>
                              <TableCell>
                                {shift.startTime 
                                  ? format(new Date(shift.startTime), 'HH:mm', { locale: cs })
                                  : "??:??"} - 
                                {shift.endTime 
                                  ? format(new Date(shift.endTime), 'HH:mm', { locale: cs })
                                  : "??:??"}
                              </TableCell>
                              <TableCell>
                                {shift.user
                                  ? `${shift.user.firstName} ${shift.user.lastName}`
                                  : "Neobsazeno"}
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold">{formatDuration(hours)}</span>
                              </TableCell>
                              <TableCell>
                                {shift.notes || <span className="text-slate-400">-</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Celkem za období:</TableCell>
                          <TableCell className="font-bold">
                            {formatDuration(totalMonthlyHours)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      V tomto období nejsou žádné směny
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Karta statistik */}
            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistika odpracovaných hodin</CardTitle>
                    <CardDescription>
                      Celkové hodiny na pracovišti rozdělené podle pracovníků
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userStats.length > 0 ? (
                      <div className="space-y-4">
                        {userStats.sort((a, b) => b.totalHours - a.totalHours).map(userData => (
                          <div key={userData.id} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{userData.firstName} {userData.lastName}</span>
                              <span className="text-sm font-bold">{formatDuration(userData.totalHours)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div 
                                className="bg-primary rounded-full h-2" 
                                style={{ 
                                  width: `${Math.min(100, (userData.totalHours / (Math.max(...userStats.map(u => u.totalHours)) || 1)) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        Nejsou k dispozici žádná data pro statistiku
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Měsíční vytížení</CardTitle>
                    <CardDescription>
                      Odpracované hodiny v {format(selectedDate, 'LLLL yyyy', { locale: cs })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sortedUsersByHours.length > 0 ? (
                      <div className="space-y-4">
                        {sortedUsersByHours.filter(u => u.monthlyHours > 0).map(userData => (
                          <div key={userData.id} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{userData.firstName} {userData.lastName}</span>
                              <span className="text-sm font-bold">{formatDuration(userData.monthlyHours)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div 
                                className="bg-amber-500 rounded-full h-2" 
                                style={{ 
                                  width: `${Math.min(100, (userData.monthlyHours / (Math.max(...sortedUsersByHours.map(u => u.monthlyHours)) || 1)) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        V tomto měsíci nejsou žádné odpracované hodiny
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Dialog pro přepočet mzdy */}
        <Dialog open={wageDialogOpen} onOpenChange={setWageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přepočet mzdy</DialogTitle>
              <DialogDescription>
                Nastavte hodinovou sazbu a zobrazte výpočet mzdy pro pracovníka.
              </DialogDescription>
            </DialogHeader>
            
            {selectedUserId && (
              <div className="space-y-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Pracovník:</span>
                  <span>
                    {userStats.find(u => u.id === selectedUserId)?.firstName} 
                    {" "}
                    {userStats.find(u => u.id === selectedUserId)?.lastName}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Odpracované hodiny:</span>
                  <span className="font-bold">
                    {formatDuration(userStats.find(u => u.id === selectedUserId)?.monthlyHours || 0)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="hourlyWage">Hodinová sazba:</Label>
                    <span className="font-semibold">{hourlyWage} Kč/h</span>
                  </div>
                  <Slider
                    id="hourlyWage"
                    min={130}
                    max={200}
                    step={5}
                    value={[hourlyWage]}
                    onValueChange={(value) => setHourlyWage(value[0])}
                  />
                  <div className="flex justify-between text-xs text-slate-500 px-1">
                    <span>130 Kč</span>
                    <span>200 Kč</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Hrubá mzda:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency((userStats.find(u => u.id === selectedUserId)?.monthlyHours || 0) * hourlyWage)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setWageDialogOpen(false)}>
                Zavřít
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog pro editaci pracoviště */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upravit pracoviště</DialogTitle>
              <DialogDescription>
                Změňte údaje o pracovišti a nastavte vedoucího.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Název pracoviště</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Typ pracoviště</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Vyberte typ pracoviště" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">Sklad</SelectItem>
                    <SelectItem value="office">Kancelář</SelectItem>
                    <SelectItem value="event">Akce</SelectItem>
                    <SelectItem value="club">Klub</SelectItem>
                    <SelectItem value="other">Jiné</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Adresa</Label>
                <Input
                  id="address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manager">Vedoucí pracoviště</Label>
                <Select
                  value={editForm.managerId?.toString() || "none"}
                  onValueChange={(value) => setEditForm({ 
                    ...editForm, 
                    managerId: value !== "none" ? parseInt(value) : null 
                  })}
                >
                  <SelectTrigger id="manager">
                    <SelectValue placeholder="Vyberte vedoucího" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center">
                        <UserCircle className="h-4 w-4 mr-2 text-slate-400" />
                        <span>Žádný vedoucí</span>
                      </div>
                    </SelectItem>
                    {allUsers.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center">
                          <UserCircle className="h-4 w-4 mr-2" />
                          <span>{user.firstName} {user.lastName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Poznámky</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                Zrušit
              </Button>
              <Button 
                onClick={handleUpdateWorkplace}
                disabled={updateWorkplaceMutation.isPending}
              >
                {updateWorkplaceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládání...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Uložit změny
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog pro výpočet mzdy */}
        <Dialog open={wageDialogOpen} onOpenChange={setWageDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Výpočet mzdy</DialogTitle>
              <DialogDescription>
                Nastavte hodinovou sazbu a zobrazte si celkovou mzdu za odpracované hodiny.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {selectedUserId && (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hourlyWage" className="text-right">
                        Hodinová sazba: {hourlyWage} Kč/h
                      </Label>
                      <span className="text-sm text-primary font-medium">
                        {formatCurrency(hourlyWage)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">130 Kč</span>
                      <Slider
                        id="hourlyWage"
                        min={130}
                        max={200}
                        step={5}
                        value={[hourlyWage]}
                        onValueChange={(values) => setHourlyWage(values[0])}
                        className="flex-1"
                      />
                      <span className="text-sm">200 Kč</span>
                    </div>
                  </div>
                
                  <div className="border rounded-lg p-4 bg-slate-50">
                    <h4 className="text-sm font-medium mb-2">Mzdové výpočty:</h4>
                    <div className="space-y-2">
                      {userStats.filter(u => u.id === selectedUserId).map(userData => (
                        <div key={userData.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Tento měsíc ({formatDuration(userData.monthlyHours)}):</span>
                            <span className="font-semibold">
                              {formatCurrency(userData.monthlyHours * hourlyWage)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Celkem ({formatDuration(userData.totalHours)}):</span>
                            <span className="font-semibold">
                              {formatCurrency(userData.totalHours * hourlyWage)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWageDialogOpen(false)}>
                Zavřít
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <MobileNavigation />
      </main>
    </div>
  );
}