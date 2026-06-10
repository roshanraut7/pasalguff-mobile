import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import RenderHTML, { defaultSystemFonts } from "react-native-render-html";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
} from "@/store/api/communityApi";

import { useDeletePostMutation } from "@/store/api/postApi";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import YouTubeEmbedPlayer from "@/components/post/YouTubeEmbedPlayer";

import type { CommunityPost, PostMedia } from "@/types/post";

const systemFonts = [
  ...defaultSystemFonts,
  "Poppins_400Regular",
  "Poppins_500Medium",
  "Poppins_600SemiBold",
  "Poppins_700Bold",
  "Poppins_400Italic",
];

export default function PostModerationDetailScreen() {
  const { slug, postData } = useLocalSearchParams<{
    slug: string;
    postId: string;
    postData?: string;
  }>();

  const { width } = useWindowDimensions();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [deleting, setDeleting] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const post = useMemo(() => parsePostData(postData), [postData]);

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

  const [deletePost] = useDeletePostMutation();

  const isOwner =
    access?.role === "ADMIN" ||
    community?.myRole === "ADMIN" ||
    community?.isOwner === true;

  const isModerator =
    access?.role === "MODERATOR" || community?.myRole === "MODERATOR";

  const canManagePosts =
    isOwner || Boolean(access?.permissions?.canManagePosts);

  const canManageComments =
    isOwner || Boolean(access?.permissions?.canManageComments);

  const canOpenScreen = isOwner || isModerator;

  const handleOpenLink = useCallback(async (url?: string | null) => {
    if (!url) return;
    const finalUrl =
      /^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)
        ? url
        : `https://${url}`;
    try {
      await Linking.openURL(finalUrl);
    } catch (error) {
      console.log("Could not open link:", error);
    }
  }, []);

  const handleDeletePost = useCallback(() => {
    if (!community?.id || !post?.id) return;

    Alert.alert(
      "Delete post",
      "Are you sure you want to permanently delete this post from the community?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deletePost({
                communityId: community.id,
                postId: post.id,
              }).unwrap();
              Alert.alert("Success", "Post deleted successfully.");
              router.back();
            } catch (error: any) {
              Alert.alert(
                "Could not delete post",
                error?.data?.message ??
                  "Something went wrong while deleting this post.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [community?.id, deletePost, post?.id]);

  const handleManageComments = useCallback(() => {
    if (!post?.id) return;
    const typedPost = post as any;
    const postTitle =
      typedPost.title ||
      htmlToPlainText(typedPost.content).slice(0, 60) ||
      "Post Comments";
    router.push({
      pathname: "/user/moderator-panel/comments",
      params: { slug: slug ?? "", postId: post.id, postTitle },
    });
  }, [post, slug]);

  const handleOpenAuthor = useCallback(() => {
    const authorId = (post as any)?.author?.id;
    if (!authorId || !community?.id || authorId === session?.user?.id) return;
    router.push({
      pathname: "/user/profile/[userId]",
      params: { userId: authorId, sourceCommunityId: community.id },
    });
  }, [community?.id, post, session?.user?.id]);

  if (isPending || communityLoading || accessLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session?.user) return <Redirect href="/(auth)" />;

  if (communityError || !community || !post) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Header colors={colors} />
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="document-outline" size={28} color={colors.muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Post not found
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            This post could not be loaded.
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
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No permission
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Only owners or moderators with post-management permission can view
            this page.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const typedPost = post as any;
  const author = typedPost.author;
  const authorName = getAuthorName(author);
  const authorAvatar = toAbsoluteFileUrl(author?.image);
  const tag = getPostTagLabel(typedPost.tag ?? typedPost.type);
  const createdAt = typedPost.publishedAt ?? typedPost.createdAt ?? null;

  const media = getNormalizedImageMedia(
    Array.isArray(typedPost.media) ? typedPost.media : [],
  );

  const hasMedia = media.length > 0;
  const hasYouTubeEmbed =
    typedPost.linkType === "VIDEO" &&
    typedPost.linkProvider === "YOUTUBE" &&
    Boolean(typedPost.linkExternalId);
  const hasNormalLink =
    Boolean(typedPost.linkUrl) && !hasYouTubeEmbed && !hasMedia;

  const htmlSource = typedPost.content?.trim()
    ? { html: `<div>${typedPost.content}</div>` }
    : null;

  const contentWidth = Math.max(width - 64, 240);

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header colors={colors} />

        {/* Moderator context badge */}
      
        {/* Main card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* ── Author row ─────────────────────────────── */}
          <Pressable onPress={handleOpenAuthor} style={styles.authorRow}>
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              {authorAvatar ? (
                <ExpoImage
                  source={{ uri: authorAvatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={180}
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={[styles.avatarInitial, { color: colors.accent }]}>
                  {getInitials(authorName)}
                </Text>
              )}
            </View>

            <View style={styles.authorMeta}>
              <Text
                numberOfLines={1}
                style={[styles.authorName, { color: colors.foreground }]}
              >
                {authorName}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.postDate, { color: colors.muted }]}
              >
                {formatDate(createdAt)}
              </Text>
            </View>

            {tag ? (
              <View
                style={[
                  styles.tagPill,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.tagText, { color: colors.accent }]}
                >
                  {tag}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <View style={[styles.innerDivider, { backgroundColor: colors.border }]} />

          {/* ── Post content ───────────────────────────── */}
          <View style={styles.contentSection}>
            {typedPost.title ? (
              <Text style={[styles.postTitle, { color: colors.foreground }]}>
                {typedPost.title}
              </Text>
            ) : null}

            {htmlSource ? (
              <RenderHTML
                contentWidth={contentWidth}
                source={htmlSource}
                systemFonts={systemFonts}
                ignoredDomTags={["label"]}
                baseStyle={{
                  color: colors.foreground,
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: "Poppins_400Regular",
                }}
                tagsStyles={{
                  p: {
                    color: colors.foreground,
                    fontSize: 14,
                    lineHeight: 22,
                    marginTop: 0,
                    marginBottom: 8,
                    fontFamily: "Poppins_400Regular",
                  },
                  strong: {
                    color: colors.foreground,
                    fontFamily: "Poppins_700Bold",
                    fontWeight: "700",
                  },
                  b: {
                    color: colors.foreground,
                    fontFamily: "Poppins_700Bold",
                    fontWeight: "700",
                  },
                  em: {
                    color: colors.foreground,
                    fontFamily: "Poppins_400Italic",
                    fontStyle: "italic",
                  },
                  a: {
                    color: colors.link,
                    textDecorationLine: "underline",
                  },
                  li: {
                    color: colors.foreground,
                    fontSize: 14,
                    lineHeight: 22,
                    marginBottom: 4,
                    fontFamily: "Poppins_400Regular",
                  },
                }}
                renderersProps={{
                  a: { onPress: (_event, href) => handleOpenLink(href) },
                }}
              />
            ) : (
              <Text style={[styles.noContent, { color: colors.muted }]}>
                No written content.
              </Text>
            )}
          </View>

          {/* ── YouTube embed ──────────────────────────── */}
          {hasYouTubeEmbed ? (
            <View style={styles.mediaSection}>
              <YouTubeEmbedPlayer
                videoId={typedPost.linkExternalId}
                thumbnailUrl={typedPost.linkThumbnailUrl}
                title={typedPost.linkTitle ?? typedPost.title ?? "YouTube video"}
                sourceUrl={typedPost.linkUrl}
                playbackDisabled={false}
              />
            </View>
          ) : null}

          {/* ── Link card ──────────────────────────────── */}
          {hasNormalLink ? (
            <Pressable
              onPress={() => handleOpenLink(typedPost.linkUrl)}
              style={[
                styles.linkCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.linkIconWrap,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="link-outline" size={17} color={colors.link} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={[styles.linkTitle, { color: colors.foreground }]}
                >
                  {typedPost.linkTitle?.trim() || "Shared link"}
                </Text>
                {typedPost.linkDescription?.trim() ? (
                  <Text
                    numberOfLines={2}
                    style={[styles.linkDesc, { color: colors.muted }]}
                  >
                    {typedPost.linkDescription}
                  </Text>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[styles.linkUrl, { color: colors.link }]}
                >
                  {typedPost.linkUrl}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={15}
                color={colors.muted}
                style={{ alignSelf: "center" }}
              />
            </Pressable>
          ) : null}

          {/* ── Media grid ────────────────────────────── */}
          {hasMedia ? (
            <View style={styles.mediaSection}>
              <MediaGrid
                media={media}
                onPressItem={(index) => {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }}
              />
              <Text style={[styles.mediaHint, { color: colors.muted }]}>
                Tap image to view full screen
              </Text>
            </View>
          ) : null}

          <View style={[styles.innerDivider, { backgroundColor: colors.border }]} />

          {/* ── Stats row ─────────────────────────────── */}
          <View style={styles.statsRow}>
            <StatCard
              label="Likes"
              value={typedPost.likeCount ?? 0}
              icon="thumbs-up-outline"
              colors={colors}
            />
            <StatCard
              label="Dislikes"
              value={typedPost.dislikeCount ?? 0}
              icon="thumbs-down-outline"
              colors={colors}
            />
            <StatCard
              label="Comment"
              value={typedPost.commentCount ?? 0}
              icon="chatbubble-outline"
              colors={colors}
            />
            <StatCard
              label="Shares"
              value={typedPost.shareCount ?? 0}
              icon="share-social-outline"
              colors={colors}
            />
          </View>

          <View style={[styles.innerDivider, { backgroundColor: colors.border }]} />

          {/* ── Actions ───────────────────────────────── */}
          <View style={styles.actionRow}>
            {canManageComments ? (
              <Pressable
                onPress={handleManageComments}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={colors.accent}
                />
                <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                  Comments
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleDeletePost}
              disabled={deleting}
              style={[
                styles.actionBtn,
                styles.deleteBtn,
                {
                  backgroundColor: colors.danger,
                  borderColor: colors.danger,
                  opacity: deleting ? 0.65 : 1,
                },
              ]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.dangerForeground} />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.dangerForeground}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: colors.dangerForeground },
                    ]}
                  >
                    Delete Post
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <PostMediaViewer
        visible={viewerOpen}
        media={media}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Header({
  colors,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={[
          styles.backBtn,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Post Detail
        </Text>
        <Text style={[styles.headerSub, { color: colors.muted }]}>
          Full moderation review
        </Text>
      </View>
    </View>
  );
}

function MediaGrid({
  media,
  onPressItem,
}: {
  media: PostMedia[];
  onPressItem: (index: number) => void;
}) {
  const count = media.length;

  // single
  if (count === 1) {
    return (
      <Pressable
        onPress={() => onPressItem(0)}
        style={styles.mediaSingle}
      >
        <ExpoImage
          source={{ uri: media[0].url }}
          style={styles.mediaSingleImg}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      </Pressable>
    );
  }

  // 2 side-by-side
  if (count === 2) {
    return (
      <View style={styles.mediaRow}>
        {media.map((item, idx) => (
          <Pressable
            key={item.id ?? `${item.url}-${idx}`}
            onPress={() => onPressItem(idx)}
            style={styles.mediaHalf}
          >
            <ExpoImage
              source={{ uri: item.url }}
              style={styles.mediaTileImg}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />
          </Pressable>
        ))}
      </View>
    );
  }

  // 3+ — 1 large hero + small strip
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => onPressItem(0)} style={styles.mediaHero}>
        <ExpoImage
          source={{ uri: media[0].url }}
          style={styles.mediaTileImg}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      </Pressable>
      <View style={styles.mediaRow}>
        {media.slice(1, 4).map((item, idx) => {
          const realIndex = idx + 1;
          const isLast = realIndex === 3 && count > 4;
          return (
            <Pressable
              key={item.id ?? `${item.url}-${realIndex}`}
              onPress={() => onPressItem(realIndex)}
              style={styles.mediaThird}
            >
              <ExpoImage
                source={{ uri: item.url }}
                style={styles.mediaTileImg}
                contentFit="cover"
                transition={180}
                cachePolicy="memory-disk"
              />
              {isLast ? (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{count - 4}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.surfaceSecondary },
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={[styles.statVal, { color: colors.foreground }]}>
        {formatCount(value)}
      </Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parsePostData(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as CommunityPost;
  } catch {
    try {
      return JSON.parse(raw) as CommunityPost;
    } catch {
      return null;
    }
  }
}

function getAuthorName(author?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
}) {
  if (!author) return "Unknown user";
  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return author.name || fullName || author.businessName || "Unknown user";
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0]?.charAt(0)?.toUpperCase() || "U";
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function htmlToPlainText(html?: string | null) {
  if (!html) return "";
  return String(html)
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getPostTagLabel(tag?: string | null) {
  if (!tag) return null;
  return String(tag)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getNormalizedImageMedia(media: any[]): PostMedia[] {
  return [...media]
    .filter((item) => item?.type === "IMAGE" && Boolean(item?.url))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({
      ...item,
      url: toAbsoluteFileUrl(item.url) ?? item.url,
    }));
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

/** Compact number formatting: 1200 → 1.2k */
function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

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

  // ── Header ──────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    marginBottom: 14,
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

  // ── Mod badge ───────────────────────────────────
  modBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },

  modDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  modBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    flex: 1,
  },

  // ── Card shell ──────────────────────────────────
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 26,
    overflow: "hidden",
  },

  innerDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  // ── Author ──────────────────────────────────────
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },

  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  avatarImage: { width: "100%", height: "100%" },

  avatarInitial: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  authorMeta: { flex: 1, minWidth: 0 },

  authorName: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.1,
  },

  postDate: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },

  tagPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  tagText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.2,
  },

  // ── Content ─────────────────────────────────────
  contentSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  postTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
    letterSpacing: -0.3,
  },

  noContent: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  // ── Media ───────────────────────────────────────
  mediaSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  mediaSingle: {
    borderRadius: 18,
    overflow: "hidden",
    height: 220,
  },

  mediaSingleImg: {
    width: "100%",
    height: "100%",
  },

  mediaRow: {
    flexDirection: "row",
    gap: 6,
  },

  mediaHalf: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
  },

  mediaHero: {
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
  },

  mediaThird: {
    flex: 1,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },

  mediaTileImg: {
    width: "100%",
    height: "100%",
  },

  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },

  moreText: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },

  mediaHint: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  // ── Link card ───────────────────────────────────
  linkCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  linkTitle: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    lineHeight: 19,
  },

  linkDesc: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 17,
    marginTop: 2,
  },

  linkUrl: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    marginTop: 4,
  },

  // ── Stats ───────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
  },

  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },

  statVal: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.3,
  },

  statLabel: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // ── Actions ─────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },

  actionBtn: {
    flex: 1,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  deleteBtn: {
    // accent styles applied via inline props
  },

  actionBtnText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.1,
  },

  // ── Empty states ─────────────────────────────────
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
    marginTop: 4,
  },
});