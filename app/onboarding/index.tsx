import React, { useMemo, useState } from "react";
import { useSession } from "@/api/better-auth-client";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  Button,
  FieldError,
  Input,
  Label,
  Select,
  TextField,
} from "heroui-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useGetMyOnboardingQuery,
  useGetOnboardingCategoriesQuery,
  useGetSuggestedCommunitiesQuery,
  useUpdateMyOnboardingMutation,
} from "@/store/api/onboardingApi";
import type { SuggestedCommunity } from "@/store/api/onboardingApi";
import { useUploadProfileAvatarMutation } from "@/store/api/uploadApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

type StepKey =
  | "welcome"
  | "profilePhoto"
  | "vendorType"
  | "interests"
  | "suggestedCommunities"
  | "businessProfile";

type PickedProfileImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

const STEPS: StepKey[] = [
  "welcome",
  "profilePhoto",
  "vendorType",
  "interests",
  "suggestedCommunities",
  "businessProfile",
];

const BUSINESS_TYPES = [
  // Consumer Electronics & Retail
  "Smartphone Retailer",
  "Mobile Phone Dealer",
  "Laptop & Computer Dealer",
  "Home Appliance Dealer",
  "Audio & Video Equipment Seller",
  "Gaming & Accessories Dealer",
  "Wearables & Fitness Gadgets Retailer",
  "Camera & Photography Equipment Dealer",
  "Car Electronics & Audio Installer",
  "Ev FourWheelers",
    "Ev TwoWheelers",

  // B2B, Supply Chain & Distribution
  "Wholesaler",
  "Distributor",
  "Importer",
  "Mobile & Laptop Spare Parts Supplier",
  "Electronics Accessories Supplier",
  "Repair Tools & Dealer",
  "Parts & Accessories",
  // Smart Tech, Security & Power
  "CCTV & Security Systems Vendor",
  "Smart Home & IoT Devices",
  "Solar & Power Backup Solutions",
  "EV Charging Stations & Accessories Dealer",
  "Drone & UAV Seller",

  // Enterprise & Office IT
  "IT Infrastructure & Networking Vendor",
  "POS & Billing Systems Provider",
  "Office Automation & Equipment Dealer",
  "Software & License Reseller",

  // Services & Circular Economy
  "Electronics Repair Shop",
  "Service Center (Repair & Installation)",
  "Refurbished & Second-Hand Electronics Dealer",
  "E-Waste Recycling & Scrap Buyer",
  "3D Printing Equipment & Materials Supplier",

  // Training & Education
  "Instructor",
  "Trainer",
  "Trainee",

  "Other",
];

