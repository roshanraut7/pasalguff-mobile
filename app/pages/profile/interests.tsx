import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
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
import { Button, Input } from "heroui-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useGetMyProfileQuery,
} from "@/store/api/profileApi";
import {
  useGetOnboardingCategoriesQuery,
  useUpdateMyOnboardingMutation,
} from "@/store/api/onboardingApi";

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (error as {
      data?: {
        message?: string | string[];
      };
    }).data;

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to update interests";
}

function categoryIcon(
  name: string,
  slug: string,
): keyof typeof Ionicons.glyphMap {
  const text = `${name} ${slug}`.toLowerCase();

  if (
    text.includes("mobile") ||
    text.includes("phone")
  ) {
    return "phone-portrait-outline";
  }

  if (
    text.includes("computer") ||
    text.includes("laptop")
  ) {
    return "laptop-outline";
  }

  if (
    text.includes("cctv") ||
    text.includes("security")
  ) {
    return "shield-checkmark-outline";
  }

  if (text.includes("network")) {
    return "wifi-outline";
  }

  if (
    text.includes("software") ||
    text.includes("coding")
  ) {
    return "code-slash-outline";
  }

  if (text.includes("solar")) {
    return "sunny-outline";
  }

  if (
    text.includes("training") ||
    text.includes("education")
  ) {
    return "school-outline";
  }

  if (
    text.includes("repair") ||
    text.includes("spare")
  ) {
    return "construct-outline";
  }

  if (text.includes("electronic")) {
    return "hardware-chip-outline";
  }

  return "apps-outline";
}

export default function InterestsScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useGetMyProfileQuery();

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useGetOnboardingCategoriesQuery();

  const [updateMyOnboarding, { isLoading }] =
    useUpdateMyOnboardingMutation();

  const [search, setSearch] = useState("");
  const [
    selectedCategoryIds,
    setSelectedCategoryIds,
  ] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (!profile) return;

    setSelectedCategoryIds(
      profile.interests.map(
        (interest) => interest.id,
      ),
    );
  }, [profile]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return categories;

    return categories.filter((category) =>
      `${category.name} ${category.slug} ${
        category.description ?? ""
      }`
        .toLowerCase()
        .includes(query),
    );
  }, [categories, search]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((previous) =>
      previous.includes(categoryId)
        ? previous.filter(
            (item) => item !== categoryId,
          )
        : [...previous, categoryId],
    );
  };

  const handleSave = async () => {
    setErrorMessage("");

    if (!profile?.profileType) {
      setErrorMessage(
        "Choose your profile type before updating interests.",
      );
      return;
    }

    if (!profile.profileRole) {
      setErrorMessage(
        "Choose your profile role before updating interests.",
      );
      return;
    }

    if (selectedCategoryIds.length === 0) {
      setErrorMessage(
        "Select at least one interest.",
      );
      return;
    }

    try {
      await updateMyOnboarding({
        profileType: profile.profileType,
        profileRole: profile.profileRole,
        categoryIds: selectedCategoryIds,
        onboardingCompleted: true,
      }).unwrap();

      await refetchProfile();
      router.back();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error),
      );
    }
  };

  const loading =
    profileLoading || categoriesLoading;

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

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 20,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Interests
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily:
                "Poppins_400Regular",
            }}
          >
            Choose topics for your feed and communities
          </Text>
        </View>
      </View>

      {loading ? (
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
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
        >
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search interests"
            className="border-field-border bg-field-background"
          />

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily:
                "Poppins_400Regular",
              marginTop: 12,
              marginBottom: 14,
            }}
          >
            {selectedCategoryIds.length} selected
          </Text>

          <View style={{ gap: 10 }}>
            {filteredCategories.map(
              (category) => {
                const selected =
                  selectedCategoryIds.includes(
                    category.id,
                  );

                return (
                  <Pressable
                    key={category.id}
                    onPress={() =>
                      toggleCategory(category.id)
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: selected
                        ? colors.accent
                        : colors.border,
                      backgroundColor: selected
                        ? `${colors.accent}12`
                        : colors.surface,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor:
                          `${colors.accent}12`,
                      }}
                    >
                      <Ionicons
                        name={categoryIcon(
                          category.name,
                          category.slug,
                        )}
                        size={21}
                        color={colors.accent}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color:
                            colors.foreground,
                          fontSize: 14,
                          fontFamily:
                            "Poppins_600SemiBold",
                        }}
                      >
                        {category.name}
                      </Text>

                      {category.description ? (
                        <Text
                          numberOfLines={2}
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            lineHeight: 18,
                            fontFamily:
                              "Poppins_400Regular",
                            marginTop: 2,
                          }}
                        >
                          {category.description}
                        </Text>
                      ) : null}
                    </View>

                    <Ionicons
                      name={
                        selected
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={23}
                      color={
                        selected
                          ? colors.accent
                          : colors.muted
                      }
                    />
                  </Pressable>
                );
              },
            )}
          </View>

          {filteredCategories.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 36,
              }}
            >
              <Ionicons
                name="search-outline"
                size={34}
                color={colors.muted}
              />

              <Text
                style={{
                  color: colors.muted,
                  fontSize: 13,
                  fontFamily:
                    "Poppins_500Medium",
                  marginTop: 10,
                }}
              >
                No interests found
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <Text
              style={{
                color: colors.danger,
                fontSize: 13,
                lineHeight: 20,
                fontFamily:
                  "Poppins_500Medium",
                marginTop: 16,
              }}
            >
              {errorMessage}
            </Text>
          ) : null}
        </ScrollView>
      )}

      <View
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 16,
          paddingTop: 10,
          backgroundColor: colors.background,
        }}
      >
        <Button
          onPress={handleSave}
          isDisabled={
            isLoading ||
            loading ||
            selectedCategoryIds.length === 0
          }
          className="bg-accent rounded-full"
        >
          <Button.Label className="text-accent-foreground">
            {isLoading
              ? "Saving..."
              : "Save interests"}
          </Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  );
}