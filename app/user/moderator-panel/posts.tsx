import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
} from "@/store/api/communityApi";

import { useGetCommunityPostsQuery } from "@/store/api/postApi";

import type { CommunityPost } from "@/types/post";

export default function PostModerationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const {
    data: community,
    isLoading: communityLoading,
    error: communityError,
  } = useGetCommunityBySlugQuery(slug ?? "", {
    skip: !session?.user || !slug,
    refetchOnMountOrArgChange: true,
  });

  const { data: access, isLoading: accessLoading } =
    useGetCommunityAccessQuery(community?.id ?? "", {
      skip: !session?.user || !community?.id,
      refetchOnMountOrArgChange: true,
    });

  const isOwner =
    access?.role === "ADMIN" ||
    community?.myRole === "ADMIN" ||
    community?.isOwner === true;

  const isModerator =
    access?.role === "MODERATOR" || community?.myRole === "MODERATOR";

  const canManagePosts =
    isOwner || Boolean(access?.permissions?.canManagePosts);

  const canOpenScreen = isOwner || isModerator;

  const isSearchActive = Boolean(search.trim());

  /**
   * Debounce search so backend is not called on every single key press.
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  /**
   * Reset post list when community or backend search query changes.
   */
  useEffect(() => {
    setCursor(undefined);
    setPosts([]);
  }, [community?.id, debouncedSearch]);

  /**
   * Reset everything when opening another community.
   */
  useEffect(() => {
    setCursor(undefined);
    setPosts([]);
    setSearch("");
    setDebouncedSearch("");
  }, [community?.id]);

  const {
    data: postsResponse,
    isLoading: postsLoading,
    isFetching: postsFetching,
  } = useGetCommunityPostsQuery(
    {
      communityId: community?.id ?? "",
      limit: 10,
      cursor,
      search: debouncedSearch || undefined,
      sortBy: "newest",
    },
    {
      skip: !community?.id || !canManagePosts,
      refetchOnMountOrArgChange: true,
    },
  );

  useEffect(() => {
    if (!postsResponse) return;

    const incomingPosts = postsResponse.data ?? [];

    setPosts((prev) => {
      if (!cursor) return incomingPosts;

      const existingIds = new Set(prev.map((p) => p.id));
      return [...prev, ...incomingPosts.filter((p) => !existingIds.has(p.id))];
    });
  }, [postsResponse, cursor]);

  const totalPostCount = community?.postCount ?? posts.length;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCursor(undefined);
    setPosts([]);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setCursor(undefined);
    setPosts([]);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (postsLoading || postsFetching) return;
    if (!postsResponse?.meta?.hasMore || !postsResponse?.meta?.nextCursor) return;
    if (cursor === postsResponse.meta.nextCursor) return;

    setCursor(postsResponse.meta.nextCursor ?? undefined);
  }, [postsLoading, postsFetching, postsResponse?.meta, cursor]);

  const handleOpenPostDetail = useCallback(
    (post: CommunityPost) => {
      router.push({
        pathname: "/user/moderator-panel/post-detail",
        params: {
          slug: slug ?? "",
          postId: post.id,
          postData: encodeURIComponent(JSON.stringify(post)),
        },
      });
    },
    [slug],
  );

  if (isPending || communityLoading || accessLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session?.user) return <Redirect href="/(auth)" />;

  if (communityError || !community) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Header colors={colors} />

        <View style={styles.center}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons name="globe-outline" size={28} color={colors.muted} />
          </View>

          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Community not found
          </Text>

          <Text style={[styles.emptyText, { color: colors.muted }]}>
            This community could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canOpenScreen || !canManagePosts) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Header colors={colors} />

        <View style={styles.center}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={28}
              color={colors.accent}
            />
          </View>

          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No permission
          </Text>

          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Only the owner or moderators with post-management permission can
            manage community posts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const showInitialLoading =
    (postsLoading || postsFetching) && posts.length === 0;

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Header colors={colors} />

        <View style={styles.kpiRow}>
          <KpiCard
            label="Total Posts"
            value={formatCount(totalPostCount)}
            icon="document-text-outline"
            colors={colors}
          />
        </View>

        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: isSearchActive ? colors.accent : colors.border,
              },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.accent} />

            <TextInput
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search posts, author or tag…"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, { color: colors.foreground }]}
            />

            {isSearchActive ? (
              <Pressable
                onPress={handleClearSearch}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.clearButton,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="close" size={15} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {isSearchActive ? (
            <View style={styles.searchMetaRow}>
              <Text style={[styles.searchMetaText, { color: colors.muted }]}>
                Searching backend for:{" "}
                <Text style={{ color: colors.accent }}>{search.trim()}</Text>
              </Text>

              {postsFetching ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Community Posts
            </Text>

            <Text style={[styles.sectionSub, { color: colors.muted }]}>
              {isSearchActive
                ? "Search results from backend"
                : "Tap a card to view full post"}
            </Text>
          </View>

          <Text style={[styles.sectionCount, { color: colors.muted }]}>
            {posts.length} shown
          </Text>
        </View>

        {showInitialLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : posts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={36}
              color={colors.accent}
            />

            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, marginTop: 12 },
              ]}
            >
              No posts found
            </Text>

            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {isSearchActive
                ? "No posts match your search."
                : "No posts in this community yet."}
            </Text>
          </View>
        ) : (
          <View style={styles.postGrid}>
            {posts.map((post) => (
              <PostGridCard
                key={post.id}
                post={post}
                colors={colors}
                onPress={() => handleOpenPostDetail(post)}
              />
            ))}

            {postsResponse?.meta?.hasMore ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={postsFetching}
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed || postsFetching ? 0.7 : 1,
                  },
                ]}
              >
                {postsFetching ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Ionicons
                      name="arrow-down-outline"
                      size={15}
                      color={colors.accent}
                    />
                    <Text
                      style={[styles.loadMoreText, { color: colors.accent }]}
                    >
                      Load more
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  colors,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.backBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Post Moderation
        </Text>

        <Text style={[styles.headerSub, { color: colors.muted }]}>
          Community moderation
        </Text>
      </View>
    </View>
  );
}

function KpiCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View
      style={[
        styles.kpiCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.kpiIconWrap, { backgroundColor: colors.surfaceSecondary }]}
      >
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <View>
        <Text style={[styles.kpiValue, { color: colors.foreground }]}>
          {value}
        </Text>

        <Text style={[styles.kpiLabel, { color: colors.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

function PostGridCard({
  post,
  colors,
  onPress,
}: {
  post: CommunityPost;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onPress: () => void;
}) {
  const typedPost = post as any;

  const authorName = getAuthorName(typedPost.author);
  const authorAvatar = toAbsoluteFileUrl(typedPost.author?.image);
  const title = typedPost.title ?? null;
  const content = stripHtml(typedPost.content);
  const tag = typedPost.tag ?? typedPost.type ?? "POST";
  const createdAt = typedPost.createdAt ?? typedPost.publishedAt ?? null;

  const firstMediaUrl = getFirstMediaUrl(
    Array.isArray(typedPost.media) ? typedPost.media : [],
  );

  const previewText = title || content || "No content";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.postCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[styles.cardThumb, { backgroundColor: colors.surfaceSecondary }]}
      >
        {firstMediaUrl ? (
          <Image
            source={{ uri: firstMediaUrl }}
            style={styles.cardThumbImg}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name="document-text-outline"
            size={24}
            color={colors.accent}
          />
        )}

        <View
          style={[
            styles.tagPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.tagText, { color: colors.accent }]}
          >
            {String(tag).toLowerCase()}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={[styles.cardTitle, { color: colors.foreground }]}
      >
        {previewText}
      </Text>

      <View style={styles.cardAuthorRow}>
        <View
          style={[
            styles.cardAvatar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {authorAvatar ? (
            <Image
              source={{ uri: authorAvatar }}
              style={styles.cardAvatarImg}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person-outline" size={11} color={colors.accent} />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={[styles.cardAuthorName, { color: colors.foreground }]}
          >
            {authorName}
          </Text>

          <Text numberOfLines={1} style={[styles.cardDate, { color: colors.muted }]}>
            {formatDate(createdAt)}
          </Text>
        </View>
      </View>

      <View style={[styles.viewRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.viewText, { color: colors.accent }]}>
          View details
        </Text>

        <Ionicons name="chevron-forward" size={13} color={colors.accent} />
      </View>
    </Pressable>
  );
}

function getAuthorName(author?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
}) {
  if (!author) return "Unknown";

  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown";
}

function stripHtml(value?: string | null) {
  if (!value) return "";

  return String(value)
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getFirstMediaUrl(media: any[]) {
  const first = media[0];

  if (!first) return null;
  if (first.url) return toAbsoluteFileUrl(first.url);
  if (first.fileUrl) return toAbsoluteFileUrl(first.fileUrl);

  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;

  return String(n);
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    marginBottom: 16,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.3,
  },

  headerSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 1,
  },

  kpiRow: {
    marginBottom: 14,
  },

  kpiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 14,
  },

  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  kpiValue: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.4,
    lineHeight: 28,
  },

  kpiLabel: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },

  searchSection: {
    marginBottom: 14,
  },

  searchBar: {
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
  },

  clearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  searchMetaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  searchMetaText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.2,
  },

  sectionSub: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },

  sectionCount: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  postGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  postCard: {
    width: "48.5%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    padding: 10,
    minHeight: 230,
  },

  cardThumb: {
    width: "100%",
    height: 88,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },

  cardThumbImg: {
    width: "100%",
    height: "100%",
  },

  tagPill: {
    position: "absolute",
    left: 6,
    bottom: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: "80%",
  },

  tagText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.2,
  },

  cardTitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
    minHeight: 36,
    letterSpacing: -0.1,
  },

  cardAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },

  cardAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  cardAvatarImg: {
    width: "100%",
    height: "100%",
  },

  cardAuthorName: {
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold",
  },

  cardDate: {
    fontSize: 9.5,
    fontFamily: "Poppins_400Regular",
    marginTop: 1,
  },

  viewRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },

  viewText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.1,
  },

  loadMoreBtn: {
    width: "100%",
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 4,
  },

  loadMoreText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  loadingBox: {
    paddingVertical: 32,
    alignItems: "center",
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 6,
  },

  emptyTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    letterSpacing: -0.2,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});