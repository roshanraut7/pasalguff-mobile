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
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useGetMyPostsQuery } from "@/store/api/postApi";
import type { CommunityPost } from "@/types/post";

const POSTS_LIMIT = 10;

export default function PostInsightsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([]);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const refreshStartedRef = useRef(false);

  const {
    currentData: myPostsResponse,
    isLoading: myPostsLoading,
    isFetching: myPostsFetching,
    error: myPostsError,
    refetch: refetchMyPosts,
  } = useGetMyPostsQuery({
    limit: POSTS_LIMIT,
    cursor: postsCursor,
    sortBy: "newest",
  });

  const hasMorePosts = myPostsResponse?.meta?.hasMore ?? false;
  const nextPostsCursor = myPostsResponse?.meta?.nextCursor ?? null;

  useEffect(() => {
    if (!myPostsResponse) return;

    const newPosts = myPostsResponse.data ?? [];

    if (postsCursor === null) {
      setAllPosts(newPosts);
      return;
    }

    setAllPosts((previousPosts) => {
      const existingIds = new Set(previousPosts.map((post) => post.id));

      const uniqueNewPosts = newPosts.filter(
        (post) => !existingIds.has(post.id),
      );

      return [...previousPosts, ...uniqueNewPosts];
    });
  }, [myPostsResponse, postsCursor]);

  useEffect(() => {
    if (!isPullRefreshing || !refreshStartedRef.current) return;

    if (postsCursor === null && !myPostsFetching) {
      const timer = setTimeout(() => {
        setIsPullRefreshing(false);
        refreshStartedRef.current = false;
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [isPullRefreshing, postsCursor, myPostsFetching]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/pages/privacySetting");
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setIsPullRefreshing(true);
      refreshStartedRef.current = true;

      if (postsCursor !== null) {
        setPostsCursor(null);
        return;
      }

      await refetchMyPosts();
    } catch (error) {
      console.log("Post insights refresh failed:", error);
      setIsPullRefreshing(false);
      refreshStartedRef.current = false;
    }
  }, [postsCursor, refetchMyPosts]);

  const handleLoadMore = useCallback(() => {
    if (isPullRefreshing || myPostsLoading || myPostsFetching) return;
    if (!hasMorePosts || !nextPostsCursor) return;

    setPostsCursor(nextPostsCursor);
  }, [
    isPullRefreshing,
    myPostsLoading,
    myPostsFetching,
    hasMorePosts,
    nextPostsCursor,
  ]);

const handlePressPost = useCallback((post: CommunityPost) => {
  const thumbnail = getPostThumbnail(post) ?? "";
  const postTitle = getPostTitle(post);

  router.push({
    pathname: "/postanalytics/[postId]",
    params: {
      postId: post.id,
      communityId: post.communityId,
      title: postTitle,
      communityName: post.community.name,
      tag: post.tag,
      type: post.type,
      visibility: post.visibility,
      publishedAt: post.publishedAt ?? post.createdAt,
      thumbnail,

      likeCount: String(post.likeCount),
      dislikeCount: String(post.dislikeCount),
      commentCount: String(post.commentCount),
      shareCount: String(post.shareCount),
      approvalRate:
        post.approvalRate !== null ? String(post.approvalRate) : "",

      poll: post.poll ? JSON.stringify(post.poll) : "",
    },
  });
}, []);

  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => {
      return (
        <InsightPostCard
          post={item}
          colors={colors}
          styles={styles}
          onPress={() => handlePressPost(item)}
        />
      );
    },
    [colors, styles, handlePressPost],
  );

  const showInitialLoader =
    allPosts.length === 0 &&
    !isPullRefreshing &&
    !myPostsError &&
    (myPostsLoading || (myPostsFetching && postsCursor === null));

  const showEmptyState =
    allPosts.length === 0 &&
    !isPullRefreshing &&
    !myPostsLoading &&
    !myPostsFetching &&
    !myPostsError;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.foreground}
          />
        </Pressable>

        <Text style={styles.headerTitle}>Post Insights</Text>

        <View style={styles.headerSide} />
      </View>

      <FlatList
        data={allPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          allPosts.length === 0 ? styles.emptyContent : undefined,
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Your Published Posts</Text>

            <Text style={styles.sectionDescription}>
              Select a post to view its performance and feedback.
            </Text>
          </View>
        }
        ListEmptyComponent={
          showInitialLoader ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : myPostsError ? (
            <View style={styles.messageCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color={colors.danger}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Could not load your posts
              </Text>

              <Text style={styles.emptyText}>
                Pull down to try again.
              </Text>
            </View>
          ) : showEmptyState ? (
            <View style={styles.messageCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color={colors.accent}
                />
              </View>

              <Text style={styles.emptyTitle}>No published posts yet</Text>

              <Text style={styles.emptyText}>
                When you publish a post, its insights will appear here.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          myPostsFetching &&
          allPosts.length > 0 &&
          postsCursor !== null ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : (
            <View style={styles.footerSpace} />
          )
        }
      />
    </SafeAreaView>
  );
}

function InsightPostCard({
  post,
  colors,
  styles,
  onPress,
}: {
  post: CommunityPost;
  colors: any;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const thumbnailUrl = getPostThumbnail(post);
  const title = getPostTitle(post);
  const date = formatPostDate(post.publishedAt ?? post.createdAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.postCard,
        {
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={styles.mediaWrap}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mediaFallback}>
            <Ionicons
              name={getFallbackIcon(post)}
              size={32}
              color={colors.accent}
            />

            <Text numberOfLines={2} style={styles.fallbackLabel}>
              {getFallbackLabel(post)}
            </Text>
          </View>
        )}

        <View style={styles.tagBadge}>
          <Text numberOfLines={1} style={styles.tagText}>
            {formatTag(post.tag)}
          </Text>
        </View>

        {post.poll ? (
          <View style={styles.pollBadge}>
            <Ionicons name="stats-chart-outline" size={12} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.cardContent}>
        <Text numberOfLines={2} style={styles.postTitle}>
          {title}
        </Text>

        <Text numberOfLines={1} style={styles.communityName}>
          {post.community.name}
        </Text>

        <Text style={styles.dateText}>{date}</Text>

        <View style={styles.metricRow}>
          <Metric
            icon="thumbs-up-outline"
            value={post.likeCount}
            colors={colors}
            styles={styles}
          />

          <Metric
            icon="thumbs-down-outline"
            value={post.dislikeCount}
            colors={colors}
            styles={styles}
          />

          <Metric
            icon="chatbubble-outline"
            value={post.commentCount}
            colors={colors}
            styles={styles}
          />
        </View>
      </View>
    </Pressable>
  );
}

function Metric({
  icon,
  value,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  colors: any;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricItem}>
      <Ionicons name={icon} size={13} color={colors.muted} />

      <Text style={styles.metricText}>{formatCompactNumber(value)}</Text>
    </View>
  );
}

