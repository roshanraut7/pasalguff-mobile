import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

export default function CreateTabRedirect() {
  useFocusEffect(
    useCallback(() => {
    router.push("/pages/createpost");
    }, []),
  );

  return <View />;
}