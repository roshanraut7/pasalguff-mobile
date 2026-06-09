import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";

interface AdminKpiCardProps {
  title: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  /**
   * Semantic accent — drives the left-border color and icon tint.
   * "people"  → indigo   (members, requests)
   * "content" → amber    (posts, comments)
   * "danger"  → rose     (bans, reports)
   * "neutral" → uses colors.accent (default)
   */
  variant?: "people" | "content" | "danger" | "neutral";
}

const VARIANT_COLORS = {
  people:  { border: "#6366F1", icon: "#6366F1", iconBg: "#6366F114" },
  content: { border: "#F59E0B", icon: "#F59E0B", iconBg: "#F59E0B14" },
  danger:  { border: "#F43F5E", icon: "#F43F5E", iconBg: "#F43F5E14" },
  neutral: { border: null,      icon: null,      iconBg: null        },
} as const;

export default function AdminKpiCard({
  title,
  value,
  icon,
  variant = "neutral",
}: AdminKpiCardProps) {
  const { colors } = useAppTheme();

  const vc           = VARIANT_COLORS[variant];
  const accentColor  = vc.border ?? colors.accent;
  const iconColor    = vc.icon   ?? colors.accent;
  const iconBgColor  = vc.iconBg ?? colors.accent + "14";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor:     colors.border,
          borderLeftColor: accentColor,
          borderLeftWidth: 3,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: iconBgColor },
        ]}
      >
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>

      <Text
        style={[styles.value, { color: colors.foreground }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>

      <Text
        style={[styles.label, { color: colors.muted }]}
        numberOfLines={2}
      >
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "44%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    paddingLeft: 13,
    gap: 6,
  },

  iconWrap: {
    alignSelf: "flex-start",
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  value: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.8,
    includeFontPadding: false,
  },

  label: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.8,
  },
});