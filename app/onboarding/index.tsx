import React, {
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Redirect,
  router,
} from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "heroui-native";

import {
  AccountTypeStep,
  InterestsStep,
  InviteFriendsStep,
  ProfessionStep,
  ProfilePhotoStep,
  SuggestedCommunitiesStep,
  WelcomeStep,
  type PickedProfileImage,
  type ProfileType,
} from "@/components/onboarding/OnboardingCards";
import ReferralShareSheet from "@/components/onboarding/ReferralShareSheet";

import {
  authClient,
  useSession,
} from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useGetMyOnboardingQuery,
  useGetOnboardingCategoriesQuery,
  useGetSuggestedCommunitiesQuery,
  useUpdateMyOnboardingMutation,
} from "@/store/api/onboardingApi";
import { useUploadProfileAvatarMutation } from "@/store/api/uploadApi";
import type { ReferralShareStats } from "@/store/api/referralApi";

type StepKey =
  | "welcome"
  | "profilePhoto"
  | "accountType"
  | "profession"
  | "interests"
  | "suggestedCommunities"
  | "inviteFriends";

const STEPS: StepKey[] = [
  "welcome",
  "profilePhoto",
  "accountType",
  "profession",
  "interests",
  "suggestedCommunities",
  "inviteFriends",
];

const STEP_LABELS: Record<
  StepKey,
  string
> = {
  welcome: "Welcome",
  profilePhoto: "Profile photo",
  accountType: "Account type",
  profession: "Profession",
  interests: "Interests",
  suggestedCommunities:
    "Communities",
  inviteFriends: "Invite friends",
};

function apiErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (
      error as {
        data?: unknown;
      }
    ).data;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data
    ) {
      const message = (
        data as {
          message?: unknown;
        }
      ).message;

      if (typeof message === "string") {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(", ");
      }
    }
  }

  return fallback;
}

