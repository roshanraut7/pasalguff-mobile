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
      /^https?:\/\//i.test(url) ||
      /^mailto:/i.test(url) ||
      /^tel:/i.test(url)
        ? url
        : `https://${url}`;

    try {
      await Linking.openURL(finalUrl);
    } catch (error) {
      console.log("Could not open link:", error);
    }
  }, []);

  const handleDeletePost = useCallback(() => {
    if (!community?.id || !post?.id) {
      return;
    }

    Alert.alert(
      "Delete post",
      "Are you sure you want to delete this post from the community?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
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
              console.log("Delete post failed:", error);

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
      params: {
        slug: slug ?? "",
        postId: post.id,
        postTitle,
      },
    });
  }, [post, slug]);

  const handleOpenAuthor = useCallback(() => {
    const authorId = (post as any)?.author?.id;

    if (!authorId || !community?.id || authorId === session?.user?.id) {
      return;
    }

    router.push({
      pathname: "/user/profile/[userId]",
      params: {
        userId: authorId,
        sourceCommunityId: community.id,
      },
    });
  }, [community?.id, post, session?.user?.id]);

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

  if (communityError || !community || !post) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Header title="Post Detail" colors={colors} />

        <View style={styles.center}>
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
        <Header title="Post Detail" colors={colors} />

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
            Only owner or moderators with post-management permission can view
            this moderation page.
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

  const contentWidth = Math.max(width - 40, 240);

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header title="Post Detail" colors={colors} />

        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable onPress={handleOpenAuthor} style={styles.authorRow}>
            <View
              style={[
                styles.avatar,
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

            <View style={{ flex: 1 }}>
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
                  styles.tagBadge,
                  {
                    backgroundColor: colors.surfaceSecondary,
                  },
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
                fontSize: 15,
                lineHeight: 24,
                fontFamily: "Poppins_400Regular",
              }}
              tagsStyles={{
                p: {
                  color: colors.foreground,
                  fontSize: 15,
                  lineHeight: 24,
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
                  fontSize: 15,
                  lineHeight: 24,
                  marginBottom: 4,
                  fontFamily: "Poppins_400Regular",
                },
              }}
              renderersProps={{
                a: {
                  onPress: (_event, href) => handleOpenLink(href),
                },
              }}
            />
          ) : (
            <Text style={[styles.noContentText, { color: colors.muted }]}>
              No written content.
            </Text>
          )}

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
                <Ionicons name="link-outline" size={18} color={colors.link} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={[styles.linkTitle, { color: colors.foreground }]}
                >
                  {typedPost.linkTitle?.trim() || "Shared link"}
                </Text>

                {typedPost.linkDescription?.trim() ? (
                  <Text
                    numberOfLines={2}
                    style={[styles.linkDescription, { color: colors.muted }]}
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
            </Pressable>
          ) : null}

          {hasMedia ? (
            <View style={styles.mediaSection}>
              <View style={styles.mediaGrid}>
                {media.slice(0, 4).map((item, index) => {
                  const isLastVisible =
                    index === 3 && media.length > 4;

                  return (
                    <Pressable
                      key={item.id ?? `${item.url}-${index}`}
                      onPress={() => {
                        setViewerIndex(index);
                        setViewerOpen(true);
                      }}
                      style={[
                        styles.mediaTile,
                        {
                          width: media.length === 1 ? "100%" : "48.5%",
                          height: media.length === 1 ? 260 : 150,
                        },
                      ]}
                    >
                      <ExpoImage
                        source={{ uri: item.url }}
                        style={styles.mediaTileImage}
                        contentFit="cover"
                        transition={180}
                        cachePolicy="memory-disk"
                      />

                      {isLastVisible ? (
                        <View style={styles.moreOverlay}>
                          <Text style={styles.moreOverlayText}>
                            +{media.length - 4}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.mediaHint, { color: colors.muted }]}>
                Tap image to view full screen
              </Text>
            </View>
          ) : null}

          <View style={styles.statsGrid}>
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
              label="Comments"
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

          <View style={styles.actionRow}>
            {canManageComments ? (
              <Pressable
                onPress={handleManageComments}
                style={[
                  styles.actionButton,
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

                <Text style={[styles.commentText, { color: colors.accent }]}>
                  Comments
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleDeletePost}
              disabled={deleting}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.danger,
                  borderColor: colors.danger,
                  opacity: deleting ? 0.7 : 1,
                },
              ]}
            >
              {deleting ? (
                <ActivityIndicator
                  size="small"
                  color={colors.dangerForeground}
                />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.dangerForeground}
                  />

                  <Text
                    style={[
                      styles.deleteText,
                      {
                        color: colors.dangerForeground,
                      },
                    ]}
                  >
                    Delete
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
          Full moderation review
        </Text>
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
        {
          backgroundColor: colors.surfaceSecondary,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.accent} />

      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>

      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

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

  if (parts.length === 1) {
    return parts[0]?.charAt(0)?.toUpperCase() || "U";
  }

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

  detailCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    overflow: "hidden",
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarInitial: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },

  authorName: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },

  postDate: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  tagBadge: {
    maxWidth: 110,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  tagText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  postTitle: {
    fontSize: 21,
    lineHeight: 30,
    fontFamily: "Poppins_700Bold",
    marginBottom: 10,
  },

  noContentText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },

  mediaSection: {
    marginTop: 14,
  },

  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  mediaTile: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },

  mediaTileImage: {
    width: "100%",
    height: "100%",
  },

  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },

  moreOverlayText: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
  },

  mediaHint: {
    marginTop: 8,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  linkCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  linkTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold",
  },

  linkDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  linkUrl: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },

  statCard: {
    width: "48%",
    borderRadius: 18,
    padding: 12,
  },

  statValue: {
    marginTop: 6,
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  statLabel: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  actionButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  commentText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  deleteText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
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
});