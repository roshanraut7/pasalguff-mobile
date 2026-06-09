import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  const {
    data: postsResponse,
    isLoading: postsLoading,
    isFetching: postsFetching,
  } = useGetCommunityPostsQuery(
    {
      communityId: community?.id ?? "",
      limit: 10,
      cursor,
      sortBy: "newest",
    },
    {
      skip: !community?.id || !canManagePosts,
      refetchOnMountOrArgChange: true,
    },
  );

  useEffect(() => {
    setCursor(undefined);
    setPosts([]);
    setSearch("");
  }, [community?.id]);

  useEffect(() => {
    if (!postsResponse) {
      return;
    }

    const incomingPosts = postsResponse.data ?? [];

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
  }, [postsResponse, cursor]);

  const filteredPosts = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return posts;
    }

    return posts.filter((post: any) => {
      const title = String(post.title ?? "").toLowerCase();
      const content = stripHtml(post.content).toLowerCase();
      const authorName = String(post.author?.name ?? "").toLowerCase();
      const tag = String(post.tag ?? "").toLowerCase();

      return (
        title.includes(searchText) ||
        content.includes(searchText) ||
        authorName.includes(searchText) ||
        tag.includes(searchText)
      );
    });
  }, [posts, search]);

  const totalPostCount = community?.postCount ?? posts.length;

  const handleLoadMore = useCallback(() => {
    if (postsLoading || postsFetching) {
      return;
    }

    if (!postsResponse?.meta?.hasMore || !postsResponse?.meta?.nextCursor) {
      return;
    }

    if (cursor === postsResponse.meta.nextCursor) {
      return;
    }

    setCursor(postsResponse.meta.nextCursor ?? undefined);
  }, [
    postsLoading,
    postsFetching,
    postsResponse?.meta?.hasMore,
    postsResponse?.meta?.nextCursor,
    cursor,
  ]);

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

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  if (communityError || !community) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Header title="Post Moderation" colors={colors} />

        <View style={styles.center}>
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
        <Header title="Post Moderation" colors={colors} />

        <View style={styles.center}>
          <Ionicons
            name="lock-closed-outline"
            size={44}
            color={colors.accent}
          />

          <Text
            style={[
              styles.emptyTitle,
              {
                marginTop: 14,
                color: colors.foreground,
              },
            ]}
          >
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

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header title="Post Moderation" colors={colors} />

        <View style={styles.kpiRow}>
          <SmallKpi
            label="Total Posts"
            value={totalPostCount}
            icon="document-text-outline"
            colors={colors}
          />

          <SmallKpi
            label="Loaded"
            value={posts.length}
            icon="cloud-download-outline"
            colors={colors}
          />
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.muted} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search posts, author or tag..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
          />

          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Community Posts
            </Text>

            <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
              Tap a card to view full post
            </Text>
          </View>

          <Text style={[styles.sectionCount, { color: colors.muted }]}>
            {filteredPosts.length} shown
          </Text>
        </View>

        {postsLoading && posts.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : filteredPosts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={38}
              color={colors.accent}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  marginTop: 12,
                  color: colors.foreground,
                },
              ]}
            >
              No posts found
            </Text>

            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No posts match your current search.
            </Text>
          </View>
        ) : (
          <View style={styles.postGrid}>
            {filteredPosts.map((post) => (
              <SmallPostGridCard
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
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {postsFetching ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text
                    style={[styles.loadMoreText, { color: colors.accent }]}
                  >
                    Load more
                  </Text>
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
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={[
          styles.backButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {title}
        </Text>

        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          Community moderation
        </Text>
      </View>
    </View>
  );
}

function SmallKpi({
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
        styles.smallKpi,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.smallKpiIcon,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons name={icon} size={17} color={colors.accent} />
      </View>

      <View>
        <Text style={[styles.smallKpiValue, { color: colors.foreground }]}>
          {value}
        </Text>

        <Text style={[styles.smallKpiLabel, { color: colors.muted }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function SmallPostGridCard({
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

  const previewText = title || content || "No post content";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridPostCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.gridImageWrap}>
        {firstMediaUrl ? (
          <Image
            source={{ uri: firstMediaUrl }}
            style={styles.gridImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.gridImagePlaceholder,
              {
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={26}
              color={colors.accent}
            />
          </View>
        )}

        <View
          style={[
            styles.gridTagBadge,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.gridTagText,
              {
                color: colors.accent,
              },
            ]}
          >
            {String(tag).toLowerCase()}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.gridPostTitle,
          {
            color: colors.foreground,
          },
        ]}
      >
        {previewText}
      </Text>

      <View style={styles.gridAuthorRow}>
        <View
          style={[
            styles.gridAvatar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {authorAvatar ? (
            <Image
              source={{ uri: authorAvatar }}
              style={styles.gridAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person-outline" size={12} color={colors.accent} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[
              styles.gridAuthorName,
              {
                color: colors.foreground,
              },
            ]}
          >
            {authorName}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.gridPostDate,
              {
                color: colors.muted,
              },
            ]}
          >
            {formatDate(createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.viewRow}>
        <Text style={[styles.viewText, { color: colors.accent }]}>
          View details
        </Text>

        <Ionicons name="chevron-forward" size={14} color={colors.accent} />
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
  if (!author) {
    return "Unknown";
  }

  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown";
}

function stripHtml(value?: string | null) {
  if (!value) {
    return "";
  }

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

  if (!first) {
    return null;
  }

  if (first.url) {
    return toAbsoluteFileUrl(first.url);
  }

  if (first.fileUrl) {
    return toAbsoluteFileUrl(first.fileUrl);
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },

  smallKpi: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  smallKpiIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  smallKpiValue: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  smallKpiLabel: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  searchBox: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  sectionCount: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },

  loadingBox: {
    paddingVertical: 30,
  },

  postGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  gridPostCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 22,
    padding: 10,
    minHeight: 238,
  },

  gridImageWrap: {
    width: "100%",
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    marginBottom: 10,
  },

  gridImage: {
    width: "100%",
    height: "100%",
  },

  gridImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  gridTagBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    maxWidth: "85%",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  gridTagText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
  },

  gridPostTitle: {
    minHeight: 38,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
  },

  gridAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },

  gridAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  gridAvatarImage: {
    width: "100%",
    height: "100%",
  },

  gridAuthorName: {
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold",
  },

  gridPostDate: {
    marginTop: 1,
    fontSize: 9.5,
    fontFamily: "Poppins_400Regular",
  },

  viewRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  loadMoreButton: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  loadMoreText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
});