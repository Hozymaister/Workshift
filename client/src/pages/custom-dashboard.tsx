import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Home
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

enum WidgetType {
  STATS = "stats",
  UPCOMING_SHIFTS = "upcoming_shifts",
  EXCHANGE_REQUESTS = "exchange_requests",
  WEEKLY_CALENDAR = "weekly_calendar",
  WORKPLACE_STATS = "workplace_stats",
  WORKER_STATS = "worker_stats",
  INVOICE_STATS = "invoice_stats"
}

export default function CustomDashboard() {
  // State pro sledování aktivních widgetů
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([
    WidgetType.STATS,
    WidgetType.UPCOMING_SHIFTS,
    WidgetType.EXCHANGE_REQUESTS
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  // Načtení uložených widgetů z localStorage
  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboard_widgets');
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets) as WidgetType[];
        setActiveWidgets(parsedWidgets);
      } catch (e) {
        console.error('Chyba při načítání konfigurace dashboardu:', e);
      }
    }
  }, []);

  // Uložení widgetů do localStorage při změně
  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(activeWidgets));
  }, [activeWidgets]);

  const addWidget = (widgetType: WidgetType) => {
    if (!activeWidgets.includes(widgetType)) {
      setActiveWidgets([...activeWidgets, widgetType]);
    }
    setIsDialogOpen(false);
  };

  const removeWidget = (widgetType: WidgetType) => {
    setActiveWidgets(activeWidgets.filter(w => w !== widgetType));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString('cs-CZ');
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "??:??";
    try {
      return timeStr.substring(0, 5); // Předpokládáme formát "HH:MM"
    } catch (e) {
      return timeStr;
    }
  };

  // Rendering jednotlivých widgetů
  const renderWidgetContent = (widgetType: WidgetType) => {
    switch (widgetType) {
      case WidgetType.STATS:
        return (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium">Přehled</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => removeWidget(WidgetType.STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            </CardContent>
          </Card>
        );

      case WidgetType.UPCOMING_SHIFTS:
        return (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Nadcházející směny
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => removeWidget(WidgetType.UPCOMING_SHIFTS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shifts && shifts.length > 0 ? (
                  shifts.map((shift) => (
                    <div key={shift.id} className="bg-white p-3 rounded-lg shadow flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{formatDate(shift.date)}</p>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-500">
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
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
            </CardContent>
          </Card>
        );

      case WidgetType.EXCHANGE_REQUESTS:
        return (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                Žádosti o výměnu směn
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => removeWidget(WidgetType.EXCHANGE_REQUESTS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exchangeRequests && exchangeRequests.length > 0 ? (
                  exchangeRequests.map((request) => (
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
                          <p>{request.requestShift ? formatDate(request.requestShift.date) : 'Neznámé'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Nabízená směna:</p>
                          <p>{request.offeredShift ? formatDate(request.offeredShift.date) : 'Neznámé'}</p>
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
            </CardContent>
          </Card>
        );

      case WidgetType.WEEKLY_CALENDAR:
        return (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Týdenní kalendář
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => removeWidget(WidgetType.WEEKLY_CALENDAR)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-7 gap-1">
                  {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day, index) => (
                    <div key={index} className="text-center font-medium text-sm p-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Týdenní kalendář - ukázkový */}
                  {Array.from({ length: 7 }, (_, i) => {
                    // Současný den v týdnu (0 = neděle, 1 = pondělí, ...)
                    const today = new Date();
                    const currentDay = (today.getDay() || 7) - 1; // převádíme na 0 = pondělí, ... 6 = neděle
                    
                    // Vypočítáme datum pro konkrétní den v týdnu
                    const dayDate = new Date(today);
                    dayDate.setDate(today.getDate() - currentDay + i);
                    
                    // Zjistíme, jestli máme na tento den směnu (zjednodušený demo výpočet)
                    const hasShift = shifts?.some(shift => new Date(shift.date).toDateString() === dayDate.toDateString());
                    const isCurrentDay = i === currentDay;
                    
                    return (
                      <div 
                        key={i} 
                        className={`
                          border rounded-md p-1 min-h-[80px] text-xs
                          ${i > 4 ? 'bg-gray-50' : 'bg-white'}
                          ${isCurrentDay ? 'border-primary border-2' : 'border-gray-200'}
                        `}
                      >
                        <div className="text-right mb-1">{dayDate.getDate()}</div>
                        {hasShift && (
                          <div className="bg-blue-100 text-blue-800 rounded px-1 py-0.5 mb-1">
                            Směna
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case WidgetType.WORKPLACE_STATS:
        return (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Přehled pracovišť
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => removeWidget(WidgetType.WORKPLACE_STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workplaces && workplaces.length > 0 ? (
                  workplaces.slice(0, 5).map((workplace) => (
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
            </CardContent>
          </Card>
        );

      case WidgetType.WORKER_STATS:
        return (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Nejaktivnější pracovníci
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => removeWidget(WidgetType.WORKER_STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Statistika bude brzy k dispozici</p>
              </div>
            </CardContent>
          </Card>
        );

      case WidgetType.INVOICE_STATS:
        return (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Přehled fakturace
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => removeWidget(WidgetType.INVOICE_STATS)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Statistika bude brzy k dispozici</p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // Seznam dostupných widgetů pro dialog
  const availableWidgets = Object.values(WidgetType).filter(widget => !activeWidgets.includes(widget));

  // Widget options for select
  const widgetOptions = [
    { type: WidgetType.STATS, label: "Základní statistiky", icon: <BarChart3 className="mr-2 h-4 w-4" /> },
    { type: WidgetType.UPCOMING_SHIFTS, label: "Nadcházející směny", icon: <Calendar className="mr-2 h-4 w-4" /> },
    { type: WidgetType.EXCHANGE_REQUESTS, label: "Žádosti o výměnu", icon: <RefreshCw className="mr-2 h-4 w-4" /> },
    { type: WidgetType.WEEKLY_CALENDAR, label: "Týdenní kalendář", icon: <Calendar className="mr-2 h-4 w-4" /> },
    { type: WidgetType.WORKPLACE_STATS, label: "Přehled pracovišť", icon: <Building className="mr-2 h-4 w-4" /> },
    { type: WidgetType.WORKER_STATS, label: "Nejaktivnější pracovníci", icon: <Users className="mr-2 h-4 w-4" /> },
    { type: WidgetType.INVOICE_STATS, label: "Přehled fakturace", icon: <FileText className="mr-2 h-4 w-4" /> },
  ];

  return (
    <Layout title="Vlastní dashboard">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Přizpůsobitelný dashboard</h1>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Přidat widget
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Přidat nový widget</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-500 mb-4">
                  Vyberte widget, který chcete přidat na váš dashboard:
                </p>
                <div className="space-y-2">
                  {availableWidgets.length > 0 ? (
                    availableWidgets.map((widgetType) => {
                      const widgetInfo = widgetOptions.find(w => w.type === widgetType);
                      return (
                        <Button 
                          key={widgetType} 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => addWidget(widgetType)}
                        >
                          {widgetInfo?.icon}
                          <span>{widgetInfo?.label || widgetType}</span>
                        </Button>
                      );
                    })
                  ) : (
                    <p className="text-center py-4 text-sm text-gray-500">
                      Všechny dostupné widgety jsou již na dashboardu
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Pokud není vybrán žádný widget, zobrazíme prázdný stav */}
        {activeWidgets.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Prázdný dashboard</h3>
            <p className="text-gray-500 mb-6">Přidejte si widgety pro přizpůsobení vašeho dashboardu</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Přidat první widget
            </Button>
          </div>
        ) : (
          // Zobrazíme aktivní widgety
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeWidgets.map((widgetType) => (
              <div key={widgetType}>
                {renderWidgetContent(widgetType)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}