import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
} from "heroui-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  type UserProfileType,
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "@/store/api/profileApi";
import {
  PROFILE_ROLES,
  PROFILE_TYPES,
} from "@/constants/ profile-options";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;

function cleanOptional(value: string) {
  return value.trim() || null;
}

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

  return "Failed to save profile";
}

export default function EditProfileScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: profile,
    isLoading: profileLoading,
  } = useGetMyProfileQuery();

  const [updateMyProfile, { isLoading: isSaving }] =
    useUpdateMyProfileMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [profileType, setProfileType] =
    useState<UserProfileType>("INDIVIDUAL");

  const [profileRole, setProfileRole] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  const [publicEmail, setPublicEmail] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [website, setWebsite] = useState("");

  const [organizationName, setOrganizationName] =
    useState("");
  const [
    organizationAddress,
    setOrganizationAddress,
  ] = useState("");

  const [serverError, setServerError] = useState("");

  const hasHydrated = useRef(false);

  useEffect(() => {
    if (!profile || hasHydrated.current) return;

    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");

    setProfileType(
      profile.profileType ?? "INDIVIDUAL",
    );

    setProfileRole(profile.profileRole ?? "");
    setHeadline(profile.headline ?? "");
    setBio(profile.bio ?? "");
    setLocation(profile.location ?? "");

    setPublicEmail(profile.publicEmail ?? "");
    setPublicPhone(profile.publicPhone ?? "");
    setWebsite(profile.website ?? "");

    setOrganizationName(
      profile.organizationName ??
        profile.businessName ??
        "",
    );

    setOrganizationAddress(
      profile.organizationAddress ??
        profile.address ??
        "",
    );

    hasHydrated.current = true;
  }, [profile]);

  const roleOptions = useMemo(
    () => PROFILE_ROLES[profileType],
    [profileType],
  );

  const showOrganization =
    profileType === "BUSINESS" ||
    profileType === "INSTITUTE";

  const emailIsValid =
    !publicEmail.trim() ||
    EMAIL_REGEX.test(publicEmail.trim());

  const phoneIsValid =
    !publicPhone.trim() ||
    PHONE_REGEX.test(publicPhone.trim());

  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    profileRole.trim().length > 0 &&
    emailIsValid &&
    phoneIsValid;

  const handleSelectProfileType = (
    value: UserProfileType,
  ) => {
    setProfileType(value);

    if (!PROFILE_ROLES[value].includes(profileRole)) {
      setProfileRole("");
    }
  };

  const handleSave = async () => {
    setServerError("");

    if (!isValid) {
      setServerError(
        "Add your first name, last name and profile role. Also check the email and phone formats.",
      );
      return;
    }

    if (
      showOrganization &&
      !organizationName.trim()
    ) {
      setServerError(
        profileType === "BUSINESS"
          ? "Business name is required."
          : "Institute name is required.",
      );
      return;
    }

    try {
      await updateMyProfile({
        name:
          `${firstName.trim()} ${lastName.trim()}`.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),

        profileType,
        profileRole:
          cleanOptional(profileRole),

        headline: cleanOptional(headline),
        bio: cleanOptional(bio),
        location: cleanOptional(location),

        publicEmail:
          cleanOptional(publicEmail),
        publicPhone:
          cleanOptional(publicPhone),
        website: cleanOptional(website),

        organizationName: showOrganization
          ? cleanOptional(organizationName)
          : null,

        organizationAddress: showOrganization
          ? cleanOptional(organizationAddress)
          : null,
      }).unwrap();

      router.back();
    } catch (error) {
      setServerError(
        getApiErrorMessage(error),
      );
    }
  };

  const content = (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
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
          Edit profile
        </Text>
      </View>

      {profileLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator
            size="small"
            color={colors.accent}
          />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 130,
          }}
        >
          <SectionHeading
            title="Basic information"
            colors={colors}
          />

          <View style={{ gap: 16 }}>
            <TextField>
              <Label>First name *</Label>
              <Input
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                className="border-field-border bg-field-background"
              />
              <FieldError />
            </TextField>

            <TextField>
              <Label>Last name *</Label>
              <Input
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                className="border-field-border bg-field-background"
              />
              <FieldError />
            </TextField>
          </View>

          <SectionHeading
            title="Profile type"
            colors={colors}
          />

          <View style={{ gap: 10 }}>
            {PROFILE_TYPES.map((option) => {
              const selected =
                profileType === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    handleSelectProfileType(
                      option.value,
                    )
                  }
                  style={{
                    borderWidth: 1,
                    borderColor: selected
                      ? colors.accent
                      : colors.border,
                    backgroundColor: selected
                      ? `${colors.accent}12`
                      : colors.surface,
                    borderRadius: 18,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected
                        ? colors.accent
                        : colors.muted,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {selected ? (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor:
                            colors.accent,
                        }}
                      />
                    ) : null}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        fontFamily:
                          "Poppins_600SemiBold",
                      }}
                    >
                      {option.label}
                    </Text>

                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 12,
                        lineHeight: 18,
                        fontFamily:
                          "Poppins_400Regular",
                        marginTop: 2,
                      }}
                    >
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <SectionHeading
            title="Role"
            colors={colors}
          />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 9,
            }}
          >
            {roleOptions.map((role) => {
              const selected =
                profileRole === role;

              return (
                <Pressable
                  key={role}
                  onPress={() =>
                    setProfileRole(role)
                  }
                  style={{
                    borderWidth: 1,
                    borderColor: selected
                      ? colors.accent
                      : colors.border,
                    backgroundColor: selected
                      ? `${colors.accent}12`
                      : colors.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? colors.accent
                        : colors.foreground,
                      fontSize: 13,
                      fontFamily:
                        "Poppins_500Medium",
                    }}
                  >
                    {role}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <SectionHeading
            title="About"
            colors={colors}
          />

          <View style={{ gap: 16 }}>
            <TextField>
              <Label>Headline</Label>
              <Input
                value={headline}
                onChangeText={setHeadline}
                placeholder="Example: Mobile repair technician and trainer"
                className="border-field-border bg-field-background"
              />
              <FieldError />
            </TextField>

            <TextField>
              <Label>Bio</Label>
              <Input
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people about yourself, your work or your organisation"
                multiline
                numberOfLines={5}
                style={{
                  minHeight: 120,
                  textAlignVertical: "top",
                }}
                className="border-field-border bg-field-background"
              />
              <FieldError />
            </TextField>

            <TextField>
              <Label>Location</Label>
              <Input
                value={location}
                onChangeText={setLocation}
                placeholder="Example: Kathmandu, Nepal"
                className="border-field-border bg-field-background"
              />
              <FieldError />
            </TextField>
          </View>

          {showOrganization ? (
            <>
              <SectionHeading
                title={
                  profileType === "BUSINESS"
                    ? "Business information"
                    : "Institute information"
                }
                colors={colors}
              />

              <View style={{ gap: 16 }}>
                <TextField>
                  <Label>
                    {profileType === "BUSINESS"
                      ? "Business name *"
                      : "Institute name *"}
                  </Label>

                  <Input
                    value={organizationName}
                    onChangeText={
                      setOrganizationName
                    }
                    placeholder={
                      profileType === "BUSINESS"
                        ? "Enter your business name"
                        : "Enter your institute name"
                    }
                    className="border-field-border bg-field-background"
                  />
                  <FieldError />
                </TextField>

                <TextField>
                  <Label>
                    Organisation address
                  </Label>

                  <Input
                    value={organizationAddress}
                    onChangeText={
                      setOrganizationAddress
                    }
                    placeholder="Enter the organisation address"
                    className="border-field-border bg-field-background"
                  />
                  <FieldError />
                </TextField>
              </View>
            </>
          ) : null}

          <SectionHeading
            title="Public contact"
            colors={colors}
          />

          <View style={{ gap: 16 }}>
            <TextField
              isInvalid={!emailIsValid}
            >
              <Label>Public email</Label>

              <Input
                value={publicEmail}
                onChangeText={setPublicEmail}
                placeholder="contact@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="border-field-border bg-field-background"
              />

              {!emailIsValid ? (
                <FieldError>
                  Enter a valid email address
                </FieldError>
              ) : (
                <FieldError />
              )}
            </TextField>

            <TextField
              isInvalid={!phoneIsValid}
            >
              <Label>Public phone</Label>

              <Input
                value={publicPhone}
                onChangeText={setPublicPhone}
                placeholder="+977 9800000000"
                keyboardType="phone-pad"
                className="border-field-border bg-field-background"
              />

              {!phoneIsValid ? (
                <FieldError>
                  Enter a valid phone number
                </FieldError>
              ) : (
                <FieldError />
              )}
            </TextField>

            <TextField>
              <Label>Website</Label>

              <Input
                value={website}
                onChangeText={setWebsite}
                placeholder="example.com"
                autoCapitalize="none"
                keyboardType="url"
                className="border-field-border bg-field-background"
              />

              <FieldError />
            </TextField>
          </View>

          <SectionHeading
            title="Profile sections"
            colors={colors}
          />

          <View style={{ gap: 10 }}>
            <NavigationRow
              title="Interests"
              subtitle="Choose the topics you want to follow"
              icon="heart-outline"
              onPress={() =>
                router.push(
                  "/pages/profile/interests" as never,
                )
              }
              colors={colors}
            />

            <NavigationRow
              title="Skills"
              subtitle="Add your professional abilities"
              icon="construct-outline"
              onPress={() =>
                router.push(
                  "/pages/profile/skills" as never,
                )
              }
              colors={colors}
            />

            <NavigationRow
              title="Education"
              subtitle="Add schools and qualifications"
              icon="school-outline"
              onPress={() =>
                router.push(
                  "/pages/profile/education" as never,
                )
              }
              colors={colors}
            />

            <NavigationRow
              title="Experience"
              subtitle="Add your work history"
              icon="briefcase-outline"
              onPress={() =>
                router.push(
                  "/pages/profile/experiences" as never,
                )
              }
              colors={colors}
            />

            <NavigationRow
              title="Certifications"
              subtitle="Add certificates and licences"
              icon="ribbon-outline"
              onPress={() =>
                router.push(
                  "/pages/profile/certifications" as never,
                )
              }
              colors={colors}
            />
          </View>

          {serverError ? (
            <Text
              style={{
                color: colors.danger,
                fontSize: 13,
                lineHeight: 20,
                fontFamily:
                  "Poppins_500Medium",
                marginTop: 18,
              }}
            >
              {serverError}
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
            isSaving ||
            profileLoading ||
            !isValid
          }
          className="bg-accent rounded-full"
        >
          <Button.Label className="text-accent-foreground">
            {isSaving
              ? "Saving..."
              : "Save changes"}
          </Button.Label>
        </Button>
      </View>
    </View>
  );

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
    </SafeAreaView>
  );
}

function SectionHeading({
  title,
  colors,
}: {
  title: string;
  colors: {
    foreground: string;
  };
}) {
  return (
    <Text
      style={{
        color: colors.foreground,
        fontSize: 15,
        fontFamily: "Poppins_700Bold",
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      {title}
    </Text>
  );
}

function NavigationRow({
  title,
  subtitle,
  icon,
  onPress,
  colors,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
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
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${colors.accent}12`,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.accent}
        />
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
            fontSize: 12,
            fontFamily: "Poppins_400Regular",
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.muted}
      />
    </Pressable>
  );
}