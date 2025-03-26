import React, { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Workplace } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Building, Filter } from "lucide-react";

interface WorkplaceFilterProps {
  selectedWorkplaceId: number | null;
  onSelectWorkplace: (workplaceId: number | null) => void;
}

export function WorkplaceFilter({ selectedWorkplaceId, onSelectWorkplace }: WorkplaceFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const { data: workplaces = [] } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"],
  });

  // Kontrola přetečení pro zobrazení šipek
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      setShowRightArrow(scrollWidth > clientWidth);
    }
  }, [workplaces]);

  // Funkce pro scrollování
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 200;
    const currentScroll = scrollRef.current.scrollLeft;
    const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
    
    if (direction === "left") {
      scrollRef.current.scrollLeft = Math.max(0, currentScroll - scrollAmount);
    } else {
      scrollRef.current.scrollLeft = Math.min(maxScroll, currentScroll + scrollAmount);
    }
    
    // Update arrow visibility
    setShowLeftArrow(scrollRef.current.scrollLeft > 0);
    setShowRightArrow(scrollRef.current.scrollLeft < maxScroll);
  };

  // Funkce pro získání barvy pozadí podle typu pracoviště
  const getWorkplaceClass = (type: string | undefined) => {
    switch (type) {
      case "warehouse":
        return "bg-primary/90 hover:bg-primary/80";
      case "event":
        return "bg-amber-500/90 hover:bg-amber-500/80";
      case "club":
        return "bg-indigo-500/90 hover:bg-indigo-500/80";
      default:
        return "bg-slate-500/90 hover:bg-slate-500/80";
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Pokud není žádné pracoviště, nezobrazovat
  if (workplaces.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 mt-2 relative">
      <div className="flex items-center mb-2">
        <Building className="h-4 w-4 mr-2 text-slate-500" />
        <h4 className="text-sm font-medium text-slate-700">Filtrovat podle pracoviště</h4>
      </div>
      
      <div className="flex items-center">
        {showLeftArrow && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 z-10 h-8 w-8 rounded-full bg-white/80 shadow-sm border"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        
        <ScrollArea 
          ref={scrollRef} 
          className="whitespace-nowrap px-1 flex-1 overflow-x-auto scrollbar-hide"
          onScroll={handleScroll}
        >
          <div className="flex space-x-2 py-1 px-1">
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer transition-all px-3 py-1 text-white",
                selectedWorkplaceId === null ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              )}
              onClick={() => onSelectWorkplace(null)}
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Všechna pracoviště
            </Badge>

            {workplaces.map((workplace) => (
              <Badge
                key={workplace.id}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all px-3 py-1 text-white",
                  selectedWorkplaceId === workplace.id 
                    ? getWorkplaceClass(workplace.type)
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                )}
                onClick={() => onSelectWorkplace(workplace.id)}
              >
                {workplace.name}
              </Badge>
            ))}
          </div>
        </ScrollArea>
        
        {showRightArrow && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-0 z-10 h-8 w-8 rounded-full bg-white/80 shadow-sm border"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}