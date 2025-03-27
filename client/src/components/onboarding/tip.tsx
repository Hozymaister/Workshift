import { useEffect } from 'react';
import { useOnboarding, TipId } from "@/hooks/use-onboarding";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingTipProps {
  id: TipId;
  title: string;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onDismiss?: () => void;
  showNextButton?: boolean;
  nextButtonText?: string;
  onNext?: () => void;
}

const positionClasses = {
  top: "after:border-t-foreground/10 after:border-l-transparent after:border-r-transparent after:bottom-[-8px]",
  bottom: "after:border-b-foreground/10 after:border-l-transparent after:border-r-transparent after:top-[-8px]",
  left: "after:border-l-foreground/10 after:border-t-transparent after:border-b-transparent after:right-[-8px]",
  right: "after:border-r-foreground/10 after:border-t-transparent after:border-b-transparent after:left-[-8px]"
};

export function OnboardingTip({
  id,
  title,
  content,
  position = 'bottom',
  className,
  onDismiss,
  showNextButton = false,
  nextButtonText = "Další",
  onNext
}: OnboardingTipProps) {
  const { isTipSeen, markTipAsSeen, tipsEnabled } = useOnboarding();
  
  useEffect(() => {
    // Označíme tip jako viděný, ale pouze pokud tipy nejsou deaktivovány
    if (!isTipSeen(id) && tipsEnabled) {
      markTipAsSeen(id);
    }
  }, [id, isTipSeen, markTipAsSeen, tipsEnabled]);
  
  // Pokud uživatel vypnul tipy nebo již tento tip viděl, nic nezobrazujeme
  if (!tipsEnabled) {
    return null;
  }
  
  // Nastavení správného směru pro šipku podle pozice
  const afterClasses = positionClasses[position];
  const arrowPosition = 
    position === 'top' ? "after:left-1/2 after:translate-x-[-50%]" :
    position === 'bottom' ? "after:left-1/2 after:translate-x-[-50%]" :
    position === 'left' ? "after:top-1/2 after:translate-y-[-50%]" :
    "after:top-1/2 after:translate-y-[-50%]";
  
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };
  
  return (
    <Card 
      className={cn(
        "relative max-w-xs shadow-lg border border-foreground/10",
        "after:absolute after:content-[''] after:border-8",
        afterClasses,
        arrowPosition,
        className
      )}
    >
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5" 
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Zavřít</span>
        </Button>
      </CardHeader>
      <CardContent className="py-2 px-4 text-sm">
        {content}
      </CardContent>
      {showNextButton && (
        <CardFooter className="py-2 px-4 flex justify-end">
          <Button size="sm" onClick={onNext}>
            {nextButtonText}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}