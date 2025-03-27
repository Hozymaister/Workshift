import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Definujeme dostupné tipy
export type TipId = 
  | 'dashboard_overview'
  | 'custom_dashboard_intro'
  | 'shifts_management'
  | 'shift_exchange'
  | 'reports_overview'
  | 'workplace_management'
  | 'worker_management'
  | 'invoice_intro'
  | 'profile_settings'
  | 'dashboard_stats'
  | 'dashboard_upcoming'
  | 'shifts_calendar';

// Interface pro kontext
interface OnboardingContextType {
  // Zjištění, zda byl tip již zobrazen
  isTipSeen: (tipId: TipId) => boolean;
  // Označení tipu jako zobrazeného
  markTipAsSeen: (tipId: TipId) => void;
  // Reset všech tipů (pro testování)
  resetAllTips: () => void;
  // Zjištění, zda má uživatel zapnuté tipy
  tipsEnabled: boolean;
  // Přepnutí zobrazování tipů
  toggleTipsEnabled: () => void;
}

// Vytvoření kontextu s výchozími hodnotami
const OnboardingContext = createContext<OnboardingContextType>({
  isTipSeen: () => false,
  markTipAsSeen: () => {},
  resetAllTips: () => {},
  tipsEnabled: true,
  toggleTipsEnabled: () => {}
});

// Provider komponenta
export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Načteme seznam již zobrazených tipů z localStorage
  const [seenTips, setSeenTips] = useState<Record<TipId, boolean>>(
    () => {
      const storedTips = localStorage.getItem('onboarding_seen_tips');
      return storedTips ? JSON.parse(storedTips) : {};
    }
  );
  
  // Načteme, zda má uživatel zapnuté tipy
  const [tipsEnabled, setTipsEnabled] = useState<boolean>(
    () => {
      const storedSetting = localStorage.getItem('onboarding_tips_enabled');
      return storedSetting === null ? true : storedSetting === 'true';
    }
  );
  
  // Uložení změn do localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_seen_tips', JSON.stringify(seenTips));
  }, [seenTips]);
  
  useEffect(() => {
    localStorage.setItem('onboarding_tips_enabled', tipsEnabled.toString());
  }, [tipsEnabled]);
  
  const isTipSeen = (tipId: TipId): boolean => {
    return !!seenTips[tipId];
  };
  
  const markTipAsSeen = (tipId: TipId): void => {
    setSeenTips(prev => ({
      ...prev,
      [tipId]: true
    }));
  };
  
  const resetAllTips = (): void => {
    setSeenTips({} as Record<TipId, boolean>);
  };
  
  const toggleTipsEnabled = (): void => {
    setTipsEnabled(prev => !prev);
  };
  
  return (
    <OnboardingContext.Provider
      value={{
        isTipSeen,
        markTipAsSeen,
        resetAllTips,
        tipsEnabled,
        toggleTipsEnabled
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook pro použití v komponentách
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  
  return context;
}