import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShiftWithRelations, Workplace } from "@shared/schema";
import { ChevronLeft, ChevronRight, X, Download, Clock, UserIcon, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  isToday,
  isWeekend,
  getDay,
  addDays
} from "date-fns";
import { cs } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDuration, calculateDuration } from "@/lib/utils";

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ShiftWithRelations[];
  workplaces: Workplace[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedWorkplaceId: number | null;
  renderCalendarContent: (isModal: boolean) => React.ReactNode;
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

export function CalendarModal({
  open,
  onOpenChange,
  shifts,
  workplaces,
  selectedDate,
  setSelectedDate,
  selectedWorkplaceId
}: CalendarModalProps) {
  // Nastavíme měsíční pohled pro modál
  const [viewDate, setViewDate] = useState(selectedDate);
  
  // Když se otevře modál, nastavíme počáteční datum na aktuální výběr
  useEffect(() => {
    if (open) {
      setViewDate(selectedDate);
    }
  }, [open, selectedDate]);

  const handlePreviousMonth = () => {
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNextMonth = () => {
    setViewDate(addMonths(viewDate, 1));
  };

  const handleToday = () => {
    setViewDate(new Date());
  };

  // Formátování času
  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatTime = (dateString?: string | null) => {
    const parsed = parseDate(dateString);
    if (!parsed) return "??:??";
    try {
      return format(parsed, "HH:mm");
    } catch (e) {
      return "??:??";
    }
  };

  // Příprava dat pro kalendarní mřížku v měsíčním režimu
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  
  // Upravíme začátek mřížky tak, aby začínal prvním dnem v týdnu (pondělí)
  const calendarStart = getDay(monthStart) === 0 
    ? addDays(monthStart, -6) // Neděle (0) -> přesunout 6 dní zpět na pondělí
    : addDays(monthStart, getDay(monthStart) === 1 ? 0 : -(getDay(monthStart) - 1)); // Jiné dny
  
  // Vytvoříme potřebný počet týdnů pro zobrazení celého měsíce
  const weeksNeeded = Math.ceil((getDay(monthStart) + monthEnd.getDate()) / 7);
  
  // Konec kalendáře je začátek + potřebný počet dnů
  const calendarEnd = addDays(calendarStart, (weeksNeeded * 7) - 1);
  
  // Vygenerujeme pole dnů pro kalendář
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(date => {
    const isCurrentMonth = date.getMonth() === viewDate.getMonth();
    return {
      fullDate: date,
      dayNum: format(date, "d"),
      isToday: isToday(date),
      isWeekend: isWeekend(date),
      isCurrentMonth,
      shifts: shifts.filter(shift => {
        const shiftDate = parseDate(shift.date);
        return shiftDate ? isSameDay(shiftDate, date) : false;
      }),
    };
  });

  // Rozdělení dnů do týdnů pro mřížku
  const weeks = Array.from({ length: weeksNeeded }).map((_, weekIndex) => 
    days.slice(weekIndex * 7, (weekIndex + 1) * 7)
  );

  // Názvy dnů v týdnu
  const weekDays = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] max-h-[95vh] flex flex-col p-1 sm:p-6">
        <DialogHeader className="flex flex-row items-center justify-between p-2 sm:p-0">
          <DialogTitle className="text-xl font-bold">
            Kalendář směn - {format(viewDate, "LLLL yyyy", { locale: cs })}
          </DialogTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday}>
              Dnes
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-md mt-2">
          {/* Excel-like tabulka */}
          <table className="w-full border-collapse table-fixed">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                {weekDays.map((day, index) => (
                  <th 
                    key={index} 
                    className={cn(
                      "border text-center py-2 px-1 text-sm font-medium",
                      index >= 5 ? "bg-slate-200" : ""
                    )}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex} className="h-28">
                  {week.map((day, dayIndex) => (
                    <td 
                      key={dayIndex} 
                      className={cn(
                        "border p-1 relative align-top",
                        !day.isCurrentMonth ? "bg-slate-50 text-slate-400" : "",
                        day.isToday ? "bg-primary/5" : "",
                        day.isWeekend ? "bg-slate-50/80" : ""
                      )}
                    >
                      <div className="absolute top-1 left-1 font-semibold text-sm">
                        {day.isToday ? (
                          <Badge variant="default" className="rounded-full px-1.5">
                            {day.dayNum}
                          </Badge>
                        ) : (
                          <span className={day.isCurrentMonth ? "text-slate-700" : "text-slate-400"}>
                            {day.dayNum}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-5 space-y-1 max-h-24 overflow-y-auto">
                        {day.shifts.length === 0 ? (
                          <div className="h-5"></div>
                        ) : (
                          day.shifts.map((shift, shiftIndex) => (
                            <TooltipProvider key={shiftIndex}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <motion.div 
                                    className={cn(
                                      "rounded px-1 py-0.5 text-xs cursor-pointer",
                                      getDayClass(shift.workplace?.type)
                                    )}
                                    whileHover={{ 
                                      y: -1,
                                      boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.1)"
                                    }}
                                  >
                                    <div className="flex items-center gap-1 max-w-full truncate">
                                      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                                      <span className="truncate">
                                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 max-w-full truncate">
                                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                                      <span className="truncate">
                                        {shift.workplace?.name}
                                      </span>
                                    </div>
                                  </motion.div>
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
                                          ({shift.startTime && shift.endTime ? 
                                            formatDuration(calculateDuration(shift.startTime, shift.endTime)) : "0h 0m"})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="text-xs flex items-center gap-2">
                                      <UserIcon className="h-4 w-4" />
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
                          ))
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}