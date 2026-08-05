import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  FieldError,
  Input,
  Label,
  TextField,
} from "heroui-native";

import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { SuggestedCommunity } from "@/store/api/onboardingApi";
import type { ReferralShareStats } from "@/store/api/referralApi";

export type ProfileType =
  | "BUSINESS"
  | "INSTITUTE"
  | "INDIVIDUAL";

export type PickedProfileImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type IconName = keyof typeof Ionicons.glyphMap;

type RoleOption = {
  label: string;
  icon: IconName;
};

const PROFILE_TYPES: Array<{
  value: ProfileType;
  label: string;
  description: string;
  icon: IconName;
}> = [
  {
    value: "BUSINESS",
    label: "Business",
    description:
      "Retailer, manufacturer, wholesaler, supplier or service centre.",
    icon: "storefront-outline",
  },
  {
    value: "INSTITUTE",
    label: "Institute",
    description:
      "Technical institute, training centre, college or academy.",
    icon: "school-outline",
  },
  {
    value: "INDIVIDUAL",
    label: "Individual",
    description:
      "Student, technician, content creator, trainer or enthusiast.",
    icon: "person-outline",
  },
];

const PROFILE_ROLES: Record<
  ProfileType,
  RoleOption[]
> = {
  BUSINESS: [
    {
      label: "Retailer",
      icon: "cart-outline",
    },
    {
      label: "Manufacturer",
      icon: "business-outline",
    },
    {
      label: "Wholesaler",
      icon: "cube-outline",
    },
    {
      label: "Distributor",
      icon: "git-network-outline",
    },
    {
      label: "Importer",
      icon: "globe-outline",
    },
    {
      label: "Supplier",
      icon: "layers-outline",
    },
    {
      label: "Service Centre",
      icon: "construct-outline",
    },
    {
      label: "Other",
      icon: "ellipsis-horizontal-circle-outline",
    },
  ],

  INSTITUTE: [
    {
      label: "Technical Institute",
      icon: "school-outline",
    },
    {
      label: "Training Centre",
      icon: "book-outline",
    },
    {
      label: "Technical College",
      icon: "business-outline",
    },
    {
      label: "Academy",
      icon: "ribbon-outline",
    },
    {
      label: "Vocational Centre",
      icon: "people-outline",
    },
    {
      label: "Other",
      icon: "ellipsis-horizontal-circle-outline",
    },
  ],

  INDIVIDUAL: [
    {
      label: "Technical Student",
      icon: "school-outline",
    },
    {
      label: "Technician",
      icon: "construct-outline",
    },
    {
      label: "Content Creator",
      icon: "videocam-outline",
    },
    {
      label: "Trainer",
      icon: "mic-outline",
    },
    {
      label: "Freelancer",
      icon: "laptop-outline",
    },
    {
      label: "Job Seeker",
      icon: "briefcase-outline",
    },
    {
      label: "Tech Enthusiast",
      icon: "bulb-outline",
    },
    {
      label: "Other",
      icon: "ellipsis-horizontal-circle-outline",
    },
  ],
};

function categoryIcon(
  name: string,
  slug: string,
): IconName {
  const text =
    `${name} ${slug}`.toLowerCase();

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

/* =========================================================
   WELCOME STEP
   ========================================================= */

export function WelcomeStep({
  colors,
}: {
  colors: any;
}) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          marginBottom: 20,
        }}
      >
        <Ionicons
          name="sparkles-outline"
          size={16}
          color={colors.accent}
        />

        <Text
          style={{
            color: colors.accent,
            fontSize: 12,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          Your technical community starts here
        </Text>
      </View>

      <View
        style={{
          width: 112,
          height: 112,
          borderRadius: 34,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 24,
        }}
      >
        <Image
          source={require("@/assets/images/kamkuro.png")}
          style={{
            width: 88,
            height: 88,
          }}
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
          marginTop: 10,
        }}
      >
        Connect technical students, institutes, businesses,
        professionals and content creators in one trusted
        community.
      </Text>

      <View
        style={{
          gap: 12,
          marginTop: 26,
        }}
      >
        <InfoCard
          colors={colors}
          icon="people-outline"
          title="Find your people"
          description="Join communities matching your profession and interests."
        />

        <InfoCard
          colors={colors}
          icon="school-outline"
          title="Learn and grow"
          description="Discover students, institutes, trainers and discussions."
        />

        <InfoCard
          colors={colors}
          icon="storefront-outline"
          title="Build connections"
          description="Connect with businesses, creators and technicians."
        />
      </View>
    </View>
  );
}