// Profession types that only need Professional Email + Phone
// (no business name / address required)
const TRAINING_PROFESSIONS = ["Instructor", "Trainer", "Trainee"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/;

export default function OnboardingScreen() {
  const { colors, isDark } = useAppTheme();

  const [stepIndex, setStepIndex] = useState(0);
  const [profileImage, setProfileImage] = useState<PickedProfileImage | null>(
    null,
  );

  const [selectedBusinessType, setSelectedBusinessType] = useState("");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>(
    [],
  );
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhoneNo, setBusinessPhoneNo] = useState("");
  const [serverError, setServerError] = useState("");
  const { refetch: refetchSession } = useSession();

  const { refetch: refetchMyOnboarding } = useGetMyOnboardingQuery();

  const { data: categories, isLoading: isCategoriesLoading } =
    useGetOnboardingCategoriesQuery();

  const {
    data: suggestedCommunities = [],
    isLoading: isSuggestedCommunitiesLoading,
    isFetching: isSuggestedCommunitiesFetching,
  } = useGetSuggestedCommunitiesQuery(undefined, {
    skip: stepIndex !== STEPS.indexOf("suggestedCommunities"),
  });

  const [updateMyOnboarding, { isLoading: isSaving }] =
    useUpdateMyOnboardingMutation();

  const [uploadProfileAvatar, { isLoading: isUploadingAvatar }] =
    useUploadProfileAvatarMutation();

  const isProcessing = isSaving || isUploadingAvatar;

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const progressPercent = useMemo(() => {
    return ((stepIndex + 1) / STEPS.length) * 100;
  }, [stepIndex]);

  const finalBusinessType =
    selectedBusinessType === "Other"
      ? customBusinessType.trim()
      : selectedBusinessType.trim();

  const isTrainingProfession = TRAINING_PROFESSIONS.includes(
    selectedBusinessType,
  );

  const isBusinessProfileValid = isTrainingProfession
    ? EMAIL_REGEX.test(businessEmail.trim()) &&
      PHONE_REGEX.test(businessPhoneNo.trim())
    : businessName.trim().length > 0 &&
      address.trim().length > 0 &&
      EMAIL_REGEX.test(businessEmail.trim()) &&
      PHONE_REGEX.test(businessPhoneNo.trim());

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }

      return [...prev, categoryId];
    });
  };

  const toggleCommunity = (communityId: string) => {
    setSelectedCommunityIds((prev) => {
      if (prev.includes(communityId)) {
        return prev.filter((id) => id !== communityId);
      }

      return [...prev, communityId];
    });
  };

  const goBack = () => {
    if (isProcessing) return;
    if (stepIndex === 0) return;

    setStepIndex((prev) => prev - 1);
  };

  const savePartialOnboarding = async () => {
    await updateMyOnboarding({
      businessType: finalBusinessType || null,
      categoryIds: selectedCategoryIds,
      onboardingCompleted: false,
    }).unwrap();
  };

  const goNext = async () => {
    try {
      setServerError("");

      if (currentStep === "interests") {
        await savePartialOnboarding();
      }

      if (currentStep === "businessProfile" && !isBusinessProfileValid) {
        setServerError(
          isTrainingProfession
            ? "Please fill in your professional email and professional phone number."
            : "Please fill in business name, address, business email, and business phone number.",
        );
        return;
      }

      if (!isLastStep) {
        setStepIndex((prev) => prev + 1);
        return;
      }

      await completeOnboarding();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Failed to continue onboarding",
      );
    }
  };

  const skipStep = async () => {
    try {
      setServerError("");

      if (!isLastStep) {
        setStepIndex((prev) => prev + 1);
        return;
      }

      await completeOnboarding();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Failed to skip onboarding step",
      );
    }
  };

  const completeOnboarding = async () => {
    try {
      let finalProfileImageUrl: string | undefined;

      if (profileImage?.uri) {
        const uploaded = await uploadProfileAvatar({
          uri: profileImage.uri,
          fileName: profileImage.fileName,
          mimeType: profileImage.mimeType,
        }).unwrap();

        finalProfileImageUrl = uploaded.url;
      }

      await updateMyOnboarding({
        ...(finalProfileImageUrl ? { image: finalProfileImageUrl } : {}),
        businessType: finalBusinessType || null,
        businessName: isTrainingProfession
          ? null
          : businessName.trim() || null,
        address: isTrainingProfession ? null : address.trim() || null,
        businessEmail: businessEmail.trim() || null,
        businessPhoneNo: businessPhoneNo.trim() || null,
        categoryIds: selectedCategoryIds,
        communityIds: selectedCommunityIds,
        onboardingCompleted: true,
      }).unwrap();

      await refetchMyOnboarding();
      await refetchSession();

      router.replace("/(tabs)");
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Failed to complete onboarding",
      );
    }
  };

  const showSkip =
    currentStep !== "welcome" && currentStep !== "businessProfile";

  const content = (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <Pressable
          onPress={goBack}
          disabled={stepIndex === 0 || isProcessing}
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: stepIndex === 0 ? 0 : isProcessing ? 0.5 : 1,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>

        <Image
          source={require("@/assets/images/kamkuro.png")}
          style={{ width: 44, height: 44 }}
          resizeMode="contain"
        />

        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          Step {stepIndex + 1} of {STEPS.length}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginBottom: 24,
        }}
      >
        {STEPS.map((step, idx) => (
          <View
            key={step}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              backgroundColor:
                idx <= stepIndex ? colors.accent : colors.surface,
            }}
          />
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      >
        {currentStep === "welcome" ? <WelcomeStep colors={colors} /> : null}

        {currentStep === "profilePhoto" ? (
          <ProfilePhotoStep
            colors={colors}
            profileImage={profileImage}
            setProfileImage={setProfileImage}
          />
        ) : null}

        {currentStep === "vendorType" ? (
          <VendorTypeStep
            colors={colors}
            selectedBusinessType={selectedBusinessType}
            setSelectedBusinessType={setSelectedBusinessType}
            customBusinessType={customBusinessType}
            setCustomBusinessType={setCustomBusinessType}
          />
        ) : null}

        {currentStep === "interests" ? (
          <InterestsStep
            colors={colors}
            categories={categories ?? []}
            isLoading={isCategoriesLoading}
            selectedCategoryIds={selectedCategoryIds}
            toggleCategory={toggleCategory}
          />
        ) : null}

        {currentStep === "suggestedCommunities" ? (
          <SuggestedCommunitiesStep
            colors={colors}
            communities={suggestedCommunities}
            isLoading={
              isSuggestedCommunitiesLoading || isSuggestedCommunitiesFetching
            }
            selectedCommunityIds={selectedCommunityIds}
            toggleCommunity={toggleCommunity}
          />
        ) : null}

        {currentStep === "businessProfile" ? (
          <BusinessProfileStep
            colors={colors}
            isTrainingProfession={isTrainingProfession}
            businessName={businessName}
            setBusinessName={setBusinessName}
            address={address}
            setAddress={setAddress}
            businessEmail={businessEmail}
            setBusinessEmail={setBusinessEmail}
            businessPhoneNo={businessPhoneNo}
            setBusinessPhoneNo={setBusinessPhoneNo}
          />
        ) : null}

        {serverError ? (
          <Text
            style={{
              color: colors.danger,
              fontSize: 13,
              fontFamily: "Poppins_500Medium",
              marginTop: 16,
            }}
          >
            {serverError}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ gap: 12, paddingTop: 12 }}>
        <Button
          onPress={goNext}
          isDisabled={isProcessing}
          className="bg-accent rounded-full"
        >
          <Button.Label className="text-accent-foreground">
            {isProcessing
              ? isUploadingAvatar
                ? "Uploading..."
                : "Saving..."
              : isLastStep
                ? "Finish"
                : currentStep === "welcome"
                  ? "Get Started"
                  : "Next"}
          </Button.Label>
        </Button>

        {showSkip ? (
          <Button
            onPress={skipStep}
            isDisabled={isProcessing}
            className="bg-transparent rounded-full border border-border"
          >
            <Button.Label className="text-foreground">
              Skip this step
            </Button.Label>
          </Button>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

function WelcomeStep({ colors }: { colors: any }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingVertical: 20 }}>
      <View
        style={{
          width: 120,
          height: 120,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Image
          source={require("@/assets/images/kamkuro.png")}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
      </View>

      <Text
        style={{
          color: colors.foreground,
          fontSize: 32,
          lineHeight: 40,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Welcome to KamKuro
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 15,
          lineHeight: 24,
          fontFamily: "Poppins_400Regular",
          marginTop: 12,
        }}
      >
        Connect with electronic vendors, discuss products, join trusted
        communities, and build your vendor network.
      </Text>

      <View style={{ gap: 12, marginTop: 28 }}>
        <InfoCard
          colors={colors}
          icon="people-outline"
          title="Join vendor communities"
          description="Find communities based on mobiles, laptops, CCTV, repair, spare parts and more."
        />

        <InfoCard
          colors={colors}
          icon="chatbubbles-outline"
          title="Discuss and chat"
          description="Ask questions, share market updates, and connect with community members."
        />

        <InfoCard
          colors={colors}
          icon="trending-up-outline"
          title="Grow your business network"
          description="Discover vendors, suppliers, wholesalers and service providers."
        />
      </View>
    </View>
  );
}

function ProfilePhotoStep({
  colors,
  profileImage,
  setProfileImage,
}: {
  colors: any;
  profileImage: PickedProfileImage | null;
  setProfileImage: (value: PickedProfileImage | null) => void;
}) {
  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      setProfileImage({
        uri: asset.uri,
        fileName: asset.fileName ?? `profile-avatar-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  const takePicture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.back,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      setProfileImage({
        uri: asset.uri,
        fileName: asset.fileName ?? `profile-avatar-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  const handlePhotoOptionChange = async (value: any) => {
    const selectedValue =
      typeof value === "string"
        ? value
        : typeof value?.value === "string"
          ? value.value
          : "";

    if (selectedValue === "gallery") {
      await pickFromGallery();
    }

    if (selectedValue === "camera") {
      await takePicture();
    }
  };

  const removeCurrentImage = () => {
    setProfileImage(null);
  };

  return (
    <View style={{ paddingVertical: 10 }}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 28,
          lineHeight: 36,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Choose your profile photo
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 15,
          lineHeight: 23,
          fontFamily: "Poppins_400Regular",
          marginTop: 8,
          marginBottom: 28,
        }}
      >
        Upload a photo so other vendors can recognise you in communities and
        chat.
      </Text>

      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 164,
            height: 164,
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
          }}
        >
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {profileImage?.uri ? (
              <Image
                source={{ uri: profileImage.uri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person-outline" size={46} color={colors.muted} />
            )}
          </View>

          <View
            style={{
              position: "absolute",
              right: 9,
              bottom: 9,
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Select
              presentation="dialog"
              onValueChange={handlePhotoOptionChange}
            >
              <Select.Trigger variant="unstyled">
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={25} color="#FFFFFF" />
                </View>
              </Select.Trigger>

              <Select.Portal>
                <Select.Overlay />

                <Select.Content presentation="dialog">
                  <Select.Close />

                  <Select.ListLabel>Select profile photo</Select.ListLabel>

                  <Select.Item value="gallery" label="Choose from gallery">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Ionicons
                        name="images-outline"
                        size={20}
                        color={colors.accent}
                      />
                      <Select.ItemLabel />
                    </View>
                    <Select.ItemIndicator />
                  </Select.Item>

                  <Select.Item value="camera" label="Take picture">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Ionicons
                        name="camera-outline"
                        size={20}
                        color={colors.accent}
                      />
                      <Select.ItemLabel />
                    </View>
                    <Select.ItemIndicator />
                  </Select.Item>
                </Select.Content>
              </Select.Portal>
            </Select>
          </View>
        </View>

        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "Poppins_400Regular",
            marginTop: 14,
            textAlign: "center",
          }}
        >
          Tap the plus icon to choose from gallery or take a picture.
        </Text>

        {profileImage ? (
          <Pressable onPress={removeCurrentImage} style={{ marginTop: 14 }}>
            <Text
              style={{
                color: colors.danger,
                fontSize: 13,
                fontFamily: "Poppins_500Medium",
              }}
            >
              Remove selected image
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function VendorTypeStep({
  colors,
  selectedBusinessType,
  setSelectedBusinessType,
  customBusinessType,
  setCustomBusinessType,
}: {
  colors: any;
  selectedBusinessType: string;
  setSelectedBusinessType: (value: string) => void;
  customBusinessType: string;
  setCustomBusinessType: (value: string) => void;
}) {
  const isOtherSelected = selectedBusinessType === "Other";

  const handleSelect = (type: string) => {
    setSelectedBusinessType(type);

    if (type !== "Other") {
      setCustomBusinessType("");
    }
  };

  return (
    <View style={{ paddingVertical: 10 }}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 28,
          lineHeight: 36,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Choose your profession
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 15,
          lineHeight: 23,
          fontFamily: "Poppins_400Regular",
          marginTop: 8,
          marginBottom: 22,
        }}
      >
        Choose your vendor type. If it is not listed, select Other and type
        your own business type.
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {BUSINESS_TYPES.map((type) => {
          const selected = selectedBusinessType === type;

          return (
            <Pill
              key={type}
              colors={colors}
              label={type}
              selected={selected}
              onPress={() => handleSelect(type)}
            />
          );
        })}
      </View>

      {isOtherSelected ? (
        <View style={{ marginTop: 22 }}>
          <TextField>
            <Label>Custom Business Type</Label>
            <Input
              value={customBusinessType}
              onChangeText={setCustomBusinessType}
              placeholder="Example: Electronics Accessories Supplier"
              className="border-field-border bg-field-background"
            />
            <FieldError />
          </TextField>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              lineHeight: 18,
              fontFamily: "Poppins_400Regular",
              marginTop: 8,
            }}
          >
            This will be saved as your business type.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function InterestsStep({
  colors,
  categories,
  isLoading,
  selectedCategoryIds,
  toggleCategory,
}: {
  colors: any;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  }>;
  isLoading: boolean;
  selectedCategoryIds: string[];
  toggleCategory: (categoryId: string) => void;
}) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 28,
          lineHeight: 36,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Choose your business interests
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 15,
          lineHeight: 23,
          fontFamily: "Poppins_400Regular",
          marginTop: 8,
          marginBottom: 22,
        }}
      >
        Select topics you want to see in your vendor feed.
      </Text>

      {isLoading ? (
        <View style={{ paddingVertical: 28, alignItems: "center" }}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              fontFamily: "Poppins_400Regular",
              marginTop: 10,
            }}
          >
            Loading categories...
          </Text>
        </View>
      ) : null}

      {!isLoading && categories.length === 0 ? (
        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 14,
              fontFamily: "Poppins_500Medium",
            }}
          >
            No categories found.
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              fontFamily: "Poppins_400Regular",
              marginTop: 4,
            }}
          >
            Seed your backend categories first, then this list will appear
            here.
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {categories.map((category) => {
          const selected = selectedCategoryIds.includes(category.id);

          return (
            <Pill
              key={category.id}
              colors={colors}
              label={category.name}
              selected={selected}
              onPress={() => toggleCategory(category.id)}
            />
          );
        })}
      </View>

      {selectedCategoryIds.length > 0 ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontFamily: "Poppins_500Medium",
            marginTop: 18,
          }}
        >
          {selectedCategoryIds.length} selected
        </Text>
      ) : null}
    </View>
  );
}

