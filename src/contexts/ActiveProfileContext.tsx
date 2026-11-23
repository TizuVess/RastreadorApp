import { createContext, useContext, useState, type PropsWithChildren } from 'react';

type ActiveProfileContextValue = {
  activeProfileId: string | null;
  setActiveProfileId: (profileId: string | null) => void;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null);

export function ActiveProfileProvider({ children }: PropsWithChildren) {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  return (
    <ActiveProfileContext.Provider value={{ activeProfileId, setActiveProfileId }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const context = useContext(ActiveProfileContext);
  if (!context) {
    throw new Error('useActiveProfile debe usarse dentro de ActiveProfileProvider.');
  }
  return context;
}