/* =========================================================
   PROFILE PHOTO STEP
   ========================================================= */

export function ProfilePhotoStep({
  colors,
  profileImage,
  setProfileImage,
}: {
  colors: any;
  profileImage: PickedProfileImage | null;
  setProfileImage: (
    value: PickedProfileImage | null,
  ) => void;
}) {
  const pickGallery = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    setProfileImage({
      uri: asset.uri,
      fileName:
        asset.fileName ??
        `profile-${Date.now()}.jpg`,
      mimeType:
        asset.mimeType ?? "image/jpeg",
    });
  };

  const takePhoto = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        cameraType:
          ImagePicker.CameraType.front,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    setProfileImage({
      uri: asset.uri,
      fileName:
        asset.fileName ??
        `profile-${Date.now()}.jpg`,
      mimeType:
        asset.mimeType ?? "image/jpeg",
    });
  };

  return (
    <View style={{ paddingVertical: 8 }}>
      <Heading
        colors={colors}
        eyebrow="Make it personal"
        title="Add a profile photo"
        description="Help people recognise you. You can also skip this step."
      />

      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 170,
            height: 170,
            borderRadius: 85,
            padding: 7,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: 78,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.segment,
            }}
          >
            {profileImage ? (
              <Image
                source={{
                  uri: profileImage.uri,
                }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : (
              <Ionicons
                name="person-outline"
                size={58}
                color={colors.muted}
              />
            )}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 28,
          }}
        >
          <PhotoButton
            colors={colors}
            icon="images-outline"
            label="Gallery"
            onPress={pickGallery}
          />

          <PhotoButton
            colors={colors}
            icon="camera-outline"
            label="Camera"
            onPress={takePhoto}
          />
        </View>

        {profileImage ? (
          <Pressable
            onPress={() =>
              setProfileImage(null)
            }
            style={{
              flexDirection: "row",
              gap: 7,
              alignItems: "center",
              marginTop: 18,
            }}
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color={colors.danger}
            />

            <Text
              style={{
                color: colors.danger,
                fontSize: 13,
                fontFamily:
                  "Poppins_500Medium",
              }}
            >
              Remove selected photo
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/* =========================================================
   ACCOUNT TYPE STEP
   ========================================================= */

export function AccountTypeStep({
  colors,
  selected,
  onSelect,
}: {
  colors: any;
  selected: ProfileType | null;
  onSelect: (
    value: ProfileType,
  ) => void;
}) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Heading
        colors={colors}
        eyebrow="Tell us who you are"
        title="Choose your account type"
        description="We use this to show relevant professions and content."
      />

      <View style={{ gap: 13 }}>
        {PROFILE_TYPES.map((option) => (
          <LargeCard
            key={option.value}
            colors={colors}
            icon={option.icon}
            title={option.label}
            description={
              option.description
            }
            selected={
              selected === option.value
            }
            onPress={() =>
              onSelect(option.value)
            }
          />
        ))}
      </View>
    </View>
  );
}

/* =========================================================
   PROFESSION STEP
   ========================================================= */

export function ProfessionStep({
  colors,
  profileType,
  selectedRole,
  customRole,
  onSelectRole,
  onChangeCustomRole,
}: {
  colors: any;
  profileType: ProfileType | null;
  selectedRole: string;
  customRole: string;
  onSelectRole: (
    value: string,
  ) => void;
  onChangeCustomRole: (
    value: string,
  ) => void;
}) {
  const roles = profileType
    ? PROFILE_ROLES[profileType]
    : [];

  const typeLabel =
    profileType === "BUSINESS"
      ? "business"
      : profileType === "INSTITUTE"
        ? "institute"
        : "individual profile";

  return (
    <View style={{ paddingVertical: 8 }}>
      <Heading
        colors={colors}
        eyebrow="Your main role"
        title="What best describes you?"
        description={`Choose one main role for your ${typeLabel}.`}
      />

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent:
            "space-between",
          rowGap: 12,
        }}
      >
        {roles.map((role) => (
          <SmallCard
            key={role.label}
            colors={colors}
            icon={role.icon}
            label={role.label}
            selected={
              selectedRole ===
              role.label
            }
            onPress={() =>
              onSelectRole(role.label)
            }
          />
        ))}
      </View>

      {selectedRole === "Other" ? (
        <View
          style={{
            padding: 16,
            borderRadius: 22,
            backgroundColor:
              colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            marginTop: 20,
          }}
        >
          <TextField>
            <Label>
              Describe your profession or role *
            </Label>

            <Input
              value={customRole}
              onChangeText={
                onChangeCustomRole
              }
              placeholder="Example: Drone Repair Technician"
              maxLength={100}
              className="border-field-border bg-field-background"
            />

            <FieldError />
          </TextField>
        </View>
      ) : null}
    </View>
  );
}

