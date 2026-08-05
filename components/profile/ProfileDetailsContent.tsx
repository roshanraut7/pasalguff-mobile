import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { ProfileItem } from "@/store/api/profileApi";

type ProfileDetailsContentProps = {
  profile?: ProfileItem;
  colors: ProfileDetailsColors;
  showSummary?: boolean;
  editable?: boolean;
};

export default function ProfileDetailsContent({
  profile,
  colors,
  showSummary = false,
  editable = true,
}: ProfileDetailsContentProps) {
  const fullName = useMemo(() => {
    if (profile?.name?.trim()) {
      return profile.name.trim();
    }

    const joined = `${
      profile?.firstName ?? ""
    } ${
      profile?.lastName ?? ""
    }`.trim();

    return joined || "User";
  }, [profile]);

  if (!profile) {
    return (
      <View
        style={{
          minHeight: 180,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 18,
          paddingVertical: 30,
        }}
      >
        <ActivityIndicator
          size="small"
          color={colors.accent}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingTop: showSummary ? 0 : 18,
        paddingBottom: 44,
      }}
    >
      {showSummary ? (
        <View
          style={{
            marginTop: 6,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 22,
              fontFamily: "Poppins_700Bold",
            }}
          >
            {fullName}
          </Text>

          {profile.profileRole ? (
            <Text
              style={{
                color: colors.accent,
                fontSize: 13,
                fontFamily:
                  "Poppins_600SemiBold",
                marginTop: 3,
              }}
            >
              {profile.profileRole}
            </Text>
          ) : null}

          {profile.headline ? (
            <Text
              style={{
                color: colors.muted,
                fontSize: 13,
                lineHeight: 20,
                fontFamily:
                  "Poppins_400Regular",
                marginTop: 5,
              }}
            >
              {profile.headline}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ProfileSectionCard
        title="About"
        icon="person-outline"
        onEdit={
          editable
            ? () =>
                router.push(
                  "/pages/editProfile" as never,
                )
            : undefined
        }
        colors={colors}
      >
          {profile.bio ? (
            <Text
              style={{
                color: colors.foreground,
                fontSize: 13,
                lineHeight: 21,
                fontFamily:
                  "Poppins_400Regular",
              }}
            >
              {profile.bio}
            </Text>
          ) : (
            <ProfileEmpty
              text={
                editable
                  ? "Add information about yourself, your work or your organisation."
                  : "No about information has been added."
              }
              onPress={
                editable
                  ? () =>
                      router.push(
                        "/pages/editProfile" as never,
                      )
                  : undefined
              }
              colors={colors}
            />
          )}

          <View
            style={{
              gap: 2,
              marginTop: 12,
            }}
          >
            {profile.profileType ? (
              <InfoRow
                icon="person-circle-outline"
                label="Profile type"
                value={formatProfileType(
                  profile.profileType,
                )}
                colors={colors}
              />
            ) : null}

            {profile.location ? (
              <InfoRow
                icon="location-outline"
                label="Location"
                value={profile.location}
                colors={colors}
              />
            ) : null}
          </View>
        </ProfileSectionCard>

        {profile.organizationName ||
        profile.organizationAddress ? (
          <ProfileSectionCard
            title={
              profile.profileType ===
              "INSTITUTE"
                ? "Institute"
                : "Organisation"
            }
            icon="business-outline"
            onEdit={
              editable
                ? () =>
                    router.push(
                      "/pages/editProfile" as never,
                    )
                : undefined
            }
            colors={colors}
          >
            {profile.organizationName ? (
              <InfoRow
                icon="business-outline"
                label="Name"
                value={
                  profile.organizationName
                }
                colors={colors}
              />
            ) : null}

            {profile.organizationAddress ? (
              <InfoRow
                icon="location-outline"
                label="Address"
                value={
                  profile.organizationAddress
                }
                colors={colors}
              />
            ) : null}
          </ProfileSectionCard>
        ) : null}

        <ProfileSectionCard
          title="Interests"
          icon="heart-outline"
          onEdit={
            editable
              ? () =>
                  router.push(
                    "/pages/profile/interests" as never,
                  )
              : undefined
          }
          colors={colors}
        >
          {profile.interests?.length ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {profile.interests.map(
                (interest) => (
                  <View
                    key={interest.id}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor:
                        `${colors.accent}12`,
                      borderWidth: 1,
                      borderColor:
                        `${colors.accent}30`,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.accent,
                        fontSize: 12,
                        fontFamily:
                          "Poppins_500Medium",
                      }}
                    >
                      {interest.name}
                    </Text>
                  </View>
                ),
              )}
            </View>
          ) : (
            <ProfileEmpty
              text={
                editable
                  ? "Add the topics you are interested in."
                  : "No interests have been added."
              }
              onPress={
                editable
                  ? () =>
                      router.push(
                        "/pages/profile/interests" as never,
                      )
                  : undefined
              }
              colors={colors}
            />
          )}
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Skills"
          icon="construct-outline"
          onEdit={
            editable
              ? () =>
                  router.push(
                    "/pages/profile/skills" as never,
                  )
              : undefined
          }
          colors={colors}
        >
          {profile.skills?.length ? (
            <View style={{ gap: 14 }}>
              {profile.skills.map((item) => (
                <ProfileTimelineItem
                  key={item.id}
                  title={item.skill.name}
                  meta={
                    item.yearsExperience != null
                      ? `${
                          item.yearsExperience
                        } ${
                          item.yearsExperience ===
                          1
                            ? "year"
                            : "years"
                        } of experience`
                      : null
                  }
                  colors={colors}
                />
              ))}
            </View>
          ) : (
            <ProfileEmpty
              text={
                editable
                  ? "Add your professional skills."
                  : "No skills have been added."
              }
              onPress={
                editable
                  ? () =>
                      router.push(
                        "/pages/profile/skills" as never,
                      )
                  : undefined
              }
              colors={colors}
            />
          )}
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Education"
          icon="school-outline"
          onEdit={
            editable
              ? () =>
                  router.push(
                    "/pages/profile/education" as never,
                  )
              : undefined
          }
          colors={colors}
        >
          {profile.education?.length ? (
            <View style={{ gap: 16 }}>
              {profile.education.map(
                (item) => (
                  <ProfileTimelineItem
                    key={item.id}
                    title={
                      item.qualification ||
                      item.institutionName
                    }
                    subtitle={
                      item.qualification
                        ? item.institutionName
                        : item.fieldOfStudy
                    }
                    meta={formatEducationPeriod(
                      item.startYear,
                      item.endYear,
                      item.isCurrentlyStudying,
                    )}
                    description={
                      item.description
                    }
                    colors={colors}
                  />
                ),
              )}
            </View>
          ) : (
            <ProfileEmpty
              text={
                editable
                  ? "Add your school, college or qualification."
                  : "No education information has been added."
              }
              onPress={
                editable
                  ? () =>
                      router.push(
                        "/pages/profile/education" as never,
                      )
                  : undefined
              }
              colors={colors}
            />
          )}
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Experience"
          icon="briefcase-outline"
          onEdit={
            editable
              ? () =>
                  router.push(
                    "/pages/profile/experiences" as never,
                  )
              : undefined
          }
          colors={colors}
        >
          {profile.experiences?.length ? (
            <View style={{ gap: 16 }}>
              {profile.experiences.map(
                (item) => (
                  <ProfileTimelineItem
                    key={item.id}
                    title={item.title}
                    subtitle={
                      item.organizationName
                    }
                    meta={[
                      formatEmploymentType(
                        item.employmentType,
                      ),
                      formatDatePeriod(
                        item.startDate,
                        item.endDate,
                        item.isCurrent,
                      ),
                      item.location,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    description={
                      item.description
                    }
                    colors={colors}
                  />
                ),
              )}
            </View>
          ) : (
            <ProfileEmpty
              text={
                editable
                  ? "Add your work, freelance or volunteer experience."
                  : "No experience has been added."
              }
              onPress={
                editable
                  ? () =>
                      router.push(
                        "/pages/profile/experiences" as never,
                      )
                  : undefined
              }
              colors={colors}
            />
          )}
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Certifications"
          icon="ribbon-outline"
          onEdit={
            editable
              ? () =>
                  router.push(
                    "/pages/profile/certifications" as never,
                  )
              : undefined
          }
          colors={colors}
        >
          {profile.certifications?.length ? (
            <View style={{ gap: 16 }}>
              {profile.certifications.map(
                (item) => (
                  <ProfileTimelineItem
                    key={item.id}
                    title={item.name}
                    subtitle={
                      item.issuingOrganization
                    }
                    meta={[
                      item.issueDate
                        ? `Issued ${formatMonthYear(
                            item.issueDate,
                          )}`
                        : null,
                      item.expiryDate
                        ? `Expires ${formatMonthYear(
                            item.expiryDate,
                          )}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                    description={
                      item.credentialId
                        ? `Credential ID: ${item.credentialId}`
                        : item.description
                    }
                    colors={colors}
                  />
                ),
              )}
            </View>
          ) : (
            <ProfileEmpty
              text={
                editable
                  ? "Add your certificates and licences."
                  : "No certifications have been added."
              }
              onPress={
                editable
                  ? () =>
                      router.push(
                        "/pages/profile/certifications" as never,
                      )
                  : undefined
              }
              colors={colors}
            />
          )}
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Contact"
          icon="call-outline"
          onEdit={
            editable
              ? () =>
                  router.push(
                    "/pages/editProfile" as never,
                  )
              : undefined
          }
          colors={colors}
        >
          {profile.publicEmail ||
          profile.publicPhone ||
          profile.website ? (
            <View style={{ gap: 2 }}>
              {profile.publicEmail ? (
                <InfoRow
                  icon="mail-outline"
                  label="Email"
                  value={profile.publicEmail}
                  colors={colors}
                />
              ) : null}

              {profile.publicPhone ? (
                <InfoRow
                  icon="call-outline"
                  label="Phone"
                  value={profile.publicPhone}
                  colors={colors}
                />
              ) : null}

              {profile.website ? (
                <InfoRow
                  icon="globe-outline"
                  label="Website"
                  value={profile.website}
                  colors={colors}
                />
              ) : null}
            </View>
          ) : (
            <ProfileEmpty
              text={
                editable
                  ? "Add public contact information."
                  : "No public contact information has been added."
              }
              onPress={
                editable
                  ? () =>
                      router.push(
                        "/pages/editProfile" as never,
                      )
                  : undefined
              }
              colors={colors}
            />
          )}
        </ProfileSectionCard>
    </View>
  );
}

export type ProfileDetailsColors = {
  background: string;
  surface: string;
  border: string;
  foreground: string;
  muted: string;
  accent: string;
  danger: string;
};

function ProfileSectionCard({
  title,
  icon,
  onEdit,
  colors,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onEdit?: () => void;
  colors: ProfileDetailsColors;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              `${colors.accent}12`,
          }}
        >
          <Ionicons
            name={icon}
            size={19}
            color={colors.accent}
          />
        </View>

        <Text
          style={{
            flex: 1,
            color: colors.foreground,
            fontSize: 15,
            fontFamily: "Poppins_700Bold",
            marginLeft: 10,
          }}
        >
          {title}
        </Text>

        {onEdit ? (
          <Pressable
            hitSlop={8}
            onPress={onEdit}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons
              name="pencil-outline"
              size={16}
              color={colors.accent}
            />
          </Pressable>
        ) : null}
      </View>

      {children}
    </View>
  );
}

function ProfileEmpty({
  text,
  onPress,
  colors,
}: {
  text: string;
  onPress?: () => void;
  colors: ProfileDetailsColors;
}) {
  const content = (
    <>
      <Ionicons
        name={
          onPress
            ? "add-circle-outline"
            : "information-circle-outline"
        }
        size={21}
        color={onPress ? colors.accent : colors.muted}
      />

      <Text
        style={{
          flex: 1,
          color: colors.muted,
          fontSize: 12,
          lineHeight: 18,
          fontFamily: "Poppins_400Regular",
        }}
      >
        {text}
      </Text>
    </>
  );

  const containerStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: colors.border,
  };

  if (!onPress) {
    return <View style={containerStyle}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={containerStyle}>
      {content}
    </Pressable>
  );
}

function ProfileTimelineItem({
  title,
  subtitle,
  meta,
  description,
  colors,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  description?: string | null;
  colors: ProfileDetailsColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 11,
      }}
    >
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          backgroundColor: colors.accent,
          marginTop: 6,
        }}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 13,
            fontFamily:
              "Poppins_600SemiBold",
          }}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={{
              color: colors.foreground,
              fontSize: 12,
              fontFamily:
                "Poppins_400Regular",
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}

        {meta ? (
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              fontFamily:
                "Poppins_400Regular",
              marginTop: 3,
            }}
          >
            {meta}
          </Text>
        ) : null}

        {description ? (
          <Text
            numberOfLines={4}
            style={{
              color: colors.muted,
              fontSize: 12,
              lineHeight: 18,
              fontFamily:
                "Poppins_400Regular",
              marginTop: 5,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ProfileDetailsColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        paddingVertical: 9,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            `${colors.accent}12`,
        }}
      >
        <Ionicons
          name={icon}
          size={17}
          color={colors.accent}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.muted,
            fontSize: 11,
            fontFamily:
              "Poppins_400Regular",
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: colors.foreground,
            fontSize: 13,
            fontFamily:
              "Poppins_500Medium",
            marginTop: 1,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function formatProfileType(value: string) {
  return (
    value.charAt(0) +
    value.slice(1).toLowerCase()
  );
}

function formatEducationPeriod(
  startYear: number | null,
  endYear: number | null,
  isCurrent: boolean,
) {
  if (
    !startYear &&
    !endYear &&
    !isCurrent
  ) {
    return "";
  }

  return `${startYear ?? "—"} – ${
    isCurrent
      ? "Present"
      : endYear ?? "—"
  }`;
}

function formatMonthYear(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      year: "numeric",
    },
  );
}

function formatDatePeriod(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean,
) {
  if (
    !startDate &&
    !endDate &&
    !isCurrent
  ) {
    return "";
  }

  return `${
    startDate
      ? formatMonthYear(startDate)
      : "—"
  } – ${
    isCurrent
      ? "Present"
      : endDate
        ? formatMonthYear(endDate)
        : "—"
  }`;
}

function formatEmploymentType(
  value:
    | "FULL_TIME"
    | "PART_TIME"
    | "SELF_EMPLOYED"
    | "FREELANCE"
    | "CONTRACT"
    | "INTERNSHIP"
    | "APPRENTICESHIP"
    | "VOLUNTEER"
    | "OTHER"
    | null,
) {
  if (!value) return "";

  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}