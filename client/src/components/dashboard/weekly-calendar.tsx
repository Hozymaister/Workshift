import { useQuery } from "@tanstack/react-query";
import { Shift } from "@shared/schema";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { cs } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Clock, User, MapPin } from "lucide-react";

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

// Funkce pro získání stylových tříd pro různé typy směn
function getDayClass(type: string | undefined) {
  switch (type) {
    case "warehouse":
      return "bg-primary/90 text-white";
    case "event":
      return "bg-amber-500/90 text-white";
    case "club":
      return "bg-indigo-500/90 text-white";
    default:
      return "bg-slate-500/90 text-white";
  }
}

// Funkce pro získání ikony pro typ pracoviště
function getWorkplaceIcon(type: string | undefined) {
  switch (type) {
    case "warehouse":
      return <MapPin className="h-3.5 w-3.5" />;
    case "event":
      return <Clock className="h-3.5 w-3.5" />;
    case "club":
      return <MapPin className="h-3.5 w-3.5" />;
    default:
      return <MapPin className="h-3.5 w-3.5" />;
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
      isToday: isToday(date),
      shifts: shifts?.filter(shift => shift.date && isSameDay(new Date(shift.date), date)) || [],
    };
  });
  
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "??:??";
    try {
      return format(new Date(dateString), "HH:mm");
    } catch (e) {
      return "??:??";
    }
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return durationHours.toFixed(1) + " h";
    } catch (e) {
      return "? h";
    }
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
            <div 
              key={index} 
              className={cn(
                "flex-1 text-center py-2 border-r border-slate-200 last:border-r-0",
                day.isToday ? "bg-primary/5" : ""
              )}
            >
              <div className="text-sm font-medium text-slate-900">{day.dayName}</div>
              <div className="text-sm text-slate-500">
                {day.isToday ? (
                  <Badge variant="default" className="rounded-full px-2 py-0.5">
                    {day.dayNum}.{day.monthShort}
                  </Badge>
                ) : (
                  <span>{day.dayNum}.{day.monthShort}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 min-h-[250px]">
          {weekDays.map((day, dayIndex) => (
            <div 
              key={dayIndex} 
              className={cn(
                "border-r border-b border-slate-200 p-1.5 min-h-[140px]",
                dayIndex === 6 ? "border-r-0" : "",
                day.isToday ? "bg-primary/5" : ""
              )}
            >
              {day.shifts.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                  {day.isToday ? "Dnes nemáte směny" : "Žádné směny"}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {day.shifts.map((shift, shiftIndex) => (
                    <TooltipProvider key={shiftIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "rounded p-2 text-sm cursor-pointer transition-all",
                              getDayClass(shift.workplace?.type),
                              "hover:translate-y-[-2px] hover:shadow-md"
                            )}
                          >
                            <div className="font-medium flex items-center text-xs gap-1">
                              {getWorkplaceIcon(shift.workplace?.type)}
                              <span className="truncate max-w-[80px]">
                                {shift.workplace?.name || "Neznámý objekt"}
                              </span>
                            </div>
                            <div className="text-xs mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                              </span>
                            </div>
                            {shift.user && (
                              <div className="text-xs mt-1 flex items-center gap-1 max-w-full truncate">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {`${shift.user.firstName} ${shift.user.lastName.charAt(0)}.`}
                                </span>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-2 p-1">
                            <div className="font-medium">
                              {shift.workplace?.name || "Neznámý objekt"}
                            </div>
                            <div className="text-xs flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                <span className="ml-1 text-slate-400">
                                  ({shift.startTime && shift.endTime ? calculateDuration(shift.startTime, shift.endTime) : "? h"})
                                </span>
                              </span>
                            </div>
                            <div className="text-xs flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>
                                {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : "Neobsazeno"}
                              </span>
                            </div>
                            {shift.notes && (
                              <div className="text-xs flex items-start gap-2">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{shift.notes}</span>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
