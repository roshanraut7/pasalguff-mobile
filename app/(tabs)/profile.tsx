import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
  Modal
} from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Menu, Tabs } from "heroui-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useSession } from "@/api/better-auth-client";

import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import type { CommunityItem } from "@/types/community";
import VerifiedBadge from "@/components/common/verifiedBadge";
import { useGetMyVerificationStatusQuery } from "@/store/api/verificationApi";
import { useGetMyBusinessCommunityStatusQuery } from "@/store/api/businessCommunityApi";
import StudentBadge from "@/components/common/StudentBadge"; // adjust path if needed

import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "@/store/api/profileApi";

import {
  useDeletePostMutation,
  useGetMyPostsQuery,
} from "@/store/api/postApi";

import type { PostMedia } from "@/types/post";
import type { CommunityPost } from "@/types/post";

import {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
} from "@/store/api/uploadApi";

import CommunityPostCard from "@/components/post/CommunityPostCard";
import CommentPostModal from "@/components/post/CommentsModal";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import CommunityCard from "@/components/common/communityCard";

import { usePostInteractions } from "@/hooks/media/usePostInteractions";

import {
  createProfileStyles,
  type ProfileColors,
  type ProfileStyles,
} from "@/constants/styles/profile.styles";
import ImageCropModal from "@/components/post/ImageCropModal";

type ImageTarget = "avatar" | "cover";

const POSTS_LIMIT = 10;

// Profession types that only need Professional Email + Phone
// (no business name / address required). Keep in sync with
// TRAINING_PROFESSIONS in onboarding.tsx.
const TRAINING_PROFESSIONS = ["Instructor", "Trainer", "Trainee"];

const getBannerDismissKey = (userId: string) =>
  `profileCompletionBannerDismissedUntil:${userId}`;
const REMIND_LATER_HOURS = 24;

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  const [tab, setTab] = useState("posts");

  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(
    null,
  );

  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([]);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isBannerCheckDone, setIsBannerCheckDone] = useState(false);
  const [showRemindLaterModal, setShowRemindLaterModal] = useState(false);

  const refreshStartedRef = useRef(false);

  const [viewer, setViewer] = useState<{
    visible: boolean;
    media: PostMedia[];
    index: number;
  }>({
    visible: false,
    media: [],
    index: 0,
  });

  const { data: session, isPending } = useSession();

  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    error: profileError,
    refetch: refetchProfile,
  } = useGetMyProfileQuery(undefined, {
    skip: !session?.user,
  });
  const {
  data: verificationStatus,
} = useGetMyVerificationStatusQuery(undefined, {
  skip: !session?.user,
});

  const {
    data: myCommunitiesResponse,
    isLoading: myCommunitiesLoading,
    isFetching: myCommunitiesFetching,
    error: myCommunitiesError,
    refetch: refetchMyCommunities,
  } = useGetMyCommunitiesQuery(
    {
      page: 1,
      limit: 50,
    },
    {
      skip: !session?.user,
    },
  );

  const {
    currentData: myPostsResponse,
    isLoading: myPostsLoading,
    isFetching: myPostsFetching,
    error: myPostsError,
    refetch: refetchMyPosts,
  } = useGetMyPostsQuery(
    {
      limit: POSTS_LIMIT,
      cursor: postsCursor,
      sortBy: "newest",
    },
    {
      skip: !session?.user,
    },
  );

  const { data: businessCommunityStatus } = useGetMyBusinessCommunityStatusQuery(
  undefined,
  { skip: !session?.user },
);

