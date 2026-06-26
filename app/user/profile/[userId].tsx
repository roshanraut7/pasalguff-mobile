import React, { useMemo, useState } from "react";
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
import { useCreateDirectChatMutation } from "@/store/api/chatApi";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useFollowUserMutation,
  useGetFollowStatusQuery,
  useGetUserFollowersQuery,
  useGetUserFollowingQuery,
  useUnfollowUserMutation,
  type FollowItem,
  type FollowRelationship,
  type FollowUser,
} from "@/store/api/followApi";

import { styles } from "@/constants/styles/PublicProfileScreen.styles";

type TabKey = "about" | "followers" | "following";

type ActiveItem = FollowItem;

type PublicProfilePermissions = {
  canViewProfile: boolean;
  canViewAbout: boolean;
  canViewFollowers: boolean;
  canViewFollowing: boolean;
  canMessage: boolean;
  canFollow: boolean;
  canUnfollow: boolean;
  canEditProfile: boolean;
  canViewFriends?: boolean;
};

type PublicProfileWithPermissions = FollowUser & {
  coverImage?: string | null;
  follow?: FollowRelationship & {
    followedAt?: string | null;
  };
  stats?: {
    followersCount: number;
    followingCount: number;
  };
  permissions?: PublicProfilePermissions;
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

function getFollowLabel(profile: PublicProfileWithPermissions) {
  const isFollowing = Boolean(profile.follow?.isFollowing);
  const followsMe = Boolean(profile.follow?.followsMe);
  const isMutual = Boolean(profile.follow?.isMutual || (isFollowing && followsMe));

  if (isMutual) return "Friends";
  if (isFollowing) return "Following";
  if (followsMe) return "Follow Back";
  if (profile.permissions?.canFollow) return "Follow";
  if (profile.follow?.buttonText) return profile.follow.buttonText;

  return "Private";
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

  if (isOwnProfile) {
    return null;
  }

  const canMessage = Boolean(profile.permissions?.canMessage);
  const canFollow = Boolean(profile.permissions?.canFollow);
  const canUnfollow = Boolean(profile.permissions?.canUnfollow);

  const isFollowing = Boolean(profile.follow?.isFollowing);
  const followsMe = Boolean(profile.follow?.followsMe);
  const isMutual = Boolean(profile.follow?.isMutual || (isFollowing && followsMe));

  const followButtonLabel = isMutual
    ? "Friends"
    : isFollowing
      ? "Following"
      : followsMe
        ? "Follow Back"
        : "Follow";

  const showUnfollowButton = isFollowing || canUnfollow;
  const showFollowButton = !isFollowing && (canFollow || followsMe);

  return (
    <View style={styles.profileActionRow}>
      {showUnfollowButton ? (
        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLoading}
          onPress={onUnfollow}
          style={styles.profileActionButton}
        >
          <IconButtonContent
            icon={isMutual ? "people-outline" : "checkmark-circle-outline"}
            label={followButtonLabel}
            color={colors.accent}
          />
        </Button>
      ) : showFollowButton ? (
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

      {canMessage || isMutual ? (
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

      <Text
        numberOfLines={1}
        style={[styles.headerStatLabel, { color: colors.muted }]}
      >
        {label}
      </Text>
    </View>
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
        value={getFollowLabel(profile)}
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

function FollowUserCard({
  item,
  onFollow,
  onUnfollow,
  isActionLoading,
}: {
  item: FollowItem;
  onFollow?: (item: FollowItem) => void;
  onUnfollow?: (item: FollowItem) => void;
  isActionLoading?: boolean;
}) {
  const { colors } = useAppTheme();

  const user = item.user;
  const imageUrl = toAbsoluteFileUrl(user.image);

  const relationship = item.relationship;

  const isFollowing = Boolean(relationship?.isFollowing);
  const followsMe = Boolean(relationship?.followsMe);
  const isMutual = Boolean(relationship?.isMutual || (isFollowing && followsMe));

  const buttonText = isMutual
    ? "Friends"
    : isFollowing
      ? "Following"
      : followsMe
        ? "Follow Back"
        : relationship?.buttonText ?? "Follow";

  const showFollowBackButton =
    buttonText === "Follow Back" || (!isFollowing && followsMe);

  const showFriendsButton = buttonText === "Friends" || isMutual;

  const showFollowingButton =
    buttonText === "Following" && isFollowing && !isMutual;

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
            styles.smallAvatar,
            {
              backgroundColor: colors.segment,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            },
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

      {showFollowBackButton ? (
        <Button
          size="sm"
          variant="primary"
          isDisabled={isActionLoading}
          onPress={() => onFollow?.(item)}
        >
          <Button.Label>Follow Back</Button.Label>
        </Button>
      ) : showFriendsButton ? (
        <Button
          size="sm"
          variant="secondary"
          isDisabled={isActionLoading}
          onPress={() => onUnfollow?.(item)}
        >
          <Button.Label>Friends</Button.Label>
        </Button>
      ) : showFollowingButton ? (
        <Button
          size="sm"
          variant="secondary"
          isDisabled={isActionLoading}
          onPress={() => onUnfollow?.(item)}
        >
          <Button.Label>Following</Button.Label>
        </Button>
      ) : (
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
      )}
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
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const safeUserId = String(userId ?? "");
  const safeSourceCommunityId = sourceCommunityId
    ? String(sourceCommunityId)
    : "";

  const isOwnProfile = Boolean(
    session?.user?.id && session.user.id === safeUserId,
  );

  const {
    data: followStatusData,
    isLoading: profileLoading,
    isFetching: profileFetching,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetFollowStatusQuery(safeUserId, {
    skip: !safeUserId || isOwnProfile,
  });

  const baseProfile = useMemo<PublicProfileWithPermissions | undefined>(() => {
    if (isOwnProfile && session?.user?.id) {
      const displayName =
        session.user.name?.trim() ||
        `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim() ||
        "You";

      return {
        id: session.user.id,
        name: session.user.name ?? null,
        firstName: session.user.firstName ?? null,
        lastName: session.user.lastName ?? null,
        image: session.user.image ?? null,
        businessName: null,
        businessType: null,
        displayName,
        createdAt: new Date().toISOString(),
        follow: {
          isFollowing: false,
          followsMe: false,
          isMutual: false,
          canMessage: false,
          buttonText: "Follow",
          followedAt: null,
        },
        permissions: {
          canViewProfile: true,
          canViewAbout: true,
          canViewFollowers: true,
          canViewFollowing: true,
          canMessage: false,
          canFollow: false,
          canUnfollow: false,
          canEditProfile: true,
          canViewFriends: true,
        },
        stats: {
          followersCount: 0,
          followingCount: 0,
        },
      };
    }

    if (!followStatusData?.user || !followStatusData.relationship) {
      return undefined;
    }

    const user = followStatusData.user;
    const relationship = followStatusData.relationship;

    return {
      ...user,
      follow: {
        isFollowing: relationship.isFollowing,
        followsMe: relationship.followsMe,
        isMutual: relationship.isMutual,
        canMessage: relationship.canMessage,
        buttonText: relationship.buttonText,
        followedAt: null,
      },
      permissions: {
        canViewProfile: true,
        canViewAbout: true,
        canViewFollowers: relationship.isFollowing || relationship.isMutual,
        canViewFollowing: relationship.isFollowing || relationship.isMutual,
        canMessage: relationship.canMessage,
        canFollow: !relationship.isFollowing,
        canUnfollow: relationship.isFollowing,
        canEditProfile: false,
        canViewFriends: true,
      },
      stats: {
        followersCount: 0,
        followingCount: 0,
      },
    };
  }, [followStatusData, isOwnProfile, session?.user]);

  const canViewAbout = Boolean(baseProfile?.permissions?.canViewAbout);
  const canViewFollowers = Boolean(baseProfile?.permissions?.canViewFollowers);
  const canViewFollowing = Boolean(baseProfile?.permissions?.canViewFollowing);

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

  const typedProfile = useMemo<PublicProfileWithPermissions | undefined>(() => {
    if (!baseProfile) return undefined;

    return {
      ...baseProfile,
      stats: {
        followersCount:
          followersData?.meta?.total ?? baseProfile.stats?.followersCount ?? 0,
        followingCount:
          followingData?.meta?.total ?? baseProfile.stats?.followingCount ?? 0,
      },
    };
  }, [baseProfile, followersData?.meta?.total, followingData?.meta?.total]);

  console.log("PUBLIC PROFILE FOLLOW API DEBUG:", {
    profileUserId: safeUserId,
    currentUserId: session?.user?.id,
    relationship: followStatusData?.relationship,
    profileFollow: typedProfile?.follow,
    permissions: typedProfile?.permissions,
  });

  const [followUser, { isLoading: isFollowingUser }] = useFollowUserMutation();

  const [unfollowUser, { isLoading: isUnfollowingUser }] =
    useUnfollowUserMutation();

  const [createDirectChat, { isLoading: isCreatingChat }] =
    useCreateDirectChatMutation();

  const isFollowActionLoading =
    isFollowingUser || isUnfollowingUser || isCreatingChat;

  const tabs = useMemo(() => {
    return [
      {
        key: "about" as const,
        label: "About",
      },
      {
        key: "followers" as const,
        label: `Followers ${typedProfile?.stats?.followersCount ?? 0}`,
      },
      {
        key: "following" as const,
        label: `Following ${typedProfile?.stats?.followingCount ?? 0}`,
      },
    ];
  }, [typedProfile?.stats?.followersCount, typedProfile?.stats?.followingCount]);

  const activeData = useMemo<ActiveItem[]>(() => {
    if (activeTab === "followers" && canViewFollowers) {
      return followersData?.data ?? [];
    }

    if (activeTab === "following" && canViewFollowing) {
      return followingData?.data ?? [];
    }

    return [];
  }, [
    activeTab,
    canViewFollowers,
    canViewFollowing,
    followersData?.data,
    followingData?.data,
  ]);

  const activeLoading =
    activeTab === "followers"
      ? followersLoading
      : activeTab === "following"
        ? followingLoading
        : false;

  const activeFetching =
    activeTab === "followers"
      ? followersFetching
      : activeTab === "following"
        ? followingFetching
        : false;

  const refetchSafeProfile = async () => {
    if (!isOwnProfile && safeUserId) {
      await refetchProfile();
    }
  };

  const refetchAvailableFollowData = async () => {
    const tasks: Promise<unknown>[] = [];

    if (!isOwnProfile && safeUserId) {
      tasks.push(refetchProfile());
    }

    if (canViewFollowers) {
      tasks.push(refetchFollowers());
    }

    if (canViewFollowing) {
      tasks.push(refetchFollowing());
    }

    await Promise.all(tasks);
  };

  const handleRefresh = async () => {
    await refetchAvailableFollowData();
  };

  const handleFollowUser = async () => {
    if (!safeUserId || isFollowActionLoading) return;

    try {
      await followUser(safeUserId).unwrap();

      await refetchSafeProfile();

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

      await refetchSafeProfile();

      Alert.alert("Updated", "You unfollowed this user.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not unfollow this user.",
      );
    }
  };

  const handleFollowListUser = async (item: FollowItem) => {
    const targetUser = item.user;

    if (!targetUser.id || isFollowActionLoading) return;

    try {
      setActionUserId(targetUser.id);

      await followUser(targetUser.id).unwrap();

      await refetchAvailableFollowData();

      Alert.alert("Success", `You followed back ${targetUser.displayName}.`);
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not follow this user.",
      );
    } finally {
      setActionUserId(null);
    }
  };

  const handleUnfollowListUser = async (item: FollowItem) => {
    const targetUser = item.user;

    if (!targetUser.id || isFollowActionLoading) return;

    try {
      setActionUserId(targetUser.id);

      await unfollowUser(targetUser.id).unwrap();

      await refetchAvailableFollowData();

      Alert.alert("Updated", `You unfollowed ${targetUser.displayName}.`);
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not unfollow this user.",
      );
    } finally {
      setActionUserId(null);
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
    const followItem = item as FollowItem;

    return (
      <FollowUserCard
        item={followItem}
        isActionLoading={actionUserId === followItem.user.id}
        onFollow={handleFollowListUser}
        onUnfollow={handleUnfollowListUser}
      />
    );
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
  );
}