function SuggestedCommunitiesStep({
  colors,
  communities,
  isLoading,
  selectedCommunityIds,
  toggleCommunity,
}: {
  colors: any;
  communities: SuggestedCommunity[];
  isLoading: boolean;
  selectedCommunityIds: string[];
  toggleCommunity: (communityId: string) => void;
}) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 28,
          lineHeight: 36,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Suggested communities
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 15,
          lineHeight: 23,
          fontFamily: "Poppins_400Regular",
          marginTop: 8,
          marginBottom: 22,
        }}
      >
        You can join useful communities now or explore more after onboarding.
      </Text>

      {isLoading ? (
        <View style={{ paddingVertical: 28, alignItems: "center" }}>
          <ActivityIndicator size="small" color={colors.accent} />

          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              fontFamily: "Poppins_400Regular",
              marginTop: 10,
            }}
          >
            Loading suggested communities...
          </Text>
        </View>
      ) : null}

      {!isLoading && communities.length === 0 ? (
        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 14,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            No suggestions yet.
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              lineHeight: 20,
              fontFamily: "Poppins_400Regular",
              marginTop: 4,
            }}
          >
            Create active communities in your backend first. Then suggestions
            will appear here.
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        {communities.map((community) => {
          const selected = selectedCommunityIds.includes(community.id);
          const avatarUrl = toAbsoluteFileUrl(community.avatarImage);

          return (
            <Pressable
              key={community.id}
              onPress={() => toggleCommunity(community.id)}
              style={{
                padding: 15,
                borderRadius: 22,
                backgroundColor: selected ? colors.accent : colors.surface,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    backgroundColor: selected ? "#FFFFFF22" : colors.segment,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name="people-outline"
                      size={22}
                      color={selected ? "#FFFFFF" : colors.accent}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: selected ? "#FFFFFF" : colors.foreground,
                      fontSize: 15,
                      fontFamily: "Poppins_600SemiBold",
                    }}
                  >
                    {community.name}
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={{
                      color: selected ? "#FFFFFFCC" : colors.muted,
                      fontSize: 12,
                      lineHeight: 18,
                      fontFamily: "Poppins_400Regular",
                      marginTop: 2,
                    }}
                  >
                    {community.description ??
                      community.category?.name ??
                      "Vendor community"}
                  </Text>

                  <Text
                    style={{
                      color: selected ? "#FFFFFFCC" : colors.muted,
                      fontSize: 11,
                      fontFamily: "Poppins_500Medium",
                      marginTop: 6,
                    }}
                  >
                    {community.visibility} • {community._count?.members ?? 0}{" "}
                    members • {community._count?.posts ?? 0} posts
                  </Text>
                </View>

                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={colors.accent}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedCommunityIds.length > 0 ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontFamily: "Poppins_500Medium",
            marginTop: 18,
          }}
        >
          {selectedCommunityIds.length} selected
        </Text>
      ) : null}
    </View>
  );
}

