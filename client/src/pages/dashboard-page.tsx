import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { UpcomingShifts } from "@/components/dashboard/upcoming-shifts";
import { ExchangeRequests } from "@/components/dashboard/exchange-requests";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ShiftForm } from "@/components/shifts/shift-form";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, Calendar, RefreshCw, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  
  interface DashboardStats {
    plannedHours: number;
    workedHours: number;
    upcomingShifts: number;
    exchangeRequests: number;
  }
  
  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  return (
    <Layout title="Dashboard">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Přehled vašich směn a aktivit</p>
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
