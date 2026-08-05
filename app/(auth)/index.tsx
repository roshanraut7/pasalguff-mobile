import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Redirect,
  useLocalSearchParams,
} from "expo-router";

import LoginForm from "@/components/form/LoginForm";
import SignupForm from "@/components/form/SignupForm";
import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  const params = useLocalSearchParams<{
    mode?: string | string[];
  }>();

  const requestedMode = Array.isArray(params.mode)
    ? params.mode[0]
    : params.mode;

  const { data: session, isPending } = useSession();
  const { colors, isDark } = useAppTheme();

  /*
   * This prevents later Better Auth session refreshes from replacing
   * the complete login/signup page with a loading spinner.
   */
  const hasCompletedInitialSessionCheck = useRef(false);

  useEffect(() => {
    if (!isPending) {
      hasCompletedInitialSessionCheck.current = true;
    }
  }, [isPending]);

  useEffect(() => {
    if (requestedMode === "signup") {
      setMode("signup");
      return;
    }

    if (requestedMode === "login") {
      setMode("login");
    }
  }, [requestedMode]);

  /*
   * Show the full-screen loading indicator only during the first
   * session check when the app/auth page initially opens.
   */
  if (
    isPending &&
    !hasCompletedInitialSessionCheck.current
  ) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
        </View>
      </SafeAreaView>
    );
  }

  /*
   * Redirect only authenticated users whose email has already
   * been verified.
   *
   * SignupForm controls navigation to the OTP page for new users.
   */
  if (
    !isPending &&
    session?.user?.emailVerified
  ) {
    const role = session.user.role;

    const isAdmin =
      role === "ADMIN" ||
      role === "SUPER_ADMIN";

    const onboardingCompleted =
      session.user.onboardingCompleted;

    if (isAdmin) {
      return <Redirect href="/admin" />;
    }

    if (!onboardingCompleted) {
      return <Redirect href="/onboarding" />;
    }

    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <StatusBar
        barStyle={
          isDark
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={colors.background}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 0 : 20
        }
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
                  fontFamily:
                    "Poppins_600SemiBold",
                }}
              >
                Kam Kuro
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
              {mode === "login"
                ? "Welcome Back"
                : "Create Account"}
            </Text>

            <Text
              style={{
                color: colors.muted,
                fontSize: 15,
                lineHeight: 24,
                maxWidth: 330,
                fontFamily:
                  "Poppins_400Regular",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {mode === "login"
                ? "Login to continue to your business community."
                : "Create your account and start connecting with trusted vendors."}
            </Text>
          </View>

          <View
            style={{
              marginTop: 24,
              borderRadius: 999,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 6,
              flexDirection: "row",
            }}
          >
            <Pressable
              onPress={() => setMode("login")}
              disabled={mode === "login"}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor:
                  mode === "login"
                    ? colors.accent
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color:
                    mode === "login"
                      ? colors.accentForeground
                      : colors.foreground,
                  fontSize: 14,
                  fontFamily:
                    "Poppins_600SemiBold",
                }}
              >
                Login
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("signup")}
              disabled={mode === "signup"}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor:
                  mode === "signup"
                    ? colors.accent
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color:
                    mode === "signup"
                      ? colors.accentForeground
                      : colors.foreground,
                  fontSize: 14,
                  fontFamily:
                    "Poppins_600SemiBold",
                }}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              marginTop: 24,
              borderRadius: 28,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            {mode === "login" ? (
              <LoginForm />
            ) : (
              <SignupForm />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}