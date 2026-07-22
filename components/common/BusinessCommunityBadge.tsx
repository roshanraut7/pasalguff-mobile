import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  label?: string;
  size?: number;
};

export default function BusinessCommunityBadge({
  label = "Verified Business",
  size = 14,
}: Props) {
  return (
    <View style={styles.wrap}>
      <MaterialIcons name="verified" size={size} color="#1D9E75" />
      <Text style={[styles.label, { fontSize: size - 2 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    color: "#1D9E75",
    fontFamily: "Poppins_600SemiBold",
  },
});