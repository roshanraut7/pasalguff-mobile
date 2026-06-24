import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Tabs } from "heroui-native";

import { useSession } from "@/api/better-auth-client";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import CommentPostModal from "@/components/post/CommentsModal";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePostInteractions } from "@/hooks/media/usePostInteractions";
import { usePostMediaViewer } from "@/hooks/media/usePostMediaViewer";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import { useCreateDirectChatMutation } from "@/store/api/chatApi";

import {
  useGetPublicProfileCommunitiesQuery,
  useGetPublicProfilePostsQuery,
  useGetPublicProfileQuery,
} from "@/store/api/friendApi";

import {
  useFollowUserMutation,
  useGetUserFollowersQuery,
  useGetUserFollowingQuery,
  useUnfollowUserMutation,
  type FollowItem,
} from "@/store/api/followApi";

import type {
  PublicProfileCommunity,
  PublicProfilePost,
  PublicUserProfile,
} from "@/types/friend";
import type { CommunityPost } from "@/types/post";

import { styles } from "@/constants/styles/PublicProfileScreen.styles";

type TabKey = "about" | "posts" | "communities" | "followers" | "following";

type ActiveItem = CommunityPost | PublicProfileCommunity | FollowItem;

type PublicProfilePermissions = {
  canViewProfile: boolean;
  canViewAbout: boolean;
  canViewPosts: boolean;
  canViewCommunities: boolean;
  canViewFollowers: boolean;
  canViewFollowing: boolean;
  canMessage: boolean;
  canFollow: boolean;
  canUnfollow: boolean;
  canEditProfile: boolean;

  /**
   * Temporary backend alias.
   * Keep this only while old frontend/backend types still reference friends.
   */
  canViewFriends?: boolean;
};

type PublicProfileWithPermissions = PublicUserProfile & {
  follow?: {
    isFollowing: boolean;
    followsMe?: boolean;
    isMutual?: boolean;
    followedAt?: string | null;
    buttonText?: "Follow" | "Follow Back" | "Following";
  };
  stats?: {
    followersCount: number;
    followingCount: number;
  };
  permissions?: PublicProfilePermissions;
};

type PublicProfilePostWithExtraFields = PublicProfilePost & {
  title?: string | null;
  linkUrl?: string | null;
  type?: unknown;
  tag?: unknown;
  status?: unknown;
  visibility?: unknown;
  updatedAt?: string | null;
  editedAt?: string | null;
  isLikedByMe?: boolean;
};

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() || "U";
  }

  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function followLabel(profile: PublicProfileWithPermissions) {
  if (profile.follow?.buttonText) return profile.follow.buttonText;
  if (profile.follow?.isFollowing) return "Following";
  if (profile.follow?.followsMe) return "Follow Back";
  if (profile.permissions?.canFollow) return "Follow";

  return "Private";
}

