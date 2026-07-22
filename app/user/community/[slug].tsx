import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Accordion, Tabs } from "heroui-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/api/better-auth-client";
import CommentPostModal from "@/components/post/CommentsModal";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePostInteractions } from "@/hooks/media/usePostInteractions";
import { usePostMediaViewer } from "@/hooks/media/usePostMediaViewer";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import BusinessCommunityBadge from "@/components/common/BusinessCommunityBadge";

import {
  useCancelMyJoinRequestMutation,
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
  useGetVisibleCommunityMembersQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} from "@/store/api/communityApi";

import {
  useGetCommunityGuidelinesQuery,
  type CommunityGuidelineItem,
} from "@/store/api/communityGuidelinesApi";

import {
  useDeletePostMutation,
  useGetCommunityPostsQuery,
  useGetMyContributorStatusQuery,
} from "@/store/api/postApi";

import type { CommunityMemberItem } from "@/types/community";
import type { CommunityPost } from "@/types/post";

function getMemberListKey(member: CommunityMemberItem, index?: number) {
  return String(
    member.user?.id ??
      member.id ??
      `${member.role ?? "member"}-${member.user?.email ?? "unknown"}-${index ?? 0}`,
  );
}

export default function CommunityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [tab, setTab] = useState("posts");

  const [isJoining, setIsJoining] = useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [localJoined, setLocalJoined] = useState(false);

  const [submittedPrivateRequest, setSubmittedPrivateRequest] =
    useState(false);

  const [postCursor, setPostCursor] = useState<string | undefined>(undefined);
  const [postItems, setPostItems] = useState<CommunityPost[]>([]);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const [memberPage, setMemberPage] = useState(1);
  const [memberItems, setMemberItems] = useState<CommunityMemberItem[]>([]);

  const { viewer, openViewer, closeViewer } = usePostMediaViewer();

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
    posts: postItems,
    setPosts: setPostItems,
    sessionUser: session?.user,
  });

  const {
    data: community,
    isLoading: communityLoading,
    error: communityError,
    refetch: refetchCommunity,
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
    access?.role === "MODERATOR" || community?.myRole === "MODERATOR";

  const isJoined =
    localJoined ||
    Boolean(access?.isMember) ||
    Boolean(community?.isJoined);

  const isJoinRequestPending =
    !isJoined &&
    (submittedPrivateRequest ||
      community?.myJoinRequestStatus === "PENDING" ||
      access?.joinRequestStatus === "PENDING");

  const isPrivateLocked =
    community?.visibility === "PRIVATE" && !isJoined && !isOwner && !isModerator;

  const canViewContent =
    Boolean(access?.canView) ||
    community?.visibility === "PUBLIC" ||
    isJoined ||
    isOwner ||
    isModerator;

  /**
   * This slug page is purely a viewing page.
   * Admin/moderator management actions (manage panel) are handled
   * in the dedicated manage pages, not here.
   */
  const canOpenManagePage = isModerator;

  /* =========================================================
     RESTRICTED COMMUNITY — CONTRIBUTOR (POST) REQUEST STATUS
     ========================================================= */

  const isRestrictedCommunity = community?.visibility === "RESTRICTED";

  // Only a plain joined member needs to request posting access.
  // Owners and moderators already have posting rights, so we skip the check for them.
  const needsContributorCheck =
    isRestrictedCommunity && isJoined && !isOwner && !isModerator;

  const { data: contributorStatus } = useGetMyContributorStatusQuery(
    { communityId: community?.id ?? "" },
    {
      skip: !community?.id || !needsContributorCheck,
      refetchOnMountOrArgChange: true,
    },
  );

  const showRequestToPostBadge =
    needsContributorCheck &&
    (!contributorStatus ||
      contributorStatus.status === "NONE" ||
      contributorStatus.status === "REJECTED" ||
      contributorStatus.status === "CANCELLED");

  const showPendingContributorBadge =
    needsContributorCheck && contributorStatus?.status === "PENDING";

  const canLoadMembers =
    !!session?.user &&
    !!community?.id &&
    (isJoined || isOwner || isModerator);

  const {
    data: membersResponse,
    isLoading: membersLoading,
    isFetching: membersFetching,
    error: membersError,
  } = useGetVisibleCommunityMembersQuery(
    {
      communityId: community?.id ?? "",
      page: memberPage,
      limit: 20,
    },
    {
      skip: !canLoadMembers || !community?.id,
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: postsResponse,
    isLoading: postsLoading,
    isFetching: postsFetching,
    error: postsError,
  } = useGetCommunityPostsQuery(
    {
      communityId: community?.id ?? "",
      limit: 10,
      cursor: postCursor,
      sortBy: "newest",
    },
    {
      skip: !session?.user || !community?.id || !canViewContent,
      refetchOnMountOrArgChange: true,
    },
  );

  const canLoadGuidelines =
    !!session?.user && !!community?.id && canViewContent;

  const {
    data: guidelinesResponse,
    isLoading: guidelinesLoading,
    isFetching: guidelinesFetching,
    error: guidelinesError,
  } = useGetCommunityGuidelinesQuery(community?.id ?? "", {
    skip: !canLoadGuidelines,
    refetchOnMountOrArgChange: true,
  });

  const guidelineItems = guidelinesResponse?.data ?? [];

  const [joinCommunity] = useJoinCommunityMutation();
  const [cancelMyJoinRequest] = useCancelMyJoinRequestMutation();
  const [deletePost] = useDeletePostMutation();

  const coverUrl = toAbsoluteFileUrl(community?.coverImage);
  const avatarUrl = toAbsoluteFileUrl(community?.avatarImage);

  const showJoinButton =
    !!community && !isOwner && !isJoined && !isJoinRequestPending;

  const showCancelRequestButton =
    !!community && !isOwner && !isJoined && isJoinRequestPending;

  const showLeaveButton =
    !!community &&
    isJoined &&
    !isOwner &&
    !isModerator;

  const memberCount =
    community?.memberCount ?? membersResponse?.meta?.total ?? memberItems.length;

  const totalPostCount = community?.postCount ?? postItems.length;

  const roleLabel = useMemo(() => {
    if (isOwner) {
      return community?.visibility === "PUBLIC" ? "Super Mod" : "Admin";
    }
    if (isModerator) return "Moderator";
    if (isJoined) return "Joined";
    return null;
  }, [isOwner, isModerator, isJoined, community?.visibility]);

  const aboutRoleLabel = isJoinRequestPending
    ? "Pending"
    : roleLabel ?? "Visitor";

  useEffect(() => {
    setTab("posts");

    setPostCursor(undefined);
    setPostItems([]);
    setDeletingPostId(null);

    setMemberPage(1);
    setMemberItems([]);

    setSubmittedPrivateRequest(false);

    closeComments();
  }, [community?.id, closeComments]);

  useEffect(() => {
    if (isJoined) {
      setSubmittedPrivateRequest(false);
    }
  }, [isJoined]);

  useEffect(() => {
    if (!postsResponse) {
      return;
    }

    const incomingPosts = postsResponse.data ?? [];

    setPostItems((previousItems) => {
      if (!postCursor) {
        return incomingPosts;
      }

      const existingIds = new Set(previousItems.map((item) => item.id));
      const newItems = incomingPosts.filter(
        (item) => !existingIds.has(item.id),
      );

      return [...previousItems, ...newItems];
    });
  }, [postsResponse, postCursor]);

  useEffect(() => {
    if (!membersResponse) {
      return;
    }

    const incomingMembers = membersResponse.data ?? [];

    setMemberItems((previousItems) => {
      if (memberPage === 1) {
        return incomingMembers;
      }

      const existingMemberKeys = new Set(
        previousItems.map((item, index) => getMemberListKey(item, index)),
      );

      const newItems = incomingMembers.filter((item, index) => {
        const memberKey = getMemberListKey(item, index);

        if (existingMemberKeys.has(memberKey)) {
          return false;
        }

        existingMemberKeys.add(memberKey);
        return true;
      });

      return [...previousItems, ...newItems];
    });
  }, [membersResponse, memberPage]);

  useEffect(() => {
    if (community || access) {
      setLocalJoined(
        Boolean(access?.isMember) || Boolean(community?.isJoined),
      );
    }
  }, [community, access]);
const handleManageCommunity = useCallback(() => {
  if (!slug || !community?.id) {
    return;
  }

  router.push({
    pathname: "/user/moderator-panel",
    params: {
      slug,
      mode: isOwner ? "admin" : "moderator",
      communityId: community.id,
      communityName: community.name,
      communityAvatar: community.avatarImage ?? "",
      communityVisibility: community.visibility,
      communityCategory: community.category?.name ?? "",
    },
  });
}, [
  isOwner,
  slug,
  community?.id,
  community?.name,
  community?.avatarImage,
  community?.visibility,
  community?.category?.name,
]);

  const handleGoToContributorRequest = useCallback(() => {
    if (!community?.id) return;

    router.push({
      pathname: "/pages/contributor-request",
      params: {
        communityId: community.id,
        communityName: community.name,
        slug: community.slug,
      },
    });
  }, [community?.id, community?.name, community?.slug]);

  const handleJoin = useCallback(async () => {
    if (!community?.id) {
      return;
    }

    try {
      setIsJoining(true);

      await joinCommunity({
        communityId: community.id,
      }).unwrap();

      setMemberPage(1);
      setMemberItems([]);

      if (community.visibility === "PRIVATE") {
        setSubmittedPrivateRequest(true);

        await Promise.allSettled([refetchCommunity(), refetchAccess()]);

        Alert.alert(
          "Request sent",
          "Your request is pending. Please wait for verification from the admin to unlock this community.",
        );

        return;
      }

      await Promise.allSettled([refetchCommunity(), refetchAccess()]);
    } catch (error: any) {
      console.log("Join community failed:", error);

      Alert.alert(
        "Could not join",
        error?.data?.message ??
          "Something went wrong while joining this community.",
      );
    } finally {
      setIsJoining(false);
    }
  }, [
    community?.id,
    community?.visibility,
    joinCommunity,
    refetchCommunity,
    refetchAccess,
  ]);

  const [leaveCommunity] = useLeaveCommunityMutation();

  const handleLeaveCommunity = useCallback(async () => {
    if (!community?.id) return;

    Alert.alert(
      "Leave Community",
      "Are you sure you want to leave this community? You will lose access to its posts and content.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLeaving(true);

              await leaveCommunity(community.id).unwrap();

              await Promise.allSettled([
                refetchCommunity(),
                refetchAccess(),
              ]);

              Alert.alert("Success", "You have successfully left the community.");
            } catch (error: any) {
              console.log("Leave community failed:", error);
              Alert.alert(
                "Could not leave community",
                error?.data?.message || "Something went wrong. Please try again.",
              );
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ],
    );
  }, [community?.id, leaveCommunity, refetchCommunity, refetchAccess]);

  const handleCancelJoinRequest = useCallback(() => {
    if (!community?.id) {
      return;
    }

    Alert.alert(
      "Cancel request",
      "Do you want to cancel your join request for this private community?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCancellingRequest(true);

              await cancelMyJoinRequest(community.id).unwrap();

              setSubmittedPrivateRequest(false);
              setMemberPage(1);
              setMemberItems([]);

              await Promise.allSettled([refetchCommunity(), refetchAccess()]);
            } catch (error: any) {
              console.log("Cancel join request failed:", error);

              Alert.alert(
                "Could not cancel request",
                error?.data?.message ??
                  "Something went wrong while cancelling your request.",
              );
            } finally {
              setIsCancellingRequest(false);
            }
          },
        },
      ],
    );
  }, [community?.id, cancelMyJoinRequest, refetchCommunity, refetchAccess]);

  const handleDeletePost = useCallback(
    async (post: CommunityPost) => {
      if (!community?.id) {
        return;
      }

      try {
        setDeletingPostId(post.id);

        await deletePost({
          communityId: community.id,
          postId: post.id,
        }).unwrap();

        setPostItems((previousItems) =>
          previousItems.filter((item) => item.id !== post.id),
        );

        if (commentPost?.id === post.id) {
          closeComments();
        }

        await Promise.allSettled([refetchCommunity()]);
      } catch (error: any) {
        console.log("Delete community post failed:", error);

        Alert.alert(
          "Could not delete post",
          error?.data?.message ??
            "Something went wrong while deleting this post.",
        );

        throw error;
      } finally {
        setDeletingPostId(null);
      }
    },
    [
      community?.id,
      deletePost,
      commentPost?.id,
      closeComments,
      refetchCommunity,
    ],
  );

  const loadMorePosts = useCallback(() => {
    if (tab !== "posts") {
      return;
    }

    if (postsLoading || postsFetching) {
      return;
    }

    if (!postsResponse?.meta?.hasMore) {
      return;
    }

    if (!postsResponse?.meta?.nextCursor) {
      return;
    }

    if (postCursor === postsResponse.meta.nextCursor) {
      return;
    }

    setPostCursor(postsResponse.meta.nextCursor ?? undefined);
  }, [
    tab,
    postsLoading,
    postsFetching,
    postCursor,
    postsResponse?.meta?.hasMore,
    postsResponse?.meta?.nextCursor,
  ]);

  const loadMoreMembers = useCallback(() => {
    if (tab !== "members") {
      return;
    }

    if (membersLoading || membersFetching) {
      return;
    }

    const currentPage = membersResponse?.meta?.page ?? memberPage;
    const totalPages = membersResponse?.meta?.totalPages ?? 1;

    if (currentPage >= totalPages) {
      return;
    }

    setMemberPage((previousPage) => previousPage + 1);
  }, [
    tab,
    membersLoading,
    membersFetching,
    membersResponse?.meta?.page,
    membersResponse?.meta?.totalPages,
    memberPage,
  ]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;

      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 220;

      if (!isCloseToBottom) {
        return;
      }

      if (tab === "posts") {
        loadMorePosts();
      }

      if (tab === "members") {
        loadMoreMembers();
      }
    },
    [tab, loadMorePosts, loadMoreMembers],
  );

  const handleAuthorPress = useCallback(
    (authorId: string) => {
      if (!authorId || !community?.id) {
        return;
      }

      if (authorId === session?.user?.id) {
        return;
      }

      router.push({
        pathname: "/user/profile/[userId]",
        params: {
          userId: authorId,
          sourceCommunityId: community.id,
        },
      });
    },
    [community?.id, session?.user?.id],
  );

  const handleMemberPress = useCallback(
    (memberUserId?: string | null) => {
      if (!memberUserId || !community?.id) {
        return;
      }

      if (memberUserId === session?.user?.id) {
        return;
      }

      router.push({
        pathname: "/user/profile/[userId]",
        params: {
          userId: memberUserId,
          sourceCommunityId: community.id,
        },
      });
    },
    [community?.id, session?.user?.id],
  );

  if (isPending || communityLoading || accessLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  if (communityError || !community) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-4 h-[64px] w-[64px] items-center justify-center rounded-full bg-segment">
            <Ionicons name="alert-circle-outline" size={30} color={colors.accent} />
          </View>

          <Text
            className="text-center text-foreground"
            style={{
              fontSize: 24,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Community not found
          </Text>

          <Text
            className="mt-2 text-center text-muted"
            style={{
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_400Regular",
            }}
          >
            This community could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ScrollView
          className="bg-background"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View className="bg-background">
            <View className="relative">
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={{
                    width: "100%",
                    height: 214,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    height: 214,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                  }}
                />
              )}

              <View
                pointerEvents="none"
                className="absolute inset-0"
                style={{
                  height: 214,
                  borderBottomLeftRadius: 32,
                  borderBottomRightRadius: 32,
                  backgroundColor: colors.separator,
                }}
              />

              <View className="absolute left-5 top-5">
                <Pressable
                  onPress={() => {
                    router.replace("/(tabs)");
                  }}
                  className="h-[42px] w-[42px] items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.coverActionBackground }}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.surface} />
                </Pressable>
              </View>

              <View className="absolute -bottom-[48px] left-5">
                <View className="h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full border-4 border-background bg-surface">
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-segment">
                      <Ionicons
                        name="people-outline"
                        size={38}
                        color={colors.accent}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View className="px-5 pt-[62px]">
              <View className="flex-row items-start justify-between">
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    className="text-foreground"
                    style={{
                      fontSize: 28,
                      lineHeight: 36,
                      fontFamily: "Poppins_700Bold",
                    }}
                  >
                    {community.name}
                  </Text>
                  {community.purpose === "BUSINESS" ? (
                    <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
                      <BusinessCommunityBadge label="Verified Business" size={13} />
                    </View>
                  ) : null}

                  <View
                    className="mt-2 flex-row flex-wrap items-center"
                    style={{ gap: 8 }}
                  >
                    <SmallChip
                      icon="grid-outline"
                      label={community.category?.name ?? "Unknown"}
                      colors={colors}
                    />

                    <SmallChip
                      icon={
                        community.visibility === "PRIVATE"
                          ? "lock-closed-outline"
                          : "earth-outline"
                      }
                      label={community.visibility}
                      colors={colors}
                    />
                  </View>

                  {community.description ? (
                    <Text
                      className="mt-4 text-muted"
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        fontFamily: "Poppins_400Regular",
                      }}
                    >
                      {community.description}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={{
                    minWidth: 96,
                    maxWidth: 132,
                    alignItems: "flex-end",
                  }}
                >
                  {roleLabel && !showLeaveButton ? (
                    <RoleStatusChip
                      icon="shield-checkmark-outline"
                      label={roleLabel}
                      colors={colors}
                    />
                  ) : null}

                  {canOpenManagePage ? (
                    <View style={{ marginTop: roleLabel ? 8 : 0 }}>
                      <ManageCommunityButton
                        colors={colors}
                        onPress={handleManageCommunity}
                      />
                    </View>
                  ) : (
                    <HeaderAction
                      showJoinButton={showJoinButton}
                      showCancelRequestButton={showCancelRequestButton}
                      showLeaveButton={showLeaveButton}
                      isJoining={isJoining}
                      isCancellingRequest={isCancellingRequest}
                      isLeaving={isLeaving}
                      colors={colors}
                      onJoin={handleJoin}
                      onCancelRequest={handleCancelJoinRequest}
                      onLeave={handleLeaveCommunity}
                    />
                  )}
                </View>
              </View>

              {isJoinRequestPending ? (
                <View className="mt-4 rounded-[18px] bg-segment px-4 py-3">
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={18} color={colors.accent} />
                    <Text
                      className="ml-2 text-foreground"
                      style={{
                        fontSize: 13,
                        fontFamily: "Poppins_600SemiBold",
                      }}
                    >
                      Join request pending
                    </Text>
                  </View>

                  <Text
                    className="mt-1 text-muted"
                    style={{
                      fontSize: 12,
                      lineHeight: 19,
                      fontFamily: "Poppins_400Regular",
                    }}
                  >
                    The admin needs to approve your request before you can view locked content.
                  </Text>
                </View>
              ) : null}

              <View className="mt-5 flex-row items-center" style={{ gap: 22 }}>
                <InlineStat
                  icon="document-text-outline"
                  value={String(totalPostCount)}
                  label="Posts"
                  colors={colors}
                />

                <InlineStat
                  icon="people-outline"
                  value={String(memberCount)}
                  label="Members"
                  colors={colors}
                />
              </View>
            </View>

            <View className="mt-4">
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
                    contentContainerStyle={{
                      flexDirection: "row",
                      gap: 20,
                      paddingLeft: 20,
                      paddingRight: 24,
                    }}
                  >
                    <Tabs.Indicator />

                    <Tabs.Trigger value="posts">
                      <Tabs.Label>Posts</Tabs.Label>
                    </Tabs.Trigger>

                    <Tabs.Trigger value="about">
                      <Tabs.Label>About</Tabs.Label>
                    </Tabs.Trigger>

                    <Tabs.Trigger value="guidelines">
                      <Tabs.Label>Guidelines</Tabs.Label>
                    </Tabs.Trigger>

                    <Tabs.Trigger value="members">
                      <Tabs.Label>Members</Tabs.Label>
                    </Tabs.Trigger>
                  </Tabs.ScrollView>
                </Tabs.List>

                <View style={{ paddingTop: 6 }}>
                  <Tabs.Content value="posts">
                    <View className="bg-background">
                      {isPrivateLocked ? (
                        <PrivateLockedMessage
                          isPending={isJoinRequestPending}
                          colors={colors}
                        />
                      ) : (
                        <>
                          {showRequestToPostBadge ? (
                            <ContributorRequestBanner
                              pending={false}
                              colors={colors}
                              onPress={handleGoToContributorRequest}
                            />
                          ) : null}

                          {showPendingContributorBadge ? (
                            <ContributorRequestBanner
                              pending
                              colors={colors}
                              onPress={handleGoToContributorRequest}
                            />
                          ) : null}

                          {postsLoading && postItems.length === 0 ? (
                            <LoadingBlock colors={colors} />
                          ) : postsError ? (
                            <ErrorText message="Failed to load posts." colors={colors} />
                          ) : postItems.length === 0 ? (
                            <EmptyState
                              icon="document-text-outline"
                              title="No posts yet"
                              description="Community posts will appear here."
                              colors={colors}
                            />
                          ) : (
                            <View className="mt-2">
                              {postItems.map((post) => {
                                const isOwnPost =
                                  post.author?.id === session?.user?.id;

                                return (
                                  <CommunityPostCard
                                    key={post.id}
                                    post={post}
                                    disableMediaPlayback={viewer.visible}
                                    onPressLike={handleLikePost}
                                    onPressComment={openComments}
                                    onPressShare={handleSharePost}
                                    onPressAuthor={handleAuthorPress}
                                    onPressMedia={openViewer}
                                    onPressJoin={handleJoin}
                                    canDelete={isOwnPost}
                                    isDeleting={deletingPostId === post.id}
                                    onDelete={handleDeletePost}
                                  />
                                );
                              })}

                              {postsFetching && postItems.length > 0 ? (
                                <View className="py-5">
                                  <ActivityIndicator size="small" color={colors.accent} />
                                </View>
                              ) : null}

                              {postsResponse &&
                              postItems.length > 0 &&
                              !postsResponse.meta.hasMore ? (
                                <Text
                                  className="pt-2 pb-1 text-center text-muted"
                                  style={{
                                    fontSize: 12,
                                    fontFamily: "Poppins_400Regular",
                                  }}
                                >
                                  No more posts.
                                </Text>
                              ) : null}
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="about">
                    <View className="px-5 pt-1" style={{ rowGap: 10 }}>
                      <InfoRow
                        icon="people-outline"
                        label="Community Name"
                        value={community.name}
                        colors={colors}
                      />

                      <InfoRow
                        icon="grid-outline"
                        label="Category"
                        value={community.category?.name ?? "-"}
                        colors={colors}
                      />

                      <InfoRow
                        icon="lock-closed-outline"
                        label="Visibility"
                        value={community.visibility}
                        colors={colors}
                      />

                      <InfoRow
                        icon="shield-checkmark-outline"
                        label="Your Role"
                        value={aboutRoleLabel}
                        colors={colors}
                      />

                      <InfoRow
                        icon="document-text-outline"
                        label="Description"
                        value={community.description || "-"}
                        multiline
                        colors={colors}
                      />
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="guidelines">
                    <View className="bg-background px-5 pt-1">
                      {isPrivateLocked ? (
                        <PrivateLockedMessage
                          isPending={isJoinRequestPending}
                          colors={colors}
                        />
                      ) : guidelinesLoading ||
                        (guidelinesFetching && guidelineItems.length === 0) ? (
                        <LoadingBlock colors={colors} />
                      ) : guidelinesError ? (
                        <ErrorText
                          message="Failed to load guidelines."
                          colors={colors}
                        />
                      ) : guidelineItems.length === 0 ? (
                        <EmptyState
                          icon="reader-outline"
                          title="No guidelines yet"
                          description="Community guidelines will appear here once the admin adds them."
                          colors={colors}
                        />
                      ) : (
                        <Accordion
                          selectionMode="single"
                          variant="surface"
                          defaultValue={guidelineItems[0]?.id}
                          className="overflow-hidden rounded-[22px]"
                          styles={{
                            container: {
                              borderRadius: 22,
                              overflow: "hidden",
                            },
                            separator: {
                              height: 1,
                            },
                          }}
                        >
                          {guidelineItems.map((guideline, index) => (
                            <GuidelineAccordionItem
                              key={guideline.id}
                              guideline={guideline}
                              index={index}
                              colors={colors}
                            />
                          ))}
                        </Accordion>
                      )}
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="members">
                    <View className="bg-background px-5 pt-1">
                      {isPrivateLocked ? (
                        <PrivateLockedMessage
                          isPending={isJoinRequestPending}
                          colors={colors}
                        />
                      ) : !isJoined && !isOwner && !isModerator ? (
                        <EmptyState
                          icon="lock-closed-outline"
                          title="Members are locked"
                          description="Join this community to view members."
                          colors={colors}
                        />
                      ) : membersLoading && memberItems.length === 0 ? (
                        <LoadingBlock colors={colors} />
                      ) : membersError ? (
                        <ErrorText message="Failed to load members." colors={colors} />
                      ) : memberItems.length === 0 ? (
                        <EmptyState
                          icon="people-outline"
                          title="No members found"
                          description="Members will appear here after they join this community."
                          colors={colors}
                        />
                      ) : (
                        <View style={{ rowGap: 10 }}>
                          {memberItems.map((member, index) => {
                            const memberAvatar =
                              toAbsoluteFileUrl(member.user?.image) ?? null;

                            return (
                              <MemberRow
                                key={getMemberListKey(member, index)}
                                member={member}
                                memberAvatar={memberAvatar}
                                colors={colors}
                                onPressProfile={() =>
                                  handleMemberPress(member.user?.id)
                                }
                              />
                            );
                          })}

                          {membersFetching && memberItems.length > 0 ? (
                            <View className="py-5">
                              <ActivityIndicator size="small" color={colors.accent} />
                            </View>
                          ) : null}

                          {membersResponse &&
                          memberItems.length > 0 &&
                          membersResponse.meta.page >=
                            membersResponse.meta.totalPages ? (
                            <Text
                              className="pt-2 pb-1 text-center text-muted"
                              style={{
                                fontSize: 12,
                                fontFamily: "Poppins_400Regular",
                              }}
                            >
                              No more members.
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </Tabs.Content>
                </View>
              </Tabs>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <CommentPostModal
        visible={Boolean(commentPost)}
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
    </>
  );
}

function ManageCommunityButton({
  colors,
  onPress,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full border border-border bg-surface px-3 py-2"
      style={{
        minHeight: 34,
      }}
    >
      <Ionicons name="settings-outline" size={15} color={colors.accent} />

      <Text
        style={{
          marginLeft: 5,
          color: colors.accent,
          fontSize: 12,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Manage
      </Text>
    </Pressable>
  );
}

function RoleStatusChip({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="flex-row items-center rounded-full bg-segment px-3 py-2">
      <Ionicons name={icon} size={14} color={colors.accent} />

      <Text
        className="ml-1 text-foreground"
        numberOfLines={1}
        style={{
          fontSize: 11,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function InlineStat({
  icon,
  value,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="flex-row items-center">
      <View className="mr-2 h-[34px] w-[34px] items-center justify-center rounded-full bg-segment">
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <Text
        className="text-foreground"
        style={{
          fontSize: 16,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {value}
      </Text>

      <Text
        className="ml-1 text-muted"
        style={{
          fontSize: 13,
          fontFamily: "Poppins_400Regular",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function HeaderAction({
  showJoinButton,
  showCancelRequestButton,
  showLeaveButton,
  isJoining,
  isCancellingRequest,
  isLeaving,
  colors,
  onJoin,
  onCancelRequest,
  onLeave,
}: {
  showJoinButton: boolean;
  showCancelRequestButton: boolean;
  showLeaveButton: boolean;
  isJoining: boolean;
  isCancellingRequest: boolean;
  isLeaving: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onJoin: () => void;
  onCancelRequest: () => void;
  onLeave: () => void;
}) {
  if (showLeaveButton) {
    return (
      <Pressable
        onPress={onLeave}
        disabled={isLeaving}
        style={{
          minHeight: 34,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.accent,
          backgroundColor: colors.segment,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
          paddingVertical: 7,
        }}
      >
        {isLeaving ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text
            numberOfLines={1}
            style={{
              color: colors.accent,
              fontSize: 11,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Joined
          </Text>
        )}
      </Pressable>
    );
  }

  if (showCancelRequestButton) {
    return (
      <Pressable
        onPress={onCancelRequest}
        disabled={isCancellingRequest}
        style={{
          minHeight: 34,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.danger,
          backgroundColor: colors.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
          paddingVertical: 7,
        }}
      >
        {isCancellingRequest ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Text
            numberOfLines={1}
            style={{
              color: colors.danger,
              fontSize: 11,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Cancel
          </Text>
        )}
      </Pressable>
    );
  }

  if (showJoinButton) {
    return (
      <Pressable
        onPress={onJoin}
        disabled={isJoining}
        className="rounded-full bg-accent px-4 py-2"
      >
        {isJoining ? (
          <ActivityIndicator size="small" color={colors.accentForeground} />
        ) : (
          <Text
            style={{
              color: colors.accentForeground,
              fontSize: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Join
          </Text>
        )}
      </Pressable>
    );
  }

  return null;
}

function ContributorRequestBanner({
  pending,
  colors,
  onPress,
}: {
  pending: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={pending ? undefined : onPress}
      disabled={pending}
      className="mx-5 mt-2 flex-row items-center rounded-[20px] border border-border bg-surface px-4 py-3"
    >
      <View className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-segment">
        <Ionicons
          name={pending ? "time-outline" : "person-add-outline"}
          size={19}
          color={colors.accent}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          className="text-foreground"
          style={{ fontSize: 14, fontFamily: "Poppins_700Bold" }}
        >
          {pending ? "Request pending" : "Request to post"}
        </Text>

        <Text
          className="mt-0.5 text-muted"
          style={{ fontSize: 12, lineHeight: 18, fontFamily: "Poppins_400Regular" }}
        >
          {pending
            ? "Waiting for admin approval before you can post here."
            : "This is a restricted community. Ask the admin for permission to post."}
        </Text>
      </View>

      {!pending ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null}
    </Pressable>
  );
}

function PrivateLockedMessage({
  isPending,
  colors,
}: {
  isPending: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="mx-5 mt-2 rounded-[24px] border border-border bg-surface px-4 py-5">
      <View className="flex-row items-start">
        <View className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-full bg-segment">
          <Ionicons
            name={isPending ? "time-outline" : "lock-closed-outline"}
            size={21}
            color={colors.accent}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            className="text-foreground"
            style={{
              fontSize: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            {isPending ? "Waiting for admin approval" : "Private community"}
          </Text>

          <Text
            className="mt-1 text-muted"
            style={{
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_400Regular",
            }}
          >
            {isPending
              ? "Your join request is pending. After approval, posts, guidelines and members will be unlocked."
              : "Join this private community first. After admin approval, posts, guidelines and members will be unlocked."}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SmallChip({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="flex-row items-center rounded-full bg-segment px-3 py-1.5">
      <Ionicons name={icon} size={13} color={colors.accent} />

      <Text
        className="ml-1 text-foreground"
        numberOfLines={1}
        style={{
          fontSize: 11,
          fontFamily: "Poppins_600SemiBold",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function GuidelineAccordionItem({
  guideline,
  index,
  colors,
}: {
  guideline: CommunityGuidelineItem;
  index: number;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Accordion.Item value={guideline.id}>
      <Accordion.Trigger className="px-4 py-4">
        <View className="flex-row items-center" style={{ flex: 1 }}>
          <View className="mr-3 h-[30px] w-[30px] items-center justify-center rounded-full bg-segment">
            <Text
              style={{
                color: colors.accent,
                fontSize: 13,
                fontFamily: "Poppins_700Bold",
              }}
            >
              {index + 1}
            </Text>
          </View>

          <Text
            className="text-foreground"
            numberOfLines={2}
            style={{
              flex: 1,
              fontSize: 14,
              lineHeight: 21,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            {guideline.title}
          </Text>
        </View>

        <Accordion.Indicator />
      </Accordion.Trigger>

      <Accordion.Content>
        <Text
          className="text-muted"
          style={{
            paddingLeft: 47,
            paddingRight: 16,
            paddingBottom: 16,
            fontSize: 13,
            lineHeight: 21,
            fontFamily: "Poppins_400Regular",
          }}
        >
          {guideline.description || "No description provided."}
        </Text>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function MemberRow({
  member,
  memberAvatar,
  colors,
  onPressProfile,
}: {
  member: CommunityMemberItem;
  memberAvatar: string | null;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onPressProfile: () => void;
}) {
  return (
    <Pressable
      onPress={onPressProfile}
      android_ripple={{ color: colors.surfaceSecondary }}
      className="flex-row items-center rounded-[22px] border border-border bg-surface px-4 py-3"
      style={{ width: "100%" }}
    >
      <View className="mr-3 h-[50px] w-[50px] overflow-hidden rounded-full border border-border bg-segment">
        {memberAvatar ? (
          <Image
            source={{ uri: memberAvatar }}
            style={{
              width: "100%",
              height: "100%",
            }}
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="person-outline" size={21} color={colors.accent} />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          className="text-foreground"
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          {member.user.name ?? "Unknown User"}
        </Text>

        <Text
          className="mt-1 text-muted"
          numberOfLines={1}
          style={{
            fontSize: 12,
            fontFamily: "Poppins_400Regular",
          }}
        >
          {member.role === "ADMIN"
            ? "Community admin"
            : member.role === "MODERATOR"
              ? "Moderator"
              : "Member"}
        </Text>
      </View>

      <View className="ml-3 h-[32px] w-[32px] items-center justify-center rounded-full bg-segment">
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function InfoRow({
  icon,
  label,
  value,
  multiline = false,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  multiline?: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="flex-row rounded-[20px] border border-border bg-surface px-4 py-3">
      <View className="mr-3 h-[36px] w-[36px] items-center justify-center rounded-full bg-segment">
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          className="text-muted"
          style={{
            fontSize: 12,
            fontFamily: "Poppins_500Medium",
          }}
        >
          {label}
        </Text>

        <Text
          className="mt-1 text-foreground"
          numberOfLines={multiline ? undefined : 2}
          style={{
            fontSize: 15,
            lineHeight: 22,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function LoadingBlock({
  colors,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="py-4">
      <ActivityIndicator size="small" color={colors.accent} />
    </View>
  );
}

function ErrorText({
  message,
  colors,
}: {
  message: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Text
      className="mt-2 px-5"
      style={{
        color: colors.danger,
        fontSize: 14,
        fontFamily: "Poppins_500Medium",
      }}
    >
      {message}
    </Text>
  );
}

function EmptyState({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="rounded-[24px] border border-border bg-surface px-4 py-5">
      <View className="mb-3 h-[42px] w-[42px] items-center justify-center rounded-full bg-segment">
        <Ionicons name={icon} size={21} color={colors.accent} />
      </View>

      <Text
        className="text-foreground"
        style={{
          fontSize: 16,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {title}
      </Text>

      <Text
        className="mt-1 text-muted"
        style={{
          fontSize: 14,
          lineHeight: 22,
          fontFamily: "Poppins_400Regular",
        }}
      >
        {description}
      </Text>
    </View>
  );
}