import { useMemo } from "react";
import type { StatusBarStyle } from "expo-status-bar";

import {
  darkColors,
  lightColors,
  NavigationDarkTheme,
  NavigationLightTheme,
} from "@/constants/theme";
import { useAppThemeMode } from "@/components/theme/AppThemeProvider";

export function useAppTheme() {
  const { themeMode, isDark, setThemeMode, toggleTheme } = useAppThemeMode();

  return useMemo(() => {
    const statusBarStyle: StatusBarStyle = isDark ? "light" : "dark";

    return {
      themeMode,
      isDark,
      setThemeMode,
      toggleTheme,
      colors: isDark ? darkColors : lightColors,
      navigationTheme: isDark ? NavigationDarkTheme : NavigationLightTheme,
      statusBarStyle,
    };
  }, [themeMode, isDark, setThemeMode, toggleTheme]);
}