function mapPublicPostToCommunityPost(
  post: PublicProfilePost,
  profile: PublicProfileWithPermissions,
  userId: string,
): CommunityPost {
  const safePost = post as PublicProfilePostWithExtraFields;

  const community = safePost.community as PublicProfilePost["community"] & {
    id?: string | null;
    slug?: string | null;
    avatarImage?: string | null;
    visibility?: string | null;
  };

  return {
    id: safePost.id,
    communityId: community.id ?? "",
    authorId: userId,

    title: safePost.title ?? null,
    content: safePost.content ?? "",
    linkUrl: safePost.linkUrl ?? null,

    type: safePost.type,
    tag: safePost.tag ?? null,
    status: safePost.status,
    visibility: safePost.visibility,

    createdAt: safePost.createdAt,
    updatedAt: safePost.updatedAt ?? safePost.createdAt,
    publishedAt: safePost.publishedAt ?? safePost.createdAt,
    editedAt: safePost.editedAt ?? null,

    author: {
      id: userId,
      name: profile.displayName,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      businessName: profile.businessName ?? null,
      image: profile.image ?? null,
    },

    community: {
      id: community.id ?? "",
      name: safePost.community.name,
      slug: community.slug ?? "",
      avatarImage: community.avatarImage ?? null,
      visibility: community.visibility ?? null,
    },

    media: safePost.media ?? [],

    isLikedByMe: Boolean(safePost.isLikedByMe),
    likeCount: safePost.engagement?.likeCount ?? 0,
    commentCount: safePost.engagement?.commentCount ?? 0,
    shareCount: safePost.engagement?.shareCount ?? 0,
  } as unknown as CommunityPost;
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
          backgroundColor: colors.segment,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.coverFallbackContent}>
        <View
          style={[
            styles.coverFallbackIcon,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Ionicons name="person-outline" size={30} color={colors.accent} />
        </View>
      </View>
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
          backgroundColor: colors.segment,
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

function ProfileActionButtons({
  profile,
  isOwnProfile,
  isLoading,
  onFollow,
  onUnfollow,
  onMessage,
}: {
  profile: PublicProfileWithPermissions;
  isOwnProfile: boolean;
  isLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onMessage: () => void;
}) {
  const { colors } = useAppTheme();

  const canMessage = Boolean(profile.permissions?.canMessage);
  const canFollow = Boolean(profile.permissions?.canFollow);
  const canUnfollow = Boolean(profile.permissions?.canUnfollow);
  const isFollowing = Boolean(profile.follow?.isFollowing);
  const followsMe = Boolean(profile.follow?.followsMe);

const followButtonLabel =
  profile.follow?.buttonText ??
  (isFollowing ? "Following" : followsMe ? "Follow Back" : "Follow");

  if (isOwnProfile) {
    return null;
  }

  if (!canFollow && !canUnfollow && !isFollowing && !canMessage) {
    return null;
  }

  return (
    <View style={styles.profileActionRow}>
  {canUnfollow || isFollowing ? (
    <Button
      size="sm"
      variant="secondary"
      isDisabled={isLoading}
      onPress={onUnfollow}
      style={styles.profileActionButton}
    >
      <IconButtonContent
        icon="checkmark-circle-outline"
        label="Following"
        color={colors.accent}
      />
    </Button>
  ) : canFollow ? (
    <Button
      size="sm"
      variant="primary"
      isDisabled={isLoading}
      onPress={onFollow}
      style={styles.profileActionButton}
    >
      <IconButtonContent
        icon="person-add-outline"
        label={followButtonLabel}
        color={colors.accentForeground}
      />
    </Button>
  ) : null}

  {canMessage ? (
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
  ) : null}
</View>
  );
}

function HeaderStatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.headerStatCard,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.headerStatIcon,
          {
            backgroundColor: colors.segment,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>

      <Text
        numberOfLines={1}
        style={[styles.headerStatValue, { color: colors.foreground }]}
      >
        {value}
      </Text>

      <Text numberOfLines={1} style={[styles.headerStatLabel, { color: colors.muted }]}>
        {label}
      </Text>
    </View>
  );
}

function CommunityListCard({
  community,
}: {
  community: PublicProfileCommunity;
}) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(community.avatarImage);

  return (
    <Pressable
      onPress={() => router.push(`/user/community/${community.slug}`)}
      style={({ pressed }) => [
        styles.communityCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.communityAvatar} />
      ) : (
        <View
          style={[
            styles.communityAvatarFallback,
            {
              backgroundColor: colors.segment,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.communityInitials, { color: colors.accent }]}>
            {getInitials(community.name)}
          </Text>
        </View>
      )}

      <View style={styles.communityInfo}>
        <View style={styles.communityTitleRow}>
          <Text
            numberOfLines={1}
            style={[styles.cardTitle, { color: colors.foreground }]}
          >
            {community.name}
          </Text>

          <View
            style={[
              styles.smallPill,
              {
                backgroundColor: colors.segment,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.smallPillText, { color: colors.accent }]}>
              {community.visibility}
            </Text>
          </View>
        </View>

        {community.description ? (
          <Text
            numberOfLines={2}
            style={[styles.cardMeta, { color: colors.muted }]}
          >
            {community.description}
          </Text>
        ) : null}

        <View style={styles.communityStatsRow}>
          <View style={styles.miniStat}>
            <Ionicons name="people-outline" size={13} color={colors.accent} />
            <Text style={[styles.miniStatText, { color: colors.muted }]}>
              {community.memberCount} members
            </Text>
          </View>

          <View style={styles.miniStat}>
            <Ionicons
              name="document-text-outline"
              size={13}
              color={colors.accent}
            />
            <Text style={[styles.miniStatText, { color: colors.muted }]}>
              {community.postCount} posts
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.cardArrowWrap,
        ]}
      >
        <Ionicons name="chevron-forward" size={17} color={colors.surface} />
      </View>
    </Pressable>
  );
}