/* =========================================================
   INTERESTS STEP
   ========================================================= */

export function InterestsStep({
  colors,
  categories,
  isLoading,
  selectedIds,
  onToggle,
}: {
  colors: any;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  }>;
  isLoading: boolean;
  selectedIds: string[];
  onToggle: (
    id: string,
  ) => void;
}) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Heading
        colors={colors}
        eyebrow="Personalise your experience"
        title="Choose your interests"
        description="Select one or more technical areas for your feed and community suggestions."
      />

      {isLoading ? (
        <LoadingBox
          colors={colors}
          label="Loading interests..."
        />
      ) : null}

      {!isLoading &&
      categories.length === 0 ? (
        <EmptyBox
          colors={colors}
          icon="albums-outline"
          title="No interests available"
          description="Add active categories in the backend first."
        />
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent:
            "space-between",
          rowGap: 12,
        }}
      >
        {categories.map(
          (category) => (
            <InterestCard
              key={category.id}
              colors={colors}
              icon={categoryIcon(
                category.name,
                category.slug,
              )}
              title={category.name}
              description={
                category.description
              }
              selected={selectedIds.includes(
                category.id,
              )}
              onPress={() =>
                onToggle(category.id)
              }
            />
          ),
        )}
      </View>

      {selectedIds.length > 0 ? (
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontFamily:
              "Poppins_500Medium",
            marginTop: 18,
          }}
        >
          {selectedIds.length} interests selected
        </Text>
      ) : null}
    </View>
  );
}

/* =========================================================
   SUGGESTED COMMUNITIES STEP
   ========================================================= */

export function SuggestedCommunitiesStep({
  colors,
  communities,
  isLoading,
  selectedIds,
  onToggle,
}: {
  colors: any;
  communities:
    SuggestedCommunity[];
  isLoading: boolean;
  selectedIds: string[];
  onToggle: (
    id: string,
  ) => void;
}) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Heading
        colors={colors}
        eyebrow="Start connecting"
        title="Suggested communities"
        description="Join communities now, or skip and explore them later."
      />

      {isLoading ? (
        <LoadingBox
          colors={colors}
          label="Finding communities..."
        />
      ) : null}

      {!isLoading &&
      communities.length === 0 ? (
        <EmptyBox
          colors={colors}
          icon="people-outline"
          title="No suggestions yet"
          description="Finish onboarding and explore communities later."
        />
      ) : null}

      <View style={{ gap: 12 }}>
        {communities.map(
          (community) => {
            const selected =
              selectedIds.includes(
                community.id,
              );

            const avatar =
              toAbsoluteFileUrl(
                community.avatarImage,
              );

            return (
              <Pressable
                key={community.id}
                onPress={() =>
                  onToggle(community.id)
                }
                style={{
                  padding: 15,
                  borderRadius: 22,
                  backgroundColor:
                    selected
                      ? colors.accent
                      : colors.surface,
                  borderWidth: 1,
                  borderColor:
                    selected
                      ? colors.accent
                      : colors.border,
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
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      backgroundColor:
                        selected
                          ? "#FFFFFF22"
                          : colors.segment,
                      alignItems: "center",
                      justifyContent:
                        "center",
                      overflow: "hidden",
                    }}
                  >
                    {avatar ? (
                      <Image
                        source={{
                          uri: avatar,
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    ) : (
                      <Ionicons
                        name="people-outline"
                        size={24}
                        color={
                          selected
                            ? "#FFFFFF"
                            : colors.accent
                        }
                      />
                    )}
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: selected
                          ? "#FFFFFF"
                          : colors.foreground,
                        fontSize: 15,
                        fontFamily:
                          "Poppins_600SemiBold",
                      }}
                    >
                      {community.name}
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={{
                        color: selected
                          ? "#FFFFFFCC"
                          : colors.muted,
                        fontSize: 12,
                        lineHeight: 18,
                        fontFamily:
                          "Poppins_400Regular",
                        marginTop: 3,
                      }}
                    >
                      {community.description ??
                        community.category
                          ?.name ??
                        "Technical community"}
                    </Text>

                    <Text
                      style={{
                        color: selected
                          ? "#FFFFFFCC"
                          : colors.muted,
                        fontSize: 11,
                        fontFamily:
                          "Poppins_500Medium",
                        marginTop: 6,
                      }}
                    >
                      {community._count
                        ?.members ?? 0}{" "}
                      members •{" "}
                      {community._count
                        ?.posts ?? 0}{" "}
                      posts
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      selected
                        ? "checkmark-circle"
                        : "add-circle-outline"
                    }
                    size={25}
                    color={
                      selected
                        ? "#FFFFFF"
                        : colors.accent
                    }
                  />
                </View>
              </Pressable>
            );
          },
        )}
      </View>
    </View>
  );
}

