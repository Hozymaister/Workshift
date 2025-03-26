import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shift, Workplace } from "@shared/schema";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: Shift[];
  workplaces: Workplace[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedWorkplaceId: number | null;
  renderCalendarContent: (isModal: boolean) => React.ReactNode;
}

export function CalendarModal({
  open,
  onOpenChange,
  selectedDate,
  setSelectedDate,
  renderCalendarContent
}: CalendarModalProps) {
  const handlePreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">
            Kalendář směn - {format(selectedDate, "LLLL yyyy", { locale: cs })}
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
        
        <ScrollArea className="flex-1 overflow-auto">
          {renderCalendarContent(true)}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}