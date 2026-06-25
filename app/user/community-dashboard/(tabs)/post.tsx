import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useGetCommunityAccessQuery } from "@/store/api/communityApi";
import { useGetCommunityPostsQuery } from "@/store/api/postApi";
import type { CommunityPost } from "@/types/post";

type PostTypeFilter = "" | "TEXT" | "MEDIA" | "LINK" | "POLL";

const PAGE_SIZE = 12;

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function CommunityDashboardPostsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const searchInputRef = useRef<TextInput | null>(null);

  const localParams = useLocalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const globalParams = useGlobalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const communityId =
    getParamValue(localParams.communityId) ||
    getParamValue(globalParams.communityId) ||
    getParamValue(localParams.id) ||
    getParamValue(globalParams.id);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [typeFilter, setTypeFilter] = useState<PostTypeFilter>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: access,
    isLoading: accessLoading,
  } = useGetCommunityAccessQuery(communityId, {
    skip: !communityId,
    refetchOnMountOrArgChange: true,
  });

  const canManagePosts =
    access?.role === "ADMIN" ||
    access?.role === "MODERATOR" ||
    Boolean(access?.permissions?.canManagePosts);

  const {
    data: postsResponse,
    isLoading: postsLoading,
    isFetching: postsFetching,
    error,
    refetch,
  } = useGetCommunityPostsQuery(
    {
      communityId,
      limit: PAGE_SIZE,
      cursor,
      search: debouncedSearch || undefined,
      type: typeFilter || undefined,
      sortBy: "newest",
    },
    {
      skip: !communityId || !canManagePosts,
      refetchOnMountOrArgChange: true,
    },
  );

  const isSearchActive = Boolean(search.trim());
  const showInitialLoading =
    accessLoading || ((postsLoading || postsFetching) && posts.length === 0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextSearch = search.trim().length >= 2 ? search.trim() : "";
      setDebouncedSearch((prev) => (prev === nextSearch ? prev : nextSearch));
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setCursor(undefined);
    setPosts([]);
  }, [communityId, debouncedSearch, typeFilter]);

  useEffect(() => {
    if (!postsResponse) return;

    const incomingPosts = postsResponse.data ?? [];

    setPosts((previousPosts) => {
      if (!cursor) return incomingPosts;

      const existingIds = new Set(previousPosts.map((post) => post.id));

      return [
        ...previousPosts,
        ...incomingPosts.filter((post) => !existingIds.has(post.id)),
      ];
    });
  }, [postsResponse, cursor]);

  const totalPostCount = postsResponse?.data?.length
    ? posts.length
    : posts.length;

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
    searchInputRef.current?.focus();
  }, []);

  const handleTypeFilterChange = useCallback((nextType: PostTypeFilter) => {
    setTypeFilter((currentType) => (currentType === nextType ? "" : nextType));
    setCursor(undefined);
    setPosts([]);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (postsLoading || postsFetching) return;
    if (!postsResponse?.meta?.hasMore) return;
    if (!postsResponse?.meta?.nextCursor) return;
    if (cursor === postsResponse.meta.nextCursor) return;

    setCursor(postsResponse.meta.nextCursor ?? undefined);
  }, [
    postsLoading,
    postsFetching,
    postsResponse?.meta?.hasMore,
    postsResponse?.meta?.nextCursor,
    cursor,
  ]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(undefined);
    setPosts([]);

    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleOpenPostDetail = useCallback(
    (post: CommunityPost) => {
      router.push({
        pathname: "/pages/dashboard-post-detail",
        params: {
          communityId,
          postId: post.id,
          postData: encodeURIComponent(JSON.stringify(post)),
        },
      });
    },
    [communityId],
  );

  if (!communityId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={34} color={colors.warning} />

          <Text style={styles.emptyTitle}>Community ID missing</Text>

          <Text style={styles.emptyText}>
            Open this screen with communityId in the route params.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!accessLoading && !canManagePosts) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Header title="Community Posts" subtitle="Dashboard moderation" />

        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={38} color={colors.accent} />

          <Text style={styles.emptyTitle}>No permission</Text>

          <Text style={styles.emptyText}>
            Only admins or moderators with post-management permission can manage
            community posts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <PostGridCard
            post={item}
            onPress={() => handleOpenPostDetail(item)}
          />
        )}
        ListHeaderComponent={
          <View>
            <Header
              title="Community Posts"
              subtitle={`${totalPostCount} loaded posts`}
            />

            <View style={styles.searchSection}>
              <View
                style={[
                  styles.searchBar,
                  {
                    borderColor: isSearchActive ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons name="search-outline" size={18} color={colors.accent} />

                <TextInput
                  ref={searchInputRef}
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Search posts, author or tag…"
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  style={styles.searchInput}
                />

                {isSearchActive ? (
                  <Pressable
                    onPress={handleClearSearch}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons name="close" size={15} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>

              {isSearchActive ? (
                <View style={styles.searchMetaRow}>
                  <Text style={styles.searchMetaText}>
                    Searching backend for{" "}
                    <Text style={styles.searchMetaAccent}>{search.trim()}</Text>
                  </Text>

                  {postsFetching ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.filterRow}>
              <TypeChip
                label="All"
                active={typeFilter === ""}
                onPress={() => handleTypeFilterChange("")}
              />

              <TypeChip
                label="Text"
                active={typeFilter === "TEXT"}
                onPress={() => handleTypeFilterChange("TEXT")}
              />

              <TypeChip
                label="Media"
                active={typeFilter === "MEDIA"}
                onPress={() => handleTypeFilterChange("MEDIA")}
              />

              <TypeChip
                label="Link"
                active={typeFilter === "LINK"}
                onPress={() => handleTypeFilterChange("LINK")}
              />

              <TypeChip
                label="Poll"
                active={typeFilter === "POLL"}
                onPress={() => handleTypeFilterChange("POLL")}
              />
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Community Posts</Text>

                <Text style={styles.sectionSub}>
                  Tap a card to view media, comments, and admin actions.
                </Text>
              </View>

              <Text style={styles.sectionCount}>{posts.length} shown</Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color={colors.danger}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Failed to load posts</Text>

                  <Text style={styles.errorMessage}>
                    Please refresh and try again.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          showInitialLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                name="document-text-outline"
                size={38}
                color={colors.accent}
              />

              <Text style={[styles.emptyTitle, { marginTop: 12 }]}>
                No posts found
              </Text>

              <Text style={styles.emptyText}>
                {isSearchActive
                  ? "No posts match your search."
                  : "No posts in this community yet."}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          postsResponse?.meta?.hasMore ? (
            <Pressable
              onPress={handleLoadMore}
              disabled={postsFetching}
              style={({ pressed }) => [
                styles.loadMoreBtn,
                pressed || postsFetching ? { opacity: 0.7 } : null,
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

                  <Text style={styles.loadMoreText}>Load more</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={{ height: 24 }} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(130, insets.bottom + 120),
          },
        ]}
      />
    </SafeAreaView>
  );

  function Header({
    title,
    subtitle,
  }: {
    title: string;
    subtitle: string;
  }) {
    return (
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{title}</Text>

          <Text style={styles.headerSub}>{subtitle}</Text>
        </View>
      </View>
    );
  }

  function TypeChip({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.typeChip,
          active && styles.typeChipActive,
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text
          style={[
            styles.typeChipText,
            active && { color: colors.accent },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function PostGridCard({
    post,
    onPress,
  }: {
    post: CommunityPost;
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

    const hasYouTube =
      typedPost.linkType === "VIDEO" &&
      typedPost.linkProvider === "YOUTUBE" &&
      Boolean(typedPost.linkThumbnailUrl);

    const previewImage = firstMediaUrl || typedPost.linkThumbnailUrl || null;
    const previewText = title || content || typedPost.linkTitle || "No content";

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.postCard,
          pressed && { opacity: 0.78 },
        ]}
      >
        <View style={styles.cardThumb}>
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={styles.cardThumbImg}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name={
                typedPost.type === "LINK"
                  ? "link-outline"
                  : typedPost.type === "MEDIA"
                    ? "image-outline"
                    : "document-text-outline"
              }
              size={26}
              color={colors.accent}
            />
          )}

          {hasYouTube ? (
            <View style={styles.playBadge}>
              <Ionicons name="play" size={16} color="#fff" />
            </View>
          ) : null}

          <View style={styles.tagPill}>
            <Text numberOfLines={1} style={styles.tagText}>
              {String(tag).toLowerCase()}
            </Text>
          </View>
        </View>

        <Text numberOfLines={2} style={styles.cardTitle}>
          {previewText}
        </Text>

        <View style={styles.cardAuthorRow}>
          <View style={styles.cardAvatar}>
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
            <Text numberOfLines={1} style={styles.cardAuthorName}>
              {authorName}
            </Text>

            <Text numberOfLines={1} style={styles.cardDate}>
              {formatDate(createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.cardStatsRow}>
          <SmallStat
            icon="thumbs-up-outline"
            value={typedPost.likeCount ?? 0}
          />

          <SmallStat
            icon="chatbubble-outline"
            value={typedPost.commentCount ?? 0}
          />
        </View>

        <View style={styles.viewRow}>
          <Text style={styles.viewText}>View details</Text>

          <Ionicons name="chevron-forward" size={13} color={colors.accent} />
        </View>
      </Pressable>
    );
  }

  function SmallStat({
    icon,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    value: number;
  }) {
    return (
      <View style={styles.smallStat}>
        <Ionicons name={icon} size={13} color={colors.muted} />
        <Text style={styles.smallStatText}>{formatCount(value)}</Text>
      </View>
    );
  }
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCount(value?: number | null) {
  const safeValue = Number(value ?? 0);

  if (safeValue >= 1000000) {
    return `${(safeValue / 1000000).toFixed(1)}M`;
  }

  if (safeValue >= 1000) {
    return `${(safeValue / 1000).toFixed(1)}K`;
  }

  return String(safeValue);
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background ?? colors.surface,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 140,
    },

    header: {
      paddingTop: 12,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerTitle: {
      color: colors.foreground,
      fontSize: 22,
      fontFamily: "Poppins_700Bold",
    },

    headerSub: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },

    emptyTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      fontFamily: "Poppins_400Regular",
    },

    searchSection: {
      marginBottom: 14,
    },

    searchBar: {
      minHeight: 48,
      borderRadius: 24,
      paddingHorizontal: 14,
      borderWidth: 1,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    searchInput: {
      flex: 1,
      minWidth: 0,
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    clearButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
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
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    searchMetaAccent: {
      color: colors.accent,
      fontFamily: "Poppins_600SemiBold",
    },

    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },

    typeChip: {
      minHeight: 34,
      borderRadius: 17,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    typeChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSecondary,
    },

    typeChipText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },

    sectionHeader: {
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
    },

    sectionTitle: {
      color: colors.foreground,
      fontSize: 16,
      fontFamily: "Poppins_700Bold",
    },

    sectionSub: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    sectionCount: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    errorBox: {
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surface,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    errorMessage: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    gridRow: {
      gap: 12,
      marginBottom: 12,
    },

    postCard: {
      flex: 1,
      minHeight: 245,
      borderRadius: 22,
      padding: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    cardThumb: {
      height: 110,
      borderRadius: 18,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    cardThumbImg: {
      width: "100%",
      height: "100%",
    },

    playBadge: {
      position: "absolute",
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.55)",
    },

    tagPill: {
      position: "absolute",
      left: 8,
      bottom: 8,
      maxWidth: "78%",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    tagText: {
      color: colors.accent,
      fontSize: 10,
      fontFamily: "Poppins_600SemiBold",
    },

    cardTitle: {
      marginTop: 10,
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_700Bold",
    },

    cardAuthorRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    cardAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },

    cardAvatarImg: {
      width: "100%",
      height: "100%",
    },

    cardAuthorName: {
      color: colors.foreground,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    cardDate: {
      marginTop: 1,
      color: colors.muted,
      fontSize: 10,
      fontFamily: "Poppins_400Regular",
    },

    cardStatsRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    smallStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    smallStatText: {
      color: colors.muted,
      fontSize: 10,
      fontFamily: "Poppins_500Medium",
    },

    viewRow: {
      marginTop: "auto",
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    viewText: {
      color: colors.accent,
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    loadingBox: {
      paddingVertical: 30,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyCard: {
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    loadMoreBtn: {
      minHeight: 46,
      borderRadius: 23,
      marginTop: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },

    loadMoreText: {
      color: colors.accent,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },
  });
}