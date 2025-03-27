import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/layout";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { UpcomingShifts } from "@/components/dashboard/upcoming-shifts";
import { ExchangeRequests } from "@/components/dashboard/exchange-requests";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ShiftForm } from "@/components/shifts/shift-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, CheckCircle, Calendar, RefreshCw, Plus, 
  Building2, User, X, BarChart3, Building, Users, 
  FileText, Bell, FileBarChart, FileDigit, Scan, 
  ShoppingCart, Briefcase, FileCheck, ClipboardList,
  Home
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingTip } from "@/components/onboarding/tip";
import { Tour } from "@/components/onboarding/tours";
import { Link } from "wouter";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
// Importy z react-grid-layout
import { Responsive, WidthProvider } from 'react-grid-layout';
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Vytvoření responzivního grid layoutu s automatickou šířkou
const ResponsiveReactGridLayout = WidthProvider(Responsive);

// Definice typů pro widgety
enum WidgetType {
  // Přehledové widgety
  STATS = "stats",
  UPCOMING_SHIFTS = "upcoming_shifts",
  EXCHANGE_REQUESTS = "exchange_requests",
  WEEKLY_CALENDAR = "weekly_calendar",
  
  // Pracovní widgety
  WORKPLACE_STATS = "workplace_stats",
  WORKER_STATS = "worker_stats",
  
  // Administrativní widgety
  INVOICE_STATS = "invoice_stats",
  DOCUMENTS_STATS = "documents_stats",
  SCAN_WIDGET = "scan_widget",
  
  // Zákaznické widgety
  CUSTOMERS_WIDGET = "customers_widget",
  
  // Reporty
  REPORTS_WIDGET = "reports_widget",
  HOURS_REPORTS = "hours_reports",
  SHIFT_REPORTS = "shift_reports",
  
  // Další widgety
  QUICK_ACTIONS = "quick_actions",
  NOTIFICATIONS = "notifications"
}

// Definice typu layoutu
interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  static?: boolean;
}

// Definice typu směny
interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  userId: number;
  workplaceId: number;
  notes?: string;
  workplace?: {
    id: number;
    name: string;
    type: string;
  };
}

// Definice typu požadavku na výměnu
interface ExchangeRequest {
  id: number;
  status: string;
  requestShift?: {
    id: number;
    date: string;
  };
  offeredShift?: {
    id: number;
    date: string;
  };
}

// Definice typu pracoviště
interface Workplace {
  id: number;
  name: string;
  type: string;
}

