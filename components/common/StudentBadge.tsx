import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StudentBadge({ size = 16 }: { size?: number }) {
  return (
    <View
      style={{
        width: size + 6,
        height: size + 6,
        borderRadius: (size + 6) / 2,
        backgroundColor: "#1D9E75", // gold — swap for your theme accent if preferred
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="school" size={size - 3} color="#FFFFFF" />
    </View>
  );
}