import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Layout } from "@/components/layout/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
// Definice typů pro simulaci položek ze schématu
// Tyto typy budou užitečné, dokud nebude možné importovat reálné typy
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
import {
  Calendar,
  Clock,
  BarChart3,
  Building,
  Users,
  FileText,
  RefreshCw,
  Plus,
  Settings,
  Save,
  X
} from "lucide-react";

// Widget typy - pro každý widget v menu
enum WidgetType {
  UPCOMING_SHIFTS = "upcoming_shifts",
  EXCHANGE_REQUESTS = "exchange_requests",
  STATS = "stats",
  WEEKLY_CALENDAR = "weekly_calendar",
  WORKPLACE_STATS = "workplace_stats",
  WORKER_STATS = "worker_stats",
  INVOICE_STATS = "invoice_stats"
}

// Typy widgetů, které jsou dostupné v menu
const WIDGET_TYPES = [
  { id: WidgetType.UPCOMING_SHIFTS, name: "Nadcházející směny", icon: <Calendar className="mr-2 h-5 w-5" /> },
  { id: WidgetType.EXCHANGE_REQUESTS, name: "Požadavky na výměnu", icon: <RefreshCw className="mr-2 h-5 w-5" /> },
  { id: WidgetType.STATS, name: "Statistiky", icon: <BarChart3 className="mr-2 h-5 w-5" /> },
  { id: WidgetType.WEEKLY_CALENDAR, name: "Týdenní kalendář", icon: <Calendar className="mr-2 h-5 w-5" /> },
  { id: WidgetType.WORKPLACE_STATS, name: "Přehled pracovišť", icon: <Building className="mr-2 h-5 w-5" /> },
  { id: WidgetType.WORKER_STATS, name: "Přehled pracovníků", icon: <Users className="mr-2 h-5 w-5" /> },
  { id: WidgetType.INVOICE_STATS, name: "Faktury a finance", icon: <FileText className="mr-2 h-5 w-5" /> }
];

// Widget interface
interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

// Výchozí layout pro dashboard
const DEFAULT_LAYOUTS: Widget[] = [
  { id: "stats", type: WidgetType.STATS, x: 0, y: 0, w: 12, h: 1, minH: 1, maxH: 1 },
  { id: "upcoming_shifts", type: WidgetType.UPCOMING_SHIFTS, x: 0, y: 1, w: 6, h: 2 },
  { id: "exchange_requests", type: WidgetType.EXCHANGE_REQUESTS, x: 6, y: 1, w: 6, h: 2 },
  { id: "weekly_calendar", type: WidgetType.WEEKLY_CALENDAR, x: 0, y: 3, w: 12, h: 3 }
];

