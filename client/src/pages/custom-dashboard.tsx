import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/layout";
import { Link } from "wouter";
import {
  Calendar,
  Clock,
  BarChart3,
  Building,
  Users,
  FileText,
  RefreshCw,
  Plus,
  X,
  Home,
  Bell,
  FileBarChart,
  FileDigit,
  Scan,
  ShoppingCart,
  Briefcase,
  FileCheck,
  ClipboardList
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Importy z react-grid-layout
import { Responsive, WidthProvider } from 'react-grid-layout';
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Vytvoření responzivního grid layoutu s automatickou šířkou
const ResponsiveReactGridLayout = WidthProvider(Responsive);

// Typy dat
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

interface Workplace {
  id: number;
  name: string;
  type: string;
  address?: string;
}

interface ExchangeRequest {
  id: number;
  requesterId: number;
  requesteeId: number;
  requestShiftId: number;
  offeredShiftId: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  requestShift?: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    workplace?: {
      id: number;
      name: string;
    };
  };
  offeredShift?: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    workplace?: {
      id: number;
      name: string;
    };
  };
}

// Typy widgetů
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

export default function CustomDashboard() {
  // State pro sledování aktivních widgetů - defaultně prázdný dashboard
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [gridLayout, setGridLayout] = useState<LayoutItem[]>([]);
  
  // Get user info and role
  const { user } = useAuth();
  const isCompany = user?.role === "company" || user?.role === "admin";

  // Klíče pro localStorage
  const widgetsStorageKey = isCompany ? 'dashboard_widgets_company' : 'dashboard_widgets_worker';
  const layoutStorageKey = isCompany ? 'dashboard_layout_company' : 'dashboard_layout_worker';

  // Data fetching
  const { data: stats } = useQuery<{
    plannedHours: number;
    workedHours: number;
    upcomingShifts: number;
    exchangeRequests: number;
  }>({
    queryKey: ["/api/stats"]
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

  // Detekce mobilního zařízení s použitím useState pro reaktivitu
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  
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
      parsedWidgets = isCompany 
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
  }, [isCompany, widgetsStorageKey, layoutStorageKey, generateDefaultLayout]);

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
                <ShoppingCart className="h-4 w-4 mr-2 text-purple-600" />
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
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <ShoppingCart className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <p className="text-gray-500">Přehled zákazníků bude brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí seznam zákazníků a jejich aktivitu</p>
              </div>
            </CardContent>
          </Card>
        );
        
      case WidgetType.REPORTS_WIDGET:
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle">
              <CardTitle className="text-md font-medium flex items-center">
                <FileBarChart className="h-4 w-4 mr-2 text-blue-600" />
                Reporty a statistiky
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
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <FileBarChart className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-500">Reporty budou brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí podrobné reporty a analýzy</p>
              </div>
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
                <p className="text-gray-500">Přehled odpracovaných hodin bude brzy k dispozici</p>
                <p className="text-xs text-gray-400 mt-1">Zobrazí detailní rozpis odpracovaných hodin</p>
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
                <p className="text-xs text-gray-400 mt-1">Zobrazí detailní přehled směn s analýzou</p>
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
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Přidat směnu</span>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  <span>Výměna směny</span>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileDigit className="mr-2 h-4 w-4" />
                  <span>Nová faktura</span>
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span>Nový report</span>
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

  return (
    <Layout title="Vlastní dashboard">
      <div className="container py-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Můj dashboard</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Přidat widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Přidat widget na dashboard</DialogTitle>
              </DialogHeader>
              
              <div className="mt-4 space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Kategorie widgetů</label>
                  <Select defaultValue="overview">
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte kategorii" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Přehledové widgety</SelectItem>
                      <SelectItem value="work">Pracovní widgety</SelectItem>
                      <SelectItem value="admin">Administrativní widgety</SelectItem>
                      <SelectItem value="reports">Reporty</SelectItem>
                      <SelectItem value="other">Další widgety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Přehledové widgety</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {!activeWidgets.includes(WidgetType.STATS) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.STATS)}>
                        <BarChart3 className="mr-2 h-4 w-4 text-blue-600" />
                        <span>Přehled</span>
                      </Button>
                    )}
                    {!activeWidgets.includes(WidgetType.UPCOMING_SHIFTS) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.UPCOMING_SHIFTS)}>
                        <Calendar className="mr-2 h-4 w-4 text-indigo-600" />
                        <span>Nadcházející směny</span>
                      </Button>
                    )}
                    {!activeWidgets.includes(WidgetType.EXCHANGE_REQUESTS) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.EXCHANGE_REQUESTS)}>
                        <RefreshCw className="mr-2 h-4 w-4 text-amber-600" />
                        <span>Žádosti o výměnu</span>
                      </Button>
                    )}
                    {!activeWidgets.includes(WidgetType.WEEKLY_CALENDAR) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.WEEKLY_CALENDAR)}>
                        <Calendar className="mr-2 h-4 w-4 text-rose-600" />
                        <span>Týdenní kalendář</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                {isCompany && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Pracovní widgety</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {!activeWidgets.includes(WidgetType.WORKPLACE_STATS) && (
                        <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.WORKPLACE_STATS)}>
                          <Building className="mr-2 h-4 w-4 text-blue-600" />
                          <span>Pobočky</span>
                        </Button>
                      )}
                      {!activeWidgets.includes(WidgetType.WORKER_STATS) && (
                        <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.WORKER_STATS)}>
                          <Users className="mr-2 h-4 w-4 text-cyan-600" />
                          <span>Pracovníci</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {isCompany && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Administrativní widgety</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {!activeWidgets.includes(WidgetType.INVOICE_STATS) && (
                        <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.INVOICE_STATS)}>
                          <FileDigit className="mr-2 h-4 w-4 text-green-600" />
                          <span>Fakturace</span>
                        </Button>
                      )}
                      {!activeWidgets.includes(WidgetType.DOCUMENTS_STATS) && (
                        <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.DOCUMENTS_STATS)}>
                          <FileText className="mr-2 h-4 w-4 text-orange-500" />
                          <span>Dokumenty</span>
                        </Button>
                      )}
                      {!activeWidgets.includes(WidgetType.SCAN_WIDGET) && (
                        <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.SCAN_WIDGET)}>
                          <Scan className="mr-2 h-4 w-4 text-red-500" />
                          <span>Skenování</span>
                        </Button>
                      )}
                      {!activeWidgets.includes(WidgetType.CUSTOMERS_WIDGET) && (
                        <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.CUSTOMERS_WIDGET)}>
                          <ShoppingCart className="mr-2 h-4 w-4 text-purple-600" />
                          <span>Zákazníci</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="font-medium">Reporty</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {!activeWidgets.includes(WidgetType.REPORTS_WIDGET) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.REPORTS_WIDGET)}>
                        <FileBarChart className="mr-2 h-4 w-4 text-blue-600" />
                        <span>Reporty a statistiky</span>
                      </Button>
                    )}
                    {!activeWidgets.includes(WidgetType.HOURS_REPORTS) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.HOURS_REPORTS)}>
                        <Clock className="mr-2 h-4 w-4 text-teal-600" />
                        <span>Odpracované hodiny</span>
                      </Button>
                    )}
                    {!activeWidgets.includes(WidgetType.SHIFT_REPORTS) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.SHIFT_REPORTS)}>
                        <FileCheck className="mr-2 h-4 w-4 text-indigo-600" />
                        <span>Reporty směn</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Další widgety</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {!activeWidgets.includes(WidgetType.QUICK_ACTIONS) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.QUICK_ACTIONS)}>
                        <Briefcase className="mr-2 h-4 w-4 text-violet-600" />
                        <span>Rychlé akce</span>
                      </Button>
                    )}
                    {!activeWidgets.includes(WidgetType.NOTIFICATIONS) && (
                      <Button variant="outline" className="justify-start" onClick={() => addWidget(WidgetType.NOTIFICATIONS)}>
                        <Bell className="mr-2 h-4 w-4 text-yellow-600" />
                        <span>Oznámení</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Drag & Drop Dashboard s React Grid Layout */}
        {activeWidgets.length > 0 ? (
          <ResponsiveReactGridLayout
            className="layout"
            layouts={{ 
              lg: gridLayout.map(item => ({...item, minW: Math.min(item.minW || 1, item.w)})),
              md: gridLayout.map(item => ({...item, minW: Math.min(item.minW || 1, item.w)})),
              sm: gridLayout.map(item => ({...item, minW: Math.min(item.minW || 1, item.w)})),
              xs: gridLayout.map(item => ({...item, minW: 1, w: Math.max(item.w, 1)})),
              xxs: gridLayout.map(item => ({...item, minW: 1, w: Math.max(item.w, 1)}))
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 8, sm: 6, xs: 2, xxs: 2 }}
            rowHeight={30}
            containerPadding={[5, 5]}
            margin={[5, 10]} 
            onLayoutChange={(newLayout) => handleLayoutChange(newLayout)}
            draggableHandle=".drag-handle" 
            resizeHandles={['se']}
            autoSize={true}
            compactType="vertical"
            preventCollision={false}
            isBounded={true}
            useCSSTransforms={true}
            isResizable={!isMobile} // Vypnout změnu velikosti na mobilních zařízeních
            isDraggable={true}
          >
            {activeWidgets.map(widgetType => (
              <div key={widgetType} className="bg-white rounded-md shadow overflow-hidden">
                {renderWidgetContent(widgetType)}
              </div>
            ))}
          </ResponsiveReactGridLayout>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-600">Váš dashboard je prázdný</h3>
            <p className="text-gray-500 mb-4">Přidejte widgety pro přizpůsobení vašeho dashboardu</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Přidat widget
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}