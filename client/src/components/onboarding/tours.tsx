import React, { useState } from 'react';
import { OnboardingTip } from "./tip";
import { TipId } from "@/hooks/use-onboarding";

// Rozhraní pro krok túry
interface TourStep {
  id: TipId;
  title: string;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  selector?: string; // CSS selektor pro element, ke kterému se má tip připojit
}

// Typy túry
export type TourType = 
  | 'dashboard' 
  | 'shifts' 
  | 'exchanges' 
  | 'reports' 
  | 'workplaces'
  | 'workers'
  | 'invoice';

// Rozhraní pro vlastnosti túry
interface TourProps {
  tourType: TourType;
  onComplete?: () => void;
  initialStep?: number;
}

// Definice túr
const tours: Record<TourType, TourStep[]> = {
  dashboard: [
    {
      id: 'dashboard_overview',
      title: 'Vítejte na hlavním přehledu',
      content: (
        <div>
          <p>Toto je hlavní přehled, kde najdete nejdůležitější informace a statistiky.</p>
          <p className="mt-1">Najdete zde počet hodin, nadcházející směny a další klíčové informace.</p>
        </div>
      ),
      position: 'bottom'
    },
    {
      id: 'dashboard_stats',
      title: 'Statistiky',
      content: (
        <div>
          <p>V této sekci vidíte základní statistiky:</p>
          <ul className="list-disc pl-5 mt-1">
            <li>Plánované hodiny</li>
            <li>Odpracované hodiny</li>
            <li>Nadcházející směny</li>
            <li>Požadavky na výměnu směn</li>
          </ul>
        </div>
      ),
      position: 'bottom',
      selector: '.stats-card'
    },
    {
      id: 'dashboard_upcoming',
      title: 'Nadcházející směny',
      content: (
        <div>
          <p>Zde vidíte vaše nadcházející směny na nejbližší období.</p>
          <p className="mt-1">Můžete si prohlédnout detaily jako datum, čas a pracoviště.</p>
        </div>
      ),
      position: 'bottom',
      selector: '.upcoming-shifts'
    }
  ],
  shifts: [
    {
      id: 'shifts_management',
      title: 'Správa směn',
      content: (
        <div>
          <p>Na této stránce můžete spravovat všechny své směny.</p>
          <p className="mt-1">Můžete vytvářet nové směny, upravovat existující a žádat o výměny.</p>
        </div>
      ),
      position: 'bottom'
    },
    {
      id: 'shifts_calendar',
      title: 'Kalendář směn',
      content: (
        <div>
          <p>Kalendář vám zobrazuje všechny směny přehledně podle dnů.</p>
          <p className="mt-1">Můžete filtrovat směny podle pracovišť a časového období.</p>
        </div>
      ),
      position: 'bottom',
      selector: '.shifts-calendar'
    }
  ],
  exchanges: [
    {
      id: 'shift_exchange',
      title: 'Výměny směn',
      content: (
        <div>
          <p>Zde můžete žádat o výměnu směny s ostatními pracovníky.</p>
          <p className="mt-1">Vidíte také žádosti od ostatních, které čekají na vaše schválení.</p>
        </div>
      ),
      position: 'bottom'
    }
  ],
  reports: [
    {
      id: 'reports_overview',
      title: 'Výkazy práce',
      content: (
        <div>
          <p>Tato sekce vám umožňuje vytvářet a zobrazovat výkazy odpracovaných hodin.</p>
          <p className="mt-1">Můžete generovat výkazy za různá období a exportovat je do různých formátů.</p>
        </div>
      ),
      position: 'bottom'
    }
  ],
  workplaces: [
    {
      id: 'workplace_management',
      title: 'Správa pracovišť',
      content: (
        <div>
          <p>Zde můžete spravovat všechna pracoviště.</p>
          <p className="mt-1">Můžete přidávat nová pracoviště, upravovat existující a přiřazovat k nim pracovníky.</p>
        </div>
      ),
      position: 'bottom'
    }
  ],
  workers: [
    {
      id: 'worker_management',
      title: 'Správa pracovníků',
      content: (
        <div>
          <p>V této sekci můžete spravovat všechny pracovníky.</p>
          <p className="mt-1">Můžete přidávat nové pracovníky, upravovat jejich údaje a přiřazovat jim směny.</p>
        </div>
      ),
      position: 'bottom'
    }
  ],
  invoice: [
    {
      id: 'invoice_intro',
      title: 'Fakturace',
      content: (
        <div>
          <p>Zde můžete vytvářet a spravovat faktury.</p>
          <p className="mt-1">Sledujte vydané i přijaté faktury a exportujte je do PDF.</p>
        </div>
      ),
      position: 'bottom'
    }
  ]
};

export function Tour({ tourType, onComplete, initialStep = 0 }: TourProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const tourSteps = tours[tourType];
  
  // Pokud již neexistují další kroky, dokončíme túru
  if (currentStep >= tourSteps.length) {
    if (onComplete) onComplete();
    return null;
  }
  
  const currentTourStep = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  
  // Najdeme cílový element, pokud je specifikován
  let targetElement: HTMLElement | null = null;
  let targetRect: DOMRect | null = null;
  
  if (currentTourStep.selector) {
    targetElement = document.querySelector(currentTourStep.selector);
    if (targetElement) {
      targetRect = targetElement.getBoundingClientRect();
    }
  }
  
  // Pokračování na další krok
  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };
  
  // Dokončení túry
  const handleComplete = () => {
    if (onComplete) onComplete();
  };
  
  return (
    <div 
      className="relative" 
      style={{
        position: 'absolute',
        top: targetRect ? `${targetRect.top + window.scrollY + targetRect.height}px` : '120px',
        left: targetRect ? `${targetRect.left + window.scrollX + (targetRect.width / 2)}px` : '50%',
        transform: 'translateX(-50%)',
        zIndex: 100
      }}
    >
      <OnboardingTip
        id={currentTourStep.id}
        title={currentTourStep.title}
        content={currentTourStep.content}
        position={currentTourStep.position || 'bottom'}
        showNextButton={!isLastStep}
        nextButtonText="Další"
        onNext={handleNext}
        onDismiss={handleComplete}
      />
    </div>
  );
}