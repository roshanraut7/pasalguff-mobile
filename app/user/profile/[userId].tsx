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
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Tabs } from "heroui-native";

import { useSession } from "@/api/better-auth-client";
import ProfileImageViewer from "@/components/common/profileImageViewer";
import VerifiedBadge from "@/components/common/verifiedBadge";
import ProfileDetailsContent from "@/components/profile/ProfileDetailsContent";
import { styles } from "@/constants/styles/PublicProfileScreen.styles";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useCreateDirectChatMutation } from "@/store/api/chatApi";

import {
  useFollowUserMutation,
  useGetUserFollowersQuery,
  useGetUserFollowingQuery,
  useUnfollowUserMutation,
  type FollowItem,
} from "@/store/api/followApi";

import {
  useGetPublicProfileQuery,
  type PublicProfileResponse,
} from "@/store/api/profileApi";

type TabKey = "about" | "followers" | "following";
type ActiveItem = FollowItem;
type FollowListUser = FollowItem["user"] & {
  profileRole?: string | null;
  organizationName?: string | null;
  isVerified?: boolean;
  verificationTrack?: PublicProfileResponse["verificationTrack"];
};

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() || "U";
  }

  return `${parts[0]?.charAt(0) ?? ""}${
    parts[1]?.charAt(0) ?? ""
  }`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getProfileRoleIcon(
  profileType: PublicProfileResponse["profileType"],
): keyof typeof Ionicons.glyphMap {
  switch (profileType) {
    case "BUSINESS":
      return "storefront-outline";

    case "INSTITUTE":
      return "school-outline";

    case "INDIVIDUAL":
    default:
      return "person-outline";
  }
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

function CoverImage({
  image,
  onPress,
}: {
  image?: string | null;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(image);

  if (imageUrl) {
    return (
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      </Pressable>
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
  onPress,
}: {
  image?: string | null;
  name?: string | null;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(image);

  if (imageUrl) {
    return (
      <Pressable onPress={onPress}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      </Pressable>
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
  isLoading,
  onFollow,
  onUnfollow,
  onMessage,
}: {
  profile: PublicProfileResponse;
  isLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onMessage: () => void;
}) {
  const { colors } = useAppTheme();

  const canMessage =
    profile.follow.canMessage || profile.permissions.canMessage;
  const canFollow = profile.follow.canFollow || profile.permissions.canFollow;
  const canUnfollow =
    profile.follow.canUnfollow || profile.permissions.canUnfollow;

  const isFollowing = profile.follow.isFollowing;
  const followsMe = profile.follow.followsMe;
  const isMutual = profile.follow.isMutual;

  const followButtonLabel = profile.follow.buttonText;
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

function AboutSection({ profile }: { profile: PublicProfileResponse }) {
  const { colors } = useAppTheme();

  if (!profile.permissions.canViewAbout || !profile.about) {
    return (
      <LockedState
        title="About is private"
        text="This user's about information is private."
      />
    );
  }

  const detailsProfile = {
    id: profile.id,
    email: profile.about.publicEmail ?? "",

    name: profile.name,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,

    profileType: profile.profileType,
    profileRole: profile.profileRole,

    headline: profile.headline,
    bio: profile.about.bio,
    location: profile.about.location,

    publicEmail: profile.about.publicEmail,
    publicPhone: profile.about.publicPhone,
    website: profile.about.website,

    organizationName: profile.about.organizationName,
    organizationAddress: profile.about.organizationAddress,

    image: profile.image,
    coverImage: profile.coverImage,

    isVerified: profile.isVerified,
    verificationTrack: profile.verificationTrack,
    verifiedAt: profile.verifiedAt,

    interests: profile.about.interests,
    skills: profile.about.skills,
    education: profile.about.education,
    experiences: profile.about.experiences,
    certifications: profile.about.certifications,

    businessName: profile.businessName,
    businessType: profile.businessType,
    createdAt: profile.createdAt,
  };

  return (
    <ProfileDetailsContent
      profile={detailsProfile as any}
      colors={colors}
      editable={false}
    />
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

  const user = item.user as FollowListUser;
  const imageUrl = toAbsoluteFileUrl(user.image);
  const relationship = item.relationship;

  const isFollowing = Boolean(relationship?.isFollowing);
  const followsMe = Boolean(relationship?.followsMe);
  const isMutual = Boolean(
    relationship?.isMutual || (isFollowing && followsMe),
  );

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

  const metaText =
    user.profileRole ||
    user.organizationName ||
    user.businessName ||
    "Community member";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/user/profile/[userId]",
          params: {
            userId: user.id,
          },
        })
      }
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.cardTitle,
              {
                color: colors.foreground,
                flexShrink: 1,
              },
            ]}
          >
            {user.displayName}
          </Text>

          {user.isVerified && user.verificationTrack ? (
            <VerifiedBadge track={user.verificationTrack} size={14} />
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={[styles.cardMeta, { color: colors.muted }]}
        >
          {metaText}
        </Text>
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

export default function PublicProfileScreen() {
  const { colors } = useAppTheme();
  const { data: session, isPending: sessionPending } = useSession();

  const { userId, sourceCommunityId } = useLocalSearchParams<{
    userId: string;
    sourceCommunityId?: string;
  }>();

  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [profileViewerVisible, setProfileViewerVisible] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const safeUserId = String(userId ?? "");
  const safeSourceCommunityId = sourceCommunityId
    ? String(sourceCommunityId)
    : "";

  const isOwnProfile = Boolean(
    session?.user?.id && session.user.id === safeUserId,
  );

  const {
    data: publicProfile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetPublicProfileQuery(safeUserId, {
    skip: !safeUserId || !session?.user || isOwnProfile,
  });

  const canViewAbout = Boolean(publicProfile?.permissions.canViewAbout);
  const canViewFollowers = Boolean(
    publicProfile?.permissions.canViewFollowers,
  );
  const canViewFollowing = Boolean(
    publicProfile?.permissions.canViewFollowing,
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
      skip:
        !safeUserId ||
        !session?.user ||
        isOwnProfile ||
        !canViewFollowers,
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
      skip:
        !safeUserId ||
        !session?.user ||
        isOwnProfile ||
        !canViewFollowing,
    },
  );

  const [followUser, { isLoading: isFollowingUser }] =
    useFollowUserMutation();

  const [unfollowUser, { isLoading: isUnfollowingUser }] =
    useUnfollowUserMutation();

  const [createDirectChat, { isLoading: isCreatingChat }] =
    useCreateDirectChatMutation();

  const typedProfile = publicProfile;

  const isFollowActionLoading =
    isFollowingUser || isUnfollowingUser || isCreatingChat;

  const tabs = useMemo(
    () => [
      {
        key: "about" as const,
        label: "About",
      },
      {
        key: "followers" as const,
        label: `Followers ${typedProfile?.stats.followersCount ?? 0}`,
      },
      {
        key: "following" as const,
        label: `Following ${typedProfile?.stats.followingCount ?? 0}`,
      },
    ],
    [
      typedProfile?.stats.followersCount,
      typedProfile?.stats.followingCount,
    ],
  );

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
    if (!isOwnProfile && safeUserId && session?.user) {
      await refetchProfile();
    }
  };

  const refetchAvailableFollowData = async () => {
    const tasks: Promise<unknown>[] = [];

    if (!isOwnProfile && safeUserId && session?.user) {
      tasks.push(Promise.resolve(refetchProfile()));
    }

    if (canViewFollowers) {
      tasks.push(Promise.resolve(refetchFollowers()));
    }

    if (canViewFollowing) {
      tasks.push(Promise.resolve(refetchFollowing()));
    }

    await Promise.allSettled(tasks);
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

  const openProfileImage = (image: string | null | undefined) => {
    const absoluteUrl = image ? toAbsoluteFileUrl(image) : null;

    if (!absoluteUrl) return;

    setViewerImageUrl(absoluteUrl);
    setProfileViewerVisible(true);
  };

  const handleMessagePress = async () => {
    const canMessage = Boolean(
      typedProfile?.follow.canMessage || typedProfile?.permissions.canMessage,
    );

    if (!safeUserId || isCreatingChat || !canMessage) {
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

  if (sessionPending) {
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

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  if (isOwnProfile) {
    return <Redirect href="/(tabs)/profile" />;
  }

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

  const renderItem = ({ item }: { item: ActiveItem }) => (
    <FollowUserCard
      item={item}
      isActionLoading={actionUserId === item.user.id}
      onFollow={handleFollowListUser}
      onUnfollow={handleUnfollowListUser}
    />
  );

  const renderEmpty = () => {
    if (activeLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (activeTab === "about") {
      return <AboutSection profile={typedProfile} />;
    }

    if (activeTab === "followers") {
      if (!canViewFollowers) {
        return (
          <LockedState
            title="Followers are private"
            text="This user's followers list is private."
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
          title="Following is private"
          text="This user's following list is private."
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
        <CoverImage
          image={typedProfile.coverImage}
          onPress={() => openProfileImage(typedProfile.coverImage)}
        />

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
              onPress={() => openProfileImage(typedProfile.image)}
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.profileName,
                  {
                    color: colors.foreground,
                    flexShrink: 1,
                  },
                ]}
              >
                {typedProfile.displayName}
              </Text>

              {typedProfile.isVerified && typedProfile.verificationTrack ? (
                <VerifiedBadge
                  track={typedProfile.verificationTrack}
                  size={16}
                />
              ) : null}
            </View>

            {typedProfile.organizationName ? (
              <Text
                numberOfLines={1}
                style={[styles.profileSubText, { color: colors.muted }]}
              >
                {typedProfile.organizationName}
              </Text>
            ) : null}

            {typedProfile.profileRole ? (
              <View
                style={[
                  styles.businessTypePill,
                  {
                    backgroundColor: colors.segment,
                  },
                ]}
              >
                <Ionicons
                  name={getProfileRoleIcon(typedProfile.profileType)}
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
                  {typedProfile.profileRole}
                </Text>
              </View>
            ) : null}

            {typedProfile.headline ? (
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 19,
                  fontFamily: "Poppins_400Regular",
                  marginTop: 5,
                }}
              >
                {typedProfile.headline}
              </Text>
            ) : null}

            {canViewAbout && typedProfile.about?.location ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 5,
                }}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.muted}
                />

                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  {typedProfile.about.location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <ProfileActionButtons
          profile={typedProfile}
          isLoading={isFollowActionLoading}
          onFollow={handleFollowUser}
          onUnfollow={handleUnfollowUser}
          onMessage={handleMessagePress}
        />

        <View style={styles.headerStatsGrid}>
          <HeaderStatCard
            icon="people-outline"
            value={String(typedProfile.stats.followersCount)}
            label="Followers"
          />

          <HeaderStatCard
            icon="person-outline"
            value={String(typedProfile.stats.followingCount)}
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

      <ProfileImageViewer
        visible={profileViewerVisible}
        imageUrl={viewerImageUrl}
        onClose={() => {
          setProfileViewerVisible(false);
          setViewerImageUrl(null);
        }}
        type="avatar"
      />
    </SafeAreaView>
  );
}