/* =========================================================
   INVITE FRIENDS STEP
   ========================================================= */

export function InviteFriendsStep({
  colors,
  stats,
  onOpenShareSheet,
}: {
  colors: any;
  stats:
    | ReferralShareStats
    | null;
  onOpenShareSheet: () => void;
}) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Heading
        colors={colors}
        eyebrow="One last step"
        title="Invite your friends"
        description="Share your referral download link or skip this step."
      />

      <Pressable
        onPress={onOpenShareSheet}
        style={({ pressed }) => ({
          padding: 14,
          borderRadius: 18,
          backgroundColor:
            colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        })}
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
              width: 44,
              height: 44,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                colors.segment,
            }}
          >
            <Ionicons
              name="share-social-outline"
              size={21}
              color={colors.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 15,
                fontFamily:
                  "Poppins_600SemiBold",
              }}
            >
              Share KamKuro
            </Text>

            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                lineHeight: 17,
                fontFamily:
                  "Poppins_400Regular",
                marginTop: 2,
              }}
            >
              Invite friends using your tracked download link.
            </Text>
          </View>

          <View
            style={{
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor:
                colors.accent,
            }}
          >
            <Text
              style={{
                color:
                  colors.accentForeground,
                fontSize: 11,
                fontFamily:
                  "Poppins_600SemiBold",
              }}
            >
              {stats
                ? "View"
                : "Share"}
            </Text>
          </View>
        </View>
      </Pressable>

      {stats ? (
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 10,
          }}
        >
          <StatCard
            colors={colors}
            label="Shares"
            value={stats.shareCount}
          />

          <StatCard
            colors={colors}
            label="Opens"
            value={
              stats.pageOpenCount
            }
          />

          <StatCard
            colors={colors}
            label="Downloads"
            value={
              stats.downloadCount
            }
          />
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 14,
          padding: 12,
          borderRadius: 16,
          backgroundColor:
            colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons
          name="information-circle-outline"
          size={19}
          color={colors.accent}
        />

        <Text
          style={{
            flex: 1,
            color: colors.muted,
            fontSize: 11,
            lineHeight: 17,
            fontFamily:
              "Poppins_400Regular",
          }}
        >
          This step is optional. You can finish onboarding without sharing.
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   PRIVATE SHARED COMPONENTS
   ========================================================= */

function Heading({
  colors,
  eyebrow,
  title,
  description,
}: {
  colors: any;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        marginBottom: 24,
      }}
    >
      <Text
        style={{
          color: colors.accent,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontFamily:
            "Poppins_600SemiBold",
          marginBottom: 7,
        }}
      >
        {eyebrow}
      </Text>

      <Text
        style={{
          color: colors.foreground,
          fontSize: 28,
          lineHeight: 36,
          fontFamily:
            "Poppins_700Bold",
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 14,
          lineHeight: 22,
          fontFamily:
            "Poppins_400Regular",
          marginTop: 8,
        }}
      >
        {description}
      </Text>
    </View>
  );
}

function LargeCard({
  colors,
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  colors: any;
  icon: IconName;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 16,
        borderRadius: 24,
        backgroundColor: selected
          ? colors.accent
          : colors.surface,
        borderWidth: 1,
        borderColor: selected
          ? colors.accent
          : colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
        }}
      >
        <IconBox
          colors={colors}
          icon={icon}
          selected={selected}
          size={52}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: selected
                ? "#FFFFFF"
                : colors.foreground,
              fontSize: 16,
              fontFamily:
                "Poppins_600SemiBold",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: selected
                ? "#FFFFFFCC"
                : colors.muted,
              fontSize: 12,
              lineHeight: 18,
              fontFamily:
                "Poppins_400Regular",
              marginTop: 3,
            }}
          >
            {description}
          </Text>
        </View>

        <Ionicons
          name={
            selected
              ? "checkmark-circle"
              : "chevron-forward-circle-outline"
          }
          size={24}
          color={
            selected
              ? "#FFFFFF"
              : colors.muted
          }
        />
      </View>
    </Pressable>
  );
}

