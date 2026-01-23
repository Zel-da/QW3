import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TbmNavigationContextType {
  registerSafeNavigate: (fn: (to: string) => void) => void;
  unregisterSafeNavigate: () => void;
  safeNavigate: ((to: string) => void) | null;
  isTbmActive: boolean;
}

const TbmNavigationContext = createContext<TbmNavigationContextType | null>(null);

export function TbmNavigationProvider({ children }: { children: ReactNode }) {
  const [safeNavigate, setSafeNavigate] = useState<((to: string) => void) | null>(null);

  const registerSafeNavigate = useCallback((fn: (to: string) => void) => {
    setSafeNavigate(() => fn);
  }, []);

  const unregisterSafeNavigate = useCallback(() => {
    setSafeNavigate(null);
  }, []);

  return (
    <TbmNavigationContext.Provider value={{
      registerSafeNavigate,
      unregisterSafeNavigate,
      safeNavigate,
      isTbmActive: safeNavigate !== null,
    }}>
      {children}
    </TbmNavigationContext.Provider>
  );
}

export function useTbmNavigation() {
  const context = useContext(TbmNavigationContext);
  if (!context) {
    throw new Error('useTbmNavigation must be used within TbmNavigationProvider');
  }
  return context;
}
