import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Tabs } from "heroui-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useGetPublicProfileCommunitiesQuery,
  useGetPublicProfileMutualFriendsQuery,
  useGetPublicProfilePostsQuery,
  useGetPublicProfileQuery,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
} from "@/store/api/friendApi";

import type {
  FriendUser,
  PublicProfileCommunity,
  PublicProfilePost,
  PublicUserProfile,
} from "@/types/friend";

type TabKey = "posts" | "communities" | "friends";

type ActiveItem = PublicProfilePost | PublicProfileCommunity | FriendUser;

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

function toPlainText(value?: string | null) {
  if (!value) return "No content";

  const text = value
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text || "No content";
}

function IconButtonContent({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  color: string;
}) {
  return (
    <View style={styles.buttonContent}>
      <Ionicons name={icon} size={16} color={color} />
      {label ? <Button.Label>{label}</Button.Label> : null}
    </View>
  );
}

function ProfileAvatar({
  image,
  name,
}: {
  image?: string | null;
  name?: string | null;
}) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(image);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.avatarImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.avatarFallbackText, { color: colors.accent }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function CoverImage({ image }: { image?: string | null }) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(image);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.coverImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.coverFallback,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    />
  );
}

function ProfileActionButtons({
  profile,
  isLoading,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  onMessage,
}: {
  profile: PublicUserProfile;
  isLoading: boolean;
  onSendRequest: () => void;
  onAcceptRequest: () => void;
  onRejectRequest: () => void;
  onCancelRequest: () => void;
  onMessage: () => void;
}) {
  const { colors } = useAppTheme();
  const friendship = profile.friendship;

  if (friendship?.status === "ACCEPTED") {
    return (
      <View style={styles.profileActionRow}>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLoading}
          style={styles.profileActionButton}
        >
          <IconButtonContent
            icon="checkmark-circle-outline"
            label="Friends"
            color={colors.accent}
          />
        </Button>

        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLoading}
          onPress={onMessage}
          style={styles.profileActionButton}
        >
          <IconButtonContent
            icon="chatbubble-ellipses-outline"
            label="Message"
            color={colors.accent}
          />
        </Button>
      </View>
    );
  }

  if (friendship?.status === "PENDING" && friendship.direction === "INCOMING") {
    return (
      <View style={styles.profileActionRow}>
        <Button
          size="sm"
          variant="primary"
          isDisabled={isLoading}
          onPress={onAcceptRequest}
          style={styles.profileActionButton}
        >
          <Button.Label>Accept</Button.Label>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLoading}
          onPress={onRejectRequest}
          style={styles.profileActionButton}
        >
          <Button.Label>Delete</Button.Label>
        </Button>

        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLoading}
          onPress={onMessage}
          style={styles.profileActionIconButton}
        >
          <IconButtonContent
            icon="chatbubble-ellipses-outline"
            color={colors.accent}
          />
        </Button>
      </View>
    );
  }

  if (friendship?.status === "PENDING" && friendship.direction === "OUTGOING") {
    return (
      <View style={styles.profileActionRow}>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLoading}
          onPress={onCancelRequest}
          style={styles.profileActionButton}
        >
          <IconButtonContent
            icon="time-outline"
            label="Requested"
            color={colors.accent}
          />
        </Button>

        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLoading}
          onPress={onMessage}
          style={styles.profileActionButton}
        >
          <IconButtonContent
            icon="chatbubble-ellipses-outline"
            label="Message"
            color={colors.accent}
          />
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.profileActionRow}>
      <Button
        size="sm"
        variant="primary"
        isDisabled={isLoading}
        onPress={onSendRequest}
        style={styles.profileActionButton}
      >
        <IconButtonContent
          icon="person-add-outline"
          label="Add Friend"
          color={colors.accentForeground}
        />
      </Button>

      <Button
        size="sm"
        variant="secondary"
        isDisabled={isLoading}
        onPress={onMessage}
        style={styles.profileActionButton}
      >
        <IconButtonContent
          icon="chatbubble-ellipses-outline"
          label="Message"
          color={colors.accent}
        />
      </Button>
    </View>
  );
}

