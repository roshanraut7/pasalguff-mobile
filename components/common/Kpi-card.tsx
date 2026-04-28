import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";

type AdminKpiCardProps = {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function AdminKpiCard({
  title,
  value,
  icon,
}: AdminKpiCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 128,
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
});