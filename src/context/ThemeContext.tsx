import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type WolfTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'wolf_theme_v2';

type ThemeContextValue = {
  theme: WolfTheme;
  setTheme: (theme: WolfTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function resolveThemePreference(stored: string | null | undefined): WolfTheme {
  return stored === 'dark' ? 'dark' : 'light';
}

function readInitialTheme(): WolfTheme {
  if (typeof document !== 'undefined') {
    const applied = document.documentElement.dataset.theme;
    if (applied === 'dark' || applied === 'light') return applied;
  }
  if (typeof localStorage !== 'undefined') {
    return resolveThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  }
  return 'light';
}

function applyTheme(theme: WolfTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#f5f5f4' : '#0a0c10');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<WolfTheme>(readInitialTheme);

  const setTheme = useCallback((next: WolfTheme) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [setTheme, theme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export { THEME_STORAGE_KEY };
