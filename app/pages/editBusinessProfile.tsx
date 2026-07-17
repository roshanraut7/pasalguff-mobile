import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { Button, FieldError, Input, Label, TextField } from "heroui-native";
import { BUSINESS_TYPES } from "@/constants/businesstype";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "@/store/api/profileApi";

// Keep in sync with TRAINING_PROFESSIONS in onboarding.tsx / profile.tsx
const TRAINING_PROFESSIONS = ["Instructor", "Trainer", "Trainee"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/;

export default function EditBusinessProfileScreen() {
  const { colors, isDark } = useAppTheme();

  const { data: profile, isLoading: profileLoading } = useGetMyProfileQuery();
  const [updateMyProfile, { isLoading: isSaving }] =
    useUpdateMyProfileMutation();

  const isTrainingProfession = TRAINING_PROFESSIONS.includes(
    profile?.businessType ?? "",
  );
const [businessType, setBusinessType] = useState(profile?.businessType ?? "");
const [customBusinessType, setCustomBusinessType] = useState("");
  const [businessName, setBusinessName] = useState(
    profile?.businessName ?? "",
  );
  const [address, setAddress] = useState(profile?.address ?? "");
  const [businessEmail, setBusinessEmail] = useState(
    profile?.businessEmail ?? "",
  );
  const [businessPhoneNo, setBusinessPhoneNo] = useState(
    profile?.businessPhoneNo ?? "",
  );
  const [serverError, setServerError] = useState("");

  // Re-sync local state once profile finishes loading (first render only
  // has no data yet, so fields would otherwise stay empty).
  const hasHydrated = React.useRef(false);
  React.useEffect(() => {
    if (profile && !hasHydrated.current) {
      setBusinessName(profile.businessName ?? "");
      setAddress(profile.address ?? "");
      setBusinessEmail(profile.businessEmail ?? "");
      setBusinessPhoneNo(profile.businessPhoneNo ?? "");
      hasHydrated.current = true;
    }
  }, [profile]);

  const isValid = isTrainingProfession
    ? EMAIL_REGEX.test(businessEmail.trim()) &&
      PHONE_REGEX.test(businessPhoneNo.trim())
    : businessName.trim().length > 0 &&
      address.trim().length > 0 &&
      EMAIL_REGEX.test(businessEmail.trim()) &&
      PHONE_REGEX.test(businessPhoneNo.trim());

  const emailLabel = isTrainingProfession
    ? "Professional Email"
    : "Business Email";
  const phoneLabel = isTrainingProfession
    ? "Professional Phone"
    : "Business Phone";

  const handleSave = async () => {
    setServerError("");

    if (!isValid) {
      setServerError(
        isTrainingProfession
          ? "Please fill in your professional email and professional phone number."
          : "Please fill in business name, address, business email, and business phone number.",
      );
      return;
    }

    try {
      await updateMyProfile({
          businessType: businessType.trim() || null,
        businessName: isTrainingProfession
          ? null
          : businessName.trim() || null,
        address: isTrainingProfession ? null : address.trim() || null,
        businessEmail: businessEmail.trim() || null,
        businessPhoneNo: businessPhoneNo.trim() || null,
      }).unwrap();

      router.back();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to save changes",
      );
    }
  };

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
          gap: 12,
          marginBottom: 22,
        }}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={colors.foreground}
          onPress={() => router.back()}
        />

        <Text
          style={{
            color: colors.foreground,
            fontSize: 20,
            fontFamily: "Poppins_700Bold",
          }}
        >
          {isTrainingProfession
            ? "Edit contact details"
            : "Edit business profile"}
        </Text>
      </View>

      {profileLoading ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
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
      )}

      <View style={{ paddingTop: 12 }}>
        <Button
          onPress={handleSave}
          isDisabled={isSaving || profileLoading}
          className="bg-accent rounded-full"
        >
          <Button.Label className="text-accent-foreground">
            {isSaving ? "Saving..." : "Save changes"}
          </Button.Label>
        </Button>
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