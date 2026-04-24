import { useMemo } from "react";
import type { StatusBarStyle } from "expo-status-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  darkColors,
  lightColors,
  NavigationDarkTheme,
  NavigationLightTheme,
} from "@/constants/theme";

export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return useMemo(() => {
    const statusBarStyle: StatusBarStyle = isDark ? "light" : "dark";

    return {
      isDark,
      colors: isDark ? darkColors : lightColors,
      navigationTheme: isDark ? NavigationDarkTheme : NavigationLightTheme,
      statusBarStyle,
    };
  }, [isDark]);
}