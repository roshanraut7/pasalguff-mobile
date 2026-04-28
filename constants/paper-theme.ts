import {
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from "react-native-paper";

type AppPaperColors = {
  background: string;
  foreground: string;
  surface: string;
  surfaceSecondary: string;
  muted: string;
  accent: string;
  accentForeground: string;
  danger: string;
  dangerForeground: string;
  border: string;
  backdrop: string;
};

export function buildPaperTheme(
  colors: AppPaperColors,
  isDark: boolean
): MD3Theme {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...baseTheme,
    dark: isDark,
    roundness: 16,
    colors: {
      ...baseTheme.colors,
      primary: colors.accent,
      onPrimary: colors.accentForeground,
      secondary: colors.accent,
      onSecondary: colors.accentForeground,
      error: colors.danger,
      onError: colors.dangerForeground,
      background: colors.background,
      onBackground: colors.foreground,
      surface: colors.surface,
      onSurface: colors.foreground,
      surfaceVariant: colors.surfaceSecondary,
      onSurfaceVariant: colors.muted,
      outline: colors.border,
      outlineVariant: colors.border,
      shadow: "#000000",
      scrim: colors.backdrop,
      inverseSurface: colors.foreground,
      inverseOnSurface: colors.background,
      inversePrimary: colors.accent,
      elevation: {
        level0: colors.background,
        level1: colors.surface,
        level2: colors.surface,
        level3: colors.surface,
        level4: colors.surface,
        level5: colors.surface,
      },
    },
    fonts: {
      ...baseTheme.fonts,
      bodyLarge: {
        ...baseTheme.fonts.bodyLarge,
        fontFamily: "Poppins_400Regular",
      },
      bodyMedium: {
        ...baseTheme.fonts.bodyMedium,
        fontFamily: "Poppins_400Regular",
      },
      bodySmall: {
        ...baseTheme.fonts.bodySmall,
        fontFamily: "Poppins_400Regular",
      },
      titleLarge: {
        ...baseTheme.fonts.titleLarge,
        fontFamily: "Poppins_600SemiBold",
      },
      titleMedium: {
        ...baseTheme.fonts.titleMedium,
        fontFamily: "Poppins_600SemiBold",
      },
      titleSmall: {
        ...baseTheme.fonts.titleSmall,
        fontFamily: "Poppins_600SemiBold",
      },
      labelLarge: {
        ...baseTheme.fonts.labelLarge,
        fontFamily: "Poppins_500Medium",
      },
      labelMedium: {
        ...baseTheme.fonts.labelMedium,
        fontFamily: "Poppins_500Medium",
      },
      labelSmall: {
        ...baseTheme.fonts.labelSmall,
        fontFamily: "Poppins_500Medium",
      },
    },
  };
}