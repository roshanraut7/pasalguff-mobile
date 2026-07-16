import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  useEffect,
} from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Tabs } from "heroui-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";

import { useSession } from "@/api/better-auth-client";
import CommentPostModal from "@/components/post/CommentsModal";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import DislikeReasonModal from "@/components/post/DislikeReasonModal";
import ShareBottomSheet, { type ShareBottomSheetRef } from "@/components/common/ShareBottomSheet";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import CommunityDiscussionHomeCard from "@/components/common/CommunityDiscussionHomeCard";
import FollowCommunityModal from "@/components/common/FollowCommunityModal";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePostMediaViewer } from "@/hooks/media/usePostMediaViewer";
import { usePostInteractions } from "@/hooks/media/usePostInteractions";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import {
  useGetHomeFeedPostsQuery,
  useVotePostPollMutation,
} from "@/store/api/postApi";
import {
  useGetHomeFeedDiscussionsQuery,
  type CommunityDiscussion,
} from "@/store/api/communityDiscussionApi";
import type { CommunityPost, PostMedia } from "@/types/post";

// ============================================================
// A version of react-native-reanimated's Animated.FlatList, but
// typed against RN's FlatList so scrollToOffset / etc keep types.
// ============================================================
// const AnimatedFlatList = Animated.FlatList as unknown as typeof FlatList;

type HomeFeedTab = "FOR_YOU" | "COMMUNITY" | "DISCUSSION";
type DiscussionSubTab = "DISCUSSION" | "LIVE";
type HomeListItem = CommunityPost | CommunityDiscussion;
type PendingFollowAction = "COMMENT" | "POLL";

type CommunityFollowState = CommunityPost & {
  visibility?: string | null;
  communityVisibility?: string | null;
  isCommunityFollowedByMe?: boolean;
  isJoinedByMe?: boolean;
  community?: {
    id?: string;
    name?: string | null;
    slug?: string | null;
    avatarImage?: string | null;
    visibility?: string | null;
    isCommunityFollowedByMe?: boolean;
    isJoinedByMe?: boolean;
    isMember?: boolean;
  } | null;
};

type HomePostItemProps = {
  item: CommunityPost;
  disableMediaPlayback: boolean;
  showCommunityHeader: boolean;
  ownedCommunityIds: Set<string>;
  onPressLike: (post: CommunityPost) => void;
  onPressDislike: (post: CommunityPost) => void;
  onPressComment: (post: CommunityPost) => void;
  onPressShare: (post: CommunityPost) => void;
  onPressAuthor: (authorId: string) => void;
  onPressMedia: (media: PostMedia[], startIndex: number) => void;
  onPressPollOption: (post: CommunityPost, optionId: string) => void;
  onPressJoin: (post: CommunityPost) => void;
};

const OPTIONS_HEADER_HEIGHT = 54;

const HOME_TABS: { label: string; value: HomeFeedTab }[] = [
  { label: "For You", value: "FOR_YOU" },
  { label: "Community", value: "COMMUNITY" },
  { label: "Discussions", value: "DISCUSSION" },
];

function isHomeFeedTab(value: string): value is HomeFeedTab {
  return value === "FOR_YOU" || value === "COMMUNITY" || value === "DISCUSSION";
}