function PostCard({ post }: { post: PublicProfilePost }) {
  const { colors } = useAppTheme();

  const firstImage = post.media?.find((item) => item.type === "IMAGE");
  const imageUrl = toAbsoluteFileUrl(firstImage?.url);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[styles.cardTitle, { color: colors.foreground }]}
          >
            {post.community.name}
          </Text>

          <Text style={[styles.cardMeta, { color: colors.muted }]}>
            {formatDate(post.publishedAt ?? post.createdAt)}
          </Text>
        </View>

        <View
          style={[
            styles.visibilityPill,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.visibilityText, { color: colors.accent }]}>
            {post.community.visibility}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={3}
        style={[styles.postText, { color: colors.foreground }]}
      >
        {toPlainText(post.content)}
      </Text>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.postImage} />
      ) : null}

      <View style={styles.engagementRow}>
        <Text style={[styles.engagementText, { color: colors.muted }]}>
          Likes {post.engagement.likeCount}
        </Text>

        <Text style={[styles.engagementText, { color: colors.muted }]}>
          Comments {post.engagement.commentCount}
        </Text>

        <Text style={[styles.engagementText, { color: colors.muted }]}>
          Shares {post.engagement.shareCount}
        </Text>
      </View>
    </View>
  );
}

function CommunityCard({ community }: { community: PublicProfileCommunity }) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(community.avatarImage);

  return (
    <Pressable
      onPress={() => router.push(`/user/community/${community.slug}`)}
      style={[
        styles.card,
        styles.rowCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.smallAvatar} />
      ) : (
        <View
          style={[
            styles.smallAvatarFallback,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.smallInitials, { color: colors.accent }]}>
            {getInitials(community.name)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[styles.cardTitle, { color: colors.foreground }]}
        >
          {community.name}
        </Text>

        {community.description ? (
          <Text
            numberOfLines={2}
            style={[styles.cardMeta, { color: colors.muted }]}
          >
            {community.description}
          </Text>
        ) : null}

        <Text style={[styles.cardMeta, { color: colors.muted }]}>
          {community.memberCount} members · {community.postCount} posts
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function FriendCard({ friend }: { friend: FriendUser }) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(friend.image);

  return (
    <Pressable
      onPress={() => router.push(`/user/profile/${friend.id}`)}
      style={[
        styles.card,
        styles.rowCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.smallAvatar} />
      ) : (
        <View
          style={[
            styles.smallAvatarFallback,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.smallInitials, { color: colors.accent }]}>
            {getInitials(friend.displayName)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[styles.cardTitle, { color: colors.foreground }]}
        >
          {friend.displayName}
        </Text>

        {friend.businessName ? (
          <Text
            numberOfLines={1}
            style={[styles.cardMeta, { color: colors.muted }]}
          >
            {friend.businessName}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function EmptyState({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useAppTheme();

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
      <Ionicons name={icon} size={30} color={colors.accent} />

      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {title}
      </Text>

      <Text style={[styles.emptyText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

export default function PublicProfileScreen() {
  const { colors } = useAppTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  const safeUserId = String(userId ?? "");

  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetPublicProfileQuery(safeUserId, {
    skip: !safeUserId,
  });

  const {
    data: postsData,
    isLoading: postsLoading,
    isFetching: postsFetching,
    refetch: refetchPosts,
  } = useGetPublicProfilePostsQuery(
    {
      userId: safeUserId,
      page: 1,
      limit: 20,
    },
    {
      skip: !safeUserId,
    },
  );

  const {
    data: communitiesData,
    isLoading: communitiesLoading,
    isFetching: communitiesFetching,
    refetch: refetchCommunities,
  } = useGetPublicProfileCommunitiesQuery(
    {
      userId: safeUserId,
      page: 1,
      limit: 20,
    },
    {
      skip: !safeUserId,
    },
  );

  const {
    data: mutualFriendsData,
    isLoading: mutualFriendsLoading,
    isFetching: mutualFriendsFetching,
    refetch: refetchMutualFriends,
  } = useGetPublicProfileMutualFriendsQuery(
    {
      userId: safeUserId,
      page: 1,
      limit: 20,
    },
    {
      skip: !safeUserId,
    },
  );

  const [sendFriendRequest, { isLoading: isSendingRequest }] =
    useSendFriendRequestMutation();

  const [acceptFriendRequest, { isLoading: isAcceptingRequest }] =
    useAcceptFriendRequestMutation();

  const [rejectFriendRequest, { isLoading: isRejectingRequest }] =
    useRejectFriendRequestMutation();

  const [cancelFriendRequest, { isLoading: isCancellingRequest }] =
    useCancelFriendRequestMutation();

  const isFriendActionLoading =
    isSendingRequest ||
    isAcceptingRequest ||
    isRejectingRequest ||
    isCancellingRequest;

  const tabs = useMemo(
    () => [
      {
        key: "posts" as const,
        label: `Posts ${postsData?.meta?.total ?? 0}`,
      },
      {
        key: "communities" as const,
        label: `Communities ${communitiesData?.meta?.total ?? 0}`,
      },
      {
        key: "friends" as const,
        label: `Friends ${mutualFriendsData?.meta?.total ?? 0}`,
      },
    ],
    [
      postsData?.meta?.total,
      communitiesData?.meta?.total,
      mutualFriendsData?.meta?.total,
    ],
  );

  const activeData = useMemo<ActiveItem[]>(() => {
    if (activeTab === "posts") return postsData?.data ?? [];
    if (activeTab === "communities") return communitiesData?.data ?? [];
    return mutualFriendsData?.data ?? [];
  }, [activeTab, postsData?.data, communitiesData?.data, mutualFriendsData?.data]);

  const activeLoading =
    activeTab === "posts"
      ? postsLoading
      : activeTab === "communities"
        ? communitiesLoading
        : mutualFriendsLoading;

  const activeFetching =
    activeTab === "posts"
      ? postsFetching
      : activeTab === "communities"
        ? communitiesFetching
        : mutualFriendsFetching;

  const handleRefresh = async () => {
    await Promise.all([
      refetchProfile(),
      activeTab === "posts"
        ? refetchPosts()
        : activeTab === "communities"
          ? refetchCommunities()
          : refetchMutualFriends(),
    ]);
  };

  const handleSendFriendRequest = async () => {
    try {
      await sendFriendRequest({
        receiverId: safeUserId,
      }).unwrap();

      await refetchProfile();

      Alert.alert("Success", "Friend request sent.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not send friend request.",
      );
    }
  };

  const handleAcceptFriendRequest = async () => {
    const requestId = profile?.friendship?.id;

    if (!requestId) return;

    try {
      await acceptFriendRequest(requestId).unwrap();

      await refetchProfile();

      Alert.alert("Success", "Friend request accepted.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not accept friend request.",
      );
    }
  };

  const handleRejectFriendRequest = async () => {
    const requestId = profile?.friendship?.id;

    if (!requestId) return;

    try {
      await rejectFriendRequest(requestId).unwrap();

      await refetchProfile();

      Alert.alert("Removed", "Friend request deleted.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not delete friend request.",
      );
    }
  };

  const handleCancelFriendRequest = async () => {
    const requestId = profile?.friendship?.id;

    if (!requestId) return;

    try {
      await cancelFriendRequest(requestId).unwrap();

      await refetchProfile();

      Alert.alert("Cancelled", "Friend request cancelled.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not cancel friend request.",
      );
    }
  };

  const handleMessagePress = () => {
    Alert.alert("Message", "Message feature will be added next.");
  };

  if (profileLoading) {
    return (
      <SafeAreaView
        style={[styles.root, styles.center, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (profileError || !profile) {
    return (
      <SafeAreaView
        style={[styles.root, styles.center, { backgroundColor: colors.background }]}
      >
        <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />

        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Profile not available
        </Text>

        <Text style={[styles.errorText, { color: colors.muted }]}>
          You may not have permission to view this profile.
        </Text>

        <Button
          size="sm"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        >
          <Button.Label>Go Back</Button.Label>
        </Button>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: ActiveItem }) => {
    if (activeTab === "posts") {
      return <PostCard post={item as PublicProfilePost} />;
    }

    if (activeTab === "communities") {
      return <CommunityCard community={item as PublicProfileCommunity} />;
    }

    return <FriendCard friend={item as FriendUser} />;
  };

  const renderEmpty = () => {
    if (activeLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (activeTab === "posts") {
      return (
        <EmptyState
          icon="document-text-outline"
          title="No visible posts"
          text="This user has no posts that are visible to you."
        />
      );
    }

    if (activeTab === "communities") {
      return (
        <EmptyState
          icon="people-circle-outline"
          title="No visible communities"
          text="This user has no communities visible to you."
        />
      );
    }

    return (
      <EmptyState
        icon="person-circle-outline"
        title="No friends"
        text="No friends are visible to you yet."
      />
    );
  };

  const listHeader = (
    <View style={styles.page}>
      <View style={styles.coverSection}>
        <CoverImage image={profile.coverImage} />

        <View style={styles.avatarFloatingWrap}>
          <View style={styles.avatarOuter}>
            <ProfileAvatar image={profile.image} name={profile.displayName} />
          </View>
        </View>
      </View>

      <View style={styles.profileInfoSection}>
        <View style={styles.profileInfoRow}>
          <View style={styles.profileInfoLeft}>
            <Text
              numberOfLines={1}
              style={[styles.profileName, { color: colors.foreground }]}
            >
              {profile.displayName}
            </Text>

            {profile.businessName ? (
              <Text
                numberOfLines={1}
                style={[styles.profileEmail, { color: colors.muted }]}
              >
                {profile.businessName}
              </Text>
            ) : null}

            {profile.businessType ? (
              <Text
                numberOfLines={1}
                style={[styles.profileBusinessType, { color: colors.muted }]}
              >
                {profile.businessType}
              </Text>
            ) : null}
          </View>
        </View>

        <ProfileActionButtons
          profile={profile}
          isLoading={isFriendActionLoading}
          onSendRequest={handleSendFriendRequest}
          onAcceptRequest={handleAcceptFriendRequest}
          onRejectRequest={handleRejectFriendRequest}
          onCancelRequest={handleCancelFriendRequest}
          onMessage={handleMessagePress}
        />

        <View style={styles.profileBadgeRow}>
          <View
            style={[
              styles.profileBadge,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.accent} />

            <Text style={[styles.profileBadgeText, { color: colors.accent }]}>
              Joined {formatDate(profile.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
        variant="secondary"
        style={styles.tabsRoot}
      >
        <Tabs.List>
          <Tabs.Indicator />

          {tabs.map((tab) => (
            <Tabs.Trigger key={tab.key} value={tab.key} style={styles.tabTrigger}>
              <Tabs.Label>{tab.label}</Tabs.Label>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.scroll}
        data={activeData}
        keyExtractor={(item, index) =>
          "id" in item ? item.id : `${activeTab}-${index}`
        }
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={(activeFetching || profileFetching) && !activeLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 130,
  },

  page: {
    paddingBottom: 0,
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  errorText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  coverSection: {
    position: "relative",
    width: "100%",
  },

  coverImage: {
    width: "100%",
    height: 240,
  },

  coverFallback: {
    width: "100%",
    height: 240,
    borderBottomWidth: 1,
  },

  avatarFloatingWrap: {
    position: "absolute",
    left: 32,
    bottom: -54,
  },

  avatarOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 4,
    backgroundColor: "#ffffff",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 54,
  },

  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 54,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    fontSize: 34,
    fontFamily: "Poppins_700Bold",
  },

  profileInfoSection: {
    paddingTop: 66,
    paddingHorizontal: 32,
    paddingBottom: 20,
  },

  profileInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  profileInfoLeft: {
    flex: 1,
  },

  profileName: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: "Poppins_700Bold",
  },

  profileEmail: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
  },

  profileBusinessType: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
  },

  profileActionRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  profileActionButton: {
    flex: 1,
    minHeight: 44,
  },

  profileActionIconButton: {
    width: 56,
    minHeight: 44,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  profileBadgeRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  profileBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
  },

  tabsRoot: {
    borderBottomWidth: 1,
    borderBottomColor: "#bbf7d0",
  },

  tabTrigger: {
    minWidth: 120,
  },

  loadingWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cardTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Poppins_700Bold",
  },

  cardMeta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },

  postText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
  },

  postImage: {
    marginTop: 12,
    width: "100%",
    height: 190,
    borderRadius: 16,
  },

  engagementRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  engagementText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  visibilityPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  visibilityText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  smallAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },

  smallAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  smallInitials: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 14,
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