export default function CustomDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Layout state
  const [layouts, setLayouts] = useState<Widget[]>([]);
  const [availableWidgets, setAvailableWidgets] = useState<WidgetType[]>([]);
  const [isDraggingFromMenu, setIsDraggingFromMenu] = useState(false);
  const [draggedWidgetType, setDraggedWidgetType] = useState<WidgetType | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
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
      // Získáme pouze nadcházející směny (od dnešního dne)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return data
        .filter((shift) => new Date(shift.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5); // Pouze 5 nejbližších směn
    }
  });
  
  const { data: exchangeRequests } = useQuery<ExchangeRequest[]>({ 
    queryKey: ["/api/exchange-requests"] 
  });
  
  const { data: workplaces } = useQuery<Workplace[]>({ 
    queryKey: ["/api/workplaces"] 
  });
  
  // Load saved layout from localStorage on mount
  useEffect(() => {
    const savedLayouts = localStorage.getItem('dashboard-layouts');
    
    if (savedLayouts) {
      try {
        setLayouts(JSON.parse(savedLayouts));
      } catch (e) {
        console.error("Chyba při načítání uloženého layoutu:", e);
        setLayouts(DEFAULT_LAYOUTS);
      }
    } else {
      setLayouts(DEFAULT_LAYOUTS);
    }
    
    // Dostupné widgety pro menu jsou ty, které nejsou v layoutu
    updateAvailableWidgets(savedLayouts ? JSON.parse(savedLayouts) : DEFAULT_LAYOUTS);
  }, []);
  
  // Update available widgets list based on current layout
  const updateAvailableWidgets = (currentLayouts: Widget[]) => {
    const usedWidgetTypes = currentLayouts.map(widget => widget.type);
    const availableTypes = Object.values(WidgetType).filter(
      type => !usedWidgetTypes.includes(type)
    );
    setAvailableWidgets(availableTypes);
  };
  
  // Handle layout change
  const handleLayoutChange = (newLayout: any) => {
    const updatedWidgets = layouts.map((widget, i) => {
      const layoutItem = newLayout.find((item: any) => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        };
      }
      return widget;
    });
    
    setLayouts(updatedWidgets);
  };
  
  // Save current layout to localStorage
  const saveLayout = () => {
    localStorage.setItem('dashboard-layouts', JSON.stringify(layouts));
    toast({
      title: "Layout uložen",
      description: "Vaše nastavení dashboardu bylo úspěšně uloženo."
    });
  };
  
  // Reset to default layout
  const resetLayout = () => {
    setLayouts(DEFAULT_LAYOUTS);
    localStorage.setItem('dashboard-layouts', JSON.stringify(DEFAULT_LAYOUTS));
    updateAvailableWidgets(DEFAULT_LAYOUTS);
    toast({
      title: "Layout resetován",
      description: "Dashboard byl vrácen do výchozího nastavení."
    });
  };
  
  // Handle widget deletion
  const removeWidget = (widgetId: string) => {
    const widgetToRemove = layouts.find(w => w.id === widgetId);
    if (widgetToRemove) {
      const newLayouts = layouts.filter(w => w.id !== widgetId);
      setLayouts(newLayouts);
      
      // Přidání widgetu zpět do dostupných widgetů
      if (widgetToRemove.type) {
        setAvailableWidgets([...availableWidgets, widgetToRemove.type]);
      }
    }
  };
  
  // Handle drag start from menu
  const handleDragStart = (widgetType: WidgetType) => {
    setIsDraggingFromMenu(true);
    setDraggedWidgetType(widgetType);
  };
  
  // Handle drop from menu to dashboard
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (isDraggingFromMenu && draggedWidgetType) {
      // Vytvoření nového widgetu
      const newWidget: Widget = {
        id: `${draggedWidgetType}_${Date.now()}`,
        type: draggedWidgetType,
        x: 0,
        y: 0,
        w: 6,
        h: 2
      };
      
      // Přidání widgetu do layoutu
      const newLayouts = [...layouts, newWidget];
      setLayouts(newLayouts);
      
      // Odebrání widgetu z dostupných widgetů
      setAvailableWidgets(availableWidgets.filter(type => type !== draggedWidgetType));
      
      // Reset dragging state
      setIsDraggingFromMenu(false);
      setDraggedWidgetType(null);
    }
  };
  
  // Prevent default behavior for drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Render widget content based on type
  const renderWidgetContent = (widget: Widget) => {
    switch(widget.type) {
      case WidgetType.STATS:
        return (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                <p className="text-sm text-gray-500">Plánované hodiny</p>
              </div>
              <p className="text-2xl font-bold">{stats?.plannedHours || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-sm text-gray-500">Odpracováno</p>
              </div>
              <p className="text-2xl font-bold">{stats?.workedHours || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-purple-500 mr-2" />
                <p className="text-sm text-gray-500">Nadcházející směny</p>
              </div>
              <p className="text-2xl font-bold">{stats?.upcomingShifts || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <RefreshCw className="h-5 w-5 text-amber-500 mr-2" />
                <p className="text-sm text-gray-500">Žádosti o výměnu</p>
              </div>
              <p className="text-2xl font-bold">{stats?.exchangeRequests || 0}</p>
            </div>
          </div>
        );
      
      case WidgetType.UPCOMING_SHIFTS:
        return (
          <div className="space-y-3">
            {shifts && shifts.length > 0 ? (
              shifts.map((shift: any) => (
                <div key={shift.id} className="bg-white p-3 rounded-lg shadow flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{new Date(shift.date).toLocaleDateString('cs-CZ')}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {new Date(shift.startTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(shift.endTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Badge variant="outline">{shift.workplace?.name || 'Neznámé pracoviště'}</Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Nemáte žádné nadcházející směny</p>
              </div>
            )}
          </div>
        );
      
      case WidgetType.EXCHANGE_REQUESTS:
        return (
          <div className="space-y-3">
            {exchangeRequests && exchangeRequests.length > 0 ? (
              exchangeRequests.map((request: any) => (
                <div key={request.id} className="bg-white p-3 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <RefreshCw className="h-4 w-4 text-amber-600 mr-2" />
                      <p className="font-medium">Žádost o výměnu směny</p>
                    </div>
                    <Badge variant={request.status === 'pending' ? 'outline' : (request.status === 'approved' ? 'success' : 'destructive')}>
                      {request.status === 'pending' ? 'Čeká' : (request.status === 'approved' ? 'Schváleno' : 'Zamítnuto')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Požadovaná směna:</p>
                      <p>{request.requestShift ? new Date(request.requestShift.date).toLocaleDateString('cs-CZ') : 'Neznámé'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Nabízená směna:</p>
                      <p>{request.offeredShift ? new Date(request.offeredShift.date).toLocaleDateString('cs-CZ') : 'Neznámé'}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Žádné aktivní žádosti o výměnu</p>
              </div>
            )}
          </div>
        );
      
      case WidgetType.WEEKLY_CALENDAR:
        return (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="grid grid-cols-7 gap-1">
              {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day, index) => (
                <div key={index} className="text-center font-medium text-sm p-2">
                  {day}
                </div>
              ))}
              
              {/* Demo calendar cells - would be generated dynamically in real implementation */}
              {Array.from({ length: 35 }, (_, i) => {
                // Calculate if this cell has a shift (for demo purposes)
                const hasShift = i === 3 || i === 8 || i === 15 || i === 22;
                const isWeekend = i % 7 === 5 || i % 7 === 6;
                const isCurrentDay = i === 10;
                
                return (
                  <div 
                    key={i} 
                    className={`
                      border rounded-md p-1 min-h-[60px] text-xs
                      ${isWeekend ? 'bg-gray-50' : 'bg-white'}
                      ${isCurrentDay ? 'border-primary border-2' : 'border-gray-200'}
                    `}
                  >
                    <div className="text-right mb-1">{i + 1}</div>
                    {hasShift && (
                      <div className="bg-blue-100 text-blue-800 rounded px-1 py-0.5 mb-1">
                        9:00 - 17:00
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      
      case WidgetType.WORKPLACE_STATS:
        return (
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium mb-3">Přehled pracovišť</h3>
              {workplaces && workplaces.length > 0 ? (
                workplaces.slice(0, 5).map((workplace: any) => (
                  <div key={workplace.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-500 mr-2" />
                      <span>{workplace.name}</span>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {workplace.type}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">Žádná pracoviště k zobrazení</p>
              )}
            </div>
          </div>
        );
      
      case WidgetType.WORKER_STATS:
        return (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-3">Nejaktivnější pracovníci</h3>
            <div className="space-y-3">
              {/* Demo data */}
              {[
                { id: 1, name: "Jan Novák", hours: 42 },
                { id: 2, name: "Petr Svoboda", hours: 38 },
                { id: 3, name: "Marie Dvořáková", hours: 35 }
              ].map(worker => (
                <div key={worker.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-500 mr-2" />
                    <span>{worker.name}</span>
                  </div>
                  <div className="text-sm font-medium">{worker.hours} h</div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case WidgetType.INVOICE_STATS:
        return (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-3">Finanční přehled</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Příjmy (měsíc)</p>
                <p className="text-xl font-bold text-green-600">28 500 Kč</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Výdaje (měsíc)</p>
                <p className="text-xl font-bold text-red-600">12 300 Kč</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Zisk</span>
                <span className="font-medium text-green-600">16 200 Kč</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '58%' }}></div>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Widget není implementován</p>
          </div>
        );
    }
  };

  return (
    <Layout title="Dashboard">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Přizpůsobitelný dashboard</h1>
            <p className="text-gray-500">Přetáhněte si widgety a přizpůsobte si zobrazení</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Settings className="mr-2 h-4 w-4" />
              {isEditMode ? "Ukončit úpravy" : "Upravit dashboard"}
            </Button>
            
            {isEditMode && (
              <>
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={resetLayout}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button 
                  className="flex items-center"
                  onClick={saveLayout}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Uložit změny
                </Button>
              </>
            )}
          </div>
        </div>
        
        {isEditMode && (
          <>
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Dostupné widgety</CardTitle>
                <CardDescription>Přetáhněte widgety na pracovní plochu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {availableWidgets.map(widgetType => {
                    const widget = WIDGET_TYPES.find(w => w.id === widgetType);
                    if (!widget) return null;
                    
                    return (
                      <div
                        key={widget.id}
                        draggable
                        onDragStart={() => handleDragStart(widget.id as WidgetType)}
                        className="bg-white border rounded-md p-2 cursor-move flex items-center hover:border-primary"
                      >
                        {widget.icon}
                        <span>{widget.name}</span>
                      </div>
                    );
                  })}
                  
                  {availableWidgets.length === 0 && (
                    <p className="text-gray-500 py-2">Všechny widgety jsou již na ploše.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Separator className="mb-6" />
          </>
        )}
        
        {/* Dashboard grid */}
        <div 
          className={`bg-slate-50 p-4 rounded-lg min-h-[500px] ${isEditMode ? 'border-2 border-dashed border-blue-300' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <GridLayout
            className="layout"
            cols={12}
            rowHeight={100}
            width={1200}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            onLayoutChange={handleLayoutChange}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            layout={layouts.map(widget => ({ 
              i: widget.id, 
              x: widget.x, 
              y: widget.y, 
              w: widget.w, 
              h: widget.h,
              minW: widget.minW,
              minH: widget.minH,
              maxW: widget.maxW,
              maxH: widget.maxH
            }))}
          >
            {layouts.map(widget => (
              <div key={widget.id} className="bg-slate-100 rounded-lg overflow-hidden">
                <div className="p-4">
                  {isEditMode && (
                    <div className="flex justify-between items-center mb-2 bg-slate-200 p-2 rounded">
                      <span className="text-sm font-medium">
                        {WIDGET_TYPES.find(w => w.id === widget.type)?.name || "Widget"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-500 hover:text-red-500"
                        onClick={() => removeWidget(widget.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {renderWidgetContent(widget)}
                </div>
              </div>
            ))}
          </GridLayout>
          
          {layouts.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Plus className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">Přetáhněte sem widgety z menu</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}