const HomePostItem = memo(function HomePostItem({
  item,
  disableMediaPlayback,
  showCommunityHeader,
  ownedCommunityIds,
  onPressLike,
  onPressDislike,
  onPressComment,
  onPressShare,
  onPressAuthor,
  onPressMedia,
  onPressPollOption,
  onPressJoin,
}: HomePostItemProps) {
  return (
    <CommunityPostCard
      post={item}
      showCommunityHeader={showCommunityHeader}
      ownedCommunityIds={ownedCommunityIds}
      disableMediaPlayback={disableMediaPlayback}
      onPressLike={onPressLike}
      onPressDislike={onPressDislike}
      onPressComment={onPressComment}
      onPressShare={onPressShare}
      onPressAuthor={onPressAuthor}
      onPressMedia={onPressMedia}
      onPressPollOption={onPressPollOption}
      onPressJoin={onPressJoin}
    />
  );
});

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { data: session, isPending } = useSession();

  const listRef = useRef<FlashListRef<HomeListItem>>(null);
  const shareSheetRef = useRef<ShareBottomSheetRef>(null);

  // React 19 concurrent transition — tab switch stays responsive
  // even while the new tab's list is being rendered/re-committed.
  const [isTabPending, startTabTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<HomeFeedTab>("FOR_YOU");
  const isDiscussionTab = activeTab === "DISCUSSION";

  // ------------------------------------------------------------
  // NEW: sub-tab inside the Discussions tab.
  // "DISCUSSION" = forum-only discussions (discussion.liveChat is null).
  // "LIVE" = discussions that have (or had) a live chat attached —
  // LIVE, SCHEDULED, ENDED, or CANCELLED all stay here, since the
  // liveChat relation is never removed once created, only its
  // status changes. Same CommunityDiscussionHomeCard renders both.
  // ------------------------------------------------------------
  const [discussionSubTab, setDiscussionSubTab] = useState<DiscussionSubTab>("DISCUSSION");

  // ------------------------------------------------------------
  // FIX: each feed keeps its own cursor + its own local list.
  // Previously a single `cursor`/`posts` pair was shared between
  // FOR_YOU and COMMUNITY, so paging on one tab silently corrupted
  // pagination on the other, and switching tabs required wiping
  // the shared array (the source of the "stuck" unmount/remount).
  // ------------------------------------------------------------
  const [forYouCursor, setForYouCursor] = useState<string | undefined>(undefined);
  const [forYouPosts, setForYouPosts] = useState<CommunityPost[]>([]);

  const [communityCursor, setCommunityCursor] = useState<string | undefined>(undefined);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

  const [discussionCursor, setDiscussionCursor] = useState<string | undefined>(undefined);
  const [discussions, setDiscussions] = useState<CommunityDiscussion[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  const [followModalPost, setFollowModalPost] = useState<CommunityPost | null>(null);
  const [pendingFollowAction, setPendingFollowAction] = useState<PendingFollowAction | null>(null);

  const { viewer, openViewer, closeViewer } = usePostMediaViewer();
  const [votePostPoll] = useVotePostPollMutation();

  // Which array is "live" right now, based on the active tab.
  const activePosts = activeTab === "COMMUNITY" ? communityPosts : forYouPosts;
  const setActivePosts = activeTab === "COMMUNITY" ? setCommunityPosts : setForYouPosts;
  const getItemType = useCallback(
    (item: HomeListItem) => {
      if (isDiscussionTab) return "discussion";
      const post = item as CommunityPost;
      if (post.poll) return "poll";
      const mediaCount = post.media?.length ?? 0;
      if (mediaCount > 1) return "carousel";
      if (mediaCount === 1) return "single-image";
      return "text";
    },
    [isDiscussionTab],
  );
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
    dislikePostTarget,
    dislikeReason,
    setDislikeReason,
    dislikeError,
    isSubmittingDislike,
    openComments,
    closeComments,
    handleLikePost,
    handleDislikePost,
    handleSubmitDislike,
    closeDislikeModal,
    handleSharePost,
    handleShareToFriends,
    handleCreateComment,
    handleCommentLike,
    handleShareToFeed,
    refetchComments,
  } = usePostInteractions({
    posts: activePosts,
    setPosts: setActivePosts,
    sessionUser: session?.user,
  });

  const { data: myCommunitiesResponse } = useGetMyCommunitiesQuery(
    { limit: 100 },
    { skip: !session?.user },
  );

  const ownedCommunityIds = useMemo(() => {
    const ids = new Set<string>();
    (myCommunitiesResponse?.data ?? []).forEach((community) => {
      if (community.isOwner || community.myRole === "ADMIN") {
        ids.add(community.id);
      }
    });
    return ids;
  }, [myCommunitiesResponse]);

  // ------------------------------------------------------------
  // FIX: two independent query subscriptions instead of one query
  // that gets re-args'd on every tab switch. RTK Query already
  // caches each { feedType, cursor } combination by its tags, so
  // switching back to a tab you've already visited is instant —
  // no network call, no loading flash — as long as tags haven't
  // been invalidated.
  //
  // FIX: refetchOnMountOrArgChange is false. Your invalidatesTags
  // setup (on like/comment/vote/join) is already the source of
  // truth for freshness. Forcing a refetch on every mount throws
  // that away and turns every tab switch into a network round trip
  // — bad for perceived speed and bad for server load at scale.
  // Prefer refetchOnFocus / refetchOnReconnect (set globally in
  // your baseApi) if you want freshness on app resume instead.
  // ------------------------------------------------------------
  const {
    data: forYouResponse,
    isLoading: isForYouLoading,
    isFetching: isForYouFetching,
    error: forYouError,
    refetch: refetchForYou,
  } = useGetHomeFeedPostsQuery(
    { feedType: "FOR_YOU", limit: 8, cursor: forYouCursor, sortBy: "newest" },
    { skip: !session?.user || activeTab !== "FOR_YOU", refetchOnMountOrArgChange: false },
  );

  const {
    data: communityResponse,
    isLoading: isCommunityLoading,
    isFetching: isCommunityFetching,
    error: communityError,
    refetch: refetchCommunity,
  } = useGetHomeFeedPostsQuery(
    { feedType: "COMMUNITY", limit: 8, cursor: communityCursor, sortBy: "newest" },
    { skip: !session?.user || activeTab !== "COMMUNITY", refetchOnMountOrArgChange: false },
  );

  const {
    data: discussionResponse,
    isLoading: isDiscussionLoading,
    isFetching: isDiscussionFetching,
    error: discussionError,
    refetch: refetchDiscussions,
  } = useGetHomeFeedDiscussionsQuery(
    { limit: 8, cursor: discussionCursor, sortBy: "newest" },
    { skip: !session?.user || !isDiscussionTab, refetchOnMountOrArgChange: false },
  );

  useEffect(() => {
    if (!forYouResponse) return;
    const incoming = forYouResponse.data ?? [];
    setForYouPosts((prev) => {
      if (!forYouCursor) return incoming;
      const existing = new Set(prev.map((p) => p.id));
      return [...prev, ...incoming.filter((p) => !existing.has(p.id))];
    });
  }, [forYouResponse, forYouCursor]);

  useEffect(() => {
    if (!communityResponse) return;
    const incoming = communityResponse.data ?? [];
    setCommunityPosts((prev) => {
      if (!communityCursor) return incoming;
      const existing = new Set(prev.map((p) => p.id));
      return [...prev, ...incoming.filter((p) => !existing.has(p.id))];
    });
  }, [communityResponse, communityCursor]);

  useEffect(() => {
    if (!discussionResponse) return;
    const incoming = discussionResponse.data ?? [];
    setDiscussions((prev) => {
      if (!discussionCursor) return incoming;
      const existing = new Set(prev.map((d) => d.id));
      return [...prev, ...incoming.filter((d) => !existing.has(d.id))];
    });
  }, [discussionResponse, discussionCursor]);

  // ------------------------------------------------------------
  // FIX: header hide/show fully on the UI thread via reanimated.
  // No JS-thread scroll listeners, no setTimeout to "guess" when
  // scrolling stopped. This alone removes a lot of the jank that
  // was competing with the tab-switch work on the JS thread.
  // ------------------------------------------------------------
  const lastOffset = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const currentOffset = event.nativeEvent.contentOffset.y;
      const diff = currentOffset - lastOffset.value;

      if (currentOffset <= 0) {
        headerTranslateY.value = withTiming(0, { duration: 150 });
      } else if (diff > 4) {
        headerTranslateY.value = withTiming(-OPTIONS_HEADER_HEIGHT, { duration: 150 });
      } else if (diff < -4) {
        headerTranslateY.value = withTiming(0, { duration: 150 });
      }
      lastOffset.value = currentOffset;
    },
    [lastOffset, headerTranslateY],
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const isPostCommunityFollowed = useCallback(
    (post: CommunityPost) => {
      const normalizedPost = post as CommunityFollowState;
      if (typeof normalizedPost.isCommunityFollowedByMe === "boolean") {
        return normalizedPost.isCommunityFollowedByMe;
      }
      if (typeof normalizedPost.isJoinedByMe === "boolean") {
        return normalizedPost.isJoinedByMe;
      }
      if (typeof normalizedPost.community?.isCommunityFollowedByMe === "boolean") {
        return normalizedPost.community.isCommunityFollowedByMe;
      }
      if (typeof normalizedPost.community?.isJoinedByMe === "boolean") {
        return normalizedPost.community.isJoinedByMe;
      }
      if (typeof normalizedPost.community?.isMember === "boolean") {
        return normalizedPost.community.isMember;
      }
      return activeTab === "COMMUNITY";
    },
    [activeTab],
  );

  const canCommentOnPost = useCallback(
    (post: CommunityPost) => {
      const normalizedPost = post as CommunityFollowState;
      const visibility = String(
        normalizedPost.community?.visibility ??
          normalizedPost.communityVisibility ??
          normalizedPost.visibility ??
          "",
      ).toUpperCase();

      if (visibility === "PUBLIC" || visibility === "RESTRICTED") return true;

      return isPostCommunityFollowed(post);
    },
    [isPostCommunityFollowed],
  );

  const getPostVisibility = useCallback((post: CommunityPost) => {
    const normalizedPost = post as CommunityFollowState;
    return String(
      normalizedPost.community?.visibility ??
        normalizedPost.communityVisibility ??
        normalizedPost.visibility ??
        "",
    ).toUpperCase();
  }, []);

  const openFollowRequiredModal = useCallback((post: CommunityPost, action: PendingFollowAction) => {
    setFollowModalPost(post);
    setPendingFollowAction(action);
  }, []);

  const closeFollowRequiredModal = useCallback(() => {
    setFollowModalPost(null);
    setPendingFollowAction(null);
  }, []);

  const handleFollowCommunityFromModal = useCallback(() => {
    if (!followModalPost) return;
    const normalizedPost = followModalPost as CommunityFollowState;
    const communityRouteId = normalizedPost.community?.slug || followModalPost.communityId;
    closeFollowRequiredModal();
    router.push({ pathname: "/user/community/[slug]", params: { slug: communityRouteId } });
  }, [followModalPost, closeFollowRequiredModal]);

  // ------------------------------------------------------------
  // FIX: no requestAnimationFrame, no array clearing. Each tab now
  // owns its own posts/cursor, so switching tabs is just a state
  // update — wrapped in startTransition so React can keep the tab
  // indicator and touch feedback responsive while the new tab's
  // list (if not cached) streams in behind it.
  // ------------------------------------------------------------
  const handleChangeTab = useCallback(
    (tab: HomeFeedTab) => {
      if (tab === activeTab) return;

      closeComments();
      closeDislikeModal();
      closeViewer();
      closeFollowRequiredModal();

      startTabTransition(() => {
        setActiveTab(tab);
      });

      // Always land back on the Discussion sub-tab when re-entering
      // the Discussions tab, so state stays predictable.
      if (tab === "DISCUSSION") {
        setDiscussionSubTab("DISCUSSION");
      }

      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      headerTranslateY.value = withTiming(0, { duration: 150 });
    },
    [activeTab, closeComments, closeDislikeModal, closeViewer, closeFollowRequiredModal, headerTranslateY],
  );

  const handleTabValueChange = useCallback(
    (value: string) => {
      if (!isHomeFeedTab(value)) return;
      handleChangeTab(value);
    },
    [handleChangeTab],
  );

  const handleChangeDiscussionSubTab = useCallback(
    (subTab: DiscussionSubTab) => {
      if (subTab === discussionSubTab) return;
      setDiscussionSubTab(subTab);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [discussionSubTab],
  );

  const handleVotePostPoll = useCallback(
    async (post: CommunityPost, optionId: string) => {
      try {
        const response = await votePostPoll({
          communityId: post.communityId,
          postId: post.id,
          body: { optionId },
        }).unwrap();

        setActivePosts((prev) => prev.map((item) => (item.id === post.id ? response.post : item)));
      } catch (voteError) {
        console.log("Poll vote failed:", voteError);
      }
    },
    [votePostPoll, setActivePosts],
  );

  const handleProtectedOpenComments = useCallback(
    (post: CommunityPost) => {
      if (!canCommentOnPost(post)) {
        openFollowRequiredModal(post, "COMMENT");
        return;
      }
      openComments(post);
    },
    [canCommentOnPost, openFollowRequiredModal, openComments],
  );

  const handleProtectedVotePostPoll = useCallback(
    async (post: CommunityPost, optionId: string) => {
      if (!isPostCommunityFollowed(post)) {
        openFollowRequiredModal(post, "POLL");
        return;
      }
      await handleVotePostPoll(post, optionId);
    },
    [isPostCommunityFollowed, openFollowRequiredModal, handleVotePostPoll],
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      if (isDiscussionTab) {
        if (discussionCursor !== undefined) {
          setDiscussionCursor(undefined);
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
          return;
        }
        await refetchDiscussions();
        return;
      }

      if (activeTab === "COMMUNITY") {
        if (communityCursor !== undefined) {
          setCommunityCursor(undefined);
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
          return;
        }
        await refetchCommunity();
        return;
      }

      if (forYouCursor !== undefined) {
        setForYouCursor(undefined);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        return;
      }
      await refetchForYou();
    } finally {
      const settled =
        (isDiscussionTab && discussionCursor === undefined) ||
        (activeTab === "COMMUNITY" && communityCursor === undefined) ||
        (activeTab === "FOR_YOU" && forYouCursor === undefined);
      if (settled) setRefreshing(false);
    }
  }, [
    refreshing,
    isDiscussionTab,
    activeTab,
    discussionCursor,
    communityCursor,
    forYouCursor,
    refetchDiscussions,
    refetchCommunity,
    refetchForYou,
  ]);

  useEffect(() => {
    if (!refreshing) return;

    if (isDiscussionTab) {
      if (discussionCursor !== undefined || isDiscussionLoading || isDiscussionFetching) return;
      setRefreshing(false);
      return;
    }

    if (activeTab === "COMMUNITY") {
      if (communityCursor !== undefined || isCommunityLoading || isCommunityFetching) return;
      setRefreshing(false);
      return;
    }

    if (forYouCursor !== undefined || isForYouLoading || isForYouFetching) return;
    setRefreshing(false);
  }, [
    refreshing,
    isDiscussionTab,
    activeTab,
    discussionCursor,
    isDiscussionLoading,
    isDiscussionFetching,
    communityCursor,
    isCommunityLoading,
    isCommunityFetching,
    forYouCursor,
    isForYouLoading,
    isForYouFetching,
  ]);

  const loadMoreFeed = useCallback(() => {
    if (isDiscussionTab) {
      if (isDiscussionLoading || isDiscussionFetching) return;
      if (!discussionResponse?.meta?.hasMore) return;
      if (!discussionResponse.meta.nextCursor) return;
      if (discussionCursor === discussionResponse.meta.nextCursor) return;
      setDiscussionCursor(discussionResponse.meta.nextCursor);
      return;
    }

    if (activeTab === "COMMUNITY") {
      if (isCommunityLoading || isCommunityFetching) return;
      if (!communityResponse?.meta?.hasMore) return;
      if (!communityResponse.meta.nextCursor) return;
      if (communityCursor === communityResponse.meta.nextCursor) return;
      setCommunityCursor(communityResponse.meta.nextCursor);
      return;
    }

    if (isForYouLoading || isForYouFetching) return;
    if (!forYouResponse?.meta?.hasMore) return;
    if (!forYouResponse.meta.nextCursor) return;
    if (forYouCursor === forYouResponse.meta.nextCursor) return;
    setForYouCursor(forYouResponse.meta.nextCursor);
  }, [
    isDiscussionTab,
    activeTab,
    isDiscussionLoading,
    isDiscussionFetching,
    discussionResponse,
    discussionCursor,
    isCommunityLoading,
    isCommunityFetching,
    communityResponse,
    communityCursor,
    isForYouLoading,
    isForYouFetching,
    forYouResponse,
    forYouCursor,
  ]);

  const handleAuthorPress = useCallback((authorId: string) => {
    if (!authorId) return;
    router.push(`/user/profile/${authorId}`);
  }, []);
  const handleOpenShareSheet = useCallback((post: CommunityPost) => {
    shareSheetRef.current?.present(post);
  }, []);

  const handleJoinCommunity = useCallback((post: CommunityPost) => {
    const normalizedPost = post as CommunityFollowState;
    const communitySlug = normalizedPost.community?.slug || post.communityId;
    router.push({ pathname: "/user/community/[slug]", params: { slug: communitySlug } });
  }, []);

  const disableMediaPlayback = useMemo(
    () => viewer.visible || Boolean(commentPost) || Boolean(dislikePostTarget) || Boolean(followModalPost),
    [viewer.visible, commentPost, dislikePostTarget, followModalPost],
  );

  const renderPostItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <HomePostItem
        item={item}
        showCommunityHeader={activeTab === "FOR_YOU"}
        ownedCommunityIds={ownedCommunityIds}
        disableMediaPlayback={disableMediaPlayback}
        onPressLike={handleLikePost}
        onPressDislike={handleDislikePost}
        onPressComment={handleProtectedOpenComments}
        onPressShare={handleOpenShareSheet}
        onPressAuthor={handleAuthorPress}
        onPressMedia={openViewer}
        onPressPollOption={handleProtectedVotePostPoll}
        onPressJoin={handleJoinCommunity}
      />
    ),
    [
      activeTab,
      ownedCommunityIds,
      disableMediaPlayback,
      handleLikePost,
      handleDislikePost,
      handleProtectedOpenComments,
      handleOpenShareSheet,
      handleAuthorPress,
      openViewer,
      handleProtectedVotePostPoll,
      handleJoinCommunity,
    ],
  );

  const renderDiscussionItem = useCallback(
    ({ item }: { item: CommunityDiscussion }) => <CommunityDiscussionHomeCard discussion={item} />,
    [],
  );

  // ------------------------------------------------------------
  // NEW: split the raw discussions list by whether they have a
  // liveChat relation at all. A discussion keeps its liveChat
  // record forever once created (status just changes to ENDED /
  // CANCELLED), so "Live" always shows LIVE, SCHEDULED, ENDED, and
  // CANCELLED discussions, while "Discussion" shows pure forum
  // posts that never had a live session attached.
  // ------------------------------------------------------------
  const filteredDiscussions = useMemo(() => {
    if (discussionSubTab === "LIVE") {
      return discussions.filter((d) => Boolean(d.liveChat));
    }
    return discussions.filter((d) => !d.liveChat);
  }, [discussions, discussionSubTab]);

  const listData = useMemo<HomeListItem[]>(
    () =>
      isDiscussionTab
        ? filteredDiscussions
        : activeTab === "COMMUNITY"
          ? communityPosts
          : forYouPosts,
    [isDiscussionTab, filteredDiscussions, activeTab, communityPosts, forYouPosts],
  );

  const activeLoading = isDiscussionTab
    ? isDiscussionLoading
    : activeTab === "COMMUNITY"
      ? isCommunityLoading
      : isForYouLoading;

  const activeFetching = isDiscussionTab
    ? isDiscussionFetching
    : activeTab === "COMMUNITY"
      ? isCommunityFetching
      : isForYouFetching;

  const activeError = isDiscussionTab ? discussionError : activeTab === "COMMUNITY" ? communityError : forYouError;

  const activeResponse = isDiscussionTab
    ? discussionResponse
    : activeTab === "COMMUNITY"
      ? communityResponse
      : forYouResponse;

  const renderItem = useCallback(
    ({ item }: { item: HomeListItem }) => {
      if (isDiscussionTab) return renderDiscussionItem({ item: item as CommunityDiscussion });
      return renderPostItem({ item: item as CommunityPost });
    },
    [isDiscussionTab, renderDiscussionItem, renderPostItem],
  );

  const keyExtractor = useCallback((item: HomeListItem) => item.id, []);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.accent}
        colors={[colors.accent]}
        progressBackgroundColor={colors.surface}
      />
    ),
    [refreshing, handleRefresh, colors.accent, colors.surface],
  );

  const optionsHeader = useMemo(
    () => (
      <Animated.View
        style={[
          {
            minHeight: OPTIONS_HEADER_HEIGHT,
            backgroundColor: colors.background,
            justifyContent: "center",
          },
          headerAnimatedStyle,
        ]}
      >
        <Tabs value={activeTab} onValueChange={handleTabValueChange} variant="secondary" style={{ width: "100%" }}>
          <Tabs.List
            style={{
              width: "100%",
              minHeight: OPTIONS_HEADER_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.background,
            }}
          >
            <Tabs.Indicator />
            {HOME_TABS.map((tab) => (
              <Tabs.Trigger key={tab.value} value={tab.value}>
                {({ isSelected }) => (
                  <Tabs.Label
                    style={{
                      color: isSelected ? colors.foreground : colors.muted,
                      fontSize: 15,
                      fontFamily: isSelected ? "Poppins_700Bold" : "Poppins_500Medium",
                    }}
                  >
                    {tab.label}
                  </Tabs.Label>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </Animated.View>
    ),
    [activeTab, colors.background, colors.foreground, colors.muted, handleTabValueChange, headerAnimatedStyle],
  );

  const emptyComponent = useMemo(() => {
    if (activeLoading || (activeFetching && listData.length === 0)) {
      return (
        <View className="py-10">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (activeError) {
      return (
        <View className="px-5 py-10">
          <Text
            className="text-center"
            style={{ color: colors.danger, fontSize: 14, lineHeight: 22, fontFamily: "Poppins_500Medium" }}
          >
            {isDiscussionTab ? "Failed to load discussions. Pull down to refresh." : "Failed to load posts. Pull down to refresh."}
          </Text>
        </View>
      );
    }

    return (
      <View className="px-5 py-10">
        <Text
          className="text-center"
          style={{ color: colors.muted, fontSize: 14, lineHeight: 22, fontFamily: "Poppins_400Regular" }}
        >
          {activeTab === "FOR_YOU"
            ? "No public posts to discover yet."
            : activeTab === "COMMUNITY"
              ? "No posts from your communities yet."
              : discussionSubTab === "LIVE"
                ? "No live discussions right now."
                : "No discussions to show yet."}
        </Text>
      </View>
    );
  }, [
    activeTab,
    activeLoading,
    activeFetching,
    activeError,
    listData.length,
    isDiscussionTab,
    discussionSubTab,
    colors.accent,
    colors.danger,
    colors.muted,
  ]);

  const footerComponent = useMemo(() => {
    if (activeFetching && listData.length > 0) {
      return (
        <View className="py-5">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (activeResponse && listData.length > 0 && !activeResponse.meta?.hasMore) {
      return (
        <Text className="py-5 text-center" style={{ color: colors.muted, fontSize: 12, fontFamily: "Poppins_400Regular" }}>
          {isDiscussionTab ? "No more discussions." : "No more posts."}
        </Text>
      );
    }

    return null;
  }, [activeFetching, listData.length, activeResponse, isDiscussionTab, colors.accent, colors.muted]);

  const followModalCommunityName = (followModalPost as CommunityFollowState | null)?.community?.name;

  if (isPending) {
    return (
      <SafeAreaView className=" flex-1 bg-background" edges={[]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <SafeAreaView className=" flex-1bg-background" edges={[]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-foreground" style={{ fontSize: 18, fontFamily: "Poppins_700Bold" }}>
            Please login first
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={[]}>
        <View
          style={{
            minHeight: OPTIONS_HEADER_HEIGHT,
            backgroundColor: colors.background,
            justifyContent: "center",
          }}
        >
          <Tabs value={activeTab} onValueChange={handleTabValueChange} variant="secondary" style={{ width: "100%" }}>
            <Tabs.List
              style={{
                width: "100%",
                minHeight: OPTIONS_HEADER_HEIGHT,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.background,
              }}
            >
              <Tabs.Indicator />
              {HOME_TABS.map((tab) => (
                <Tabs.Trigger key={tab.value} value={tab.value}>
                  {({ isSelected }) => (
                    <Tabs.Label
                      style={{
                        color: isSelected ? colors.foreground : colors.muted,
                        fontSize: 15,
                        fontFamily: isSelected ? "Poppins_700Bold" : "Poppins_500Medium",
                      }}
                    >
                      {tab.label}
                    </Tabs.Label>
                  )}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>
        </View>

        {/* NEW: Discussion / Live sub-tab bar, only visible on the Discussions tab */}
        {isDiscussionTab ? (
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 14,
              paddingVertical: 8,
              gap: 8,
              backgroundColor: colors.background,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => handleChangeDiscussionSubTab("DISCUSSION")}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor:
                  discussionSubTab === "DISCUSSION" ? colors.accent : colors.surfaceSecondary,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Poppins_600SemiBold",
                  color:
                    discussionSubTab === "DISCUSSION"
                      ? colors.accentForeground
                      : colors.muted,
                }}
              >
                Discussion
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleChangeDiscussionSubTab("LIVE")}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor:
                  discussionSubTab === "LIVE" ? colors.danger : colors.surfaceSecondary,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Poppins_600SemiBold",
                  color: discussionSubTab === "LIVE" ? "#FFFFFF" : colors.muted,
                }}
              >
                Live
              </Text>
            </Pressable>
          </View>
        ) : null}

        <FlashList
          ref={listRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemType={getItemType}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.7}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={footerComponent}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>

      <CommentPostModal
        visible={!!commentPost}
        post={activeCommentPost}
        showCommunityHeader={activeTab === "FOR_YOU"}
        ownedCommunityIds={ownedCommunityIds}
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
        onPressCommentLike={handleCommentLike}
        onRefreshComments={() => {
          void refetchComments();
        }}
        canWriteComment={activeCommentPost ? canCommentOnPost(activeCommentPost) : false}
        onRequestFollow={() => {
          if (!activeCommentPost) return;
          openFollowRequiredModal(activeCommentPost, "COMMENT");
        }}
        colors={colors}
      />

      <PostMediaViewer visible={viewer.visible} media={viewer.media} initialIndex={viewer.index} onClose={closeViewer} />

      <DislikeReasonModal
        visible={!!dislikePostTarget}
        reason={dislikeReason}
        errorText={dislikeError}
        isSubmitting={isSubmittingDislike}
        onChangeReason={setDislikeReason}
        onClose={closeDislikeModal}
        onSubmit={() => {
          void handleSubmitDislike();
        }}
      />

      <FollowCommunityModal
        visible={!!followModalPost}
        communityName={followModalCommunityName}
        isRestricted={followModalPost ? getPostVisibility(followModalPost) === "RESTRICTED" : false}
        onClose={closeFollowRequiredModal}
        onFollow={handleFollowCommunityFromModal}
      />

      <ShareBottomSheet
        ref={shareSheetRef}
        onShareExternal={handleSharePost}
        onShareToFriends={handleShareToFriends}
        onShareToFeed={handleShareToFeed}
        onLinkCopied={() => {
          // e.g. Toast.show({ type: "success", text1: "Link copied" })
        }}
      />
    </>
  );
}