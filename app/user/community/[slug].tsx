import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { Tabs } from "heroui-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useSession } from "@/api/better-auth-client";
import {
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
  useGetCommunityMembersQuery,
  useJoinCommunityMutation,
} from "@/store/api/communityApi";
import {
  useGetCommunityPostsQuery,
  useLikePostMutation,
  useSharePostMutation,
  useUnlikePostMutation,
} from "@/store/api/postApi";
import type { CommunityPostMediaType } from "@/types/post";
import type { CommunityMemberItem } from "@/types/community";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import PostMediaViewer from "@/components/post/PostMediaViewer";

export default function CommunityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [tab, setTab] = useState("posts");
  const [isJoining, setIsJoining] = useState(false);

  const [postCursor, setPostCursor] = useState<string | undefined>(undefined);
  const [postItems, setPostItems] = useState<any[]>([]);

  const [memberPage, setMemberPage] = useState(1);
  const [memberItems, setMemberItems] = useState<CommunityMemberItem[]>([]);

  const [viewer, setViewer] = useState<{
    visible: boolean;
    media: CommunityPostMediaType[];
    index: number;
  }>({
    visible: false,
    media: [],
    index: 0,
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

  const canViewContent =
    Boolean(access?.canView) ||
    community?.visibility === "PUBLIC" ||
    Boolean(isJoined);

  const canManageMembers =
    isOwner || Boolean(access?.permissions?.canManageMembers);

  const canLoadMembers =
    !!session?.user && !!community?.id && Boolean(isJoined);

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
    refetch: refetchPosts,
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

  const [joinCommunity] = useJoinCommunityMutation();
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [sharePost] = useSharePostMutation();

  const coverUrl = toAbsoluteFileUrl(community?.coverImage);
  const avatarUrl = toAbsoluteFileUrl(community?.avatarImage);

  const showJoinButton = !!community && !isOwner && !isJoined;

  const memberCount =
    community?.memberCount ?? membersResponse?.meta?.total ?? memberItems.length;

  const totalPostCount = community?.postCount ?? postItems.length;

  const roleLabel = useMemo(() => {
    if (isOwner) return "Owner";
    if (isModerator) return "Moderator";
    if (isJoined) return "Joined";
    return null;
  }, [isOwner, isModerator, isJoined]);

  useEffect(() => {
    setPostCursor(undefined);
    setPostItems([]);

    setMemberPage(1);
    setMemberItems([]);
  }, [community?.id]);

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

  const handleJoin = async () => {
    if (!community?.id) return;

    try {
      setIsJoining(true);

      await joinCommunity({ communityId: community.id }).unwrap();

      setMemberPage(1);
      setMemberItems([]);

      await Promise.allSettled([
        refetchCommunity(),
        refetchAccess(),
        refetchPosts(),
      ]);
    } catch (error) {
      console.log("Join community failed:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLikePost = useCallback(
    async (post: {
      id: string;
      communityId: string;
      isLikedByMe?: boolean;
    }) => {
      try {
        if (post.isLikedByMe) {
          await unlikePost({
            communityId: post.communityId,
            postId: post.id,
          }).unwrap();
        } else {
          await likePost({
            communityId: post.communityId,
            postId: post.id,
          }).unwrap();
        }
      } catch (error) {
        console.log("Like/unlike failed:", error);
      }
    },
    [likePost, unlikePost],
  );

  const handleSharePost = useCallback(
    async (post: { id: string; communityId: string }) => {
      try {
        await sharePost({
          communityId: post.communityId,
          postId: post.id,
          body: {
            platform: "copy_link",
          },
        }).unwrap();
      } catch (error) {
        console.log("Share post failed:", error);
      }
    },
    [sharePost],
  );

  const openViewer = useCallback(
    (media: CommunityPostMediaType[], index: number) => {
      setViewer({
        visible: true,
        media,
        index,
      });
    },
    [],
  );

  const closeViewer = useCallback(() => {
    setViewer((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const loadMorePosts = useCallback(() => {
    if (tab !== "posts") return;
    if (postsLoading || postsFetching) return;
    if (!postsResponse?.meta?.hasMore) return;
    if (!postsResponse?.meta?.nextCursor) return;

    setPostCursor(postsResponse.meta.nextCursor ?? undefined);
  }, [
    tab,
    postsLoading,
    postsFetching,
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
                  onPress={() => router.back()}
                  className="h-[42px] w-[42px] items-center justify-center rounded-full border border-white/20 bg-white/15"
                >
                  <Ionicons name="chevron-back" size={20} color="#fff" />
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
                      {!canViewContent && community.visibility === "PRIVATE" ? (
                        <Text
                          className="mt-2 px-5 text-muted"
                          style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: "Poppins_400Regular",
                          }}
                        >
                          Join this private community to view posts.
                        </Text>
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
                          {postItems.map((post) => (
                            <CommunityPostCard
                              key={post.id}
                              post={post}
                              disableMediaPlayback={viewer.visible}
                              onPressLike={handleLikePost}
                              onPressComment={(item) => {
                                console.log("Comment pressed:", item.id);
                              }}
                              onPressShare={handleSharePost}
                              onPressAuthor={(authorId) => {
                                console.log("Open author:", authorId);
                              }}
                              onPressMedia={openViewer}
                            />
                          ))}

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
                        value={roleLabel ?? "Visitor"}
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
                      <Text
                        className="text-muted"
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        Guidelines API is not added yet, so this tab is only a UI
                        placeholder for now.
                      </Text>
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="members">
                    <View className="bg-background px-5 pt-2">
                      {!isJoined ? (
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

                            return (
                              <MemberRow
                                key={member.id}
                                member={member}
                                memberAvatar={memberAvatar}
                                canManageMembers={canManageMembers}
                                colors={colors}
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

      <PostMediaViewer
        visible={viewer.visible}
        media={viewer.media}
        initialIndex={viewer.index}
        onClose={closeViewer}
      />
    </>
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

function MemberRow({
  member,
  memberAvatar,
  canManageMembers,
  colors,
}: {
  member: CommunityMemberItem;
  memberAvatar: string | null;
  canManageMembers: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View
      className="flex-row items-center rounded-[20px] border border-border bg-surface px-4 py-3"
      style={{ width: "100%" }}
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
          style={{
            fontSize: 15,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          {member.user.name ?? "Unknown User"}
        </Text>

        <Text
          className="mt-1 text-muted"
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
            style={{
              fontSize: 12,
              fontFamily: "Poppins_400Regular",
            }}
          >
            {member.user.email}
          </Text>
        ) : null}
      </View>
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