function FollowUserCard({ item }: { item: FollowItem }) {
  const { colors } = useAppTheme();

  const user = item.user;
  const imageUrl = toAbsoluteFileUrl(user.image);

  return (
    <Pressable
      onPress={() => router.push(`/user/profile/${user.id}`)}
      style={({ pressed }) => [
        styles.userCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.smallAvatar} />
      ) : (
        <View
          style={[
            // styles.smallAvatarFallback,
            // {
            //   backgroundColor: colors.segment,
            //   borderColor: colors.border,
            // },
          ]}
        >
          <Text style={[styles.smallInitials, { color: colors.accent }]}>
            {getInitials(user.displayName)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[styles.cardTitle, { color: colors.foreground }]}
        >
          {user.displayName}
        </Text>

        {user.businessName ? (
          <Text
            numberOfLines={1}
            style={[styles.cardMeta, { color: colors.muted }]}
          >
            {user.businessName}
          </Text>
        ) : (
          <Text
            numberOfLines={1}
            style={[styles.cardMeta, { color: colors.muted }]}
          >
            Community member
          </Text>
        )}
      </View>

      <View
        style={[
          styles.cardArrowWrap,
          {
            backgroundColor: colors.segment,
          },
        ]}
      >
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.infoRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.infoIconWrap,
          {
            backgroundColor: colors.segment,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>

        <Text
          numberOfLines={3}
          style={[styles.infoValue, { color: colors.foreground }]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function AboutSection({ profile }: { profile: PublicProfileWithPermissions }) {
  return (
    <View style={styles.aboutWrap}>
      <InfoRow
        icon="storefront-outline"
        label="Business Name"
        value={profile.businessName || "-"}
      />

      <InfoRow
        icon="briefcase-outline"
        label="Business Type"
        value={profile.businessType || "-"}
      />

      <InfoRow
        icon="person-add-outline"
        label="Follow Status"
        value={followLabel(profile)}
      />

      <InfoRow
        icon="people-outline"
        label="Followers"
        value={String(profile.stats?.followersCount ?? 0)}
      />

      <InfoRow
        icon="person-outline"
        label="Following"
        value={String(profile.stats?.followingCount ?? 0)}
      />

      <InfoRow
        icon="calendar-outline"
        label="Joined"
        value={formatDate(profile.createdAt)}
      />
    </View>
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
      <View
        style={[
          styles.emptyIconWrap,
          {
            backgroundColor: colors.segment,
          },
        ]}
      >
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {title}
      </Text>

      <Text style={[styles.emptyText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

function LockedState({ title, text }: { title: string; text: string }) {
  return <EmptyState icon="lock-closed-outline" title={title} text={text} />;
}

export default function PublicProfileScreen() {
  const { colors } = useAppTheme();
  const { data: session } = useSession();

  const { userId, sourceCommunityId } = useLocalSearchParams<{
    userId: string;
    sourceCommunityId?: string;
  }>();

  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [postItems, setPostItems] = useState<CommunityPost[]>([]);

  const { viewer, openViewer, closeViewer } = usePostMediaViewer();

  const safeUserId = String(userId ?? "");
  const safeSourceCommunityId = sourceCommunityId
    ? String(sourceCommunityId)
    : "";

  const isOwnProfile = Boolean(
    session?.user?.id && session.user.id === safeUserId,
  );

  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetPublicProfileQuery(safeUserId, {
    skip: !safeUserId,
  });

  const typedProfile = profile as PublicProfileWithPermissions | undefined;

  const canViewAbout = Boolean(typedProfile?.permissions?.canViewAbout);
  const canViewPosts = Boolean(typedProfile?.permissions?.canViewPosts);
  const canViewCommunities = Boolean(
    typedProfile?.permissions?.canViewCommunities,
  );
  const canViewFollowers = Boolean(typedProfile?.permissions?.canViewFollowers);
  const canViewFollowing = Boolean(typedProfile?.permissions?.canViewFollowing);

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
      skip: !safeUserId || !canViewPosts,
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
      skip: !safeUserId || !canViewCommunities,
    },
  );

  const {
    data: followersData,
    isLoading: followersLoading,
    isFetching: followersFetching,
    refetch: refetchFollowers,
  } = useGetUserFollowersQuery(
    {
      userId: safeUserId,
      page: 1,
      limit: 20,
    },
    {
      skip: !safeUserId || !canViewFollowers,
    },
  );

  const {
    data: followingData,
    isLoading: followingLoading,
    isFetching: followingFetching,
    refetch: refetchFollowing,
  } = useGetUserFollowingQuery(
    {
      userId: safeUserId,
      page: 1,
      limit: 20,
    },
    {
      skip: !safeUserId || !canViewFollowing,
    },
  );

  const [followUser, { isLoading: isFollowingUser }] = useFollowUserMutation();

  const [unfollowUser, { isLoading: isUnfollowingUser }] =
    useUnfollowUserMutation();

  const [createDirectChat, { isLoading: isCreatingChat }] =
    useCreateDirectChatMutation();

  const {
    commentPost,
    activeCommentPost,
    comments,
    commentInput,
    setCommentInput,

    isLoadingComments,
    isFetchingComments,
    isCreatingComment,
    isCreatingReply,

    openComments,
    closeComments,
    handleLikePost,
    handleSharePost,
    handleCreateComment,
    refetchComments,
  } = usePostInteractions({
    posts: postItems,
    setPosts: setPostItems,
    sessionUser: session?.user,
  });

  useEffect(() => {
    if (!typedProfile || !postsData?.data || !canViewPosts) {
      setPostItems([]);
      return;
    }

    const mappedPosts = postsData.data.map((post) =>
      mapPublicPostToCommunityPost(post, typedProfile, safeUserId),
    );

    setPostItems(mappedPosts);
  }, [typedProfile, postsData?.data, safeUserId, canViewPosts]);

  const isFollowActionLoading =
    isFollowingUser || isUnfollowingUser || isCreatingChat;

  const tabs = useMemo(() => {
    return [
      {
        key: "about" as const,
        label: "About",
      },
      {
        key: "posts" as const,
        label: `Posts ${canViewPosts ? postsData?.meta?.total ?? 0 : ""}`,
      },
      {
        key: "communities" as const,
        label: `Communities ${
          canViewCommunities ? communitiesData?.meta?.total ?? 0 : ""
        }`,
      },
      {
        key: "followers" as const,
        label: `Followers ${
          canViewFollowers
            ? followersData?.meta?.total ??
              typedProfile?.stats?.followersCount ??
              0
            : typedProfile?.stats?.followersCount ?? 0
        }`,
      },
      {
        key: "following" as const,
        label: `Following ${
          canViewFollowing
            ? followingData?.meta?.total ??
              typedProfile?.stats?.followingCount ??
              0
            : typedProfile?.stats?.followingCount ?? 0
        }`,
      },
    ];
  }, [
    canViewPosts,
    canViewCommunities,
    canViewFollowers,
    canViewFollowing,
    postsData?.meta?.total,
    communitiesData?.meta?.total,
    followersData?.meta?.total,
    followingData?.meta?.total,
    typedProfile?.stats?.followersCount,
    typedProfile?.stats?.followingCount,
  ]);

  useEffect(() => {
    const activeTabExists = tabs.some((tab) => tab.key === activeTab);

    if (!activeTabExists) {
      setActiveTab("about");
    }
  }, [activeTab, tabs]);

  const activeData = useMemo<ActiveItem[]>(() => {
    if (activeTab === "posts" && canViewPosts) {
      return postItems;
    }

    if (activeTab === "communities" && canViewCommunities) {
      return communitiesData?.data ?? [];
    }

    if (activeTab === "followers" && canViewFollowers) {
      return followersData?.data ?? [];
    }

    if (activeTab === "following" && canViewFollowing) {
      return followingData?.data ?? [];
    }

    return [];
  }, [
    activeTab,
    canViewPosts,
    canViewCommunities,
    canViewFollowers,
    canViewFollowing,
    postItems,
    communitiesData?.data,
    followersData?.data,
    followingData?.data,
  ]);

  const activeLoading =
    activeTab === "posts"
      ? postsLoading
      : activeTab === "communities"
        ? communitiesLoading
        : activeTab === "followers"
          ? followersLoading
          : activeTab === "following"
            ? followingLoading
            : false;

  const activeFetching =
    activeTab === "posts"
      ? postsFetching
      : activeTab === "communities"
        ? communitiesFetching
        : activeTab === "followers"
          ? followersFetching
          : activeTab === "following"
            ? followingFetching
            : false;

  const handleRefresh = async () => {
    const tasks: Promise<unknown>[] = [refetchProfile()];

    if (activeTab === "posts" && canViewPosts) {
      tasks.push(refetchPosts());
    }

    if (activeTab === "communities" && canViewCommunities) {
      tasks.push(refetchCommunities());
    }

    if (activeTab === "followers" && canViewFollowers) {
      tasks.push(refetchFollowers());
    }

    if (activeTab === "following" && canViewFollowing) {
      tasks.push(refetchFollowing());
    }

    await Promise.all(tasks);
  };

  const handleFollowUser = async () => {
    if (!safeUserId || isFollowActionLoading) return;

    try {
      await followUser(safeUserId).unwrap();

      await refetchProfile();

      Alert.alert("Success", "You are now following this user.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not follow this user.",
      );
    }
  };

  const handleUnfollowUser = async () => {
    if (!safeUserId || isFollowActionLoading) return;

    try {
      await unfollowUser(safeUserId).unwrap();

      await refetchProfile();

      Alert.alert("Updated", "You unfollowed this user.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not unfollow this user.",
      );
    }
  };

  const handleMessagePress = async () => {
    if (!safeUserId || isCreatingChat || !typedProfile?.permissions?.canMessage) {
      return;
    }

    try {
      const chat = await createDirectChat({
        targetUserId: safeUserId,
        body: safeSourceCommunityId
          ? {
              sourceCommunityId: safeSourceCommunityId,
            }
          : {},
      }).unwrap();

      router.push(`/messages/${chat.id}`);
    } catch (error: any) {
      console.log("Create direct chat failed:", JSON.stringify(error, null, 2));

      Alert.alert(
        "Could not open chat",
        error?.data?.message ?? "You may not be allowed to message this user.",
      );
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.root,
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (profileError || !typedProfile) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.root,
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.errorIconWrap,
            {
              backgroundColor: colors.segment,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={colors.danger}
          />
        </View>

        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Profile not available
        </Text>

        <Text style={[styles.errorText, { color: colors.muted }]}>
          This profile could not be loaded.
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
      const post = item as CommunityPost;

      return (
        <CommunityPostCard
          post={post}
          disableMediaPlayback={viewer.visible || !!commentPost}
          onPressMedia={openViewer}
          onPressAuthor={(authorId) => {
            if (!authorId || authorId === safeUserId) return;

            router.push(`/user/profile/${authorId}`);
          }}
          onPressLike={handleLikePost}
          onPressComment={openComments}
          onPressShare={handleSharePost}
        />
      );
    }

    if (activeTab === "communities") {
      return <CommunityListCard community={item as PublicProfileCommunity} />;
    }

    if (activeTab === "followers" || activeTab === "following") {
      return <FollowUserCard item={item as FollowItem} />;
    }

    return null;
  };

  const renderEmpty = () => {
    if (activeLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (activeTab === "about") {
      if (!canViewAbout) {
        return (
          <LockedState
            title="About is private"
            text="This user's about information is private."
          />
        );
      }

      return <AboutSection profile={typedProfile} />;
    }

    if (activeTab === "posts") {
      if (!canViewPosts) {
        return (
          <LockedState
            title="Posts are private"
            text="Follow this user or share a community with them to see visible posts."
          />
        );
      }

      return (
        <EmptyState
          icon="document-text-outline"
          title="No visible posts"
          text="This user has no posts that are visible to you."
        />
      );
    }

    if (activeTab === "communities") {
      if (!canViewCommunities) {
        return (
          <LockedState
            title="Follow to see communities"
            text="This user's communities are private. Follow this user to unlock this tab."
          />
        );
      }

      return (
        <EmptyState
          icon="people-circle-outline"
          title="No visible communities"
          text="This user has no communities visible to you."
        />
      );
    }

    if (activeTab === "followers") {
      if (!canViewFollowers) {
        return (
          <LockedState
            title="Follow to see followers"
            text="This user's followers list is private. Follow this user to unlock this tab."
          />
        );
      }

      return (
        <EmptyState
          icon="person-circle-outline"
          title="No followers"
          text="No followers are visible yet."
        />
      );
    }

    if (!canViewFollowing) {
      return (
        <LockedState
          title="Follow to see following"
          text="This user's following list is private. Follow this user to unlock this tab."
        />
      );
    }

    return (
      <EmptyState
        icon="person-circle-outline"
        title="No following"
        text="This user is not following anyone visible yet."
      />
    );
  };

  const listHeader = (
    <View style={styles.page}>
      <View style={styles.coverSection}>
        <CoverImage image={typedProfile.coverImage} />

        <View pointerEvents="none" style={styles.coverBackdrop} />

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </Pressable>

        <View style={styles.avatarFloatingWrap}>
          <View
            style={[
              styles.avatarOuter,
              {
                backgroundColor: colors.background,
              },
            ]}
          >
            <ProfileAvatar
              image={typedProfile.image}
              name={typedProfile.displayName}
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.profileInfoSection,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.profileInfoTopRow}>
          <View style={styles.profileNameWrap}>
            <Text
              numberOfLines={1}
              style={[styles.profileName, { color: colors.foreground }]}
            >
              {typedProfile.displayName}
            </Text>

            {typedProfile.businessName ? (
              <Text
                numberOfLines={1}
                style={[styles.profileSubText, { color: colors.muted }]}
              >
                {typedProfile.businessName}
              </Text>
            ) : null}

            {typedProfile.businessType ? (
              <View
                style={[
                  styles.businessTypePill,
                  {
                    backgroundColor: colors.segment,
                  },
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={13}
                  color={colors.accent}
                />

                <Text
                  numberOfLines={1}
                  style={[
                    styles.businessTypePillText,
                    {
                      color: colors.accent,
                    },
                  ]}
                >
                  {typedProfile.businessType}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <ProfileActionButtons
          profile={typedProfile}
          isOwnProfile={isOwnProfile}
          isLoading={isFollowActionLoading}
          onFollow={handleFollowUser}
          onUnfollow={handleUnfollowUser}
          onMessage={handleMessagePress}
        />

        <View style={styles.headerStatsGrid}>
          <HeaderStatCard
            icon="people-outline"
            value={String(typedProfile.stats?.followersCount ?? 0)}
            label="Followers"
          />

          <HeaderStatCard
            icon="person-outline"
            value={String(typedProfile.stats?.followingCount ?? 0)}
            label="Following"
          />

          <HeaderStatCard
            icon="calendar-outline"
            value={formatDate(typedProfile.createdAt)}
            label="Joined"
          />
        </View>
      </View>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
        variant="secondary"
        style={[
          styles.tabsRoot,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Tabs.List>
          <Tabs.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollAlign="start"
            contentContainerStyle={styles.tabsScrollContent}
          >
            <Tabs.Indicator />

            {tabs.map((tabItem) => (
              <Tabs.Trigger key={tabItem.key} value={tabItem.key}>
                <Tabs.Label>{tabItem.label}</Tabs.Label>
              </Tabs.Trigger>
            ))}
          </Tabs.ScrollView>
        </Tabs.List>
      </Tabs>
    </View>
  );

  return (
    <>
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
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

      <CommentPostModal
        visible={!!commentPost}
        post={activeCommentPost}
        comments={comments}
        isLoading={
          (isLoadingComments || isFetchingComments) && comments.length === 0
        }
        isCreating={isCreatingComment || isCreatingReply}
        inputValue={commentInput}
        onChangeInput={setCommentInput}
        onClose={closeComments}
        onSubmit={handleCreateComment}
        onPressMedia={openViewer}
        onPressPostLike={handleLikePost}
        onPressPostShare={handleSharePost}
        onRefreshComments={() => {
          void refetchComments();
        }}
        colors={colors}
      />

      <PostMediaViewer
        visible={viewer.visible}
        media={viewer.media}
        initialIndex={viewer.index}
        onClose={closeViewer}
      />
    </>
  );
}