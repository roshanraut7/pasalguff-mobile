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
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useSession } from "@/api/better-auth-client";
import CommentPostModal from "@/components/post/CommentsModal";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import DislikeReasonModal from "@/components/post/DislikeReasonModal";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePostMediaViewer } from "@/hooks/media/usePostMediaViewer";
import { usePostInteractions } from "@/hooks/media/usePostInteractions";
import {
  useGetHomeFeedPostsQuery,
  useVotePostPollMutation,
} from "@/store/api/postApi";
import type { CommunityPost, PostMedia } from "@/types/post";

type HomeFeedTab = "FOR_YOU" | "COMMUNITY";

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

  const listRef = useRef<FlatList<CommunityPost>>(null);

  const optionsTranslateY = useRef(new Animated.Value(0)).current;
  const optionsOpacity = useRef(new Animated.Value(1)).current;

  const showOptionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<HomeFeedTab>("FOR_YOU");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * When true, any playing embedded YouTube WebView inside a card is removed.
   * This stops audio/video while the user scrolls the feed.
   */
  const [isFeedScrolling, setIsFeedScrolling] = useState(false);

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
      feedType: activeTab,
      limit: 8,
      cursor,
      sortBy: "newest",
    },
    {
      skip: !session?.user,
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

      const existingIds = new Set(
        previousPosts.map((post) => post.id),
      );

      const newPosts = incomingPosts.filter(
        (post) => !existingIds.has(post.id),
      );

      return [...previousPosts, ...newPosts];
    });
  }, [feedResponse, cursor]);

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
      if (cursor === undefined) {
        setRefreshing(false);
      }
    }
  }, [cursor, refetch, refreshing, showOptions]);

  useEffect(() => {
    if (!refreshing) return;
    if (cursor !== undefined) return;
    if (isLoading || isFetching) return;

    setRefreshing(false);
  }, [refreshing, cursor, isLoading, isFetching]);

  const loadMorePosts = useCallback(() => {
    if (isLoading || isFetching) return;
    if (!feedResponse?.meta?.hasMore) return;
    if (!feedResponse.meta.nextCursor) return;
    if (cursor === feedResponse.meta.nextCursor) return;

    setCursor(feedResponse.meta.nextCursor);
  }, [
    isLoading,
    isFetching,
    cursor,
    feedResponse?.meta?.hasMore,
    feedResponse?.meta?.nextCursor,
  ]);

  const handleAuthorPress = useCallback((authorId: string) => {
    if (!authorId) return;

    router.push(`/user/profile/${authorId}`);
  }, []);

  /**
   * Embedded videos should stop when:
   * - media viewer is open,
   * - the feed is scrolling,
   * - comments modal is open,
   * - dislike reason modal is open.
   */
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

  const keyExtractor = useCallback(
    (item: CommunityPost) => item.id,
    [],
  );

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
          height: OPTIONS_HEADER_HEIGHT,
          backgroundColor: colors.background,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: optionsOpacity,
          transform: [
            {
              translateY: optionsTranslateY,
            },
          ],
        }}
      >
        <Pressable
          onPress={() => handleChangeTab("FOR_YOU")}
          hitSlop={12}
          style={({ pressed }) => ({
            height: OPTIONS_HEADER_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 32,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              color:
                activeTab === "FOR_YOU"
                  ? colors.foreground
                  : colors.muted,
              fontSize: 15,
              fontFamily:
                activeTab === "FOR_YOU"
                  ? "Poppins_700Bold"
                  : "Poppins_500Medium",
            }}
          >
            For You
          </Text>

          {activeTab === "FOR_YOU" && (
            <View
              style={{
                position: "absolute",
                bottom: 8,
                height: 3,
                width: 26,
                borderRadius: 999,
                backgroundColor: colors.accent,
              }}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => handleChangeTab("COMMUNITY")}
          hitSlop={12}
          style={({ pressed }) => ({
            height: OPTIONS_HEADER_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              color:
                activeTab === "COMMUNITY"
                  ? colors.foreground
                  : colors.muted,
              fontSize: 15,
              fontFamily:
                activeTab === "COMMUNITY"
                  ? "Poppins_700Bold"
                  : "Poppins_500Medium",
            }}
          >
            Community
          </Text>

          {activeTab === "COMMUNITY" && (
            <View
              style={{
                position: "absolute",
                bottom: 8,
                height: 3,
                width: 26,
                borderRadius: 999,
                backgroundColor: colors.accent,
              }}
            />
          )}
        </Pressable>
      </Animated.View>
    ),
    [
      activeTab,
      colors.background,
      colors.foreground,
      colors.muted,
      colors.accent,
      handleChangeTab,
      optionsOpacity,
      optionsTranslateY,
    ],
  );

  const emptyComponent = useMemo(() => {
    if (isLoading || (isFetching && posts.length === 0)) {
      return (
        <View className="py-10">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (error) {
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
            Failed to load posts. Pull down to refresh.
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
            : "No posts from your communities yet."}
        </Text>
      </View>
    );
  }, [
    activeTab,
    isLoading,
    isFetching,
    posts.length,
    error,
    colors.accent,
    colors.danger,
    colors.muted,
  ]);

  const footerComponent = useMemo(() => {
    if (isFetching && posts.length > 0) {
      return (
        <View className="py-5">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (feedResponse && posts.length > 0 && !feedResponse.meta?.hasMore) {
      return (
        <Text
          className="py-5 text-center"
          style={{
            color: colors.muted,
            fontSize: 12,
            fontFamily: "Poppins_400Regular",
          }}
        >
          No more posts.
        </Text>
      );
    }

    return null;
  }, [
    isFetching,
    posts.length,
    feedResponse,
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
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderPostItem}
          ListHeaderComponent={optionsHeader}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{
            paddingBottom: 120,
            flexGrow: posts.length === 0 ? 1 : undefined,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollBegin={handleMomentumScrollBegin}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onEndReached={loadMorePosts}
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

      {/*
       * Keep comment modal unchanged for now.
       * Do not pass onPressPostDislike here.
       */}
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

      {/*
       * Separate feed-only Dislike reason modal.
       * No fixed reason options and no comment-section integration.
       */}
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