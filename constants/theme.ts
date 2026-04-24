import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";

export const lightColors = {
  background: "#f0fdf4",
  foreground: "#052e16",
  surface: "#ffffff",
  surfaceSecondary: "#f8fffa",
  surfaceTertiary: "#dcfce7",
  overlay: "#ffffff",
  muted: "#6b7280",
  accent: "#166534",
  accentForeground: "#ffffff",
  border: "#bbf7d0",
  separator: "#d1fae5",
  danger: "#dc2626",
  dangerForeground: "#ffffff",
  success: "#15803d",
  successForeground: "#ffffff",
  warning: "#f59e0b",
  warningForeground: "#ffffff",
  placeholder: "#9ca3af",
  segment: "#dcfce7",
  segmentForeground: "#166534",
  backdrop: "rgba(0,0,0,0.20)",
  link: "#15803d",
};

export const darkColors = {
  background: "#030712",
  foreground: "#ffffff",
  surface: "#0b0f14",
  surfaceSecondary: "#111827",
  surfaceTertiary: "#1f2937",
  overlay: "#0b0f14",
  muted: "#9ca3af",
  accent: "#22c55e",
  accentForeground: "#03130a",
  border: "#1f2937",
  separator: "#1f2937",
  danger: "#ef4444",
  dangerForeground: "#ffffff",
  success: "#22c55e",
  successForeground: "#03130a",
  warning: "#f59e0b",
  warningForeground: "#03130a",
  placeholder: "#6b7280",
  segment: "#111827",
  segmentForeground: "#ffffff",
  backdrop: "rgba(0,0,0,0.45)",
  link: "#4ade80",
};

export type AppColorName =
  keyof typeof lightColors & keyof typeof darkColors;

export const NavigationLightTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.accent,
    background: lightColors.background,
    card: lightColors.surface,
    text: lightColors.foreground,
    border: lightColors.border,
    notification: lightColors.danger,
  },
  fonts: {
    regular: {
      fontFamily: "Poppins_400Regular",
      fontWeight: "400",
    },
    medium: {
      fontFamily: "Poppins_500Medium",
      fontWeight: "500",
    },
    bold: {
      fontFamily: "Poppins_700Bold",
      fontWeight: "700",
    },
    heavy: {
      fontFamily: "Poppins_700Bold",
      fontWeight: "700",
    },
  },
};

export const NavigationDarkTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.accent,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.foreground,
    border: darkColors.border,
    notification: darkColors.danger,
  },
  fonts: {
    regular: {
      fontFamily: "Poppins_400Regular",
      fontWeight: "400",
    },
    medium: {
      fontFamily: "Poppins_500Medium",
      fontWeight: "500",
    },
    bold: {
      fontFamily: "Poppins_700Bold",
      fontWeight: "700",
    },
    heavy: {
      fontFamily: "Poppins_700Bold",
      fontWeight: "700",
    },
  },
};
export type AppColors = typeof lightColors;