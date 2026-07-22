import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";

type KpiTone = "accent" | "warning" | "danger" | "success";

type AdminKpiCardProps = {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: KpiTone;
  style?: StyleProp<ViewStyle>;
};

export default function AdminKpiCard({
  title,
  value,
  icon,
  tone = "accent",
  style,
}: AdminKpiCardProps) {
  const { colors } = useAppTheme();

  const toneColor =
    tone === "warning"
      ? colors.warning
      : tone === "danger"
      ? colors.danger
      : tone === "success"
      ? colors.success ?? colors.accent
      : colors.accent;

  return (
    <View
      style={[
        styles.card,
        style,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${toneColor}1A` }]}>
        <Ionicons name={icon} size={20} color={toneColor} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.muted }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  title: { fontSize: 12, fontFamily: "Poppins_400Regular" },
  value: { marginTop: 2, fontSize: 20, fontFamily: "Poppins_700Bold" },
});