const hasApprovedBusinessCommunity =
  businessCommunityStatus?.latestRequest?.status === "APPROVED";
  const myCommunities = (myCommunitiesResponse?.data ?? []) as CommunityItem[];

  const hasMorePosts = myPostsResponse?.meta?.hasMore ?? false;
  const nextPostsCursor = myPostsResponse?.meta?.nextCursor ?? null;

  const [deletePost, { isLoading: isDeletingPost }] = useDeletePostMutation();

  const [updateMyProfile] = useUpdateMyProfileMutation();
  const [uploadProfileAvatar] = useUploadProfileAvatarMutation();
  const [uploadProfileCover] = useUploadProfileCoverMutation();

  const user = profile ?? session?.user;

  const isTrainingProfession = TRAINING_PROFESSIONS.includes(
    user?.businessType ?? "",
  );

  const requiredFieldChecks = useMemo(() => {
    const checks = [
      !!user?.image,
      !!user?.businessType,
      !!user?.businessEmail,
      !!user?.businessPhoneNo,
    ];

    if (!isTrainingProfession) {
      checks.push(!!user?.businessName, !!user?.address);
    }

    return checks;
  }, [user, isTrainingProfession]);

const verifiedStudentCommunities = useMemo(() => {
  return myCommunities.filter((community) => community.isVerifiedStudent);
}, [myCommunities]);
  const completedCount = requiredFieldChecks.filter(Boolean).length;
  const completionPercent = Math.round(
    (completedCount / requiredFieldChecks.length) * 100,
  );
  const isProfileComplete = completedCount === requiredFieldChecks.length;

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
    handleCommentLike,
  } = usePostInteractions({
    posts: allPosts,
    setPosts: setAllPosts,
    sessionUser: session?.user,
  });

  const fullName = useMemo(() => {
    if (user?.name?.trim()) return user.name.trim();

    const joined = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

    return joined || "User";
  }, [user]);

  const initials = useMemo(() => {
    const parts = fullName.split(" ").filter(Boolean);

    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [fullName]);

  const displayAvatar = toAbsoluteFileUrl(user?.image);
  const displayCover = toAbsoluteFileUrl(user?.coverImage);

  const ownedCommunities = useMemo(() => {
    return myCommunities.filter(
      (community) =>
        community.myRole === "ADMIN" && community.myMemberStatus === "ACTIVE",
    );
  }, [myCommunities]);

  const joinedCommunities = useMemo(() => {
    return myCommunities.filter(
      (community) =>
        community.myRole !== "ADMIN" && community.myMemberStatus === "ACTIVE",
    );
  }, [myCommunities]);

  useEffect(() => {
    if (!myPostsResponse) return;

    const responseCursor = postsCursor ?? null;
    const posts = myPostsResponse.data ?? [];

    if (!responseCursor) {
      setAllPosts(posts);
      return;
    }

    setAllPosts((prev) => {
      const existingIds = new Set(prev.map((post) => post.id));
      const newPosts = posts.filter((post) => !existingIds.has(post.id));

      return [...prev, ...newPosts];
    });
  }, [myPostsResponse, postsCursor]);

  useEffect(() => {
    if (!isPullRefreshing) return;
    if (!refreshStartedRef.current) return;

    if (
      postsCursor === null &&
      !profileFetching &&
      !myCommunitiesFetching &&
      !myPostsFetching
    ) {
      const timer = setTimeout(() => {
        setIsPullRefreshing(false);
        refreshStartedRef.current = false;
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [
    isPullRefreshing,
    postsCursor,
    profileFetching,
    myCommunitiesFetching,
    myPostsFetching,
  ]);

 useEffect(() => {
  if (!user?.id) return;

  setIsBannerCheckDone(false);

  const checkBannerDismissal = async () => {
    try {
      const stored = await AsyncStorage.getItem(getBannerDismissKey(user.id));

      if (stored) {
        const dismissedUntil = Number(stored);

        if (Number.isFinite(dismissedUntil) && Date.now() < dismissedUntil) {
          setIsBannerDismissed(true);
        } else {
          setIsBannerDismissed(false);
        }
      } else {
        setIsBannerDismissed(false);
      }
    } catch (error) {
      console.log("Failed to read banner dismissal:", error);
    } finally {
      setIsBannerCheckDone(true);
    }
  };

  checkBannerDismissal();
}, [user?.id]);

  const loadMorePosts = useCallback(() => {
    if (tab !== "posts") return;
    if (isPullRefreshing) return;
    if (myPostsLoading || myPostsFetching) return;
    if (!hasMorePosts || !nextPostsCursor) return;

    setPostsCursor(nextPostsCursor);
  }, [
    tab,
    isPullRefreshing,
    myPostsLoading,
    myPostsFetching,
    hasMorePosts,
    nextPostsCursor,
  ]);

  const refreshProfilePage = useCallback(async () => {
    try {
      setIsPullRefreshing(true);
      refreshStartedRef.current = true;

      if (postsCursor !== null) {
        setPostsCursor(null);
      }

      const tasks: Promise<unknown>[] = [
        Promise.resolve(refetchProfile()),
        Promise.resolve(refetchMyCommunities()),
      ];

      if (postsCursor === null) {
        tasks.push(Promise.resolve(refetchMyPosts()));
      }

      if (commentPost) {
        tasks.push(Promise.resolve(refetchComments()));
      }

      await Promise.allSettled(tasks);
    } catch (error) {
      console.log("Profile refresh failed:", error);
    } finally {
      if (postsCursor === null) {
        setIsPullRefreshing(false);
        refreshStartedRef.current = false;
      }
    }
  }, [
    postsCursor,
    refetchProfile,
    refetchMyCommunities,
    refetchMyPosts,
    commentPost,
    refetchComments,
  ]);

  const handleOpenSettingsPrivacy = () => {
    router.push("/pages/privacySetting");
  };

const handleDismissBanner = async () => {
  if (!user?.id) return;

  setIsBannerDismissed(true);

  try {
    const remindAt = Date.now() + REMIND_LATER_HOURS * 60 * 60 * 1000;
    await AsyncStorage.setItem(
      getBannerDismissKey(user.id),
      String(remindAt),
    );
  } catch (error) {
    console.log("Failed to persist banner dismissal:", error);
  }
};

  const openViewer = useCallback((media: PostMedia[], index: number) => {
    setViewer({
      visible: true,
      media,
      index,
    });
  }, []);

  const closeViewer = useCallback(() => {
    setViewer((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const handleDeletePost = useCallback(
    async (post: CommunityPost) => {
      try {
        await deletePost({
          communityId: post.communityId,
          postId: post.id,
        }).unwrap();

        setAllPosts((prev) => prev.filter((item) => item.id !== post.id));
      } catch (error) {
        console.log("Delete post failed:", error);
        throw error;
      }
    },
    [deletePost],
  );
  const handleEditPost = useCallback((post: CommunityPost) => {
  router.push({
    pathname: "/pages/editpost",
    params: {
      postId: post.id,
      communityId: post.communityId,
    },
  });
}, []);

  const uploadPickedAsset = async (
    asset: ImagePicker.ImagePickerAsset,
    target: ImageTarget,
  ) => {
    setUploadingTarget(target);

    try {
      const uploadFn =
        target === "avatar" ? uploadProfileAvatar : uploadProfileCover;

      const uploaded = await uploadFn({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      }).unwrap();

      const absoluteUrl = toAbsoluteFileUrl(uploaded.url) ?? uploaded.url;

      if (target === "avatar") {
        await updateMyProfile({ image: absoluteUrl }).unwrap();
      } else {
        await updateMyProfile({ coverImage: absoluteUrl }).unwrap();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setUploadingTarget(null);
    }
  };
  const handleCropConfirm = async (croppedUri: string) => {
  const target = cropState.target;
  setCropState((prev) => ({ ...prev, visible: false }));

  if (!target) return;

  await uploadPickedAsset(
    {
      uri: croppedUri,
      fileName: `${target}-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
    } as ImagePicker.ImagePickerAsset,
    target,
  );
};

const handleCropCancel = () => {
  setCropState((prev) => ({ ...prev, visible: false }));
};

 const pickFromCamera = async (target: ImageTarget) => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,   // <-- was: target === "avatar"
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return;

  const asset = result.assets[0];
  setCropState({
    visible: true,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    target,
  });
};

 const pickFromGallery = async (target: ImageTarget) => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,   // <-- was: target === "avatar"
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return;

  const asset = result.assets[0];
  setCropState({
    visible: true,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    target,
  });
};
  const removeProfileImage = async (target: ImageTarget) => {
    try {
      if (target === "avatar") {
        await updateMyProfile({ image: null }).unwrap();
      } else {
        await updateMyProfile({ coverImage: null }).unwrap();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const isUploadingAvatar = uploadingTarget === "avatar";
  const isUploadingCover = uploadingTarget === "cover";
  const [cropState, setCropState] = useState<{
  visible: boolean;
  uri: string | null;
  width: number;
  height: number;
  target: ImageTarget | null;
}>({
  visible: false,
  uri: null,
  width: 0,
  height: 0,
  target: null,
});

const renderPost = useCallback(
  ({ item }: { item: CommunityPost }) => {
    return (
      <CommunityPostCard
        post={item}
        disableMediaPlayback={viewer.visible}
        canEdit
        canDelete
        isDeleting={isDeletingPost}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        onPressLike={handleLikePost}
        onPressComment={openComments}
        onPressShare={handleSharePost}
        onPressAuthor={(authorId) => {
          router.push({
            pathname: "/user/profile/[userId]",
            params: { userId: authorId },
          });
        }}
        onPressMedia={openViewer}
      />
    );
  },
  [
    viewer.visible,
    isDeletingPost,
    handleEditPost,
    handleDeletePost,
    handleLikePost,
    openComments,
    handleSharePost,
    openViewer,
  ],
);

  const showInitialPostLoader =
    tab === "posts" &&
    allPosts.length === 0 &&
    !isPullRefreshing &&
    !myPostsError &&
    (myPostsLoading || (myPostsFetching && postsCursor === null));

  const showEmptyPosts =
    tab === "posts" &&
    allPosts.length === 0 &&
    !isPullRefreshing &&
    !myPostsLoading &&
    !myPostsFetching &&
    !myPostsError;

  const showOwnedCommunitiesInitialLoader =
    tab === "communities" &&
    ownedCommunities.length === 0 &&
    !isPullRefreshing &&
    !myCommunitiesError &&
    (myCommunitiesLoading || myCommunitiesFetching);

  const showEmptyOwnedCommunities =
    tab === "communities" &&
    ownedCommunities.length === 0 &&
    !isPullRefreshing &&
    !myCommunitiesLoading &&
    !myCommunitiesFetching &&
    !myCommunitiesError;

  const showJoinedCommunitiesInitialLoader =
    tab === "joinedCommunities" &&
    joinedCommunities.length === 0 &&
    !isPullRefreshing &&
    !myCommunitiesError &&
    (myCommunitiesLoading || myCommunitiesFetching);

  const showEmptyJoinedCommunities =
    tab === "joinedCommunities" &&
    joinedCommunities.length === 0 &&
    !isPullRefreshing &&
    !myCommunitiesLoading &&
    !myCommunitiesFetching &&
    !myCommunitiesError;

  if (isPending || profileLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["left", "right"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <>
      <SafeAreaView style={styles.root} edges={["left", "right"]}>
        <FlatList
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          data={tab === "posts" ? allPosts : []}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={refreshProfilePage}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListHeaderComponent={
            <View style={styles.page}>
              <View style={styles.coverSection}>
                {!!displayCover ? (
                  <Image
                    source={{ uri: displayCover }}
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.coverFallback} />
                )}

                <View style={styles.coverActionWrap}>
                  <Menu>
                    <Menu.Trigger asChild>
                      <Pressable style={styles.coverActionButton}>
                        <Ionicons
                          name="camera-outline"
                          size={20}
                          color="#fff"
                        />
                      </Pressable>
                    </Menu.Trigger>

                    <Menu.Portal>
                      <Menu.Overlay />
                      <Menu.Content
                        presentation="popover"
                        placement="bottom"
                        align="end"
                        width={220}
                        className="rounded-2xl border border-border bg-surface"
                      >
                        <Menu.Item onPress={() => pickFromCamera("cover")}>
                          <Menu.ItemTitle>
                            {isUploadingCover ? "Uploading..." : "Take photo"}
                          </Menu.ItemTitle>
                        </Menu.Item>

                        <Menu.Item onPress={() => pickFromGallery("cover")}>
                          <Menu.ItemTitle>Choose from gallery</Menu.ItemTitle>
                        </Menu.Item>

                        <Menu.Item
                          onPress={() => removeProfileImage("cover")}
                          variant="danger"
                        >
                          <Menu.ItemTitle>Remove cover photo</Menu.ItemTitle>
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Portal>
                  </Menu>
                </View>

                <View style={styles.avatarFloatingWrap}>
                  <View style={styles.avatarOuter}>
                    {displayAvatar ? (
                      <Image
                        source={{ uri: displayAvatar }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>
                          {initials}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.avatarActionWrap}>
                    <Menu>
                      <Menu.Trigger asChild>
                        <Pressable style={styles.avatarActionButton}>
                          <Ionicons
                            name="camera-outline"
                            size={16}
                            color={colors.accent}
                          />
                        </Pressable>
                      </Menu.Trigger>

                      <Menu.Portal>
                        <Menu.Overlay />
                        <Menu.Content
                          presentation="popover"
                          placement="bottom"
                          align="end"
                          width={220}
                          className="rounded-2xl border border-border bg-surface"
                        >
                          <Menu.Item onPress={() => pickFromCamera("avatar")}>
                            <Menu.ItemTitle>
                              {isUploadingAvatar
                                ? "Uploading..."
                                : "Take photo"}
                            </Menu.ItemTitle>
                          </Menu.Item>

                          <Menu.Item onPress={() => pickFromGallery("avatar")}>
                            <Menu.ItemTitle>Choose from gallery</Menu.ItemTitle>
                          </Menu.Item>

                          <Menu.Item
                            onPress={() => removeProfileImage("avatar")}
                            variant="danger"
                          >
                            <Menu.ItemTitle>Remove profile photo</Menu.ItemTitle>
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Portal>
                    </Menu>
                  </View>
                </View>
              </View>

              <View style={styles.profileInfoSection}>
                <View style={styles.profileInfoRow}>
                  <View style={styles.profileInfoLeft}>
                     <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.profileName}>{fullName}</Text>
                      {verificationStatus?.isVerified ? (
      <VerifiedBadge
        track={verificationStatus.verificationTrack}
        size={16}
      />
    
    ) : null}
      </View>
                    <Text style={styles.profileEmail}>{user?.email}</Text>

                    {!!user?.businessType && (
                      <Text style={styles.profileBusinessType}>
                        {user.businessType}
                      </Text>
                    )}

                    {profileError ? (
                      <Text style={styles.errorText}>
                        Failed to load profile
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.profileInfoRight}>
                    <Menu>
                      <Menu.Trigger asChild>
                        <Pressable style={styles.menuButton}>
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={22}
                            color={colors.accent}
                          />
                        </Pressable>
                      </Menu.Trigger>

                      <Menu.Portal>
                        <Menu.Overlay />

                        <Menu.Content
                          presentation="popover"
                          placement="bottom"
                          align="end"
                          width={240}
                          className="rounded-2xl border border-border bg-surface"
                        >
                          <Menu.Item onPress={handleOpenSettingsPrivacy}>
                            <Menu.ItemTitle>
                              Settings & Privacy
                            </Menu.ItemTitle>
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Portal>
                    </Menu>
                  </View>
                </View>
              </View>

              {!isProfileComplete && !isBannerDismissed && isBannerCheckDone ? (
                <Pressable
                  onPress={() => router.push("/pages/editBusinessProfile")}
                  style={{
                    marginHorizontal: 20,
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 20,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        fontFamily: "Poppins_600SemiBold",
                      }}
                    >
                      Complete your{" "}
                      {isTrainingProfession
                        ? "contact details"
                        : "business profile"}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.accent,
                          fontSize: 13,
                          fontFamily: "Poppins_700Bold",
                        }}
                      >
                        {completionPercent}%
                      </Text>

                   <Pressable
  hitSlop={8}
  onPress={(e) => {
    e.stopPropagation();
    setShowRemindLaterModal(true);
  }}
>
  <Ionicons name="close" size={16} color={colors.muted} />
</Pressable>
                    </View>
                  </View>

                  <View
                    style={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: colors.segment,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${completionPercent}%`,
                        backgroundColor: colors.accent,
                        borderRadius: 999,
                      }}
                    />
                  </View>

                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      fontFamily: "Poppins_400Regular",
                      marginTop: 8,
                    }}
                  >
                    Vendors trust complete profiles more. Tap to finish yours.
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.tabsSection}>
                <Tabs
                  value={tab}
                  onValueChange={setTab}
                  variant="secondary"
                  style={{ width: "100%" }}
                >
                  <Tabs.List>
                    <Tabs.ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      scrollAlign="start"
                      contentContainerStyle={styles.tabsListContent}
                    >
                      <Tabs.Indicator />

                      <Tabs.Trigger value="posts">
                        <Tabs.Label>Posts</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="about">
                        <Tabs.Label>About</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="communities">
                        <Tabs.Label>Communities</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="joinedCommunities">
                        <Tabs.Label>Joined</Tabs.Label>
                      </Tabs.Trigger>
                    </Tabs.ScrollView>
                  </Tabs.List>

{tab === "about" ? (
  <View style={styles.paddedPanel}>
    <Text style={styles.sectionTitle}>About</Text>

    <View style={styles.infoList}>
      <InfoRow
        icon="person-outline"
        label="Name"
        value={fullName}
        colors={colors}
        styles={styles}
      />

      <InfoRow
        icon="mail-outline"
        label="Email"
        value={user?.email || "-"}
        colors={colors}
        styles={styles}
      />

      <InfoRow
        icon="briefcase-outline"
        label="Business Type"
        value={user?.businessType || "-"}
        colors={colors}
        styles={styles}
      />

      <InfoRow
        icon="location-outline"
        label="Address"
        value={user?.address || "-"}
        colors={colors}
        styles={styles}
      />

      {!isTrainingProfession && (
        <InfoRow
          icon="business-outline"
          label="Business Name"
          value={user?.businessName || "-"}
          colors={colors}
          styles={styles}
        />
      )}

      <InfoRow
        icon="call-outline"
        label={isTrainingProfession ? "Professional Phone" : "Business Phone"}
        value={user?.businessPhoneNo || "-"}
        colors={colors}
        styles={styles}
      />

      {/* Verified Student Row - Now matches design */}
      {verifiedStudentCommunities.length > 0 &&
        verifiedStudentCommunities.map((community) => (
          <View
            key={community.id}
            style={styles.infoRow}
          >
            <View style={styles.infoIconWrap}>
              <StudentBadge size={26} />
            </View>

            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>{community.name}</Text>
              <Text style={[styles.infoValue, { color: colors.accent, fontFamily: "Poppins_500Medium" }]}>
                {community.studentBatch 
                  ? `Batch ${community.studentBatch}` 
                  : "Verified Student"}
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#22C55E"
              style={{ marginLeft: "auto" }}
            />
          </View>
        ))}
    </View>
  </View>
) : null}

                  {tab === "communities" ? (
                    <View style={styles.paddedPanel}>
                      <Text style={styles.sectionTitle}>Communities</Text>

                      {showOwnedCommunitiesInitialLoader ? (
                        <View style={styles.stateWrap}>
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        </View>
                      ) : myCommunitiesError && ownedCommunities.length === 0 ? (
                        <Text style={styles.errorText}>
                          Failed to load communities
                        </Text>
                      ) : showEmptyOwnedCommunities ? (
                        <>
                          <Text style={styles.sectionText}>
                            You do not own any communities yet.
                          </Text>

                          <Text style={styles.sectionHint}>
                            Go to Settings & Privacy to create a new community.
                          </Text>
                        </>
                      ) : (
                        <View style={styles.communityList}>
                          {ownedCommunities.map((community) => (
                            <CommunityCard
                              key={community.id}
                              community={community}
                              variant="profile"
                               badgeText={community.visibility === "PUBLIC" ? "Super Mod" : "Admin"}
                              onPress={() =>
                                router.push({
                                   pathname: "/user/community-dashboard/(tabs)",
                                  params: {
                                    communityId: community.id,
                                    communityName: community.name,
                                    communityAvatar:
                                      community.avatarImage ?? "",
                                    communityVisibility: community.visibility,
                                    communityCategory:
                                      community.category?.name ?? "",
                                    returnTo: "/(tabs)/profile",
                                  },
                                })
                              }
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}

                  {tab === "joinedCommunities" ? (
                    <View style={styles.paddedPanel}>
                      <Text style={styles.sectionTitle}>
                        Joined Communities
                      </Text>

                      {showJoinedCommunitiesInitialLoader ? (
                        <View style={styles.stateWrap}>
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        </View>
                      ) : myCommunitiesError &&
                        joinedCommunities.length === 0 ? (
                        <Text style={styles.errorText}>
                          Failed to load joined communities
                        </Text>
                      ) : showEmptyJoinedCommunities ? (
                        <Text style={styles.sectionText}>
                          You have not joined any communities yet.
                        </Text>
                      ) : (
                        <View style={styles.communityList}>
                          {joinedCommunities.map((community) => (
                            <CommunityCard
                              key={community.id}
                              community={community}
                              variant="profile"
                              badgeText={
                                community.myRole === "MODERATOR"
                                  ? "Moderator"
                                  : "Joined"
                              }
                              onPress={() =>
                                router.push(`/user/community/${community.slug}`)
                              }
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}

                  {tab === "posts" ? (
                    <View style={styles.tabPanel}>
                      {showInitialPostLoader ? (
                        <View style={styles.stateWrap}>
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        </View>
                      ) : myPostsError && allPosts.length === 0 ? (
                        <Text style={styles.errorText}>
                          Failed to load your posts.
                        </Text>
                      ) : showEmptyPosts ? (
                        <View style={styles.emptyState}>
                          <Text style={styles.sectionTitle}>Posts</Text>
                          <Text style={styles.sectionText}>
                            You have not posted anything yet.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Tabs>
              </View>
            </View>
          }
          ListFooterComponent={
            tab === "posts" &&
            myPostsFetching &&
            allPosts.length > 0 &&
            postsCursor !== null ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : null
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
          onPressCommentLike={handleCommentLike}
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
      <ImageCropModal
  visible={cropState.visible}
  imageUri={cropState.uri}
  imageWidth={cropState.width}
  imageHeight={cropState.height}
  aspect={cropState.target === "avatar" ? "square" : "wide"}
  onCancel={handleCropCancel}
  onConfirm={handleCropConfirm}
/>
<Modal
  visible={showRemindLaterModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowRemindLaterModal(false)}
>
  <Pressable
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    }}
    onPress={() => setShowRemindLaterModal(false)}
  >
    <Pressable
      onPress={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: 16,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Hide this reminder?
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "Poppins_400Regular",
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        We'll remind you again in 24 hours to finish your profile.
      </Text>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={() => {
            setShowRemindLaterModal(false);
            handleDismissBanner();
          }}
          style={{
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: colors.accent,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            Remind me later
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowRemindLaterModal(false)}
          style={{
            paddingVertical: 12,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 14,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            Cancel
          </Text>
        </Pressable>
      </View>
    </Pressable>
  </Pressable>
</Modal>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ProfileColors;
  styles: ProfileStyles;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}