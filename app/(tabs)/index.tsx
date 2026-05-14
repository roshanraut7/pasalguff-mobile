import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/api/better-auth-client";
import CommentPostModal from "@/components/post/CommentsModal";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePostMediaViewer } from "@/hooks/media/usePostMediaViewer";
import { usePostInteractions } from "@/hooks/media/usePostInteractions";
import { useGetHomeFeedPostsQuery } from "@/store/api/postApi";
import type { CommunityPost, PostMedia } from "@/types/post";

type HomePostItemProps = {
  item: CommunityPost;
  viewerVisible: boolean;
  onPressLike: (post: CommunityPost) => void;
  onPressComment: (post: CommunityPost) => void;
  onPressShare: (post: CommunityPost) => void;
  onPressAuthor: (authorId: string) => void;
  onPressMedia: (media: PostMedia[], startIndex: number) => void;
};

const HomePostItem = memo(function HomePostItem({
  item,
  viewerVisible,
  onPressLike,
  onPressComment,
  onPressShare,
  onPressAuthor,
  onPressMedia,
}: HomePostItemProps) {
  return (
    <CommunityPostCard
      post={item}
      disableMediaPlayback={viewerVisible}
      onPressLike={onPressLike}
      onPressComment={onPressComment}
      onPressShare={onPressShare}
      onPressAuthor={onPressAuthor}
      onPressMedia={onPressMedia}
    />
  );
});

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { data: session, isPending } = useSession();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

    setPosts((prev) => {
      if (!cursor) {
        return incomingPosts;
      }

      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = incomingPosts.filter((item) => !existingIds.has(item.id));

      return [...prev, ...newItems];
    });
  }, [feedResponse, cursor]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);

    if (cursor !== undefined) {
      setCursor(undefined);
      return;
    }

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [cursor, refetch, refreshing]);

  useEffect(() => {
    if (!refreshing) return;
    if (cursor !== undefined) return;
    if (isLoading || isFetching) return;

    setRefreshing(false);
  }, [refreshing, cursor, isLoading, isFetching]);

  const loadMorePosts = useCallback(() => {
    if (isLoading || isFetching) return;
    if (!feedResponse?.meta?.hasMore) return;
    if (!feedResponse?.meta?.nextCursor) return;
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
    console.log("Author pressed:", authorId);
  }, []);

  const renderPostItem = useCallback(
    ({ item }: { item: CommunityPost }) => {
      return (
        <HomePostItem
          item={item}
          viewerVisible={viewer.visible}
          onPressLike={handleLikePost}
          onPressComment={openComments}
          onPressShare={handleSharePost}
          onPressAuthor={handleAuthorPress}
          onPressMedia={openViewer}
        />
      );
    },
    [
      viewer.visible,
      handleLikePost,
      openComments,
      handleSharePost,
      handleAuthorPress,
      openViewer,
    ],
  );

  const keyExtractor = useCallback((item: CommunityPost) => item.id, []);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.accent}
      />
    ),
    [refreshing, handleRefresh, colors.accent],
  );

  const emptyComponent = useMemo(() => {
    if (isLoading) {
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
          className="text-center text-muted"
          style={{
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "Poppins_400Regular",
          }}
        >
          No posts yet.
        </Text>
      </View>
    );
  }, [isLoading, error, colors.accent, colors.danger]);

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
          className="py-5 text-center text-muted"
          style={{
            fontSize: 12,
            fontFamily: "Poppins_400Regular",
          }}
        >
          No more posts.
        </Text>
      );
    }

    return null;
  }, [isFetching, posts.length, feedResponse, colors.accent]);

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
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderPostItem}
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={footerComponent}
          removeClippedSubviews
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={80}
          windowSize={5}
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