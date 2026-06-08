import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import AdminKpiCard from "@/components/common/Kpi-card";

import {
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
  useGetVisibleCommunityMembersQuery,
} from "@/store/api/communityApi";

import type { CommunityMemberItem } from "@/types/community";

export default function CommunityModerationPanelScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const {
    data: community,
    isLoading: communityLoading,
    error: communityError,
  } = useGetCommunityBySlugQuery(slug ?? "", {
    skip: !session?.user || !slug,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: access,
    isLoading: accessLoading,
  } = useGetCommunityAccessQuery(community?.id ?? "", {
    skip: !session?.user || !community?.id,
    refetchOnMountOrArgChange: true,
  });

  const isOwner =
    access?.role === "ADMIN" ||
    community?.myRole === "ADMIN" ||
    community?.isOwner === true;

  const isModerator =
    access?.role === "MODERATOR" ||
    community?.myRole === "MODERATOR";

  const canOpenModerationPanel = isOwner || isModerator;

  const canManageMembers =
    isOwner || Boolean(access?.permissions?.canManageMembers);

  const canManagePosts =
    isOwner || Boolean(access?.permissions?.canManagePosts);

  const canManageComments =
    isOwner || Boolean(access?.permissions?.canManageComments);

  const canManageReports =
    isOwner || Boolean(access?.permissions?.canManageReports);

  const canEditCommunity =
    isOwner || Boolean(access?.permissions?.canEditCommunity);

  const {
    data: membersResponse,
    isLoading: membersLoading,
    isFetching: membersFetching,
  } = useGetVisibleCommunityMembersQuery(
    {
      communityId: community?.id ?? "",
      page: 1,
      limit: 6,
    },
    {
      skip: !community?.id || !canOpenModerationPanel,
      refetchOnMountOrArgChange: true,
    },
  );

  const members = useMemo(() => {
    return (membersResponse?.data ?? []) as Array<
      CommunityMemberItem & {
        membershipId?: string;
      }
    >;
  }, [membersResponse?.data]);

  const memberCount =
    community?.memberCount ??
    membersResponse?.meta?.total ??
    members.length;

  const postCount = community?.postCount ?? 0;

  const roleLabel = isOwner ? "Owner" : isModerator ? "Mod" : "Member";
  // const banlabel = community?.banCount ?? 0;
 
  if (isPending || communityLoading || accessLoading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  if (communityError || !community) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.safe,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.center}>
          <Text
            style={[
              styles.errorTitle,
              {
                color: colors.foreground,
              },
            ]}
          >
            Community not found
          </Text>

          <Text
            style={[
              styles.errorText,
              {
                color: colors.muted,
              },
            ]}
          >
            This community could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canOpenModerationPanel) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.safe,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={colors.foreground}
            />
          </Pressable>
        </View>

        <View style={styles.center}>
          <Ionicons
            name="lock-closed-outline"
            size={42}
            color={colors.accent}
          />

          <Text
            style={[
              styles.errorTitle,
              {
                marginTop: 14,
                color: colors.foreground,
              },
            ]}
          >
            No access
          </Text>

          <Text
            style={[
              styles.errorText,
              {
                color: colors.muted,
              },
            ]}
          >
            Only community owner or moderator can open this panel.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safe,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={colors.foreground}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.screenTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              Moderation Panel
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.screenSubtitle,
                {
                  color: colors.muted,
                },
              ]}
            >
              Manage {community.name}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.roleCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.roleIcon,
              {
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={colors.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.roleTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              You are {roleLabel}
            </Text>

            <Text
              style={[
                styles.roleDescription,
                {
                  color: colors.muted,
                },
              ]}
            >
              Your available tools depend on your community permissions.
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          Overview
        </Text>

        <View style={styles.kpiGrid}>
          <AdminKpiCard
            title="Total Members"
            value={memberCount}
            icon="people-outline"
          />

          <AdminKpiCard
            title="Total Posts"
            value={postCount}
            icon="document-text-outline"
          />
          <AdminKpiCard
          title="Total Ban"
          value={0}
          icon="ban-outline"
          />

          <AdminKpiCard
            title="Pending Requests"
            value="-"
            icon="time-outline"
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              marginTop: 24,
              color: colors.foreground,
            },
          ]}
        >
          Management
        </Text>

        <View style={styles.menuList}>
          {canManageMembers ? (
            <>
              <ModerationMenuItem
                title="Join Requests"
                description="Approve or reject private community requests"
                icon="person-add-outline"
                colors={colors}
                onPress={() => {
                  router.push({
                    pathname: "/user/moderator-panel",
                    params: {
                      slug: slug ?? "",
                    },
                  });
                }}
              />

              <ModerationMenuItem
                title="Manage Members"
                description="Remove, ban, or unban community members"
                icon="people-circle-outline"
                colors={colors}
                onPress={() => {
                  router.push({
                    pathname: "/user/moderator-panel",
                    params: {
                      slug: slug ?? "",
                    },
                  });
                }}
              />
            </>
          ) : null}

          {isOwner ? (
            <ModerationMenuItem
              title="Moderators"
              description="Assign moderators and update permissions"
              icon="shield-checkmark-outline"
              colors={colors}
              onPress={() => {
                router.push({
                  pathname: "/user/moderator-panel",
                  params: {
                    slug: slug ?? "",
                  },
                });
              }}
            />
          ) : null}

          {canManagePosts ? (
            <ModerationMenuItem
              title="Post Moderation"
              description="Manage community posts"
              icon="newspaper-outline"
              colors={colors}
              onPress={() => {}}
            />
          ) : null}

          {canManageComments ? (
            <ModerationMenuItem
              title="Comment Moderation"
              description="Review and delete comments"
              icon="chatbubble-ellipses-outline"
              colors={colors}
              onPress={() => {}}
            />
          ) : null}

          {canManageReports ? (
            <ModerationMenuItem
              title="Reports"
              description="Review reported posts, comments, and members"
              icon="warning-outline"
              colors={colors}
              onPress={() => {}}
            />
          ) : null}

          {canEditCommunity ? (
            <ModerationMenuItem
              title="Community Settings"
              description="Edit community details and images"
              icon="settings-outline"
              colors={colors}
              onPress={() => {}}
            />
          ) : null}
        </View>

        <View style={styles.memberHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.foreground,
              },
            ]}
          >
            Community Users
          </Text>

          <Text
            style={[
              styles.viewAllText,
              {
                color: colors.accent,
              },
            ]}
          >
            Preview
          </Text>
        </View>

        <View
          style={[
            styles.memberPreviewCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {membersLoading || membersFetching ? (
            <View style={styles.memberLoading}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : members.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.muted,
                },
              ]}
            >
              No members found.
            </Text>
          ) : (
            members.map((member) => (
              <MemberPreviewRow
                key={member.id ?? member.membershipId ?? member.user.id}
                member={member}
                colors={colors}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModerationMenuItem({
  title,
  description,
  icon,
  colors,
  onPress,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.menuTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          numberOfLines={2}
          style={[
            styles.menuDescription,
            {
              color: colors.muted,
            },
          ]}
        >
          {description}
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

function MemberPreviewRow({
  member,
  colors,
}: {
  member: CommunityMemberItem;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const avatarUrl = toAbsoluteFileUrl(member.user.image);

  return (
    <View style={styles.memberRow}>
      <View
        style={[
          styles.memberAvatar,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.memberAvatarImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name="person-outline"
            size={18}
            color={colors.accent}
          />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[
            styles.memberName,
            {
              color: colors.foreground,
            },
          ]}
        >
          {member.user.name ?? "Unknown User"}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.memberRole,
            {
              color: colors.muted,
            },
          ]}
        >
          {member.role}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  screenTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
  },

  screenSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 22,
  },

  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  roleTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  roleDescription: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    marginBottom: 12,
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  menuList: {
    gap: 12,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 15,
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  menuTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },

  menuDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  memberHeader: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewAllText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  memberPreviewCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
  },

  memberLoading: {
    paddingVertical: 20,
  },

  emptyText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },

  memberAvatarImage: {
    width: "100%",
    height: "100%",
  },

  memberName: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  memberRole: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  errorTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
  },

  errorText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
});