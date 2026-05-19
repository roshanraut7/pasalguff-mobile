import React, { useEffect, useMemo, useState } from "react";
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
import type { CommunityPost } from "@/types/post";

type TabKey = "posts" | "about" | "communities" | "friends";

type ActiveItem = CommunityPost | PublicProfileCommunity | FriendUser;

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

function friendshipLabel(profile: PublicUserProfile) {
  const friendship = profile.friendship;

  if (!friendship) return "Not friends";

  if (friendship.status === "ACCEPTED") return "Friends";

  if (friendship.status === "PENDING" && friendship.direction === "INCOMING") {
    return "Friend request received";
  }

  if (friendship.status === "PENDING" && friendship.direction === "OUTGOING") {
    return "Friend request sent";
  }

  return friendship.status;
}

function mapPublicPostToCommunityPost(
  post: PublicProfilePost,
  profile: PublicUserProfile,
  userId: string,
): CommunityPost {
  const community = post.community as PublicProfilePost["community"] & {
    id?: string | null;
    slug?: string | null;
  };

  return {
    id: post.id,
    communityId: community.id ?? "",
    authorId: userId,

    content: post.content ?? "",
    linkUrl: null,

    createdAt: post.createdAt,
    updatedAt: post.createdAt,
    publishedAt: post.publishedAt ?? post.createdAt,

    author: {
      id: userId,
      name: profile.displayName,
      firstName: null,
      lastName: null,
      businessName: profile.businessName ?? null,
      image: profile.image ?? null,
    },

    community: {
      id: community.id ?? "",
      name: post.community.name,
      slug: community.slug ?? "",
    },

    media: post.media ?? [],

    isLikedByMe: Boolean((post as any).isLikedByMe),
    likeCount: post.engagement?.likeCount ?? 0,
    commentCount: post.engagement?.commentCount ?? 0,
    shareCount: post.engagement?.shareCount ?? 0,
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
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    />
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
          backgroundColor: colors.surface,
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
              backgroundColor: colors.surfaceSecondary,
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
                backgroundColor: colors.surfaceSecondary,
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
      style={({ pressed }) => [
        styles.friendCard,
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
            backgroundColor: colors.surfaceSecondary,
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

function AboutSection({ profile }: { profile: PublicUserProfile }) {
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
        label="Friendship"
        value={friendshipLabel(profile)}
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
  const { data: session } = useSession();

  const { userId, sourceCommunityId } = useLocalSearchParams<{
    userId: string;
    sourceCommunityId?: string;
  }>();

  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [postItems, setPostItems] = useState<CommunityPost[]>([]);

  const { viewer, openViewer, closeViewer } = usePostMediaViewer();

  const safeUserId = String(userId ?? "");
  const safeSourceCommunityId = sourceCommunityId
    ? String(sourceCommunityId)
    : "";

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
    if (!profile || !postsData?.data) {
      setPostItems([]);
      return;
    }

    const mappedPosts = postsData.data.map((post) =>
      mapPublicPostToCommunityPost(post, profile, safeUserId),
    );

    setPostItems(mappedPosts);
  }, [profile, postsData?.data, safeUserId]);

  const isFriendActionLoading =
    isSendingRequest ||
    isAcceptingRequest ||
    isRejectingRequest ||
    isCancellingRequest ||
    isCreatingChat;

  const tabs = useMemo(
    () => [
      {
        key: "posts" as const,
        label: `Posts ${postsData?.meta?.total ?? 0}`,
      },
      {
        key: "about" as const,
        label: "About",
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
    if (activeTab === "posts") return postItems;
    if (activeTab === "communities") return communitiesData?.data ?? [];
    if (activeTab === "friends") return mutualFriendsData?.data ?? [];

    return [];
  }, [
    activeTab,
    postItems,
    communitiesData?.data,
    mutualFriendsData?.data,
  ]);

  const activeLoading =
    activeTab === "posts"
      ? postsLoading
      : activeTab === "communities"
        ? communitiesLoading
        : activeTab === "friends"
          ? mutualFriendsLoading
          : false;

  const activeFetching =
    activeTab === "posts"
      ? postsFetching
      : activeTab === "communities"
        ? communitiesFetching
        : activeTab === "friends"
          ? mutualFriendsFetching
          : false;

  const handleRefresh = async () => {
    if (activeTab === "about") {
      await refetchProfile();
      return;
    }

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

  const handleMessagePress = async () => {
    if (!safeUserId || isCreatingChat) return;

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

  if (profileError || !profile) {
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

    if (activeTab === "about") {
      return <AboutSection profile={profile} />;
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
            <ProfileAvatar image={profile.image} name={profile.displayName} />
          </View>
        </View>
      </View>

      <View style={styles.profileInfoSection}>
        <Text
          numberOfLines={1}
          style={[styles.profileName, { color: colors.foreground }]}
        >
          {profile.displayName}
        </Text>

        {profile.businessName ? (
          <Text
            numberOfLines={1}
            style={[styles.profileSubText, { color: colors.muted }]}
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
                backgroundColor: colors.surface,
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
        style={[
          styles.tabsRoot,
          {
            borderBottomColor: colors.border,
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
        isLoading={(isLoadingComments || isFetchingComments) && comments.length === 0}
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
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  coverFallback: {
    width: "100%",
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
  },

  backButton: {
    position: "absolute",
    left: 20,
    top: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  avatarFloatingWrap: {
    position: "absolute",
    left: 24,
    bottom: -56,
  },

  avatarOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 4,
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
    paddingTop: 68,
    paddingHorizontal: 32,
    paddingBottom: 20,
  },

  profileName: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: "Poppins_700Bold",
  },

  profileSubText: {
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
    borderRadius: 999,
  },

  profileActionIconButton: {
    width: 56,
    minHeight: 44,
    borderRadius: 999,
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
  },

  tabsScrollContent: {
    flexDirection: "row",
    gap: 28,
    paddingLeft: 20,
    paddingRight: 28,
  },

  loadingWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },

  communityCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  communityAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  communityAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  communityInitials: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  communityInfo: {
    flex: 1,
  },

  communityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  smallPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  smallPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  communityStatsRow: {
    marginTop: 7,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  miniStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  miniStatText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Poppins_500Medium",
  },

  friendCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
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

  aboutWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },

  infoRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  infoValue: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_600SemiBold",
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