function BusinessProfileStep({
  colors,
  isTrainingProfession,
  businessName,
  setBusinessName,
  address,
  setAddress,
  businessEmail,
  setBusinessEmail,
  businessPhoneNo,
  setBusinessPhoneNo,
}: {
  colors: any;
  isTrainingProfession: boolean;
  businessName: string;
  setBusinessName: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  businessEmail: string;
  setBusinessEmail: (value: string) => void;
  businessPhoneNo: string;
  setBusinessPhoneNo: (value: string) => void;
}) {
  const emailLabel = isTrainingProfession
    ? "Professional Email"
    : "Business Email";
  const phoneLabel = isTrainingProfession
    ? "Professional Phone"
    : "Business Phone";

  return (
    <View style={{ paddingVertical: 10 }}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 28,
          lineHeight: 36,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {isTrainingProfession
          ? "Complete your contact details"
          : "Complete your business profile"}
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 15,
          lineHeight: 23,
          fontFamily: "Poppins_400Regular",
          marginTop: 8,
          marginBottom: 22,
        }}
      >
        {isTrainingProfession
          ? "This helps other vendors reach you directly for training or consultation."
          : "These details are required so other vendors can trust and reach you. PAN, registration number and cover image can be added later from Edit Profile."}
      </Text>

      <View style={{ gap: 16 }}>
        {!isTrainingProfession ? (
          <>
            <TextField>
              <Label>Business Name *</Label>
              <Input
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Example: Nikhil Electronics"
                className="border-field-border bg-field-background"
              />
              <FieldError />
            </TextField>

            <TextField>
              <Label>Address *</Label>
              <Input
                value={address}
                onChangeText={setAddress}
                placeholder="Example: Kathmandu, Nepal"
                className="border-field-border bg-field-background"
              />
              <FieldError />
            </TextField>
          </>
        ) : null}

        <TextField>
          <Label>{emailLabel} *</Label>
          <Input
            value={businessEmail}
            onChangeText={setBusinessEmail}
            placeholder="Example: contact@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border-field-border bg-field-background"
          />
          <FieldError />
        </TextField>

        <TextField>
          <Label>{phoneLabel} *</Label>
          <Input
            value={businessPhoneNo}
            onChangeText={setBusinessPhoneNo}
            placeholder="Example: 9800000000"
            keyboardType="phone-pad"
            className="border-field-border bg-field-background"
          />
          <FieldError />
        </TextField>
      </View>

      <View
        style={{
          marginTop: 22,
          padding: 16,
          borderRadius: 22,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={colors.accent}
          />

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 14,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Build more trust
            </Text>

            <Text
              style={{
                color: colors.muted,
                fontSize: 13,
                lineHeight: 20,
                fontFamily: "Poppins_400Regular",
                marginTop: 3,
              }}
            >
              A complete profile helps other vendors recognise and trust you
              in communities and chat.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function InfoCard({
  colors,
  icon,
  title,
  description,
}: {
  colors: any;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 16,
          backgroundColor: colors.segment,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={21} color={colors.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 14,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "Poppins_400Regular",
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function Pill({
  colors,
  label,
  selected,
  onPress,
}: {
  colors: any;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: selected ? colors.accent : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
      }}
    >
      {selected ? (
        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
      ) : null}

      <Text
        style={{
          color: selected ? "#FFFFFF" : colors.foreground,
          fontSize: 13,
          fontFamily: "Poppins_600SemiBold",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}