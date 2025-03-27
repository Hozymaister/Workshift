import { useOnboarding } from "@/hooks/use-onboarding";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Info, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";

export function OnboardingSettings() {
  const { tipsEnabled, toggleTipsEnabled, resetAllTips } = useOnboarding();

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-medium">Nastavení průvodce</h3>
      
      <div className="flex items-center justify-between py-3 border-b">
        <div className="space-y-0.5">
          <Label htmlFor="tips-toggle" className="text-base">Zobrazovat tipy</Label>
          <div className="text-sm text-muted-foreground">
            Povolí zobrazování kontextových nápověd v aplikaci
          </div>
        </div>
        <Switch
          id="tips-toggle"
          checked={tipsEnabled}
          onCheckedChange={toggleTipsEnabled}
        />
      </div>
      
      <div className="flex items-center justify-between py-3 border-b">
        <div className="space-y-0.5">
          <div className="text-base font-medium">Resetovat tipy</div>
          <div className="text-sm text-muted-foreground">
            Znovu zobrazí všechny nápovědy, které jste již viděli
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={resetAllTips}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Resetovat</span>
        </Button>
      </div>
      
      <div className="mt-6 flex items-start gap-2 p-3 border rounded-md bg-blue-50 text-blue-800">
        <Info className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p>Průvodce vám pomůže se lépe orientovat v aplikaci a porozumět všem funkcím. Tipy se zobrazují automaticky na odpovídajících stránkách.</p>
        </div>
      </div>
    </div>
  );
}