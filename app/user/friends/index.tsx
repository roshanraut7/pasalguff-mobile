import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Tabs } from "heroui-native";
import { router } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  useFollowUserMutation,
  useGetMyFollowersQuery,
  useGetMyFollowingQuery,
  useUnfollowUserMutation,
  type FollowItem,
} from "@/store/api/followApi";


type TabKey = "followers" | "following";

function goToUserProfile(userId: string) {
  router.push({
    pathname: "/user/profile/[userId]",
    params: {
      userId,
    },
  });
}

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() || "U";
  }

  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FollowAvatar({
  image,
  name,
  size = 72,
}: {
  image?: string | null;
  name?: string | null;
  size?: number;
}) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(image);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={avatarStyle} />;
  }

  return (
    <View
      style={[
        avatarStyle,
        styles.avatarFallback,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { color: colors.accent }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function FollowUserCard({
  item,
  mode,
  onUnfollow,
  isActionLoading,
}: {
  item: FollowItem;
  mode: TabKey;
  onUnfollow?: (item: FollowItem) => void;
  isActionLoading?: boolean;
}) {
  const { colors } = useAppTheme();
  const user = item.user;

  return (
    <Pressable
      onPress={() => goToUserProfile(user.id)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <FollowAvatar image={user.image} name={user.displayName} />

      <View style={styles.cardBody}>
        <Text
          numberOfLines={1}
          style={[styles.nameText, { color: colors.foreground }]}
        >
          {user.displayName}
        </Text>

        {user.businessName ? (
          <Text
            numberOfLines={1}
            style={[styles.businessText, { color: colors.muted }]}
          >
            {user.businessName}
          </Text>
        ) : null}

        <Text style={[styles.messageText, { color: colors.muted }]}>
          {mode === "followers"
            ? `Started following you on ${formatDate(item.followedAt)}`
            : `Following since ${formatDate(item.followedAt)}`}
        </Text>

        <View style={styles.actionRow}>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => goToUserProfile(user.id)}
            style={styles.actionButton}
          >
            <Button.Label>View Profile</Button.Label>
          </Button>

          {mode === "following" ? (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={isActionLoading}
              onPress={() => onUnfollow?.(item)}
              style={styles.actionButton}
            >
              <Button.Label>Unfollow</Button.Label>
            </Button>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ activeTab }: { activeTab: TabKey }) {
  const { colors } = useAppTheme();

  const content = {
    followers: {
      icon: "people-outline" as const,
      title: "No followers yet",
      text: "When someone follows you, they will appear here.",
    },
    following: {
      icon: "person-add-outline" as const,
      title: "Not following anyone yet",
      text: "People you follow will appear here.",
    },
  }[activeTab];

  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name={content.icon} size={30} color={colors.accent} />

      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {content.title}
      </Text>

      <Text style={[styles.emptyText, { color: colors.muted }]}>
        {content.text}
      </Text>
    </View>
  );
}

export default function FollowersScreen() {
  const { colors } = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>("followers");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const {
    data: followersData,
    isLoading: followersLoading,
    isFetching: followersFetching,
    refetch: refetchFollowers,
  } = useGetMyFollowersQuery({
    page: 1,
    limit: 20,
  });

  const {
    data: followingData,
    isLoading: followingLoading,
    isFetching: followingFetching,
    refetch: refetchFollowing,
  } = useGetMyFollowingQuery({
    page: 1,
    limit: 20,
  });

  const [unfollowUser] = useUnfollowUserMutation();

  const followersCount = followersData?.meta?.total ?? 0;
  const followingCount = followingData?.meta?.total ?? 0;

  const tabs = useMemo(
    () => [
      {
        key: "followers" as const,
        label: followersCount ? `Followers (${followersCount})` : "Followers",
      },
      {
        key: "following" as const,
        label: followingCount ? `Following (${followingCount})` : "Following",
      },
    ],
    [followersCount, followingCount],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  };

  const handleRefresh = async () => {
    if (activeTab === "followers") {
      await refetchFollowers();
      return;
    }

    await refetchFollowing();
  };

  const handleUnfollow = async (item: FollowItem) => {
    const user = item.user;

    Alert.alert(
      "Unfollow user",
      `Are you sure you want to unfollow ${user.displayName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unfollow",
          style: "destructive",
          onPress: async () => {
            try {
              setActionUserId(user.id);

              await unfollowUser(user.id).unwrap();

              Alert.alert("Updated", "You unfollowed this user.");
            } catch (error: any) {
              Alert.alert(
                "Failed",
                error?.data?.message ?? "Could not unfollow this user.",
              );
            } finally {
              setActionUserId(null);
            }
          },
        },
      ],
    );
  };

  const renderFollowersList = () => {
    const followers = followersData?.data ?? [];

    if (followersLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={followers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={followersFetching && !followersLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={<EmptyState activeTab="followers" />}
        renderItem={({ item }) => (
          <FollowUserCard
            item={item}
            mode="followers"
            isActionLoading={actionUserId === item.user.id}
          />
        )}
      />
    );
  };

  const renderFollowingList = () => {
    const following = followingData?.data ?? [];

    if (followingLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={following}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={followingFetching && !followingLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={<EmptyState activeTab="following" />}
        renderItem={({ item }) => (
          <FollowUserCard
            item={item}
            mode="following"
            isActionLoading={actionUserId === item.user.id}
            onUnfollow={handleUnfollow}
          />
        )}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              onPress={handleBack}
              hitSlop={12}
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
                size={22}
                color={colors.foreground}
              />
            </Pressable>

            <Text style={[styles.title, { color: colors.foreground }]}>
              Followers
            </Text>

            <View style={styles.headerRightSpace} />
          </View>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Manage people who follow you and people you are following.
          </Text>
        </View>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabKey)}
          variant="secondary"
          style={styles.tabsRoot}
        >
          <View style={styles.tabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              nestedScrollEnabled
              contentContainerStyle={styles.tabsScrollContent}
            >
              <Tabs.List style={styles.tabsList}>
                <Tabs.Indicator />

                {tabs.map((tab) => (
                  <Tabs.Trigger
                    key={tab.key}
                    value={tab.key}
                    style={styles.tabTrigger}
                  >
                    <Tabs.Label>{tab.label}</Tabs.Label>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </ScrollView>
          </View>

          <Tabs.Content value="followers" style={styles.tabContent}>
            {activeTab === "followers" ? renderFollowersList() : null}
          </Tabs.Content>

          <Tabs.Content value="following" style={styles.tabContent}>
            {activeTab === "following" ? renderFollowingList() : null}
          </Tabs.Content>
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },

  headerTopRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRightSpace: {
    width: 40,
    height: 40,
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  tabsRoot: {
    flex: 1,
  },

  tabsWrapper: {
    marginHorizontal: -16,
    paddingLeft: 16,
  },

  tabsScrollContent: {
    paddingRight: 16,
  },

  tabsList: {
    flexDirection: "row",
    alignSelf: "flex-start",
  },

  tabTrigger: {
    minWidth: 145,
  },

  tabContent: {
    flex: 1,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 12,
  },

  avatarFallback: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitials: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
  },

  cardBody: {
    flex: 1,
  },

  nameText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold",
  },

  businessText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  messageText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },

  actionButton: {
    flex: 1,
  },

  emptyCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});