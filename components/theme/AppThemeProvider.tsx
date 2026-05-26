import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Uniwind } from "uniwind";

export type AppThemeMode = "light" | "dark";

type AppThemeContextValue = {
  themeMode: AppThemeMode;
  isDark: boolean;
  setThemeMode: (mode: AppThemeMode) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  /**
   * Default app opening mode.
   * App will always start in light mode.
   */
  const [themeMode, setThemeModeState] = useState<AppThemeMode>("light");

  const setThemeMode = useCallback((mode: AppThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    /**
     * Important for HeroUI Native / Uniwind className colours.
     * This updates bg-background, text-foreground, bg-surface, etc.
     */
    Uniwind.setTheme(themeMode);
  }, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark: themeMode === "dark",
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, setThemeMode, toggleTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppThemeMode() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppThemeMode must be used inside AppThemeProvider");
  }

  return context;
}