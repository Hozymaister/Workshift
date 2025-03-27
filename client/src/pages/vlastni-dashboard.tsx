import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  BarChart3,
  Building,
  Users,
  FileText,
  RefreshCw
} from "lucide-react";

// Typy dat
interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  userId: number;
  workplaceId: number;
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
}

interface ExchangeRequest {
  id: number;
  requesterId: number;
  requesteeId: number;
  requestShiftId: number;
  offeredShiftId: number;
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

export default function VlastniDashboard() {
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
      return new Date(timeStr).toLocaleTimeString('cs-CZ', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <Layout title="Vlastní dashboard">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Vlastní dashboard</h1>
        
        {/* Statistiky */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Přehled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Nadcházející směny */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Nadcházející směny
              </CardTitle>
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
          
          {/* Žádosti o výměnu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Žádosti o výměnu směn
              </CardTitle>
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
        </div>
        
        {/* Týdenní kalendář a přehled pracovišť */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Týdenní kalendář
              </CardTitle>
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
                  {Array.from({ length: 35 }, (_, i) => {
                    // Ukázkový výpočet pro demo
                    const hasShift = i === 3 || i === 8 || i === 15 || i === 22;
                    const isWeekend = i % 7 === 5 || i % 7 === 6;
                    const isCurrentDay = i === 10;
                    
                    return (
                      <div 
                        key={i} 
                        className={`
                          border rounded-md p-1 min-h-[40px] text-xs
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
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Přehled pracovišť
              </CardTitle>
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
        </div>
      </div>
    </Layout>
  );
}