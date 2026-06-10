import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
} from "@/store/api/communityApi";
import {  useGetCommunityMembersQuery} from "@/store/api/communityMemberManagementApi"

import {
  useBanCommunityMemberMutation,
  useRemoveCommunityMemberMutation,
  useUnbanCommunityMemberMutation,
} from "@/store/api/communityMemberManagementApi";

type MemberRole = "ADMIN" | "MODERATOR" | "MEMBER";
type MemberStatus = "ACTIVE" | "LEFT" | "BANNED";

type ManagedMemberUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  businessName?: string | null;
};

type ManagedMemberItem = {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt?: string | null;
  updatedAt?: string | null;
  canEditCommunity?: boolean;
  canManageMembers?: boolean;
  canManagePosts?: boolean;
  canManageComments?: boolean;
  canManageReports?: boolean;
  user: ManagedMemberUser;
};

const STATUS_FILTERS: Array<"ACTIVE" | "BANNED" | "LEFT"> = [
  "ACTIVE",
  "BANNED",
  "LEFT",
];

const ROLE_FILTERS: Array<"ALL" | MemberRole> = [
  "ALL",
  "ADMIN",
  "MODERATOR",
  "MEMBER",
];

export default function ManageCommunityMembersScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState<MemberStatus>("ACTIVE");
  const [role, setRole] = useState<"ALL" | MemberRole>("ALL");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

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
    refetch: refetchAccess,
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

  const canManageMembers =
    isOwner || Boolean(access?.permissions?.canManageMembers);

  const canOpenScreen = isOwner || isModerator;

  const {
    data: membersResponse,
    isLoading: membersLoading,
    isFetching: membersFetching,
    refetch: refetchMembers,
  } = useGetCommunityMembersQuery(
    {
      communityId: community?.id ?? "",
      page,
      limit: 20,
      search: submittedSearch || undefined,
      status,
    },
    {
      skip: !community?.id || !canManageMembers,
      refetchOnMountOrArgChange: true,
    },
  );

  const [removeCommunityMember] = useRemoveCommunityMemberMutation();
  const [banCommunityMember] = useBanCommunityMemberMutation();
  const [unbanCommunityMember] = useUnbanCommunityMemberMutation();

  const members = useMemo(() => {
    return (membersResponse?.data ?? []) as ManagedMemberItem[];
  }, [membersResponse?.data]);

  const total = membersResponse?.meta?.total ?? members.length;
  const totalPages = membersResponse?.meta?.totalPages ?? 1;
  const currentPage = membersResponse?.meta?.page ?? page;

  const handleSearchSubmit = useCallback(() => {
    setPage(1);
    setSubmittedSearch(search.trim());
  }, [search]);

  const handleChangeStatus = useCallback((nextStatus: MemberStatus) => {
    setPage(1);
    setStatus(nextStatus);
  }, []);

  const handleChangeRole = useCallback((nextRole: "ALL" | MemberRole) => {
    setPage(1);
    setRole(nextRole);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (membersFetching || currentPage >= totalPages) {
      return;
    }

    setPage((previousPage) => previousPage + 1);
  }, [membersFetching, currentPage, totalPages]);

  const refreshAfterAction = useCallback(async () => {
    await Promise.allSettled([refetchMembers(), refetchAccess()]);
  }, [refetchMembers, refetchAccess]);

  const handleRemoveMember = useCallback(
    (member: ManagedMemberItem) => {
      if (!community?.id) {
        return;
      }

      const userName = getUserDisplayName(member.user);

      Alert.alert(
        "Remove member",
        `Are you sure you want to remove ${userName} from this community? They can join again later.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                setActionUserId(member.user.id);

                await removeCommunityMember({
                  communityId: community.id,
                  targetUserId: member.user.id,
                }).unwrap();

                await refreshAfterAction();

                Alert.alert("Success", "Member removed successfully.");
              } catch (error: any) {
                console.log("Remove member failed:", error);

                Alert.alert(
                  "Could not remove member",
                  error?.data?.message ??
                    "Something went wrong while removing this member.",
                );
              } finally {
                setActionUserId(null);
              }
            },
          },
        ],
      );
    },
    [community?.id, removeCommunityMember, refreshAfterAction],
  );

  const handleBanMember = useCallback(
    (member: ManagedMemberItem) => {
      if (!community?.id) {
        return;
      }

      const userName = getUserDisplayName(member.user);

      Alert.alert(
        "Ban member",
        `Are you sure you want to ban ${userName}? They will not be able to join or interact with this community.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Ban",
            style: "destructive",
            onPress: async () => {
              try {
                setActionUserId(member.user.id);

                await banCommunityMember({
                  communityId: community.id,
                  targetUserId: member.user.id,
                }).unwrap();

                await refreshAfterAction();

                Alert.alert("Success", "Member banned successfully.");
              } catch (error: any) {
                console.log("Ban member failed:", error);

                Alert.alert(
                  "Could not ban member",
                  error?.data?.message ??
                    "Something went wrong while banning this member.",
                );
              } finally {
                setActionUserId(null);
              }
            },
          },
        ],
      );
    },
    [community?.id, banCommunityMember, refreshAfterAction],
  );

  const handleUnbanMember = useCallback(
    (member: ManagedMemberItem) => {
      if (!community?.id) {
        return;
      }

      const userName = getUserDisplayName(member.user);

      Alert.alert(
        "Unban member",
        `Do you want to unban ${userName}? They will be able to join or request again.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Unban",
            onPress: async () => {
              try {
                setActionUserId(member.user.id);

                await unbanCommunityMember({
                  communityId: community.id,
                  targetUserId: member.user.id,
                }).unwrap();

                await refreshAfterAction();

                Alert.alert("Success", "Member unbanned successfully.");
              } catch (error: any) {
                console.log("Unban member failed:", error);

                Alert.alert(
                  "Could not unban member",
                  error?.data?.message ??
                    "Something went wrong while unbanning this member.",
                );
              } finally {
                setActionUserId(null);
              }
            },
          },
        ],
      );
    },
    [community?.id, unbanCommunityMember, refreshAfterAction],
  );

  const handleOpenProfile = useCallback(
    (userId: string) => {
      if (!userId || !community?.id || userId === session?.user?.id) {
        return;
      }

      router.push({
        pathname: "/user/profile/[userId]",
        params: {
          userId,
          sourceCommunityId: community.id,
        },
      });
    },
    [community?.id, session?.user?.id],
  );

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
        <Header title="Manage Members" colors={colors} />

        <View style={styles.center}>
          <Text
            style={[
              styles.emptyTitle,
              {
                color: colors.foreground,
              },
            ]}
          >
            Community not found
          </Text>

          <Text
            style={[
              styles.emptyText,
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

  if (!canOpenScreen || !canManageMembers) {
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
        <Header title="Manage Members" colors={colors} />

        <View style={styles.center}>
          <Ionicons
            name="lock-closed-outline"
            size={44}
            color={colors.accent}
          />

          <Text
            style={[
              styles.emptyTitle,
              {
                marginTop: 14,
                color: colors.foreground,
              },
            ]}
          >
            No permission
          </Text>

          <Text
            style={[
              styles.emptyText,
              {
                color: colors.muted,
              },
            ]}
          >
            Only the owner or moderators with member-management permission can
            manage community members.
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
        <Header title="Manage Members" colors={colors} />

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name="people-circle-outline"
              size={24}
              color={colors.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.summaryTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              {community.name}
            </Text>

            <Text
              style={[
                styles.summaryText,
                {
                  color: colors.muted,
                },
              ]}
            >
              Search, remove, ban or unban members in this community.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.muted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search by name, email or business..."
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={[
              styles.searchInput,
              {
                color: colors.foreground,
              },
            ]}
          />

          {search.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearch("");
                setSubmittedSearch("");
                setPage(1);
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.muted}
              />
            </Pressable>
          ) : null}
        </View>

        <Text
          style={[
            styles.filterLabel,
            {
              color: colors.foreground,
            },
          ]}
        >
          Status
        </Text>

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((item) => {
            const isActive = item === status;

            return (
              <Pressable
                key={item}
                onPress={() => handleChangeStatus(item)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : colors.surface,
                    borderColor: isActive ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive
                        ? colors.accentForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {formatText(item)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={[
            styles.filterLabel,
            {
              color: colors.foreground,
            },
          ]}
        >
          Role
        </Text>

        <View style={styles.filterRow}>
          {ROLE_FILTERS.map((item) => {
            const isActive = item === role;

            return (
              <Pressable
                key={item}
                onPress={() => handleChangeRole(item)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : colors.surface,
                    borderColor: isActive ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive
                        ? colors.accentForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {item === "ALL" ? "All" : formatText(item)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.foreground,
              },
            ]}
          >
            Members
          </Text>

          <Text
            style={[
              styles.sectionCount,
              {
                color: colors.muted,
              },
            ]}
          >
            {total} total
          </Text>
        </View>

        {membersLoading && members.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : members.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={38}
              color={colors.accent}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  marginTop: 12,
                  color: colors.foreground,
                },
              ]}
            >
              No members found
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.muted,
                },
              ]}
            >
              Try changing your search, status, or role filter.
            </Text>
          </View>
        ) : (
          <View style={styles.memberList}>
            {members.map((member) => {
              const isSelf = member.user.id === session.user.id;
              const isAdminMember = member.role === "ADMIN";
              const isActionLoading = actionUserId === member.user.id;

              const canRemove =
                member.status === "ACTIVE" && !isSelf && !isAdminMember;

              const canBan =
                member.status !== "BANNED" && !isSelf && !isAdminMember;

              const canUnban =
                member.status === "BANNED" && !isSelf && !isAdminMember;

              return (
                <ManagedMemberCard
                  key={member.id}
                  member={member}
                  colors={colors}
                  isActionLoading={isActionLoading}
                  canRemove={canRemove}
                  canBan={canBan}
                  canUnban={canUnban}
                  onPressProfile={() => handleOpenProfile(member.user.id)}
                  onRemove={() => handleRemoveMember(member)}
                  onBan={() => handleBanMember(member)}
                  onUnban={() => handleUnbanMember(member)}
                />
              );
            })}

            {currentPage < totalPages ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={membersFetching}
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {membersFetching ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text
                    style={[
                      styles.loadMoreText,
                      {
                        color: colors.accent,
                      },
                    ]}
                  >
                    Load more
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
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
            styles.headerTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.headerSubtitle,
            {
              color: colors.muted,
            },
          ]}
        >
          Community moderation
        </Text>
      </View>
    </View>
  );
}

function ManagedMemberCard({
  member,
  colors,
  isActionLoading,
  canRemove,
  canBan,
  canUnban,
  onPressProfile,
  onRemove,
  onBan,
  onUnban,
}: {
  member: ManagedMemberItem;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isActionLoading: boolean;
  canRemove: boolean;
  canBan: boolean;
  canUnban: boolean;
  onPressProfile: () => void;
  onRemove: () => void;
  onBan: () => void;
  onUnban: () => void;
}) {
  const avatarUrl = toAbsoluteFileUrl(member.user.image);
  const userName = getUserDisplayName(member.user);

  return (
    <View
      style={[
        styles.memberCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable onPress={onPressProfile} style={styles.memberTop}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="person-outline"
              size={22}
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
            {userName}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.memberMeta,
              {
                color: colors.muted,
              },
            ]}
          >
            {member.user.businessName ||
              member.user.email ||
              "Community member"}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.muted}
        />
      </Pressable>

      <View style={styles.badgeRow}>
        <Badge label={formatText(member.role)} colors={colors} />
        <Badge label={formatText(member.status)} colors={colors} danger={member.status === "BANNED"} />
      </View>

      <Text
        style={[
          styles.joinedText,
          {
            color: colors.muted,
          },
        ]}
      >
        Joined {formatDate(member.joinedAt)}
      </Text>

      <View style={styles.actionRow}>
        {canRemove ? (
          <Pressable
            onPress={onRemove}
            disabled={isActionLoading}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: colors.foreground,
                },
              ]}
            >
              Remove
            </Text>
          </Pressable>
        ) : null}

        {canBan ? (
          <Pressable
            onPress={onBan}
            disabled={isActionLoading}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.danger,
                borderColor: colors.danger,
              },
            ]}
          >
            {isActionLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.dangerForeground}
              />
            ) : (
              <Text
                style={[
                  styles.actionText,
                  {
                    color: colors.dangerForeground,
                  },
                ]}
              >
                Ban
              </Text>
            )}
          </Pressable>
        ) : null}

        {canUnban ? (
          <Pressable
            onPress={onUnban}
            disabled={isActionLoading}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              },
            ]}
          >
            {isActionLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.accentForeground}
              />
            ) : (
              <Text
                style={[
                  styles.actionText,
                  {
                    color: colors.accentForeground,
                  },
                ]}
              >
                Unban
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Badge({
  label,
  colors,
  danger = false,
}: {
  label: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  danger?: boolean;
}) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surfaceSecondary,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: danger ? colors.danger : colors.accent,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function getUserDisplayName(user: ManagedMemberUser) {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return user.name || fullName || user.businessName || "Unknown User";
}

function formatText(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

  headerTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  summaryText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  searchBox: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 8,
  },

  filterLabel: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    marginBottom: 10,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },

  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  filterText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
  },

  sectionCount: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },

  loadingBox: {
    paddingVertical: 30,
  },

  memberList: {
    gap: 14,
  },

  memberCard: {
    // height:40,
    // width:40,
    borderWidth:1,
    borderRadius: 24,
    padding: 16,
  },

  memberTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  memberName: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },

  memberMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  badgeText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  joinedText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  actionButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  loadMoreButton: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  loadMoreText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
});