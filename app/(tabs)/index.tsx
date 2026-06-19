import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Tabs } from "heroui-native";

import { useSession } from "@/api/better-auth-client";
import CommentPostModal from "@/components/post/CommentsModal";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import DislikeReasonModal from "@/components/post/DislikeReasonModal";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import CommunityDiscussionHomeCard from "@/components/common/CommunityDiscussionHomeCard";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePostMediaViewer } from "@/hooks/media/usePostMediaViewer";
import { usePostInteractions } from "@/hooks/media/usePostInteractions";
import {
  useGetHomeFeedPostsQuery,
  useVotePostPollMutation,
} from "@/store/api/postApi";
import {
  useGetHomeFeedDiscussionsQuery,
  type CommunityDiscussion,
} from "@/store/api/communityDiscussionApi";
import type { CommunityPost, PostMedia } from "@/types/post";

type HomeFeedTab = "FOR_YOU" | "COMMUNITY" | "DISCUSSION";

type HomeListItem = CommunityPost | CommunityDiscussion;

type HomePostItemProps = {
  item: CommunityPost;
  disableMediaPlayback: boolean;
  onPressLike: (post: CommunityPost) => void;
  onPressDislike: (post: CommunityPost) => void;
  onPressComment: (post: CommunityPost) => void;
  onPressShare: (post: CommunityPost) => void;
  onPressAuthor: (authorId: string) => void;
  onPressMedia: (media: PostMedia[], startIndex: number) => void;
  onPressPollOption: (post: CommunityPost, optionId: string) => void;
};

const OPTIONS_HEADER_HEIGHT = 54;
const OPTIONS_ANIMATION_DURATION = 170;
const SHOW_OPTIONS_DELAY = 100;

const HOME_TABS: {
  label: string;
  value: HomeFeedTab;
}[] = [
  {
    label: "For You",
    value: "FOR_YOU",
  },
  {
    label: "Community",
    value: "COMMUNITY",
  },
  {
    label: "Discussions",
    value: "DISCUSSION",
  },
];

function isHomeFeedTab(value: string): value is HomeFeedTab {
  return value === "FOR_YOU" || value === "COMMUNITY" || value === "DISCUSSION";
}