function getPostThumbnail(post: CommunityPost) {
  const source = post.media?.[0]?.url ?? post.linkThumbnailUrl ?? null;

  if (!source) return null;

  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  return toAbsoluteFileUrl(source) ?? source;
}

function getPostTitle(post: CommunityPost) {
  if (post.title?.trim()) {
    return post.title.trim();
  }

  const cleanContent = stripHtml(post.content);

  if (cleanContent) {
    return cleanContent;
  }

  if (post.poll?.question?.trim()) {
    return post.poll.question.trim();
  }

  if (post.type === "LINK") {
    return "Shared link";
  }

  return "Untitled post";
}

function stripHtml(value?: string | null) {
  if (!value?.trim()) return "";

  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFallbackIcon(
  post: CommunityPost,
): keyof typeof Ionicons.glyphMap {
  if (post.poll) return "stats-chart-outline";
  if (post.type === "LINK") return "link-outline";
  if (post.type === "MEDIA") return "image-outline";

  return "document-text-outline";
}

function getFallbackLabel(post: CommunityPost) {
  if (post.poll) return "Poll";
  if (post.type === "LINK") return "Link post";
  if (post.type === "MEDIA") return "Image post";

  return "Text post";
}

function formatTag(tag: CommunityPost["tag"]) {
  return tag
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPostDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }

  return String(value);
}

function createStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      height: 58,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerTitle: {
      flex: 1,
      textAlign: "center",
      color: colors.foreground,
      fontSize: 19,
      lineHeight: 26,
      fontFamily: "Poppins_700Bold",
    },

    headerSide: {
      width: 42,
      height: 42,
    },

    content: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },

    emptyContent: {
      flexGrow: 1,
    },

    listHeader: {
      marginTop: 10,
      marginBottom: 18,
    },

    sectionTitle: {
      color: colors.foreground,
      fontSize: 20,
      lineHeight: 28,
      fontFamily: "Poppins_700Bold",
    },

    sectionDescription: {
      marginTop: 4,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
    },

    gridRow: {
      gap: 12,
      marginBottom: 12,
    },

    postCard: {
      flex: 1,
      maxWidth: "48.5%",
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    mediaWrap: {
      width: "100%",
      aspectRatio: 1,
      position: "relative",
      backgroundColor: colors.surfaceSecondary,
    },

    mediaImage: {
      width: "100%",
      height: "100%",
    },

    mediaFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      gap: 7,
    },

    fallbackLabel: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
      fontFamily: "Poppins_500Medium",
    },

    tagBadge: {
      position: "absolute",
      left: 8,
      bottom: 8,
      maxWidth: "70%",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.surface,
    },

    tagText: {
      color: colors.accent,
      fontSize: 9,
      lineHeight: 12,
      fontFamily: "Poppins_700Bold",
    },

    pollBadge: {
      position: "absolute",
      right: 8,
      top: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    cardContent: {
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 11,
    },

    postTitle: {
      minHeight: 38,
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "Poppins_700Bold",
    },

    communityName: {
      marginTop: 4,
      color: colors.accent,
      fontSize: 10,
      lineHeight: 15,
      fontFamily: "Poppins_500Medium",
    },

    dateText: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      fontFamily: "Poppins_400Regular",
    },

    metricRow: {
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
    },

    metricItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },

    metricText: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 14,
      fontFamily: "Poppins_500Medium",
    },

    centerState: {
      flex: 1,
      minHeight: 320,
      alignItems: "center",
      justifyContent: "center",
    },

    messageCard: {
      marginTop: 45,
      marginHorizontal: 8,
      borderRadius: 26,
      paddingHorizontal: 22,
      paddingVertical: 30,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    emptyIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    emptyTitle: {
      marginTop: 16,
      color: colors.foreground,
      fontSize: 16,
      lineHeight: 23,
      fontFamily: "Poppins_700Bold",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      fontFamily: "Poppins_400Regular",
      textAlign: "center",
    },

    footerLoader: {
      height: 58,
      alignItems: "center",
      justifyContent: "center",
    },

    footerSpace: {
      height: 12,
    },
  });
}