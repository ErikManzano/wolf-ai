import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import WolfAlertHost from '../components/WolfAlertHost';

export type WolfAlertTone = 'success' | 'error' | 'info' | 'warning';

export type WolfAlertItem = {
  id: string;
  tone: WolfAlertTone;
  title?: string;
  message: string;
};

export type PushWolfAlertInput = {
  tone: WolfAlertTone;
  title?: string;
  message: string;
  /** Auto-dismiss ms (default 4500). Set 0 to keep until dismissed. */
  durationMs?: number;
};

type WolfAlertContextValue = {
  pushAlert: (input: PushWolfAlertInput) => string;
  dismissAlert: (id: string) => void;
};

const WolfAlertContext = createContext<WolfAlertContextValue | null>(null);

export function WolfAlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<WolfAlertItem[]>([]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const pushAlert = useCallback(
    (input: PushWolfAlertInput): string => {
      const id = `wolf-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const item: WolfAlertItem = {
        id,
        tone: input.tone,
        title: input.title,
        message: input.message,
      };
      setAlerts((prev) => [...prev, item]);
      const duration = input.durationMs ?? 4500;
      if (duration > 0) {
        window.setTimeout(() => dismissAlert(id), duration);
      }
      return id;
    },
    [dismissAlert],
  );

  const value = useMemo(() => ({ pushAlert, dismissAlert }), [pushAlert, dismissAlert]);

  return (
    <WolfAlertContext.Provider value={value}>
      {children}
      <WolfAlertHost alerts={alerts} onDismiss={dismissAlert} />
    </WolfAlertContext.Provider>
  );
}

export function useWolfAlert(): WolfAlertContextValue {
  const ctx = useContext(WolfAlertContext);
  if (!ctx) throw new Error('useWolfAlert requires WolfAlertProvider');
  return ctx;
}