function SmallCard({
  colors,
  icon,
  label,
  selected,
  onPress,
}: {
  colors: any;
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "48.5%",
        minHeight: 116,
        padding: 14,
        borderRadius: 22,
        justifyContent:
          "space-between",
        backgroundColor: selected
          ? colors.accent
          : colors.surface,
        borderWidth: 1,
        borderColor: selected
          ? colors.accent
          : colors.border,
      }}
    >
      <IconBox
        colors={colors}
        icon={icon}
        selected={selected}
        size={42}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 6,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: selected
              ? "#FFFFFF"
              : colors.foreground,
            fontSize: 13,
            lineHeight: 18,
            fontFamily:
              "Poppins_600SemiBold",
          }}
        >
          {label}
        </Text>

        {selected ? (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color="#FFFFFF"
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function InterestCard({
  colors,
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  colors: any;
  icon: IconName;
  title: string;
  description?:
    | string
    | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "48.5%",
        minHeight: 128,
        padding: 14,
        borderRadius: 22,
        backgroundColor: selected
          ? colors.accent
          : colors.surface,
        borderWidth: 1,
        borderColor: selected
          ? colors.accent
          : colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
        }}
      >
        <IconBox
          colors={colors}
          icon={icon}
          selected={selected}
          size={42}
        />

        {selected ? (
          <Ionicons
            name="checkmark-circle"
            size={19}
            color="#FFFFFF"
          />
        ) : null}
      </View>

      <Text
        style={{
          color: selected
            ? "#FFFFFF"
            : colors.foreground,
          fontSize: 13,
          lineHeight: 18,
          fontFamily:
            "Poppins_600SemiBold",
          marginTop: 12,
        }}
      >
        {title}
      </Text>

      {description ? (
        <Text
          numberOfLines={2}
          style={{
            color: selected
              ? "#FFFFFFBB"
              : colors.muted,
            fontSize: 10,
            lineHeight: 15,
            fontFamily:
              "Poppins_400Regular",
            marginTop: 4,
          }}
        >
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

function IconBox({
  colors,
  icon,
  selected,
  size,
}: {
  colors: any;
  icon: IconName;
  selected: boolean;
  size: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius:
          size > 45 ? 18 : 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected
          ? "#FFFFFF22"
          : colors.segment,
      }}
    >
      <Ionicons
        name={icon}
        size={
          size > 45 ? 25 : 21
        }
        color={
          selected
            ? "#FFFFFF"
            : colors.accent
        }
      />
    </View>
  );
}

function PhotoButton({
  colors,
  icon,
  label,
  onPress,
}: {
  colors: any;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 145,
        minHeight: 102,
        padding: 14,
        borderRadius: 22,
        backgroundColor:
          colors.surface,
        borderWidth: 1,
        borderColor:
          colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor:
            colors.segment,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={icon}
          size={22}
          color={colors.accent}
        />
      </View>

      <Text
        style={{
          color: colors.foreground,
          fontSize: 13,
          fontFamily:
            "Poppins_600SemiBold",
          marginTop: 9,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function InfoCard({
  colors,
  icon,
  title,
  description,
}: {
  colors: any;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 22,
        backgroundColor:
          colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor:
            colors.segment,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colors.accent}
        />
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
          {title}
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 19,
            fontFamily:
              "Poppins_400Regular",
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function LoadingBox({
  colors,
  label,
}: {
  colors: any;
  label: string;
}) {
  return (
    <View
      style={{
        padding: 24,
        borderRadius: 22,
        backgroundColor:
          colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <ActivityIndicator
        size="small"
        color={colors.accent}
      />

      <Text
        style={{
          color: colors.muted,
          fontSize: 13,
          fontFamily:
            "Poppins_400Regular",
          marginTop: 10,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function EmptyBox({
  colors,
  icon,
  title,
  description,
}: {
  colors: any;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        padding: 18,
        borderRadius: 22,
        backgroundColor:
          colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor:
            colors.segment,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colors.accent}
        />
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
          {title}
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 18,
            fontFamily:
              "Poppins_400Regular",
            marginTop: 3,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function StatCard({
  colors,
  label,
  value,
}: {
  colors: any;
  label: string;
  value: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        backgroundColor:
          colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 8,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: 15,
          fontFamily:
            "Poppins_700Bold",
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 9,
          fontFamily:
            "Poppins_500Medium",
        }}
      >
        {label}
      </Text>
    </View>
  );
}