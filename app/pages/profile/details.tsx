import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  router,
  useFocusEffect,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetMyProfileQuery } from "@/store/api/profileApi";
import ProfileDetailsContent, {
  type ProfileDetailsColors,
} from "@/components/profile/ProfileDetailsContent";

export default function ProfileDetailsScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: profile,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetMyProfileQuery();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

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

  if (!profile || error) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        <Header
          title="Profile details"
          colors={colors}
        />

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.danger}
          />

          <Text
            style={{
              color: colors.foreground,
              fontSize: 15,
              textAlign: "center",
              fontFamily: "Poppins_600SemiBold",
              marginTop: 10,
            }}
          >
            Failed to load profile details
          </Text>

          <Pressable
            onPress={() => {
              void refetch();
            }}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: colors.accent,
              marginTop: 16,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 13,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Try again
            </Text>
          </Pressable>
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

      <Header
        title="Profile details"
        colors={colors}
        right={
          isFetching ? (
            <ActivityIndicator
              size="small"
              color={colors.accent}
            />
          ) : (
            <Pressable
              hitSlop={8}
              onPress={() =>
                router.push(
                  "/pages/editProfile" as never,
                )
              }
            >
              <Ionicons
                name="pencil-outline"
                size={21}
                color={colors.accent}
              />
            </Pressable>
          )
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        <ProfileDetailsContent
          profile={profile}
          colors={colors}
          showSummary
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  title,
  colors,
  right,
}: {
  title: string;
  colors: ProfileDetailsColors;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
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
          flex: 1,
          color: colors.foreground,
          fontSize: 19,
          fontFamily: "Poppins_700Bold",
          marginLeft: 12,
        }}
      >
        {title}
      </Text>

      {right ?? <View style={{ width: 25 }} />}
    </View>
  );
}