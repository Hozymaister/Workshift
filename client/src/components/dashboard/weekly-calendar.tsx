import { useQuery } from "@tanstack/react-query";
import { Shift } from "@shared/schema";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

function getDayClass(type: string | undefined) {
  switch (type) {
    case "warehouse":
      return "bg-primary text-white";
    case "event":
      return "bg-amber-500 text-white";
    case "club":
      return "bg-indigo-500 text-white";
    default:
      return "bg-slate-500 text-white";
  }
}

export function WeeklyCalendar() {
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Start from Monday
  
  const startDate = format(startOfCurrentWeek, "yyyy-MM-dd");
  const endDate = format(addDays(startOfCurrentWeek, 6), "yyyy-MM-dd");
  
  const { data: shifts, isLoading } = useQuery<ShiftWithDetails[]>({
    queryKey: ["/api/shifts", { startDate, endDate }],
  });
  
  // Generate array of days for the week
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(startOfCurrentWeek, i);
    return {
      fullDate: date,
      dayName: format(date, "EEE", { locale: cs }).charAt(0).toUpperCase() + format(date, "EEE", { locale: cs }).slice(1),
      dayNum: format(date, "d"),
      monthShort: format(date, "L") + ".",
      shifts: shifts?.filter(shift => isSameDay(new Date(shift.date), date)) || [],
    };
  });
  
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  if (isLoading) {
    return (
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[350px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium text-slate-900 mb-4">Přehled směn - aktuální týden</h3>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex border-b border-slate-200">
          {weekDays.map((day, index) => (
            <div key={index} className="flex-1 text-center py-3 border-r border-slate-200 last:border-r-0">
              <div className="text-sm font-medium text-slate-900">{day.dayName}</div>
              <div className="text-sm text-slate-500">{day.dayNum}.{day.monthShort}</div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 min-h-[250px]">
          {weekDays.map((day, dayIndex) => (
            <div 
              key={dayIndex} 
              className={cn(
                "border-r border-b border-slate-200 p-2 min-h-[120px]",
                dayIndex === 6 ? "border-r-0" : ""
              )}
            >
              {day.shifts.map((shift, shiftIndex) => (
                <div 
                  key={shiftIndex} 
                  className={cn(
                    "rounded p-2 text-sm cursor-pointer mb-2",
                    getDayClass(shift.workplace?.type),
                    "hover:opacity-90"
                  )}
                >
                  <div className="font-medium">{shift.workplace?.name || "Neznámý objekt"}</div>
                  <div className="text-xs mt-1">
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </div>
                  <div className="text-xs mt-1 flex items-center">
                    <span className="material-icons text-xs mr-1">person</span>
                    {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : "Neobsazeno"}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
