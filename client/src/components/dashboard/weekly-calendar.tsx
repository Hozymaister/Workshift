import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShiftWithRelations, Workplace } from "@shared/schema";
import { 
  format, 
  startOfWeek, 
  startOfMonth,
  endOfMonth,
  addDays, 
  addMonths,
  subMonths,
  isSameDay, 
  isToday,
  isWeekend,
  eachDayOfInterval,
  getDate,
} from "date-fns";
import { cs } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Info, Clock, User, MapPin, Calendar as CalendarIcon, 
  ArrowLeftRight, ChevronLeft, ChevronRight, Maximize 
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarModal } from "@/components/ui/calendar-modal";
import { WorkplaceFilter } from "@/components/ui/workplace-filter";
import { motion, AnimatePresence } from "framer-motion";

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
  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for filter by workplace
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<number | null>(null);
  
  // State for current view date
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State for view mode (week or month)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Compute date intervals based on viewMode
  const dateInterval = viewMode === 'week' 
    ? {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6)
      }
    : {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate)
      };
  
  const startDateStr = format(dateInterval.start, "yyyy-MM-dd");
  const endDateStr = format(dateInterval.end, "yyyy-MM-dd");
  
  // Fetch shifts based on date interval
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<ShiftWithRelations[]>({
    queryKey: ["/api/shifts", { startDate: startDateStr, endDate: endDateStr }],
  });
  
  // Fetch workplaces
  const { data: workplaces = [], isLoading: workplacesLoading } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"],
  });
  
  // Filter shifts by selected workplace
  const filteredShifts: ShiftWithRelations[] = selectedWorkplaceId
    ? shifts.filter(shift => shift.workplace?.id === selectedWorkplaceId)
    : shifts;

  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  
  // Generate days for the current view (week or month)
  const days = eachDayOfInterval({
    start: dateInterval.start,
    end: dateInterval.end
  }).map(date => {
    return {
      fullDate: date,
      dayName: format(date, "EEE", { locale: cs }).charAt(0).toUpperCase() + format(date, "EEE", { locale: cs }).slice(1),
      dayNum: format(date, "d"),
      monthShort: format(date, "LLL", { locale: cs }).substring(0, 3),
      isToday: isToday(date),
      isWeekend: isWeekend(date),
      shifts: filteredShifts.filter(shift => {
        const shiftDate = parseDate(shift.date);
        return shiftDate ? isSameDay(shiftDate, date) : false;
      }),
    };
  });
  
  // Calculate number of days in a row based on view mode
  const daysInRow = viewMode === 'week' ? 7 : 7;
  
  // Split days into rows
  const dayRows = Array.from({ length: Math.ceil(days.length / daysInRow) }).map((_, i) =>
    days.slice(i * daysInRow, (i + 1) * daysInRow)
  );
  
  // Format time helper
  const formatTime = (dateString?: string | null) => {
    const parsed = parseDate(dateString ?? undefined);
    if (!parsed) return "??:??";
    try {
      return format(parsed, "HH:mm");
    } catch (e) {
      return "??:??";
    }
  };

  // Calculate duration helper
  const calculateDuration = (startTime?: string | null, endTime?: string | null) => {
    const start = parseDate(startTime ?? undefined);
    const end = parseDate(endTime ?? undefined);
    if (!start || !end) return "? h";
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return "? h";
    }
    return durationHours.toFixed(1) + " h";
  };

  // Navigation handlers
  const handlePreviousPeriod = () => {
    setSelectedDate(viewMode === 'week' 
      ? addDays(selectedDate, -7) 
      : subMonths(selectedDate, 1)
    );
  };

  const handleNextPeriod = () => {
    setSelectedDate(viewMode === 'week' 
      ? addDays(selectedDate, 7) 
      : addMonths(selectedDate, 1)
    );
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'week' ? 'month' : 'week');
  };

  // Calendar grid content renderer
  const renderCalendarContent = useCallback((isModal: boolean = false) => {
    // Determine grid columns based on view mode and modal
    const gridCols = isModal 
      ? 'grid-cols-7'
      : viewMode === 'week' 
        ? 'grid-cols-7' 
        : 'grid-cols-7';
    
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${format(selectedDate, 'yyyy-MM')}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow rounded-lg overflow-hidden"
        >
          <div className={`flex ${isModal ? 'sticky top-0 z-10 bg-white' : ''} border-b border-slate-200`}>
            {dayRows[0]?.map((day, index) => (
              <div 
                key={`header-${index}`} 
                className={cn(
                  "flex-1 text-center py-2 border-r border-slate-200 last:border-r-0",
                  day.isToday ? "bg-primary/5" : "",
                  day.isWeekend ? "bg-slate-50" : ""
                )}
              >
                <div className="text-sm font-medium text-slate-900">{day.dayName}</div>
                <div className="text-sm text-slate-500">
                  {day.isToday ? (
                    <Badge variant="default" className="rounded-full px-2 py-0.5">
                      {day.dayNum}. {day.monthShort}
                    </Badge>
                  ) : (
                    <span>
                      {day.dayNum}. {day.monthShort}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className={`grid ${gridCols} ${isModal ? 'min-h-[600px]' : 'min-h-[250px]'}`}>
            {dayRows.map((row, rowIndex) => (
              // Používáme div místo React.Fragment
              <div key={`row-${rowIndex}`} className="contents">
                {row.map((day, dayIndex) => (
                  <motion.div 
                    key={`day-${rowIndex}-${dayIndex}`}
                    whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
                    className={cn(
                      "border-r border-b border-slate-200 p-1.5 min-h-[150px]",
                      dayIndex === daysInRow - 1 ? "border-r-0" : "",
                      day.isToday ? "bg-primary/5" : "",
                      day.isWeekend ? "bg-slate-50/50" : ""
                    )}
                  >
                    {day.shifts.length === 0 ? (
                      <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                        {day.isToday ? "Dnes nemáte směny" : "Žádné směny"}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {day.shifts.map((shift, shiftIndex) => (
                          <TooltipProvider key={`shift-${shiftIndex}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div 
                                  className={cn(
                                    "rounded p-2 text-sm cursor-pointer",
                                    getDayClass(shift.workplace?.type)
                                  )}
                                  whileHover={{ 
                                    y: -2,
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                                  }}
                                  whileTap={{ y: 0 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }, [viewMode, selectedDate, dayRows, daysInRow, filteredShifts]);

  if (shiftsLoading || workplacesLoading) {
    return (
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[350px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Filter by workplace */}
      <WorkplaceFilter 
        selectedWorkplaceId={selectedWorkplaceId}
        onSelectWorkplace={setSelectedWorkplaceId}
      />
      
      {/* Calendar header with controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-900">
          Přehled směn - {viewMode === 'week' ? 'týden' : 'měsíc'}{' '}
          <span className="text-primary">
            {format(
              viewMode === 'week'
                ? dateInterval.start
                : selectedDate,
              viewMode === 'week'
                ? "d. MMMM"
                : "LLLL yyyy",
              { locale: cs }
            )}
          </span>
        </h3>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={handlePreviousPeriod}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {viewMode === 'week' ? 'Předchozí' : 'Před.'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={handleToday}
          >
            Dnes
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={handleNextPeriod}
          >
            {viewMode === 'week' ? 'Následující' : 'Násl.'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={toggleViewMode}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            {viewMode === 'week' ? 'Měsíc' : 'Týden'}
          </Button>
        </div>
      </div>
      
      {/* Calendar grid with scroll area */}
      <div className="w-full overflow-x-auto">
        {renderCalendarContent()}
      </div>
      
      {/* Fullscreen button */}
      <div className="flex justify-center mt-4">
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className="w-full max-w-xs"
        >
          <Maximize className="h-4 w-4 mr-2" />
          Zobrazit na celou obrazovku
        </Button>
      </div>
      
      {/* Fullscreen modal */}
      <CalendarModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        shifts={filteredShifts}
        workplaces={workplaces}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedWorkplaceId={selectedWorkplaceId}
        renderCalendarContent={renderCalendarContent}
      />
    </div>
  );
}
