import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type MobileTopBarBack = {
  label: string;
  onBack: () => void;
};

export type MobileTopBarConfig = {
  title?: string;
  back?: MobileTopBarBack | null;
  /** Optional row below the title (e.g. program select on athlete plan). */
  belowTitle?: ReactNode;
  /** Replaces the default title string (e.g. inline editable plan name). */
  titleContent?: ReactNode;
  /** Fixed strip directly under the mobile header (outside scroll containers). */
  pinnedBelowHeader?: ReactNode;
  /** Extra actions in the header row (e.g. program editor ⋮ menu). */
  headerActions?: ReactNode;
  /** Hide wolf brand icon when a custom back/title layout is used. */
  hideBrandIcon?: boolean;
  /** Disables edge-swipe sidebar when nested editor/detail is open. */
  lockEdgeSwipe?: boolean;
};

type MobileTopBarContextValue = {
  config: MobileTopBarConfig | null;
  setConfig: (config: MobileTopBarConfig | null) => void;
};

const MobileTopBarContext = createContext<MobileTopBarContextValue | null>(null);

export function MobileTopBarProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<MobileTopBarConfig | null>(null);
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return <MobileTopBarContext.Provider value={value}>{children}</MobileTopBarContext.Provider>;
}

export function useMobileTopBarContext() {
  const ctx = useContext(MobileTopBarContext);
  if (!ctx) {
    throw new Error('useMobileTopBarContext must be used within MobileTopBarProvider');
  }
  return ctx;
}

/** Register mobile top bar overrides while a nested view is mounted. Pass null to clear. */
export function useMobileTopBar(config: MobileTopBarConfig | null) {
  const { setConfig } = useMobileTopBarContext();

  useEffect(() => {
    setConfig(config);
    return () => setConfig(null);
  }, [config, setConfig]);
}
