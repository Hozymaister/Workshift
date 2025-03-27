import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { UpcomingShifts } from "@/components/dashboard/upcoming-shifts";
import { ExchangeRequests } from "@/components/dashboard/exchange-requests";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ShiftForm } from "@/components/shifts/shift-form";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, Calendar, RefreshCw, Plus, Building2, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const { user } = useAuth();
  
  interface DashboardStats {
    plannedHours: number;
    workedHours: number;
    upcomingShifts: number;
    exchangeRequests: number;
  }
  
  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const isCompanyAccount = user?.role === "company";

  return (
    <Layout title="Dashboard">
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
          <Button onClick={() => setIsShiftFormOpen(true)} className="inline-flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Nová směna
          </Button>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading ? (
          <>
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
          </>
        ) : (
          <>
            <StatsCard
              title="Plánované hodiny (tento měsíc)"
              value={stats?.plannedHours || 0}
              unit="h"
              icon={<Clock className="h-5 w-5 text-white" />}
              change={{ value: 8, type: "increase" }}
              iconBgClass="bg-blue-500"
            />
            
            <StatsCard
              title="Odpracované hodiny"
              value={stats?.workedHours || 0}
              icon={<CheckCircle className="h-5 w-5 text-white" />}
              iconBgClass="bg-indigo-500"
              secondaryText={`z ${stats?.plannedHours || 0}`}
            />
            
            <StatsCard
              title="Nadcházející směny"
              value={stats?.upcomingShifts || 0}
              icon={<Calendar className="h-5 w-5 text-white" />}
              iconBgClass="bg-amber-500"
              secondaryText="příštích 14 dní"
            />
            
            <StatsCard
              title="Žádosti o výměnu"
              value={stats?.exchangeRequests || 0}
              icon={<RefreshCw className="h-5 w-5 text-white" />}
              iconBgClass="bg-red-500"
              secondaryText="ke schválení"
            />
          </>
        )}
      </div>
      
      {/* Weekly Calendar */}
      <WeeklyCalendar />
      
      {/* Upcoming Shifts & Exchange Requests */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UpcomingShifts />
        <ExchangeRequests />
      </div>
      
      <ShiftForm
        open={isShiftFormOpen}
        onClose={() => setIsShiftFormOpen(false)}
      />
    </Layout>
  );
}
