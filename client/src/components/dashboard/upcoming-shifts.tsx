import { useQuery } from "@tanstack/react-query";
import { ShiftWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PencilIcon, RefreshCwIcon } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function getWorkplaceTypeColor(type: string | undefined) {
  switch (type) {
    case "warehouse":
      return "bg-primary";
    case "event":
      return "bg-amber-500";
    case "club":
      return "bg-indigo-500";
    default:
      return "bg-slate-500";
  }
}

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function UpcomingShifts() {
  const { data: shifts, isLoading } = useQuery<ShiftWithRelations[]>({
    queryKey: ["/api/shifts"],
  });

  const today = new Date();

  const upcomingShifts = (shifts ?? [])
    .map((shift) => ({ shift, date: parseDate(shift.date) }))
    .filter((entry): entry is { shift: ShiftWithRelations; date: Date } => {
      return entry.date !== null && entry.date.getTime() >= today.getTime();
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4)
    .map(entry => entry.shift);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg font-medium">Nadcházející směny</CardTitle>
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent className="pb-2">
          {[1, 2, 3, 4].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-medium">Nadcházející směny</CardTitle>
        <Link href="/shifts" className="text-sm font-medium text-primary hover:text-primary-dark">
          Zobrazit vše
        </Link>
      </CardHeader>
      <CardContent className="pb-2">
        <ul className="divide-y divide-slate-200">
          {upcomingShifts.length ? (
            upcomingShifts.map((shift) => {
              const shiftDate = parseDate(shift.date);
              const startDate = parseDate(shift.startTime) ?? shiftDate;
              const endDate = parseDate(shift.endTime);

              const dayName = shiftDate
                ? format(shiftDate, "EEEE", { locale: cs })
                : "Neznámý den";
              const displayDay = shiftDate
                ? format(shiftDate, "d.M.yyyy")
                : "Neznámé datum";

              const startTime = startDate ? format(startDate, "HH:mm") : "??:??";
              const endTime = endDate ? format(endDate, "HH:mm") : "??:??";

              return (
                <li key={shift.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={cn("w-2 h-10 rounded-full mr-4", getWorkplaceTypeColor(shift.workplace?.type))}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{shift.workplace?.name || "Neznámý objekt"}</p>
                        <p className="text-xs text-slate-500">
                          {dayName.charAt(0).toUpperCase() + dayName.slice(1)}, {displayDay} • {startTime} - {endTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary" title="Upravit směnu">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" title="Požádat o výměnu">
                        <RefreshCwIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="p-4 text-center text-slate-500">
              Nemáte žádné nadcházející směny
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