export default function OnboardingScreen() {
  const { colors, isDark } =
    useAppTheme();

  const [stepIndex, setStepIndex] =
    useState(0);

  const [
    profileImage,
    setProfileImage,
  ] =
    useState<PickedProfileImage | null>(
      null,
    );

  const [
    selectedProfileType,
    setSelectedProfileType,
  ] =
    useState<ProfileType | null>(
      null,
    );

  const [
    selectedProfileRole,
    setSelectedProfileRole,
  ] = useState("");

  const [
    customProfileRole,
    setCustomProfileRole,
  ] = useState("");

  const [
    selectedCategoryIds,
    setSelectedCategoryIds,
  ] = useState<string[]>([]);

  const [
    selectedCommunityIds,
    setSelectedCommunityIds,
  ] = useState<string[]>([]);

  const [
    serverError,
    setServerError,
  ] = useState("");

  const [
    isReferralSheetOpen,
    setIsReferralSheetOpen,
  ] = useState(false);

  const [
    referralStats,
    setReferralStats,
  ] =
    useState<ReferralShareStats | null>(
      null,
    );

  const {
    data: session,
    isPending: isSessionPending,
  } = useSession();

  const {
    refetch: refetchMyOnboarding,
  } = useGetMyOnboardingQuery();

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
  } =
    useGetOnboardingCategoriesQuery();

  const {
    data: suggestedCommunities = [],
    isLoading:
      isSuggestedCommunitiesLoading,
    isFetching:
      isSuggestedCommunitiesFetching,
  } =
    useGetSuggestedCommunitiesQuery(
      undefined,
      {
        skip:
          stepIndex !==
          STEPS.indexOf(
            "suggestedCommunities",
          ),
      },
    );

  const [
    updateMyOnboarding,
    { isLoading: isSaving },
  ] =
    useUpdateMyOnboardingMutation();

  const [
    uploadProfileAvatar,
    {
      isLoading:
        isUploadingAvatar,
    },
  ] =
    useUploadProfileAvatarMutation();

  const currentStep =
    STEPS[stepIndex];

  const isLastStep =
    stepIndex === STEPS.length - 1;

  const isProcessing =
    isSaving ||
    isUploadingAvatar;

  const progressPercent =
    Math.round(
      ((stepIndex + 1) /
        STEPS.length) *
        100,
    );

  const finalProfileRole =
    selectedProfileRole === "Other"
      ? customProfileRole.trim()
      : selectedProfileRole.trim();

  const toggleCategory = (
    id: string,
  ) => {
    setSelectedCategoryIds(
      (previous) =>
        previous.includes(id)
          ? previous.filter(
              (item) => item !== id,
            )
          : [...previous, id],
    );
  };

  const toggleCommunity = (
    id: string,
  ) => {
    setSelectedCommunityIds(
      (previous) =>
        previous.includes(id)
          ? previous.filter(
              (item) => item !== id,
            )
          : [...previous, id],
    );
  };

  const goBack = () => {
    if (
      isProcessing ||
      stepIndex === 0
    ) {
      return;
    }

    setServerError("");

    setStepIndex(
      (previous) => previous - 1,
    );
  };

  const saveInterests =
    async () => {
      if (!selectedProfileType) {
        throw new Error(
          "Select your account type.",
        );
      }

      await updateMyOnboarding({
        profileType:
          selectedProfileType,
        profileRole:
          finalProfileRole,
        categoryIds:
          selectedCategoryIds,
        onboardingCompleted: false,
      }).unwrap();
    };

  const completeOnboarding =
    async () => {
      if (!selectedProfileType) {
        setServerError(
          "Please select your account type.",
        );

        return;
      }

      try {
        let imageUrl:
          | string
          | undefined;

        if (profileImage?.uri) {
          const uploaded =
            await uploadProfileAvatar({
              uri: profileImage.uri,
              fileName:
                profileImage.fileName,
              mimeType:
                profileImage.mimeType,
            }).unwrap();

          imageUrl = uploaded.url;
        }

        await updateMyOnboarding({
          ...(imageUrl
            ? {
                image: imageUrl,
              }
            : {}),

          profileType:
            selectedProfileType,

          profileRole:
            finalProfileRole,

          categoryIds:
            selectedCategoryIds,

          communityIds:
            selectedCommunityIds,

          onboardingCompleted: true,
        }).unwrap();

        await refetchMyOnboarding();

        await authClient.getSession({
          query: {
            disableCookieCache: true,
          },
        });

        router.replace("/(tabs)");
      } catch (error) {
        setServerError(
          apiErrorMessage(
            error,
            "Failed to complete onboarding.",
          ),
        );
      }
    };

  const goNext = async () => {
    try {
      setServerError("");

      if (
        currentStep ===
          "accountType" &&
        !selectedProfileType
      ) {
        setServerError(
          "Please select the option that best describes you.",
        );

        return;
      }

      if (
        currentStep ===
        "profession"
      ) {
        if (!selectedProfileRole) {
          setServerError(
            "Please select your profession or role.",
          );

          return;
        }

        if (
          selectedProfileRole ===
            "Other" &&
          customProfileRole.trim()
            .length < 2
        ) {
          setServerError(
            "Please describe your profession or role.",
          );

          return;
        }
      }

      if (
        currentStep ===
        "interests"
      ) {
        if (
          selectedCategoryIds.length ===
          0
        ) {
          setServerError(
            "Please select at least one interest.",
          );

          return;
        }

        await saveInterests();
      }

      if (isLastStep) {
        await completeOnboarding();
        return;
      }

      setStepIndex(
        (previous) => previous + 1,
      );
    } catch (error) {
      setServerError(
        apiErrorMessage(
          error,
          "Failed to continue onboarding.",
        ),
      );
    }
  };

  const skipStep = async () => {
    if (isProcessing) {
      return;
    }

    setServerError("");

    if (
      currentStep ===
      "profilePhoto"
    ) {
      setStepIndex(
        (previous) =>
          previous + 1,
      );

      return;
    }

    if (
      currentStep ===
      "suggestedCommunities"
    ) {
      setStepIndex(
        (previous) =>
          previous + 1,
      );

      return;
    }

    if (
      currentStep ===
      "inviteFriends"
    ) {
      await completeOnboarding();
    }
  };

  const showSkip =
    currentStep ===
      "profilePhoto" ||
    currentStep ===
      "suggestedCommunities" ||
    currentStep ===
      "inviteFriends";

  const content = (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 18,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent:
            "space-between",
          marginBottom: 15,
        }}
      >
        <Pressable
          onPress={goBack}
          disabled={
            stepIndex === 0 ||
            isProcessing
          }
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              colors.surface,
            borderWidth: 1,
            borderColor:
              colors.border,
            opacity:
              stepIndex === 0
                ? 0
                : isProcessing
                  ? 0.45
                  : 1,
          }}
        >
          <Ionicons
            name="chevron-back"
            size={21}
            color={colors.foreground}
          />
        </Pressable>

        <View
          style={{
            alignItems: "center",
          }}
        >
          <Image
            source={require("@/assets/images/kamkuro.png")}
            style={{
              width: 42,
              height: 42,
            }}
            resizeMode="contain"
          />

          <Text
            style={{
              color: colors.muted,
              fontSize: 10,
              fontFamily:
                "Poppins_600SemiBold",
              marginTop: 2,
            }}
          >
            {STEP_LABELS[currentStep]}
          </Text>
        </View>

        <View
          style={{
            minWidth: 44,
            alignItems: "flex-end",
          }}
        >
          <Text
            style={{
              color:
                colors.foreground,
              fontSize: 13,
              fontFamily:
                "Poppins_600SemiBold",
            }}
          >
            {progressPercent}%
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 10,
              fontFamily:
                "Poppins_400Regular",
            }}
          >
            {stepIndex + 1}/
            {STEPS.length}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View
        style={{
          height: 7,
          borderRadius: 999,
          backgroundColor:
            colors.surface,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <View
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor:
              colors.accent,
          }}
        />
      </View>

      {/* Step content */}
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 28,
        }}
      >
        {currentStep === "welcome" ? (
          <WelcomeStep
            colors={colors}
          />
        ) : null}

        {currentStep ===
        "profilePhoto" ? (
          <ProfilePhotoStep
            colors={colors}
            profileImage={
              profileImage
            }
            setProfileImage={
              setProfileImage
            }
          />
        ) : null}

        {currentStep ===
        "accountType" ? (
          <AccountTypeStep
            colors={colors}
            selected={
              selectedProfileType
            }
            onSelect={(value) => {
              setSelectedProfileType(
                value,
              );

              setSelectedProfileRole(
                "",
              );

              setCustomProfileRole(
                "",
              );
            }}
          />
        ) : null}

        {currentStep ===
        "profession" ? (
          <ProfessionStep
            colors={colors}
            profileType={
              selectedProfileType
            }
            selectedRole={
              selectedProfileRole
            }
            customRole={
              customProfileRole
            }
            onSelectRole={(
              value,
            ) => {
              setSelectedProfileRole(
                value,
              );

              if (
                value !== "Other"
              ) {
                setCustomProfileRole(
                  "",
                );
              }
            }}
            onChangeCustomRole={
              setCustomProfileRole
            }
          />
        ) : null}

        {currentStep ===
        "interests" ? (
          <InterestsStep
            colors={colors}
            categories={
              categories
            }
            isLoading={
              isCategoriesLoading
            }
            selectedIds={
              selectedCategoryIds
            }
            onToggle={
              toggleCategory
            }
          />
        ) : null}

        {currentStep ===
        "suggestedCommunities" ? (
          <SuggestedCommunitiesStep
            colors={colors}
            communities={
              suggestedCommunities
            }
            isLoading={
              isSuggestedCommunitiesLoading ||
              isSuggestedCommunitiesFetching
            }
            selectedIds={
              selectedCommunityIds
            }
            onToggle={
              toggleCommunity
            }
          />
        ) : null}

        {currentStep ===
        "inviteFriends" ? (
          <InviteFriendsStep
            colors={colors}
            stats={referralStats}
            onOpenShareSheet={() =>
              setIsReferralSheetOpen(
                true,
              )
            }
          />
        ) : null}

        {serverError ? (
          <View
            style={{
              flexDirection: "row",
              gap: 9,
              padding: 13,
              borderRadius: 18,
              backgroundColor:
                colors.surface,
              borderWidth: 1,
              borderColor:
                colors.danger,
              marginTop: 18,
            }}
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={colors.danger}
            />

            <Text
              style={{
                flex: 1,
                color:
                  colors.danger,
                fontSize: 13,
                lineHeight: 19,
                fontFamily:
                  "Poppins_500Medium",
              }}
            >
              {serverError}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom actions */}
      <View
        style={{
          gap: 11,
          paddingTop: 10,
        }}
      >
        <Button
          onPress={goNext}
          isDisabled={isProcessing}
          className="bg-accent rounded-full"
        >
          <Button.Label className="text-accent-foreground">
            {isProcessing
              ? isUploadingAvatar
                ? "Uploading photo..."
                : "Saving..."
              : currentStep ===
                  "inviteFriends"
                ? "Finish onboarding"
                : currentStep ===
                    "welcome"
                  ? "Get started"
                  : "Continue"}
          </Button.Label>
        </Button>

        {showSkip ? (
          <Button
            onPress={skipStep}
            isDisabled={
              isProcessing
            }
            className="bg-transparent rounded-full border border-border"
          >
            <Button.Label className="text-foreground">
              {currentStep ===
              "suggestedCommunities"
                ? "Skip communities"
                : currentStep ===
                    "inviteFriends"
                  ? "Skip and finish"
                  : "Skip for now"}
            </Button.Label>
          </Button>
        ) : null}
      </View>
    </View>
  );

  if (isSessionPending) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor:
            colors.background,
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

  if (
    session?.user
      ?.onboardingCompleted
  ) {
    return (
      <Redirect href="/(tabs)" />
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor:
          colors.background,
      }}
    >
      <StatusBar
        barStyle={
          isDark
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          colors.background
        }
      />

      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}

      <ReferralShareSheet
        visible={
          isReferralSheetOpen
        }
        initialStats={
          referralStats
        }
        onClose={() =>
          setIsReferralSheetOpen(
            false,
          )
        }
        onStatsChange={
          setReferralStats
        }
      />
    </SafeAreaView>
  );
}