export default function DashboardPage() {
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const { user } = useAuth();
  const { isTipSeen } = useOnboarding();
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // State pro sledování aktivních widgetů a jejich layoutu
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([]);
  const [gridLayout, setGridLayout] = useState<LayoutItem[]>([]);
  
  // Detekce mobilního zařízení
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  interface DashboardStats {
    plannedHours: number;
    workedHours: number;
    upcomingShifts: number;
    exchangeRequests: number;
  }
  
  // Data fetching pro dashboard
  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });
  
  const { data: shifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
    select: (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return data
        .filter(shift => new Date(shift.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
    }
  });

  const { data: exchangeRequests } = useQuery<ExchangeRequest[]>({
    queryKey: ["/api/exchange-requests"]
  });

  const { data: workplaces } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"]
  });

  const isCompanyAccount = user?.role === "company" || user?.role === "admin";
  
  // Klíče pro localStorage
  const widgetsStorageKey = isCompanyAccount ? 'dashboard_widgets_company' : 'dashboard_widgets_worker';
  const layoutStorageKey = isCompanyAccount ? 'dashboard_layout_company' : 'dashboard_layout_worker';
  
  // Funkce pro generování výchozího layout nastavení pro widget
  const getDefaultWidgetLayout = (widgetType: WidgetType, index: number): LayoutItem => {
    // Výchozí velikosti jednotlivých widgetů pro desktop
    const desktopSizes: Record<WidgetType, { w: number, h: number }> = {
      [WidgetType.STATS]: { w: 12, h: 4 },
      [WidgetType.UPCOMING_SHIFTS]: { w: 6, h: 8 },
      [WidgetType.EXCHANGE_REQUESTS]: { w: 6, h: 8 },
      [WidgetType.WEEKLY_CALENDAR]: { w: 12, h: 8 },
      [WidgetType.WORKPLACE_STATS]: { w: 6, h: 8 },
      [WidgetType.WORKER_STATS]: { w: 6, h: 8 },
      [WidgetType.INVOICE_STATS]: { w: 6, h: 8 },
      [WidgetType.DOCUMENTS_STATS]: { w: 6, h: 8 },
      [WidgetType.SCAN_WIDGET]: { w: 6, h: 8 },
      [WidgetType.CUSTOMERS_WIDGET]: { w: 6, h: 8 },
      [WidgetType.REPORTS_WIDGET]: { w: 6, h: 8 },
      [WidgetType.HOURS_REPORTS]: { w: 6, h: 8 },
      [WidgetType.SHIFT_REPORTS]: { w: 6, h: 8 },
      [WidgetType.QUICK_ACTIONS]: { w: 6, h: 6 },
      [WidgetType.NOTIFICATIONS]: { w: 6, h: 6 }
    };
    
    // Výchozí velikosti jednotlivých widgetů pro mobilní zařízení
    // Na mobilním zařízení je pouze 2 sloupce, takže nastavíme vše na šířku 2
    const mobileSizes: Record<WidgetType, { w: number, h: number }> = {
      [WidgetType.STATS]: { w: 2, h: 6 },
      [WidgetType.UPCOMING_SHIFTS]: { w: 2, h: 8 },
      [WidgetType.EXCHANGE_REQUESTS]: { w: 2, h: 8 },
      [WidgetType.WEEKLY_CALENDAR]: { w: 2, h: 6 },
      [WidgetType.WORKPLACE_STATS]: { w: 2, h: 8 },
      [WidgetType.WORKER_STATS]: { w: 2, h: 8 },
      [WidgetType.INVOICE_STATS]: { w: 2, h: 8 },
      [WidgetType.DOCUMENTS_STATS]: { w: 2, h: 8 },
      [WidgetType.SCAN_WIDGET]: { w: 2, h: 8 },
      [WidgetType.CUSTOMERS_WIDGET]: { w: 2, h: 8 },
      [WidgetType.REPORTS_WIDGET]: { w: 2, h: 8 },
      [WidgetType.HOURS_REPORTS]: { w: 2, h: 8 },
      [WidgetType.SHIFT_REPORTS]: { w: 2, h: 8 },
      [WidgetType.QUICK_ACTIONS]: { w: 2, h: 6 },
      [WidgetType.NOTIFICATIONS]: { w: 2, h: 6 }
    };

    // Použijeme správné velikosti podle typu zařízení
    const widgetSizes = isMobile ? mobileSizes : desktopSizes;
    const size = widgetSizes[widgetType] || (isMobile ? { w: 2, h: 6 } : { w: 6, h: 6 });
    
    // Výpočet pozice na základě indexu - mobilní zobrazení pod sebou, desktop vedle sebe
    let x = 0;
    let y = 0;
    
    if (isMobile) {
      // Pro mobil všechny pod sebou
      x = 0;
      y = index * 6;
    } else {
      // Pro desktop sudé vlevo, liché vpravo
      x = index % 2 === 0 ? 0 : 6;
      y = Math.floor(index / 2) * 6;
    }
    
    // Pro mobilní zařízení používáme pevnou hodnotu minW=1 (nebo 2 pro celou šířku)
    // Nastavujeme minWidth na hodnotu nepřesahující aktuální šířku widgetu,
    // aby nevznikalo varování "minWidth larger than item width/maxWidth"
    const minWidth = isMobile ? Math.min(1, size.w) : Math.min(2, size.w);
    
    return {
      i: widgetType,
      x,
      y,
      w: size.w,
      h: size.h,
      minW: minWidth,
      minH: 2,
      isResizable: !isMobile // Vypnutí resize na mobilních zařízeních
    };
  };

  // Funkce pro generování výchozího layoutu - definovaná zde pro stabilní referenci
  const generateDefaultLayout = useCallback((widgets: WidgetType[]) => {
    return widgets.map((widget, index) => getDefaultWidgetLayout(widget, index));
  }, [isMobile]); // Přidána závislost na isMobile, aby došlo k přepočítání při změně typu zařízení

  // Načtení uložených widgetů a jejich layoutu z localStorage podle role uživatele
  useEffect(() => {
    // Načtení widgetů
    const savedWidgets = localStorage.getItem(widgetsStorageKey);
    let parsedWidgets: WidgetType[] = [];
    
    if (savedWidgets) {
      try {
        parsedWidgets = JSON.parse(savedWidgets) as WidgetType[];
        setActiveWidgets(parsedWidgets);
      } catch (e) {
        console.error('Chyba při načítání konfigurace dashboardu:', e);
      }
    } else {
      // Pokud nejsou žádné uložené widgety, nastavíme některé výchozí podle role
      parsedWidgets = isCompanyAccount 
        ? [WidgetType.STATS, WidgetType.WORKPLACE_STATS, WidgetType.WORKER_STATS] 
        : [WidgetType.STATS, WidgetType.UPCOMING_SHIFTS, WidgetType.WEEKLY_CALENDAR];
      
      setActiveWidgets(parsedWidgets);
    }
    
    // Načtení layoutu
    const savedLayout = localStorage.getItem(layoutStorageKey);
    if (savedLayout) {
      try {
        setGridLayout(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Chyba při načítání layoutu dashboardu:', e);
      }
    } else {
      // Pokud není uložený layout, vytvoříme výchozí layout pro widgety
      const defaultLayout = generateDefaultLayout(parsedWidgets);
      setGridLayout(defaultLayout);
    }
  }, [isCompanyAccount, widgetsStorageKey, layoutStorageKey, generateDefaultLayout]);

  // Uložení widgetů a jejich layoutu do localStorage při změně s rozlišením podle role
  useEffect(() => {
    if (activeWidgets.length === 0) return;
    
    localStorage.setItem(widgetsStorageKey, JSON.stringify(activeWidgets));
    localStorage.setItem(layoutStorageKey, JSON.stringify(gridLayout));
  }, [activeWidgets, gridLayout, widgetsStorageKey, layoutStorageKey]);

  // Přidání widgetu a jeho layoutu
  const addWidget = (widgetType: WidgetType) => {
    if (!activeWidgets.includes(widgetType)) {
      const newWidgets = [...activeWidgets, widgetType];
      setActiveWidgets(newWidgets);
      
      // Přidání nového layoutu pro widget
      const newLayout = [
        ...gridLayout,
        getDefaultWidgetLayout(widgetType, newWidgets.length - 1)
      ];
      setGridLayout(newLayout);
    }
    setIsDialogOpen(false);
  };

  // Odstranění widgetu a jeho layoutu
  const removeWidget = (widgetType: WidgetType) => {
    if (!widgetType) {
      console.error("Pokus o odstranění nedefinovaného widgetu");
      return;
    }
    
    console.log(`Odstraňuji widget: ${widgetType}`);
    
    // Bezpečná kontrola existence widgetu v poli před jeho odstraněním
    if (!activeWidgets.includes(widgetType)) {
      console.warn(`Widget ${widgetType} není aktivní, nelze odstranit`);
      return;
    }
    
    const newWidgets = activeWidgets.filter(w => w !== widgetType);
    const newLayout = gridLayout.filter((item: LayoutItem) => item.i !== widgetType);
    
    setActiveWidgets(newWidgets);
    setGridLayout(newLayout);
    
    // Okamžitě uložíme změny do localStorage pro jistotu
    try {
      localStorage.setItem(widgetsStorageKey, JSON.stringify(newWidgets));
      localStorage.setItem(layoutStorageKey, JSON.stringify(newLayout));
    } catch (error) {
      console.error("Chyba při ukládání do localStorage:", error);
    }
    
    // Pro debugging
    console.log(`Widget ${widgetType} odstraněn. Počet widgetů: ${newWidgets.length}`);
  };

  // Aktualizace layoutu při změně pozice nebo velikosti widgetu
  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    setGridLayout(newLayout);
  };
  
  // Přidání event listeneru pro změnu velikosti okna a přepočítání layoutu
  useEffect(() => {
    const handleResize = () => {
      const wasIsMobile = isMobile;
      const nowIsMobile = window.innerWidth <= 768;
      
      if (wasIsMobile !== nowIsMobile) {
        setIsMobile(nowIsMobile);
        
        // Pokud se změnil typ zařízení (desktop <-> mobil), přepočítáme layout
        if (activeWidgets.length > 0) {
          // Smažeme localStorage pro layout aby se vytvořil nový
          localStorage.removeItem(layoutStorageKey);
          
          // Počkáme na změnu stavu isMobile a pak přepočítáme layout
          setTimeout(() => {
            const newLayout = generateDefaultLayout(activeWidgets);
            setGridLayout(newLayout);
            // Uložíme nový layout do localStorage
            localStorage.setItem(layoutStorageKey, JSON.stringify(newLayout));
          }, 50);
        }
      }
    };
    
    // Spustíme kontrolu při načtení komponenty
    handleResize();
    
    // Přidáme event listener na resize okna
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile, activeWidgets, generateDefaultLayout, layoutStorageKey]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric' 
    }).format(date);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    return timeStr.substring(0, 5); // Vrátí jen HH:MM část
  };
  
  // Funkce pro odstranění widgetu s ošetřením propagace události
  const handleRemoveWidget = (e: React.MouseEvent<HTMLButtonElement>, widgetType: WidgetType) => {
    if (!e || !widgetType) {
      console.error("Neplatné parametry pro handleRemoveWidget");
      return;
    }
    
    e.stopPropagation(); // Zastavíme propagaci události, aby se nevyvolal onClick z rodiče
    
    // Pro debugging
    console.log(`handleRemoveWidget zavolán pro widget: ${widgetType}`);
    
    removeWidget(widgetType);
  };

  // Funkce pro vykreslení obsahu widgetu podle typu
  const renderWidgetContent = (widgetType: WidgetType) => {
    switch (widgetType) {
      case WidgetType.STATS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
                Přehled
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeWidget(WidgetType.STATS);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 font-medium">{stats?.plannedHours || 0}</div>
                  <div className="text-xs text-gray-500">Plánované hodiny</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 font-medium">{stats?.workedHours || 0}</div>
                  <div className="text-xs text-gray-500">Odpracované hodiny</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 font-medium">{stats?.upcomingShifts || 0}</div>
                  <div className="text-xs text-gray-500">Nadcházející směny</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-amber-600 font-medium">{stats?.exchangeRequests || 0}</div>
                  <div className="text-xs text-gray-500">Žádosti o výměnu</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        
      case WidgetType.UPCOMING_SHIFTS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-indigo-600" />
                Nadcházející směny
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeWidget(WidgetType.UPCOMING_SHIFTS);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {shifts && shifts.length > 0 ? (
                <div className="space-y-3">
                  {shifts.map(shift => (
                    <div key={shift.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{formatDate(shift.date)}</div>
                        <div className="text-sm text-gray-500">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={`${
                            shift.workplace?.type === 'warehouse' ? 'bg-blue-100 text-blue-800' : 
                            shift.workplace?.type === 'office' ? 'bg-green-100 text-green-800' : 
                            shift.workplace?.type === 'shop' ? 'bg-purple-100 text-purple-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {shift.workplace?.name || "Neznámé místo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Nemáte žádné nadcházející směny
                </div>
              )}
            </CardContent>
          </Card>
        );
      
      case WidgetType.EXCHANGE_REQUESTS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 text-amber-600" />
                Žádosti o výměnu
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.EXCHANGE_REQUESTS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {exchangeRequests && exchangeRequests.length > 0 ? (
                <div className="space-y-3">
                  {exchangeRequests.map(request => (
                    <div key={request.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div>
                        <div className="font-medium">Výměna směny</div>
                        <div className="text-sm text-gray-500">
                          {request.requestShift ? formatDate(request.requestShift.date) : "N/A"}
                          &nbsp;↔&nbsp;
                          {request.offeredShift ? formatDate(request.offeredShift.date) : "N/A"}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={`${
                            request.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                            request.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {request.status === 'pending' ? 'Čeká' : 
                           request.status === 'approved' ? 'Schváleno' : 
                           'Zamítnuto'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Nemáte žádné žádosti o výměnu
                </div>
              )}
            </CardContent>
          </Card>
        );
        
      case WidgetType.WEEKLY_CALENDAR:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-rose-600" />
                Týdenní kalendář
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.WEEKLY_CALENDAR)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <Calendar className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                <p className="text-gray-500">Přehled směn v týdnu již brzo</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí rozložení směn v celém týdnu</p>
              </div>
            </CardContent>
          </Card>
        );
        
      case WidgetType.WORKPLACE_STATS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Building className="h-4 w-4 mr-2 text-blue-600" />
                Pobočky
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.WORKPLACE_STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {workplaces && workplaces.length > 0 ? (
                <div className="space-y-3">
                  {workplaces.map(workplace => (
                    <div key={workplace.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div className="font-medium">{workplace.name}</div>
                      <Badge 
                        className={`${
                          workplace.type === 'warehouse' ? 'bg-blue-100 text-blue-800' : 
                          workplace.type === 'office' ? 'bg-green-100 text-green-800' : 
                          workplace.type === 'shop' ? 'bg-purple-100 text-purple-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {workplace.type === 'warehouse' ? 'Sklad' : 
                         workplace.type === 'office' ? 'Kancelář' : 
                         workplace.type === 'shop' ? 'Prodejna' : 
                         workplace.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Nemáte žádné pobočky
                </div>
              )}
            </CardContent>
          </Card>
        );
        
      case WidgetType.WORKER_STATS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Users className="h-4 w-4 mr-2 text-cyan-600" />
                Pracovníci
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.WORKER_STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <Users className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-gray-500">Statistika pracovníků bude brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí přehled nejaktivnějších pracovníků</p>
              </div>
            </CardContent>
          </Card>
        );

      case WidgetType.INVOICE_STATS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <FileDigit className="h-4 w-4 mr-2 text-green-600" />
                Fakturace
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.INVOICE_STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-1 md:p-3">
              <Link 
                href="/invoice" 
                className="flex flex-col justify-center items-center w-full h-full p-3 md:p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 min-h-[80px]"
              >
                <FileDigit className="h-8 w-8 text-green-500 mb-2" />
                <Button variant="outline" className="w-full mt-2 mb-1">
                  <span className="text-center w-full">Přejít na fakturaci</span>
                </Button>
                <p className="text-xs text-gray-400 mt-1 text-center">Správa faktur</p>
              </Link>
            </CardContent>
          </Card>
        );
        
      case WidgetType.DOCUMENTS_STATS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2 text-orange-500" />
                Dokumenty
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.DOCUMENTS_STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <FileText className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                <p className="text-gray-500">Přehled dokumentů bude brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí poslední nahrané dokumenty</p>
              </div>
            </CardContent>
          </Card>
        );
        
      case WidgetType.SCAN_WIDGET:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Scan className="h-4 w-4 mr-2 text-red-500" />
                Skenování
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.SCAN_WIDGET)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-1 md:p-3">
              <Link 
                href="/scan" 
                className="flex flex-col justify-center items-center w-full h-full p-3 md:p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 min-h-[80px]"
              >
                <Scan className="h-8 w-8 text-red-500 mb-2" />
                <Button variant="outline" className="w-full mt-2 mb-1">
                  <span className="text-center w-full">Spustit skenování</span>
                </Button>
                <p className="text-xs text-gray-400 mt-1 text-center">Skenování a nahrávání</p>
              </Link>
            </CardContent>
          </Card>
        );
        
      case WidgetType.CUSTOMERS_WIDGET:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2 text-violet-600" />
                Zákazníci
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.CUSTOMERS_WIDGET)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-1 md:p-3">
              <Link 
                href="/customers" 
                className="flex flex-col justify-center items-center w-full h-full p-3 md:p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 min-h-[80px]"
              >
                <ShoppingCart className="h-8 w-8 text-violet-500 mb-2" />
                <Button variant="outline" className="w-full mt-2 mb-1">
                  <span className="text-center w-full">Spravovat zákazníky</span>
                </Button>
                <p className="text-xs text-gray-400 mt-1 text-center">Evidence zákazníků</p>
              </Link>
            </CardContent>
          </Card>
        );
        
      case WidgetType.REPORTS_WIDGET:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <FileBarChart className="h-4 w-4 mr-2 text-blue-600" />
                Reporty
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.REPORTS_WIDGET)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-1 md:p-3">
              <Link 
                href="/reports" 
                className="flex flex-col justify-center items-center w-full h-full p-3 md:p-5 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 min-h-[80px]"
              >
                <FileBarChart className="h-8 w-8 text-blue-500 mb-2" />
                <Button variant="outline" className="w-full mt-2 mb-1">
                  <span className="text-center w-full">Zobrazit reporty</span>
                </Button>
                <p className="text-xs text-gray-400 mt-1 text-center">Výkonnostní reporty</p>
              </Link>
            </CardContent>
          </Card>
        );
        
      case WidgetType.HOURS_REPORTS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2 text-teal-600" />
                Odpracované hodiny
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.HOURS_REPORTS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <Clock className="h-8 w-8 text-teal-400 mx-auto mb-2" />
                <p className="text-gray-500">Statistika hodin bude brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí detailní přehled odpracovaných hodin</p>
              </div>
            </CardContent>
          </Card>
        );
        
      case WidgetType.SHIFT_REPORTS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <FileCheck className="h-4 w-4 mr-2 text-indigo-600" />
                Reporty směn
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.SHIFT_REPORTS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <FileCheck className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-gray-500">Reporty směn budou brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí detailní statistiky a reporty směn</p>
              </div>
            </CardContent>
          </Card>
        );
        
      case WidgetType.QUICK_ACTIONS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-violet-600" />
                Rychlé akce
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.QUICK_ACTIONS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Nová směna
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Výměna směny
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Tabulka směn
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <FileDigit className="mr-2 h-4 w-4" />
                  Nová faktura
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        
      case WidgetType.NOTIFICATIONS:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <Bell className="h-4 w-4 mr-2 text-yellow-600" />
                Oznámení
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={(e) => handleRemoveWidget(e, WidgetType.NOTIFICATIONS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <Bell className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-gray-500">Oznámení budou brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí důležité zprávy a upozornění</p>
              </div>
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };
  
  // Spustíme túru při první návštěvě
  useEffect(() => {
    if (!isTipSeen('dashboard_overview')) {
      setShowDashboardTour(true);
    }
  }, [isTipSeen]);

  return (
    <Layout title="Dashboard">
      {/* Dashboard Tour */}
      {showDashboardTour && (
        <Tour 
          tourType="dashboard" 
          onComplete={() => setShowDashboardTour(false)}
        />
      )}
      
      {/* Header s informacemi */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
            {isCompanyAccount ? (
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                <Building2 className="h-3 w-3 mr-1" />
                Firemní účet
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                <User className="h-3 w-3 mr-1" />
                Pracovník
              </Badge>
            )}
          </div>
          
          {isCompanyAccount ? (
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium">{user?.companyName}</span> - Přehled směn a aktivit
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium">{user?.firstName} {user?.lastName}</span> - Přehled vašich směn a aktivit
            </p>
          )}
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="inline-flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Přidat widget
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Přidat widget</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <div className="mb-4">
                  <label className="text-sm font-medium">Vyberte typ widgetu:</label>
                  <Select 
                    onValueChange={(value) => addWidget(value as WidgetType)}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Vyberte widget" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value={WidgetType.STATS}>Přehled statistik</SelectItem>
                      <SelectItem value={WidgetType.UPCOMING_SHIFTS}>Nadcházející směny</SelectItem>
                      <SelectItem value={WidgetType.EXCHANGE_REQUESTS}>Žádosti o výměnu</SelectItem>
                      <SelectItem value={WidgetType.WEEKLY_CALENDAR}>Týdenní kalendář</SelectItem>
                      
                      {isCompanyAccount && (
                        <>
                          <SelectItem value={WidgetType.WORKPLACE_STATS}>Pobočky</SelectItem>
                          <SelectItem value={WidgetType.WORKER_STATS}>Pracovníci</SelectItem>
                          <SelectItem value={WidgetType.INVOICE_STATS}>Fakturace</SelectItem>
                          <SelectItem value={WidgetType.DOCUMENTS_STATS}>Dokumenty</SelectItem>
                          <SelectItem value={WidgetType.SCAN_WIDGET}>Skenování</SelectItem>
                          <SelectItem value={WidgetType.CUSTOMERS_WIDGET}>Zákazníci</SelectItem>
                          <SelectItem value={WidgetType.REPORTS_WIDGET}>Reporty</SelectItem>
                        </>
                      )}
                      
                      <SelectItem value={WidgetType.HOURS_REPORTS}>Odpracované hodiny</SelectItem>
                      <SelectItem value={WidgetType.SHIFT_REPORTS}>Reporty směn</SelectItem>
                      <SelectItem value={WidgetType.QUICK_ACTIONS}>Rychlé akce</SelectItem>
                      <SelectItem value={WidgetType.NOTIFICATIONS}>Oznámení</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={() => setIsShiftFormOpen(true)} className="inline-flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Nová směna
          </Button>
        </div>
      </div>
      
      {/* Grid Layout pro widgety */}
      <div className="mb-8">
        <ResponsiveReactGridLayout
          className="layout"
          layouts={{ lg: gridLayout, md: gridLayout, sm: gridLayout }}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 12, sm: 2 }}
          rowHeight={50}
          isDraggable={true}
          isResizable={true}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle" // Nastavení třidy pro drag rukojeť (headery karet)
          margin={[16, 16]} // [horizontal, vertical]
        >
          {activeWidgets.map((widgetType) => (
            <div key={widgetType} className="overflow-hidden">
              {renderWidgetContent(widgetType)}
            </div>
          ))}
        </ResponsiveReactGridLayout>
        
        {/* Informace o prázdném dashboardu a možnosti přidat widget */}
        {activeWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-sm border border-gray-200">
            <Home className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Dashboard je prázdný</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">
              Přidejte si widgety, které vám pomohou s přehledem vašich směn a aktivit.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Přidat první widget
            </Button>
          </div>
        )}
      </div>
      
      <ShiftForm
        open={isShiftFormOpen}
        onClose={() => setIsShiftFormOpen(false)}
      />
    </Layout>
  );
}
