import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  unit?: string;
  icon: React.ReactNode;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
  };
  iconBgClass: string;
  secondaryText?: string;
}

export function StatsCard({
  title,
  value,
  unit,
  icon,
  change,
  iconBgClass,
  secondaryText,
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgClass)}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-slate-900">
                  {value}
                  {unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
                </div>
                
                {change && (
                  <div className={cn(
                    "ml-2 flex items-baseline text-sm font-semibold",
                    change.type === "increase" ? "text-green-600" : 
                    change.type === "decrease" ? "text-red-600" : 
                    "text-slate-600"
                  )}>
                    {change.type === "increase" && <ArrowUpIcon className="h-4 w-4 mr-1" />}
                    {change.type === "decrease" && <ArrowUpIcon className="h-4 w-4 mr-1 rotate-180" />}
                    {change.value}%
                  </div>
                )}
                
                {secondaryText && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-slate-600">
                    <span>{secondaryText}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
