import React from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import CreateCommunityForm from "@/components/form/CreateCommunityForm";

export default function CreateCommunityPage() {
  const { colors } = useAppTheme();

  const handleCreateSuccess = () => {
    router.replace("/profile");
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        bottomOffset={40}
      >
        <View className="px-5 pt-3">
          <View className="mb-5 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface"
            >
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color={colors.accent}
              />
            </Pressable>

            <View className="flex-1">
              <Text
                className="text-foreground"
                style={{ fontSize: 22, fontFamily: "Poppins_700Bold" }}
              >
                New Community
              </Text>

              <Text
                className="text-muted"
                style={{ fontSize: 13, fontFamily: "Poppins_400Regular" }}
              >
                Set up your community details
              </Text>
            </View>
          </View>

          <View className="rounded-[30px] border border-border bg-surface px-5 py-6">
            <CreateCommunityForm
              submitLabel="Create Community"
              onSuccess={handleCreateSuccess}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}