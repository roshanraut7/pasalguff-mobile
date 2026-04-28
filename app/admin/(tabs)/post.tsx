import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function AdminPostScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 20,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          Post Screen
        </Text>
      </View>
    </SafeAreaView>
  );
}