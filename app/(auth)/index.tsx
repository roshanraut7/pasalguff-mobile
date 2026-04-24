import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";

import LoginForm from "@/components/form/LoginForm";
import SignupForm from "@/components/form/SignupForm";
import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const { data: session, isPending } = useSession();
  const { colors, isDark } = useAppTheme();

  if (isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                backgroundColor: colors.segment,
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: colors.segmentForeground,
                  fontSize: 13,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Pasal Guff
              </Text>
            </View>

            <Text
              style={{
                color: colors.foreground,
                fontSize: 30,
                lineHeight: 38,
                fontFamily: "Poppins_700Bold",
                textAlign: "center",
              }}
            >
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>

            <Text
              style={{
                color: colors.muted,
                fontSize: 15,
                lineHeight: 24,
                maxWidth: 330,
                fontFamily: "Poppins_400Regular",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {mode === "login"
                ? "Login to continue to your business community."
                : "Create your account and start connecting with trusted vendors."}
            </Text>
          </View>

          <View style={{ alignItems: "center", marginTop: 20 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: colors.segment,
                borderRadius: 999,
                padding: 4,
                marginBottom: 20,
              }}
            >
              <Pressable
                onPress={() => setMode("login")}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor:
                    mode === "login" ? colors.surface : "transparent",
                }}
              >
                <Text
                  style={{
                    color:
                      mode === "login"
                        ? colors.foreground
                        : colors.segmentForeground,
                    fontFamily: "Poppins_600SemiBold",
                  }}
                >
                  Login
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode("signup")}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor:
                    mode === "signup" ? colors.surface : "transparent",
                }}
              >
                <Text
                  style={{
                    color:
                      mode === "signup"
                        ? colors.foreground
                        : colors.segmentForeground,
                    fontFamily: "Poppins_600SemiBold",
                  }}
                >
                  Sign Up
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                width: "100%",
                borderRadius: 30,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingHorizontal: 20,
                paddingVertical: 24,
              }}
            >
              {mode === "login" ? <LoginForm /> : <SignupForm />}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}