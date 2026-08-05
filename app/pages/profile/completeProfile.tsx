import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetMyProfileQuery } from "@/store/api/profileApi";

const REQUIRED_FIELD_ROUTES: Record<string, string> = {
  image: "/(tabs)/profile",
  name: "/pages/editProfile",
  profileType: "/pages/editProfile",
  profileRole: "/pages/editProfile",
  bio: "/pages/editProfile",
  location: "/pages/editProfile",
  organizationName: "/pages/editProfile",
  interests: "/pages/profile/interests",
  skills: "/pages/profile/skills",
};

export default function CompleteProfileScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: profile,
    isLoading,
    refetch,
  } = useGetMyProfileQuery();

  const completion = profile?.completion;

  if (isLoading) {
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
            justifyContent: "center",
            alignItems: "center",
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

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color={colors.foreground}
          />
        </Pressable>

        <Text
          style={{
            color: colors.foreground,
            fontSize: 20,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Complete profile
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 18,
            marginTop: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Profile completion
            </Text>

            <Text
              style={{
                color: colors.accent,
                fontSize: 18,
                fontFamily: "Poppins_700Bold",
              }}
            >
              {completion?.completionPercent ?? 0}%
            </Text>
          </View>

          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.segment,
              overflow: "hidden",
              marginTop: 14,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${completion?.completionPercent ?? 0}%`,
                backgroundColor: colors.accent,
                borderRadius: 999,
              }}
            />
          </View>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              lineHeight: 18,
              fontFamily: "Poppins_400Regular",
              marginTop: 10,
            }}
          >
            A complete profile helps other users understand and trust you.
          </Text>
        </View>

        <Text
          style={{
            color: colors.foreground,
            fontSize: 15,
            fontFamily: "Poppins_700Bold",
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          Required details
        </Text>

        {completion?.isComplete ? (
          <View
            style={{
              alignItems: "center",
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 22,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={46}
              color="#22C55E"
            />

            <Text
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontFamily: "Poppins_700Bold",
                marginTop: 10,
              }}
            >
              Your core profile is complete
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(completion?.missingFields ?? []).map(
              (field) => (
                <Pressable
                  key={field.key}
                  onPress={() => {
                    const route =
                      REQUIRED_FIELD_ROUTES[
                        field.key
                      ];

                    if (route) {
                      router.push(route as never);
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 18,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: `${colors.accent}12`,
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={22}
                      color={colors.accent}
                    />
                  </View>

                  <Text
                    style={{
                      flex: 1,
                      color: colors.foreground,
                      fontSize: 14,
                      fontFamily:
                        "Poppins_600SemiBold",
                    }}
                  >
                    {field.label}
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              ),
            )}
          </View>
        )}

        <Text
          style={{
            color: colors.foreground,
            fontSize: 15,
            fontFamily: "Poppins_700Bold",
            marginTop: 28,
            marginBottom: 12,
          }}
        >
          Make your profile stronger
        </Text>

        <View style={{ gap: 10 }}>
          <StrengthRow
            title="Add education"
            complete={
              (profile?.education.length ?? 0) > 0
            }
            icon="school-outline"
            route="/pages/profile/education"
            colors={colors}
          />

          <StrengthRow
            title="Add experience"
            complete={
              (profile?.experiences.length ?? 0) > 0
            }
            icon="briefcase-outline"
            route="/pages/profile/experiences"
            colors={colors}
          />

          <StrengthRow
            title="Add certification"
            complete={
              (profile?.certifications.length ?? 0) >
              0
            }
            icon="ribbon-outline"
            route="/pages/profile/certifications"
            colors={colors}
          />

          <StrengthRow
            title="Add a headline"
            complete={Boolean(profile?.headline)}
            icon="text-outline"
            route="/pages/editProfile"
            colors={colors}
          />

          <StrengthRow
            title="Add a website"
            complete={Boolean(profile?.website)}
            icon="globe-outline"
            route="/pages/editProfile"
            colors={colors}
          />
        </View>

        <Pressable
          onPress={() => {
            void refetch();
          }}
          style={{
            alignSelf: "center",
            marginTop: 24,
            paddingHorizontal: 18,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: colors.accent,
              fontSize: 13,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            Refresh progress
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StrengthRow({
  title,
  complete,
  icon,
  route,
  colors,
}: {
  title: string;
  complete: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  colors: {
    foreground: string;
    muted: string;
    accent: string;
    surface: string;
    border: string;
  };
}) {
  return (
    <Pressable
      onPress={() => router.push(route as never)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 18,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: complete
            ? "rgba(34,197,94,0.12)"
            : `${colors.accent}12`,
        }}
      >
        <Ionicons
          name={
            complete
              ? "checkmark"
              : icon
          }
          size={20}
          color={
            complete
              ? "#22C55E"
              : colors.accent
          }
        />
      </View>

      <Text
        style={{
          flex: 1,
          color: colors.foreground,
          fontSize: 14,
          fontFamily: "Poppins_600SemiBold",
        }}
      >
        {title}
      </Text>

      <Ionicons
        name={
          complete
            ? "checkmark-circle"
            : "chevron-forward"
        }
        size={20}
        color={
          complete
            ? "#22C55E"
            : colors.muted
        }
      />
    </Pressable>
  );
}