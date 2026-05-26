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
import {
  useCancelMyJoinRequestMutation,
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
  useJoinCommunityMutation,
} from "@/store/api/communityApi";
import {
  useGetCommunityMembersQuery,
  useRemoveCommunityMemberMutation,
} from "@/store/api/communityMemberManagementApi";
import {
  useGetCommunityGuidelinesQuery,
  type CommunityGuidelineItem,
} from "@/store/api/communityGuidelinesApi";
import {
  useDeletePostMutation,
  useGetCommunityPostsQuery,
} from "@/store/api/postApi";
import type { CommunityMemberItem } from "@/types/community";
import type { CommunityPost } from "@/types/post";

export default function CommunityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [tab, setTab] = useState("posts");
  const [isJoining, setIsJoining] = useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);

  const [postCursor, setPostCursor] = useState<string | undefined>(undefined);
  const [postItems, setPostItems] = useState<CommunityPost[]>([]);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const [memberPage, setMemberPage] = useState(1);
  const [memberItems, setMemberItems] = useState<CommunityMemberItem[]>([]);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

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

  const isOwner = access?.role === "ADMIN" || community?.myRole === "ADMIN";

  const isModerator =
    access?.role === "MODERATOR" || community?.myRole === "MODERATOR";

  const isJoined =
    Boolean(access?.isMember) ||
    Boolean(community?.isJoined) ||
    community?.myRole === "ADMIN" ||
    community?.myRole === "MODERATOR" ||
    community?.myRole === "MEMBER";

  const isJoinRequestPending = community?.myJoinRequestStatus === "PENDING";

  const isPrivateLocked =
    community?.visibility === "PRIVATE" &&
    !isJoined &&
    !isOwner &&
    !isModerator;

  const canViewContent =
    Boolean(access?.canView) ||
    community?.visibility === "PUBLIC" ||
    Boolean(isJoined) ||
    Boolean(isOwner) ||
    Boolean(isModerator);

  const canManageMembers =
    isOwner || Boolean(access?.permissions?.canManageMembers);

  const canManagePosts =
    isOwner || Boolean(access?.permissions?.canManagePosts);

  const canLoadMembers =
    !!session?.user &&
    !!community?.id &&
    (Boolean(isJoined) || Boolean(isOwner) || Boolean(isModerator));

  const {
    data: membersResponse,
    isLoading: membersLoading,
    isFetching: membersFetching,
    error: membersError,
  } = useGetCommunityMembersQuery(
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
    !!session?.user && !!community?.id && Boolean(canViewContent);

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
  const [removeCommunityMember] = useRemoveCommunityMemberMutation();

  const coverUrl = toAbsoluteFileUrl(community?.coverImage);
  const avatarUrl = toAbsoluteFileUrl(community?.avatarImage);

  const showJoinButton =
    !!community && !isOwner && !isJoined && !isJoinRequestPending;

  const showCancelRequestButton =
    !!community && !isOwner && !isJoined && isJoinRequestPending;

  const memberCount =
    community?.memberCount ?? membersResponse?.meta?.total ?? memberItems.length;

  const totalPostCount = community?.postCount ?? postItems.length;

  const roleLabel = useMemo(() => {
    if (isOwner) return "Owner";
    if (isModerator) return "Moderator";
    if (isJoined) return "Joined";

    return null;
  }, [isOwner, isModerator, isJoined]);

  const aboutRoleLabel = isJoinRequestPending
    ? "Pending"
    : roleLabel ?? "Visitor";

  useEffect(() => {
    setPostCursor(undefined);
    setPostItems([]);
    setDeletingPostId(null);

    setMemberPage(1);
    setMemberItems([]);
    setRemovingMemberId(null);

    closeComments();
  }, [community?.id, closeComments]);

  useEffect(() => {
    if (!postsResponse) return;

    const incomingPosts = postsResponse.data ?? [];

    setPostItems((prev) => {
      if (!postCursor) {
        return incomingPosts;
      }

      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = incomingPosts.filter((item) => !existingIds.has(item.id));

      return [...prev, ...newItems];
    });
  }, [postsResponse, postCursor]);

  useEffect(() => {
    if (!membersResponse) return;

    const incomingMembers = membersResponse.data ?? [];

    setMemberItems((prev) => {
      if (memberPage === 1) {
        return incomingMembers;
      }

      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = incomingMembers.filter(
        (item) => !existingIds.has(item.id),
      );

      return [...prev, ...newItems];
    });
  }, [membersResponse, memberPage]);

  const handleJoin = useCallback(async () => {
    if (!community?.id) return;

    try {
      setIsJoining(true);

      await joinCommunity({ communityId: community.id }).unwrap();

      setMemberPage(1);
      setMemberItems([]);

      await Promise.allSettled([refetchCommunity(), refetchAccess()]);

      if (community.visibility === "PRIVATE") {
        Alert.alert(
          "Request sent",
          "Your request is pending. Please wait for verification from the admin to unlock this community.",
        );
      }
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

  const handleCancelJoinRequest = useCallback(() => {
    if (!community?.id) return;

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
  }, [
    community?.id,
    cancelMyJoinRequest,
    refetchCommunity,
    refetchAccess,
  ]);

  const handleDeletePost = useCallback(
    async (post: CommunityPost) => {
      if (!community?.id) return;

      try {
        setDeletingPostId(post.id);

        await deletePost({
          communityId: community.id,
          postId: post.id,
        }).unwrap();

        setPostItems((prev) => prev.filter((item) => item.id !== post.id));

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

  const handleRemoveMember = useCallback(
    (member: CommunityMemberItem) => {
      if (!community?.id) return;

      const targetUserId = member.user.id;

      if (!targetUserId) return;

      if (targetUserId === session?.user?.id) {
        Alert.alert("Not allowed", "You cannot remove yourself.");
        return;
      }

      if (member.role === "ADMIN") {
        Alert.alert("Not allowed", "You cannot remove the community owner.");
        return;
      }

      Alert.alert(
        "Remove member",
        `Are you sure you want to remove ${
          member.user.name ?? "this member"
        } from this community?`,
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
                setRemovingMemberId(targetUserId);

                await removeCommunityMember({
                  communityId: community.id,
                  targetUserId,
                }).unwrap();

                setMemberItems((prev) =>
                  prev.filter((item) => item.user.id !== targetUserId),
                );

                await Promise.allSettled([
                  refetchCommunity(),
                  refetchAccess(),
                ]);
              } catch (error: any) {
                console.log("Remove member failed:", error);

                Alert.alert(
                  "Could not remove member",
                  error?.data?.message ??
                    "Something went wrong while removing this member.",
                );
              } finally {
                setRemovingMemberId(null);
              }
            },
          },
        ],
      );
    },
    [
      community?.id,
      removeCommunityMember,
      refetchCommunity,
      refetchAccess,
      session?.user?.id,
    ],
  );

  const loadMorePosts = useCallback(() => {
    if (tab !== "posts") return;
    if (postsLoading || postsFetching) return;
    if (!postsResponse?.meta?.hasMore) return;
    if (!postsResponse?.meta?.nextCursor) return;
    if (postCursor === postsResponse.meta.nextCursor) return;

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
    if (tab !== "members") return;
    if (membersLoading || membersFetching) return;

    const currentPage = membersResponse?.meta?.page ?? memberPage;
    const totalPages = membersResponse?.meta?.totalPages ?? 1;

    if (currentPage >= totalPages) return;

    setMemberPage((prev) => prev + 1);
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

      if (!isCloseToBottom) return;

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
      if (!authorId || !community?.id) return;

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
      if (!memberUserId || !community?.id) return;

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
      <View
        style={{ flex: 1 }}
        className="items-center justify-center bg-background"
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
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text
            className="text-foreground"
            style={{
              fontSize: 24,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Community not found
          </Text>

          <Text
            className="mt-2 text-muted"
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
      <SafeAreaView
        style={{ flex: 1 }}
        className="bg-background"
        edges={["top"]}
      >
        <ScrollView
          className="bg-background"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View className="bg-background">
            <View className="relative">
              {!!coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={{
                    width: "100%",
                    height: 220,
                    borderBottomLeftRadius: 30,
                    borderBottomRightRadius: 30,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  className="bg-segment"
                  style={{
                    height: 220,
                    borderBottomLeftRadius: 30,
                    borderBottomRightRadius: 30,
                  }}
                />
              )}

              <View className="absolute left-5 top-5">
                <Pressable
                  onPress={() => {
                    router.replace("/(tabs)");
                  }}
                  className="h-[42px] w-[42px] items-center justify-center rounded-full border border-white/20 bg-white/15"
                >
                  <Ionicons name="chevron-back" size={20} color="#ffffff" />
                </Pressable>
              </View>

              <View className="absolute left-5 -bottom-[52px]">
                <View className="h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full border-4 border-background bg-surface">
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-segment">
                      <Ionicons
                        name="people-outline"
                        size={40}
                        color={colors.accent}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View className="px-5 pt-[66px]">
              <View
                className="flex-row items-start justify-between"
                style={{ width: "100%" }}
              >
                <View style={{ width: "74%" }}>
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

                  <Text
                    className="mt-1 text-muted"
                    style={{
                      fontSize: 14,
                      lineHeight: 22,
                      fontFamily: "Poppins_500Medium",
                    }}
                  >
                    {community.category?.name ?? "Unknown"} •{" "}
                    {community.visibility}
                  </Text>

                  {!!community.description ? (
                    <Text
                      className="mt-3 text-muted"
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

                <View style={{ width: "24%", alignItems: "flex-end" }}>
                  {roleLabel ? (
                    <View className="rounded-full bg-segment px-3 py-2">
                      <Text
                        style={{
                          color: colors.segmentForeground,
                          fontSize: 12,
                          fontFamily: "Poppins_600SemiBold",
                        }}
                      >
                        {roleLabel}
                      </Text>
                    </View>
                  ) : showCancelRequestButton ? (
                    <Pressable
                      onPress={handleCancelJoinRequest}
                      disabled={isCancellingRequest}
                      style={{
                        minWidth: 116,
                        minHeight: 36,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: colors.danger,
                        backgroundColor: colors.surfaceSecondary,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      {isCancellingRequest ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Text
                          numberOfLines={1}
                          style={{
                            color: colors.danger,
                            fontSize: 12,
                            fontFamily: "Poppins_700Bold",
                          }}
                        >
                          Cancel Request
                        </Text>
                      )}
                    </Pressable>
                  ) : showJoinButton ? (
                    <Pressable
                      onPress={handleJoin}
                      disabled={isJoining}
                      className="rounded-full bg-accent px-4 py-2"
                    >
                      {isJoining ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.accentForeground}
                        />
                      ) : (
                        <Text
                          style={{
                            color: colors.accentForeground,
                            fontSize: 12,
                            fontFamily: "Poppins_600SemiBold",
                          }}
                        >
                          Join
                        </Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>

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

            <View className="mt-6">
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

                <View className="pt-3">
                  <Tabs.Content value="posts">
                    <View className="bg-background">
                      {isPrivateLocked ? (
                        <PrivateLockedMessage
                          isPending={isJoinRequestPending}
                          colors={colors}
                        />
                      ) : postsLoading && postItems.length === 0 ? (
                        <View className="py-8">
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        </View>
                      ) : postsError ? (
                        <Text
                          className="mt-2 px-5"
                          style={{
                            color: colors.danger,
                            fontSize: 14,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          Failed to load posts.
                        </Text>
                      ) : postItems.length === 0 ? (
                        <Text
                          className="mt-2 px-5 text-muted"
                          style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: "Poppins_400Regular",
                          }}
                        >
                          No posts yet.
                        </Text>
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
                                canDelete={canManagePosts || isOwnPost}
                                isDeleting={deletingPostId === post.id}
                                onDelete={handleDeletePost}
                              />
                            );
                          })}

                          {postsFetching && postItems.length > 0 ? (
                            <View className="py-5">
                              <ActivityIndicator
                                size="small"
                                color={colors.accent}
                              />
                            </View>
                          ) : null}

                          {postsResponse &&
                          postItems.length > 0 &&
                          !postsResponse.meta.hasMore ? (
                            <Text
                              className="py-4 text-center text-muted"
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
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="about">
                    <View className="px-5 pt-2" style={{ rowGap: 12 }}>
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
                    <View className="bg-background px-5 pt-2">
                      {isPrivateLocked ? (
                        <PrivateLockedMessage
                          isPending={isJoinRequestPending}
                          colors={colors}
                        />
                      ) : guidelinesLoading ||
                        (guidelinesFetching && guidelineItems.length === 0) ? (
                        <View className="py-6">
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        </View>
                      ) : guidelinesError ? (
                        <Text
                          style={{
                            color: colors.danger,
                            fontSize: 14,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          Failed to load guidelines.
                        </Text>
                      ) : guidelineItems.length === 0 ? (
                        <View className="rounded-[22px] bg-surface px-4 py-5">
                          <Text
                            className="text-foreground"
                            style={{
                              fontSize: 16,
                              fontFamily: "Poppins_700Bold",
                            }}
                          >
                            No guidelines yet
                          </Text>

                          <Text
                            className="mt-1 text-muted"
                            style={{
                              fontSize: 14,
                              lineHeight: 22,
                              fontFamily: "Poppins_400Regular",
                            }}
                          >
                            Community guidelines will appear here once the admin
                            adds them.
                          </Text>
                        </View>
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
                    <View className="bg-background px-5 pt-2">
                      {isPrivateLocked ? (
                        <PrivateLockedMessage
                          isPending={isJoinRequestPending}
                          colors={colors}
                        />
                      ) : !isJoined && !isOwner && !isModerator ? (
                        <Text
                          className="text-muted"
                          style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: "Poppins_400Regular",
                          }}
                        >
                          Join this community to view members.
                        </Text>
                      ) : membersLoading && memberItems.length === 0 ? (
                        <View className="py-6">
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        </View>
                      ) : membersError ? (
                        <Text
                          style={{
                            color: colors.danger,
                            fontSize: 14,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          Failed to load members.
                        </Text>
                      ) : memberItems.length === 0 ? (
                        <Text
                          className="text-muted"
                          style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: "Poppins_400Regular",
                          }}
                        >
                          No members found.
                        </Text>
                      ) : (
                        <View style={{ rowGap: 12 }}>
                          {memberItems.map((member) => {
                            const memberAvatar =
                              toAbsoluteFileUrl(member.user.image) ?? null;

                            const isSelf =
                              member.user.id === session?.user?.id;

                            const isAdminMember = member.role === "ADMIN";

                            const isActiveMember =
                              !member.status || member.status === "ACTIVE";

                            const canRemoveMember =
                              canManageMembers &&
                              !isSelf &&
                              !isAdminMember &&
                              isActiveMember;

                            return (
                              <MemberRow
                                key={member.id}
                                member={member}
                                memberAvatar={memberAvatar}
                                canManageMembers={canManageMembers}
                                canRemoveMember={canRemoveMember}
                                isRemoving={removingMemberId === member.user.id}
                                colors={colors}
                                onPressProfile={() =>
                                  handleMemberPress(member.user.id)
                                }
                                onRemoveMember={() =>
                                  handleRemoveMember(member)
                                }
                              />
                            );
                          })}

                          {membersFetching && memberItems.length > 0 ? (
                            <View className="py-5">
                              <ActivityIndicator
                                size="small"
                                color={colors.accent}
                              />
                            </View>
                          ) : null}

                          {membersResponse &&
                          memberItems.length > 0 &&
                          membersResponse.meta.page >=
                            membersResponse.meta.totalPages ? (
                            <Text
                              className="py-4 text-center text-muted"
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

function PrivateLockedMessage({
  isPending,
  colors,
}: {
  isPending: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View className="mx-5 mt-2 rounded-[22px] border border-border bg-surface px-4 py-5">
      <View className="flex-row items-start">
        <View className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-segment">
          <Ionicons
            name={isPending ? "time-outline" : "lock-closed-outline"}
            size={20}
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
            {isPending ? "Waiting for admin verification" : "Private community"}
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
              ? "Your join request is pending. Please wait for verification from the admin to unlock this community."
              : "Join this private community first. After admin approval, posts, guidelines and members will be unlocked."}
          </Text>
        </View>
      </View>
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
  canManageMembers,
  canRemoveMember,
  isRemoving,
  colors,
  onPressProfile,
  onRemoveMember,
}: {
  member: CommunityMemberItem;
  memberAvatar: string | null;
  canManageMembers: boolean;
  canRemoveMember: boolean;
  isRemoving: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onPressProfile: () => void;
  onRemoveMember: () => void;
}) {
  return (
    <View
      className="flex-row items-center rounded-[20px] border border-border bg-surface px-4 py-3"
      style={{ width: "100%" }}
    >
      <Pressable
        onPress={onPressProfile}
        android_ripple={{ color: colors.surfaceSecondary }}
        className="flex-row items-center"
        style={{ flex: 1 }}
      >
        <View className="mr-3 h-[48px] w-[48px] overflow-hidden rounded-full border border-border bg-segment">
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
              <Ionicons name="person-outline" size={20} color={colors.accent} />
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
              fontSize: 13,
              fontFamily: "Poppins_400Regular",
            }}
          >
            {member.role}
            {canManageMembers && member.status ? ` • ${member.status}` : ""}
          </Text>

          {canManageMembers && member.user.email ? (
            <Text
              className="mt-1 text-muted"
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontFamily: "Poppins_400Regular",
              }}
            >
              {member.user.email}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {canRemoveMember ? (
        <Pressable
          onPress={onRemoveMember}
          disabled={isRemoving}
          className="ml-3 flex-row items-center rounded-full px-3 py-2"
          style={{
            backgroundColor: colors.danger,
            opacity: isRemoving ? 0.7 : 1,
          }}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color={colors.dangerForeground} />
          ) : (
            <>
              <Ionicons
                name="person-remove-outline"
                size={14}
                color={colors.dangerForeground}
              />

              <Text
                style={{
                  marginLeft: 5,
                  color: colors.dangerForeground,
                  fontSize: 12,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Remove
              </Text>
            </>
          )}
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      )}
    </View>
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
    <View className="flex-row rounded-[18px] bg-surface px-4 py-3">
      <View className="mr-3 h-[34px] w-[34px] items-center justify-center rounded-full bg-segment">
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <View style={{ width: "84%" }}>
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