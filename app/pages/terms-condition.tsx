import React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  APP_NAME,
  TERMS_VERSION,
  VENDOR_TERMS,
} from "@/constants/vendorTerms";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function TermsAndConditionsScreen() {
  const { colors } = useAppTheme();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView
        style={{ flex: 1 }}
        className="bg-background"
      >
        {/* Header */}
        <View className="flex-row items-center border-b border-field-border px-5 py-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="mr-4"
          >
            <Ionicons
              name="arrow-back-outline"
              size={24}
              color={colors.muted}
            />
          </Pressable>

          <Text
            className="text-foreground flex-1"
            style={{
              fontSize: 18,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            Terms and Conditions
          </Text>
        </View>

        {/* Scroll Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >

          <View className="rounded-3xl border border-field-border bg-field-background p-5 mb-6">
            <Text
              className="text-foreground"
              style={{
                fontSize: 22,
                lineHeight: 30,
                fontFamily: "Poppins_700Bold",
              }}
            >
              {APP_NAME} Vendor Community Terms
            </Text>

            <Text
              className="text-muted mt-2"
              style={{
                fontSize: 13,
                lineHeight: 20,
                fontFamily: "Poppins_400Regular",
              }}
            >
              Version {TERMS_VERSION}
            </Text>

            <Text
              className="text-foreground mt-4"
              style={{
                fontSize: 14,
                lineHeight: 23,
                fontFamily: "Poppins_400Regular",
              }}
            >
              Welcome to {APP_NAME}. By creating an account and joining our
              vendor community, you agree to follow these rules.
            </Text>
          </View>

          {VENDOR_TERMS.map((section, index) => (
            <View key={section.id} className="mb-6">
              <Text
                className="text-foreground"
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                {index + 1}. {section.title}
              </Text>

              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <Text
                  key={`${section.id}-${paragraphIndex}`}
                  className="text-muted mt-2"
                  style={{
                    fontSize: 14,
                    lineHeight: 23,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}

          <View className="rounded-2xl border border-field-border bg-field-background p-4 mb-6">
            <Text
              className="text-foreground"
              style={{
                fontSize: 14,
                lineHeight: 23,
                fontFamily: "Poppins_500Medium",
              }}
            >
              By continuing, you confirm that you have read and agree to these
              Terms and Conditions.
            </Text>
          </View>

          <Pressable
            onPress={() => router.back()}
            className="h-12 items-center justify-center rounded-full bg-accent"
          >
            <Text
              className="text-accent-foreground"
              style={{
                fontSize: 15,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Back to Sign Up
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}