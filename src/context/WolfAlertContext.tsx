import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
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
  const dismissTimerRef = useRef<number | null>(null);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      if (!prev.some((a) => a.id === id)) return prev;
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      return [];
    });
  }, []);

  const pushAlert = useCallback(
    (input: PushWolfAlertInput): string => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      const id = `wolf-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const item: WolfAlertItem = {
        id,
        tone: input.tone,
        title: input.title,
        message: input.message,
      };
      setAlerts([item]);
      const duration = input.durationMs ?? 4500;
      if (duration > 0) {
        dismissTimerRef.current = window.setTimeout(() => {
          dismissTimerRef.current = null;
          dismissAlert(id);
        }, duration);
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