const HomePostItem = memo(function HomePostItem({
  item,
  disableMediaPlayback,
  onPressLike,
  onPressDislike,
  onPressComment,
  onPressShare,
  onPressAuthor,
  onPressMedia,
  onPressPollOption,
}: HomePostItemProps) {
  return (
    <CommunityPostCard
      post={item}
      disableMediaPlayback={disableMediaPlayback}
      onPressLike={onPressLike}
      onPressDislike={onPressDislike}
      onPressComment={onPressComment}
      onPressShare={onPressShare}
      onPressAuthor={onPressAuthor}
      onPressMedia={onPressMedia}
      onPressPollOption={onPressPollOption}
    />
  );
});

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { data: session, isPending } = useSession();

  const listRef = useRef<FlatList<HomeListItem>>(null);

  const optionsTranslateY = useRef(new Animated.Value(0)).current;
  const optionsOpacity = useRef(new Animated.Value(1)).current;

  const showOptionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<HomeFeedTab>("FOR_YOU");

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  const [discussionCursor, setDiscussionCursor] = useState<string | undefined>(
    undefined,
  );
  const [discussions, setDiscussions] = useState<CommunityDiscussion[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [isFeedScrolling, setIsFeedScrolling] = useState(false);

  const isDiscussionTab = activeTab === "DISCUSSION";

  const postFeedType: "FOR_YOU" | "COMMUNITY" =
    activeTab === "COMMUNITY" ? "COMMUNITY" : "FOR_YOU";

  const { viewer, openViewer, closeViewer } = usePostMediaViewer();
  const [votePostPoll] = useVotePostPollMutation();

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
    handleCreateComment,
    refetchComments,
  } = usePostInteractions({
    posts,
    setPosts,
    sessionUser: session?.user,
  });

  const {
    data: feedResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetHomeFeedPostsQuery(
    {
      feedType: postFeedType,
      limit: 8,
      cursor,
      sortBy: "newest",
    },
    {
      skip: !session?.user || isDiscussionTab,
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: discussionResponse,
    isLoading: isDiscussionLoading,
    isFetching: isDiscussionFetching,
    error: discussionError,
    refetch: refetchDiscussions,
  } = useGetHomeFeedDiscussionsQuery(
  {
    communityId: "YOUR_PUBLIC_JOINED_COMMUNITY_ID",
    limit: 8,
    cursor: discussionCursor,
    sortBy: "newest",
  },
  {
    skip: !session?.user || !isDiscussionTab,
    refetchOnMountOrArgChange: true,
  },
  );

  useEffect(() => {
    if (!feedResponse) return;

    const incomingPosts = feedResponse.data ?? [];

    setPosts((previousPosts) => {
      if (!cursor) {
        return incomingPosts;
      }

      const existingIds = new Set(previousPosts.map((post) => post.id));

      const newPosts = incomingPosts.filter(
        (post) => !existingIds.has(post.id),
      );

      return [...previousPosts, ...newPosts];
    });
  }, [feedResponse, cursor]);

  useEffect(() => {
    if (!discussionResponse) return;

    const incomingDiscussions = discussionResponse.data ?? [];

    setDiscussions((previousDiscussions) => {
      if (!discussionCursor) {
        return incomingDiscussions;
      }

      const existingIds = new Set(
        previousDiscussions.map((discussion) => discussion.id),
      );

      const newDiscussions = incomingDiscussions.filter(
        (discussion) => !existingIds.has(discussion.id),
      );

      return [...previousDiscussions, ...newDiscussions];
    });
  }, [discussionResponse, discussionCursor]);

  const clearShowOptionsTimer = useCallback(() => {
    if (!showOptionsTimerRef.current) return;

    clearTimeout(showOptionsTimerRef.current);
    showOptionsTimerRef.current = null;
  }, []);

  const hideOptions = useCallback(() => {
    clearShowOptionsTimer();

    Animated.parallel([
      Animated.timing(optionsTranslateY, {
        toValue: -OPTIONS_HEADER_HEIGHT,
        duration: OPTIONS_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(optionsOpacity, {
        toValue: 0,
        duration: OPTIONS_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [clearShowOptionsTimer, optionsOpacity, optionsTranslateY]);

  const showOptions = useCallback(() => {
    clearShowOptionsTimer();

    Animated.parallel([
      Animated.timing(optionsTranslateY, {
        toValue: 0,
        duration: OPTIONS_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(optionsOpacity, {
        toValue: 1,
        duration: OPTIONS_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [clearShowOptionsTimer, optionsOpacity, optionsTranslateY]);

  const showOptionsAfterScrollStops = useCallback(() => {
    clearShowOptionsTimer();

    showOptionsTimerRef.current = setTimeout(() => {
      showOptions();
    }, SHOW_OPTIONS_DELAY);
  }, [clearShowOptionsTimer, showOptions]);

  useEffect(() => {
    return () => {
      clearShowOptionsTimer();
      optionsTranslateY.stopAnimation();
      optionsOpacity.stopAnimation();
    };
  }, [clearShowOptionsTimer, optionsOpacity, optionsTranslateY]);

  const handleChangeTab = useCallback(
    (tab: HomeFeedTab) => {
      if (tab === activeTab) return;

      closeComments();
      closeDislikeModal();
      closeViewer();
      showOptions();

      setIsFeedScrolling(false);
      setActiveTab(tab);

      setCursor(undefined);
      setPosts([]);

      setDiscussionCursor(undefined);
      setDiscussions([]);

      setRefreshing(false);

      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: 0,
          animated: false,
        });
      });
    },
    [
      activeTab,
      closeComments,
      closeDislikeModal,
      closeViewer,
      showOptions,
    ],
  );

  const handleTabValueChange = useCallback(
    (value: string) => {
      if (!isHomeFeedTab(value)) return;

      handleChangeTab(value);
    },
    [handleChangeTab],
  );

  const handleScrollBeginDrag = useCallback(() => {
    setIsFeedScrolling(true);
    hideOptions();
  }, [hideOptions]);

  const handleScrollEndDrag = useCallback(() => {
    setIsFeedScrolling(false);
    showOptionsAfterScrollStops();
  }, [showOptionsAfterScrollStops]);

  const handleMomentumScrollBegin = useCallback(() => {
    setIsFeedScrolling(true);
    hideOptions();
  }, [hideOptions]);

  const handleMomentumScrollEnd = useCallback(() => {
    setIsFeedScrolling(false);
    showOptionsAfterScrollStops();
  }, [showOptionsAfterScrollStops]);

  const handleVotePostPoll = useCallback(
    async (post: CommunityPost, optionId: string) => {
      try {
        const response = await votePostPoll({
          communityId: post.communityId,
          postId: post.id,
          body: {
            optionId,
          },
        }).unwrap();

        setPosts((previousPosts) =>
          previousPosts.map((item) =>
            item.id === post.id ? response.post : item,
          ),
        );
      } catch (voteError) {
        console.log("Poll vote failed:", voteError);
      }
    },
    [votePostPoll],
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    setIsFeedScrolling(false);
    showOptions();

    try {
      if (isDiscussionTab) {
        if (discussionCursor !== undefined) {
          setDiscussionCursor(undefined);

          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
              offset: 0,
              animated: false,
            });
          });

          return;
        }

        await refetchDiscussions();
        return;
      }

      if (cursor !== undefined) {
        setCursor(undefined);

        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({
            offset: 0,
            animated: false,
          });
        });

        return;
      }

      await refetch();
    } finally {
      if (
        (!isDiscussionTab && cursor === undefined) ||
        (isDiscussionTab && discussionCursor === undefined)
      ) {
        setRefreshing(false);
      }
    }
  }, [
    refreshing,
    isDiscussionTab,
    discussionCursor,
    cursor,
    refetchDiscussions,
    refetch,
    showOptions,
  ]);

  useEffect(() => {
    if (!refreshing) return;

    if (isDiscussionTab) {
      if (discussionCursor !== undefined) return;
      if (isDiscussionLoading || isDiscussionFetching) return;

      setRefreshing(false);
      return;
    }

    if (cursor !== undefined) return;
    if (isLoading || isFetching) return;

    setRefreshing(false);
  }, [
    refreshing,
    isDiscussionTab,
    discussionCursor,
    isDiscussionLoading,
    isDiscussionFetching,
    cursor,
    isLoading,
    isFetching,
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

    if (isLoading || isFetching) return;
    if (!feedResponse?.meta?.hasMore) return;
    if (!feedResponse.meta.nextCursor) return;
    if (cursor === feedResponse.meta.nextCursor) return;

    setCursor(feedResponse.meta.nextCursor);
  }, [
    isDiscussionTab,
    isDiscussionLoading,
    isDiscussionFetching,
    discussionResponse?.meta?.hasMore,
    discussionResponse?.meta?.nextCursor,
    discussionCursor,
    isLoading,
    isFetching,
    feedResponse?.meta?.hasMore,
    feedResponse?.meta?.nextCursor,
    cursor,
  ]);

  const handleAuthorPress = useCallback((authorId: string) => {
    if (!authorId) return;

    router.push(`/user/profile/${authorId}`);
  }, []);

  const disableMediaPlayback =
    viewer.visible ||
    isFeedScrolling ||
    Boolean(commentPost) ||
    Boolean(dislikePostTarget);

  const renderPostItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <HomePostItem
        item={item}
        disableMediaPlayback={disableMediaPlayback}
        onPressLike={handleLikePost}
        onPressDislike={handleDislikePost}
        onPressComment={openComments}
        onPressShare={handleSharePost}
        onPressAuthor={handleAuthorPress}
        onPressMedia={openViewer}
        onPressPollOption={handleVotePostPoll}
      />
    ),
    [
      disableMediaPlayback,
      handleLikePost,
      handleDislikePost,
      openComments,
      handleSharePost,
      handleAuthorPress,
      openViewer,
      handleVotePostPoll,
    ],
  );

  const renderDiscussionItem = useCallback(
    ({ item }: { item: CommunityDiscussion }) => (
      <CommunityDiscussionHomeCard discussion={item} />
    ),
    [],
  );

  const listData = useMemo<HomeListItem[]>(
    () => (isDiscussionTab ? discussions : posts),
    [isDiscussionTab, discussions, posts],
  );

  const activeLoading = isDiscussionTab ? isDiscussionLoading : isLoading;
  const activeFetching = isDiscussionTab ? isDiscussionFetching : isFetching;
  const activeError = isDiscussionTab ? discussionError : error;
  const activeResponse = isDiscussionTab ? discussionResponse : feedResponse;

  const renderItem = useCallback(
    ({ item }: { item: HomeListItem }) => {
      if (isDiscussionTab) {
        return renderDiscussionItem({
          item: item as CommunityDiscussion,
        });
      }

      return renderPostItem({
        item: item as CommunityPost,
      });
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
        style={{
          minHeight: OPTIONS_HEADER_HEIGHT,
          backgroundColor: colors.background,
          justifyContent: "center",
          opacity: optionsOpacity,
          transform: [
            {
              translateY: optionsTranslateY,
            },
          ],
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={handleTabValueChange}
          variant="secondary"
          style={{
            width: "100%",
          }}
        >
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
                      fontFamily: isSelected
                        ? "Poppins_700Bold"
                        : "Poppins_500Medium",
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
    [
      activeTab,
      colors.background,
      colors.foreground,
      colors.muted,
      handleTabValueChange,
      optionsOpacity,
      optionsTranslateY,
    ],
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
            style={{
              color: colors.danger,
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_500Medium",
            }}
          >
            {isDiscussionTab
              ? "Failed to load discussions. Pull down to refresh."
              : "Failed to load posts. Pull down to refresh."}
          </Text>
        </View>
      );
    }

    return (
      <View className="px-5 py-10">
        <Text
          className="text-center"
          style={{
            color: colors.muted,
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "Poppins_400Regular",
          }}
        >
          {activeTab === "FOR_YOU"
            ? "No public posts to discover yet."
            : activeTab === "COMMUNITY"
              ? "No posts from your communities yet."
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
        <Text
          className="py-5 text-center"
          style={{
            color: colors.muted,
            fontSize: 12,
            fontFamily: "Poppins_400Regular",
          }}
        >
          {isDiscussionTab ? "No more discussions." : "No more posts."}
        </Text>
      );
    }

    return null;
  }, [
    activeFetching,
    listData.length,
    activeResponse,
    isDiscussionTab,
    colors.accent,
    colors.muted,
  ]);

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text
            className="text-center text-foreground"
            style={{
              fontSize: 18,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Please login first
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={optionsHeader}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{
            paddingBottom: 120,
            flexGrow: listData.length === 0 ? 1 : undefined,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollBegin={handleMomentumScrollBegin}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.7}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={footerComponent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          initialNumToRender={5}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={50}
          windowSize={9}
        />
      </SafeAreaView>

      <CommentPostModal
        visible={!!commentPost}
        post={activeCommentPost}
        comments={comments}
        isLoading={
          (isLoadingComments || isFetchingComments) &&
          comments.length === 0
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
    </>
  );
}