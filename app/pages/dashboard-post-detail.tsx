import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import RenderHTML, { defaultSystemFonts } from "react-native-render-html";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useGetCommunityAccessQuery } from "@/store/api/communityApi";
import {
  useDeleteCommentMutation,
  useDeletePostMutation,
  useGetCommunityPostQuery,
  useGetPostCommentsQuery,
  useUpdatePostMutation,
} from "@/store/api/postApi";

import PostMediaViewer from "@/components/post/PostMediaViewer";
import YouTubeEmbedPlayer from "@/components/post/YouTubeEmbedPlayer";

import type { CommunityPost, PostMedia, PostComment } from "@/types/post";

const systemFonts = [
  ...defaultSystemFonts,
  "Poppins_400Regular",
  "Poppins_500Medium",
  "Poppins_600SemiBold",
  "Poppins_700Bold",
  "Poppins_400Italic",
];

type ActionTarget =
  | {
      type: "post";
    }
  | {
      type: "comment";
      comment: PostComment;
    }
  | {
      type: "reply";
      comment: PostComment;
    };

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function CommunityDashboardPostDetailScreen() {
  const { communityId, postId, postData } = useLocalSearchParams<{
    communityId?: string | string[];
    postId?: string | string[];
    postData?: string | string[];
  }>();

  const parsedCommunityId = getParamValue(communityId);
  const parsedPostId = getParamValue(postId);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [deletingPost, setDeletingPost] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);

  const routePost = useMemo(() => parsePostData(postData), [postData]);

  const {
    data: access,
    isLoading: accessLoading,
  } = useGetCommunityAccessQuery(parsedCommunityId, {
    skip: !parsedCommunityId,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: fetchedPost,
    isLoading: postLoading,
    error: postError,
    refetch: refetchPost,
  } = useGetCommunityPostQuery(
    {
      communityId: parsedCommunityId,
      postId: parsedPostId,
    },
    {
      skip: !parsedCommunityId || !parsedPostId,
      refetchOnMountOrArgChange: true,
    },
  );

  const [deletePost] = useDeletePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const post = fetchedPost ?? routePost;
  const typedPost = post as any;

  const isOwnerOrModerator =
    access?.role === "ADMIN" || access?.role === "MODERATOR";

  const canManagePosts =
    isOwnerOrModerator || Boolean(access?.permissions?.canManagePosts);

  const canManageComments =
    isOwnerOrModerator || Boolean(access?.permissions?.canManageComments);

  const {
    data: commentsResponse,
    isLoading: commentsLoading,
    isFetching: commentsFetching,
    refetch: refetchComments,
  } = useGetPostCommentsQuery(
    {
      communityId: parsedCommunityId,
      postId: parsedPostId,
      limit: 20,
      cursor,
    },
    {
      skip: !parsedCommunityId || !parsedPostId || !canManageComments,
      refetchOnMountOrArgChange: true,
    },
  );

  const author = typedPost?.author;
  const authorName = getAuthorName(author);
  const authorAvatar = toAbsoluteFileUrl(author?.image);

  const tag = getPostTagLabel(typedPost?.tag ?? typedPost?.type);
  const createdAt = typedPost?.publishedAt ?? typedPost?.createdAt ?? null;

  const media = getNormalizedImageMedia(
    Array.isArray(typedPost?.media) ? typedPost.media : [],
  );

  const hasMedia = media.length > 0;

  const hasYouTubeEmbed =
    typedPost?.linkType === "VIDEO" &&
    typedPost?.linkProvider === "YOUTUBE" &&
    Boolean(typedPost?.linkExternalId);

  const hasNormalLink =
    Boolean(typedPost?.linkUrl) && !hasYouTubeEmbed && !hasMedia;

  const htmlSource = typedPost?.content?.trim()
    ? { html: `<div>${typedPost.content}</div>` }
    : null;

  const contentWidth = Math.max(width - 64, 240);

  const totalLoadedComments = useMemo(() => {
    return comments.reduce((total, comment: any) => {
      const replies = Array.isArray(comment.replies)
        ? comment.replies.length
        : 0;

      return total + 1 + replies;
    }, 0);
  }, [comments]);

  useEffect(() => {
    setCursor(undefined);
    setComments([]);
    setExpandedReplyIds(new Set());
    setDeletingCommentId(null);
  }, [parsedCommunityId, parsedPostId]);

  useEffect(() => {
    if (!commentsResponse) return;

    const incomingComments = commentsResponse.data ?? [];

    setComments((previousComments) => {
      if (!cursor) {
        return incomingComments;
      }

      const existingIds = new Set(
        previousComments.map((comment) => comment.id),
      );

      const newComments = incomingComments.filter(
        (comment) => !existingIds.has(comment.id),
      );

      return [...previousComments, ...newComments];
    });
  }, [commentsResponse, cursor]);

  const handleOpenLink = useCallback(async (url?: string | null) => {
    if (!url) return;

    const finalUrl =
      /^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)
        ? url
        : `https://${url}`;

    try {
      await Linking.openURL(finalUrl);
    } catch {
      Alert.alert("Could not open link", "Please try again later.");
    }
  }, []);

  const handleOpenAuthor = useCallback(() => {
    const authorId = typedPost?.author?.id;
    if (!authorId || !parsedCommunityId) return;

    router.push({
      pathname: "/user/profile/[userId]",
      params: {
        userId: authorId,
        sourceCommunityId: parsedCommunityId,
      },
    });
  }, [parsedCommunityId, typedPost?.author?.id]);

  const handleOpenCommentAuthor = useCallback(
    (userId?: string | null) => {
      if (!userId || !parsedCommunityId) return;

      router.push({
        pathname: "/user/profile/[userId]",
        params: {
          userId,
          sourceCommunityId: parsedCommunityId,
        },
      });
    },
    [parsedCommunityId],
  );

  const handleLoadMoreComments = useCallback(() => {
    if (commentsLoading || commentsFetching) return;
    if (!commentsResponse?.meta?.hasMore) return;
    if (!commentsResponse?.meta?.nextCursor) return;
    if (cursor === commentsResponse.meta.nextCursor) return;

    setCursor(commentsResponse.meta.nextCursor ?? undefined);
  }, [
    commentsLoading,
    commentsFetching,
    commentsResponse?.meta?.hasMore,
    commentsResponse?.meta?.nextCursor,
    cursor,
  ]);

  const handleToggleReplies = useCallback(
    (comment: PostComment) => {
      setExpandedReplyIds((previousIds) => {
        const nextIds = new Set(previousIds);

        if (nextIds.has(comment.id)) {
          nextIds.delete(comment.id);
        } else {
          nextIds.add(comment.id);
        }

        return nextIds;
      });

      void refetchComments();
    },
    [refetchComments],
  );

  const handleDeletePost = useCallback(() => {
    if (!parsedCommunityId || !parsedPostId) return;

    closeActionSheet();

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
              setDeletingPost(true);

              await deletePost({
                communityId: parsedCommunityId,
                postId: parsedPostId,
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
              setDeletingPost(false);
            }
          },
        },
      ],
    );
  }, [parsedCommunityId, parsedPostId, deletePost]);

  const handleUpdateStatus = useCallback(
    (nextStatus: "PUBLISHED" | "HIDDEN") => {
      if (!parsedCommunityId || !parsedPostId) return;

      closeActionSheet();

      Alert.alert(
        nextStatus === "HIDDEN" ? "Hide post" : "Restore post",
        nextStatus === "HIDDEN"
          ? "This post will be hidden from the community feed."
          : "This post will be restored to the community feed.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: nextStatus === "HIDDEN" ? "Hide" : "Restore",
            onPress: async () => {
              try {
                setUpdatingStatus(true);

                await updatePost({
                  communityId: parsedCommunityId,
                  postId: parsedPostId,
                  body: {
                    status: nextStatus,
                  } as any,
                }).unwrap();

                Alert.alert(
                  "Success",
                  nextStatus === "HIDDEN"
                    ? "Post hidden successfully."
                    : "Post restored successfully.",
                );

                await refetchPost();
              } catch (error: any) {
                Alert.alert(
                  "Action failed",
                  error?.data?.message ??
                    "Something went wrong while updating this post.",
                );
              } finally {
                setUpdatingStatus(false);
              }
            },
          },
        ],
      );
    },
    [parsedCommunityId, parsedPostId, updatePost, refetchPost],
  );

  const handleDeleteComment = useCallback(
    (comment: PostComment, type: "comment" | "reply") => {
      if (!parsedCommunityId || !parsedPostId) return;

      closeActionSheet();

      Alert.alert(
        type === "reply" ? "Delete reply" : "Delete comment",
        type === "reply"
          ? "Are you sure you want to delete this reply?"
          : "Are you sure you want to delete this comment?",
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
                setDeletingCommentId(comment.id);

                await deleteComment({
                  communityId: parsedCommunityId,
                  postId: parsedPostId,
                  commentId: comment.id,
                }).unwrap();

                setComments((previousComments) =>
                  previousComments
                    .filter((item) => item.id !== comment.id)
                    .map((item: any) => ({
                      ...item,
                      replies: Array.isArray(item.replies)
                        ? item.replies.filter(
                            (reply: PostComment) => reply.id !== comment.id,
                          )
                        : item.replies,
                    })),
                );

                await refetchComments();
                await refetchPost();

                Alert.alert(
                  "Success",
                  type === "reply"
                    ? "Reply deleted successfully."
                    : "Comment deleted successfully.",
                );
              } catch (error: any) {
                Alert.alert(
                  type === "reply"
                    ? "Could not delete reply"
                    : "Could not delete comment",
                  error?.data?.message ??
                    "Something went wrong while deleting this item.",
                );
              } finally {
                setDeletingCommentId(null);
              }
            },
          },
        ],
      );
    },
    [
      parsedCommunityId,
      parsedPostId,
      deleteComment,
      refetchComments,
      refetchPost,
    ],
  );

  function openPostActions() {
    setActionTarget({ type: "post" });
  }

  function openCommentActions(comment: PostComment) {
    setActionTarget({
      type: "comment",
      comment,
    });
  }

  function openReplyActions(comment: PostComment) {
    setActionTarget({
      type: "reply",
      comment,
    });
  }

  function closeActionSheet() {
    setActionTarget(null);
  }

  if (!parsedCommunityId || !parsedPostId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Header title="Post Detail" subtitle="Missing post details" />

        <View style={styles.center}>
          <Ionicons name="warning-outline" size={34} color={colors.warning} />

          <Text style={styles.emptyTitle}>Post details missing</Text>

          <Text style={styles.emptyText}>
            Open this screen with communityId and postId.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (accessLoading || (postLoading && !post)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (postError || !post) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Header title="Post Detail" subtitle="Full moderation review" />

        <View style={styles.center}>
          <Ionicons name="document-outline" size={34} color={colors.muted} />

          <Text style={styles.emptyTitle}>Post not found</Text>

          <Text style={styles.emptyText}>This post could not be loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canManagePosts) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Header title="Post Detail" subtitle="Full moderation review" />

        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={34} color={colors.accent} />

          <Text style={styles.emptyTitle}>No permission</Text>

          <Text style={styles.emptyText}>
            Only admins or moderators with post-management permission can view
            this page.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActionLoading = deletingPost || updatingStatus;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(120, insets.bottom + 110),
          },
        ]}
      >
        <Header title="Post Detail" subtitle="Full moderation review" />

        <View style={styles.card}>
          <Pressable onPress={handleOpenAuthor} style={styles.authorRow}>
            <View style={styles.avatarWrap}>
              {authorAvatar ? (
                <ExpoImage
                  source={{ uri: authorAvatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={180}
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {getInitials(authorName)}
                </Text>
              )}
            </View>

            <View style={styles.authorMeta}>
              <Text numberOfLines={1} style={styles.authorName}>
                {authorName}
              </Text>

              <Text numberOfLines={1} style={styles.postDate}>
                {formatDate(createdAt)}
              </Text>
            </View>

            {tag ? (
              <View style={styles.tagPill}>
                <Text numberOfLines={1} style={styles.tagText}>
                  {tag}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.innerDivider} />

          <View style={styles.contentSection}>
            {typedPost.title ? (
              <Text style={styles.postTitle}>{typedPost.title}</Text>
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
              <Text style={styles.noContent}>No written content.</Text>
            )}
          </View>

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
              style={styles.linkCard}
            >
              <View style={styles.linkIconWrap}>
                <Ionicons name="link-outline" size={17} color={colors.link} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.linkTitle}>
                  {typedPost.linkTitle?.trim() || "Shared link"}
                </Text>

                {typedPost.linkDescription?.trim() ? (
                  <Text numberOfLines={2} style={styles.linkDesc}>
                    {typedPost.linkDescription}
                  </Text>
                ) : null}

                <Text numberOfLines={1} style={styles.linkUrl}>
                  {typedPost.linkUrl}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={15} color={colors.muted} />
            </Pressable>
          ) : null}

          {hasMedia ? (
            <View style={styles.mediaSection}>
              <MediaGrid
                media={media}
                onPressItem={(index) => {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }}
              />

              <Text style={styles.mediaHint}>Tap image to view full screen</Text>
            </View>
          ) : null}

          <View style={styles.innerDivider} />

          <View style={styles.statsRow}>
            <StatCard
              label="Likes"
              value={typedPost.likeCount ?? 0}
              icon="thumbs-up-outline"
            />

            <StatCard
              label="Dislikes"
              value={typedPost.dislikeCount ?? 0}
              icon="thumbs-down-outline"
            />

            <StatCard
              label="Comments"
              value={typedPost.commentCount ?? 0}
              icon="chatbubble-outline"
            />

            <StatCard
              label="Shares"
              value={typedPost.shareCount ?? 0}
              icon="share-social-outline"
            />
          </View>
        </View>

        <View style={styles.commentSectionCard}>
          <View style={styles.commentHeaderRow}>
            <View>
              <Text style={styles.commentSectionTitle}>Comments</Text>

              <Text style={styles.commentSectionSub}>
                {totalLoadedComments} loaded
              </Text>
            </View>

            {commentsFetching ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : null}
          </View>

          {!canManageComments ? (
            <View style={styles.commentEmptyBox}>
              <Ionicons
                name="lock-closed-outline"
                size={28}
                color={colors.accent}
              />

              <Text style={styles.emptyTitle}>No comment permission</Text>

              <Text style={styles.emptyText}>
                You need comment-management permission to moderate comments.
              </Text>
            </View>
          ) : commentsLoading && comments.length === 0 ? (
            <View style={styles.commentLoadingBox}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.commentEmptyBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={32}
                color={colors.muted}
              />

              <Text style={styles.emptyTitle}>No comments yet</Text>

              <Text style={styles.emptyText}>
                This post has no comments right now.
              </Text>
            </View>
          ) : (
            <View>
              {comments.map((comment: any) => (
                <CommentItem
                  key={comment.id}
                  item={comment}
                  isRepliesExpanded={expandedReplyIds.has(comment.id)}
                  deletingCommentId={deletingCommentId}
                  onToggleReplies={handleToggleReplies}
                  onOpenCommentActions={openCommentActions}
                  onOpenReplyActions={openReplyActions}
                  onOpenProfile={handleOpenCommentAuthor}
                />
              ))}

              {commentsResponse?.meta?.hasMore ? (
                <Pressable
                  onPress={handleLoadMoreComments}
                  disabled={commentsFetching}
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    pressed || commentsFetching ? { opacity: 0.7 } : null,
                  ]}
                >
                  {commentsFetching ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more comments</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <PostMediaViewer
        visible={viewerOpen}
        media={media}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />

      <ActionSheet
        visible={Boolean(actionTarget)}
        target={actionTarget}
        postStatus={typedPost?.status}
        isActionLoading={isActionLoading}
        deletingCommentId={deletingCommentId}
        onClose={closeActionSheet}
        onHidePost={() => handleUpdateStatus("HIDDEN")}
        onRestorePost={() => handleUpdateStatus("PUBLISHED")}
        onDeletePost={handleDeletePost}
        onDeleteComment={(comment, type) => handleDeleteComment(comment, type)}
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

        {canManagePosts ? (
          <Pressable
            onPress={openPostActions}
            disabled={isActionLoading}
            style={({ pressed }) => [
              styles.moreButton,
              pressed && { opacity: 0.7 },
              isActionLoading && { opacity: 0.55 },
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.foreground}
            />
          </Pressable>
        ) : null}
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

    if (count === 1) {
      return (
        <Pressable onPress={() => onPressItem(0)} style={styles.mediaSingle}>
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

    if (count === 2) {
      return (
        <View style={styles.mediaRow}>
          {media.map((item, index) => (
            <Pressable
              key={item.id ?? `${item.url}-${index}`}
              onPress={() => onPressItem(index)}
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
          {media.slice(1, 4).map((item, index) => {
            const realIndex = index + 1;
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
  }: {
    label: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
  }) {
    return (
      <View style={styles.statCard}>
        <Ionicons name={icon} size={18} color={colors.accent} />
        <Text style={styles.statVal}>{formatCount(value)}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  function CommentAvatar({
    comment,
    size = 34,
  }: {
    comment: PostComment;
    size?: number;
  }) {
    const authorName = getCommentAuthorName(comment);
    const imageUrl = toAbsoluteFileUrl((comment as any).author?.image ?? null);

    return (
      <View style={[styles.commentAvatar, { width: size, height: size }]}>
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.commentAvatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={styles.commentAvatarInitial}>
            {getInitials(authorName)}
          </Text>
        )}
      </View>
    );
  }

  function CommentItem({
    item,
    isRepliesExpanded,
    deletingCommentId,
    onToggleReplies,
    onOpenCommentActions,
    onOpenReplyActions,
    onOpenProfile,
  }: {
    item: PostComment;
    isRepliesExpanded: boolean;
    deletingCommentId: string | null;
    onToggleReplies: (comment: PostComment) => void;
    onOpenCommentActions: (comment: PostComment) => void;
    onOpenReplyActions: (comment: PostComment) => void;
    onOpenProfile: (userId?: string | null) => void;
  }) {
    const authorName = getCommentAuthorName(item);
    const replies = ((item as any).replies ?? []) as PostComment[];
    const totalReplyCount = Math.max(
      (item as any).replyCount ?? 0,
      replies.length,
    );
    const visibleReplies = isRepliesExpanded ? replies : [];
    const likeLabel = formatCount((item as any).likeCount);

    return (
      <View style={styles.commentBlock}>
        <View style={styles.commentRow}>
          <Pressable
            onPress={() =>
              onOpenProfile((item as any).author?.id ?? (item as any).authorId)
            }
          >
            <CommentAvatar comment={item} />
          </Pressable>

          <View style={styles.commentBody}>
            <View style={styles.commentBubbleWrap}>
              <View style={styles.commentBubble}>
                <Text style={styles.commentAuthor}>{authorName}</Text>
                <Text style={styles.commentText}>
                  {(item as any).content || (item as any).body || "No comment."}
                </Text>
              </View>

              {canManageComments ? (
                <Pressable
                  onPress={() => onOpenCommentActions(item)}
                  disabled={deletingCommentId === item.id}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.commentMoreButton,
                    pressed && { opacity: 0.7 },
                    deletingCommentId === item.id && { opacity: 0.45 },
                  ]}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.commentActions}>
              <Text style={styles.commentTime}>
                {formatCommentTime((item as any).createdAt)}
              </Text>

              {likeLabel ? (
                <Text style={styles.commentReactionCount}>{likeLabel} ♥</Text>
              ) : null}
            </View>
          </View>
        </View>

        {totalReplyCount > 0 ? (
          <View style={styles.replyContainer}>
            {isRepliesExpanded && visibleReplies.length > 0 ? (
              <View style={styles.replyThreadLine} />
            ) : null}

            {!isRepliesExpanded ? (
              <Pressable
                hitSlop={8}
                onPress={() => onToggleReplies(item)}
                style={styles.viewRepliesButton}
              >
                <Text style={styles.viewMoreReplies}>
                  View {totalReplyCount}{" "}
                  {totalReplyCount === 1 ? "reply" : "replies"}
                </Text>
              </Pressable>
            ) : null}

            {visibleReplies.map((reply) => (
              <ReplyItem
                key={reply.id}
                item={reply}
                deletingCommentId={deletingCommentId}
                onOpenReplyActions={onOpenReplyActions}
                onOpenProfile={onOpenProfile}
              />
            ))}

            {isRepliesExpanded && replies.length > 0 ? (
              <Pressable
                hitSlop={8}
                onPress={() => onToggleReplies(item)}
                style={styles.viewRepliesButton}
              >
                <Text style={styles.hideReplies}>Hide replies</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  function ReplyItem({
    item,
    deletingCommentId,
    onOpenReplyActions,
    onOpenProfile,
  }: {
    item: PostComment;
    deletingCommentId: string | null;
    onOpenReplyActions: (comment: PostComment) => void;
    onOpenProfile: (userId?: string | null) => void;
  }) {
    const replyAuthorName = getCommentAuthorName(item);
    const likeLabel = formatCount((item as any).likeCount);

    return (
      <View style={styles.replyRow}>
        <Pressable
          onPress={() =>
            onOpenProfile((item as any).author?.id ?? (item as any).authorId)
          }
        >
          <CommentAvatar comment={item} size={26} />
        </Pressable>

        <View style={styles.replyBody}>
          <View style={styles.replyBubbleWrap}>
            <View style={styles.replyBubble}>
              <Text style={styles.replyAuthor}>{replyAuthorName}</Text>

              <Text style={styles.replyText}>
                {(item as any).content || (item as any).body || "No reply."}
              </Text>
            </View>

            {canManageComments ? (
              <Pressable
                onPress={() => onOpenReplyActions(item)}
                disabled={deletingCommentId === item.id}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.replyMoreButton,
                  pressed && { opacity: 0.7 },
                  deletingCommentId === item.id && { opacity: 0.45 },
                ]}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={17}
                  color={colors.muted}
                />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.replyActions}>
            <Text style={styles.replyTime}>
              {formatCommentTime((item as any).createdAt)}
            </Text>

            {likeLabel ? (
              <Text style={styles.replyReactionCount}>{likeLabel} ♥</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  function ActionSheet({
    visible,
    target,
    postStatus,
    isActionLoading,
    deletingCommentId,
    onClose,
    onHidePost,
    onRestorePost,
    onDeletePost,
    onDeleteComment,
  }: {
    visible: boolean;
    target: ActionTarget | null;
    postStatus?: string | null;
    isActionLoading: boolean;
    deletingCommentId: string | null;
    onClose: () => void;
    onHidePost: () => void;
    onRestorePost: () => void;
    onDeletePost: () => void;
    onDeleteComment: (
      comment: PostComment,
      type: "comment" | "reply",
    ) => void;
  }) {
    const isCommentAction =
      target?.type === "comment" || target?.type === "reply";

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={onClose} />

          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {target?.type === "post"
                    ? "Post actions"
                    : target?.type === "reply"
                      ? "Reply actions"
                      : "Comment actions"}
                </Text>

                <Text style={styles.sheetSub}>
                  Choose an action to perform.
                </Text>
              </View>

              <Pressable onPress={onClose} style={styles.sheetCloseButton}>
                <Ionicons name="close" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.sheetActionList}>
              {target?.type === "post" ? (
                <>
                  {postStatus === "HIDDEN" ? (
                    <SheetActionButton
                      icon="refresh-outline"
                      label={updatingStatus ? "Restoring..." : "Restore post"}
                      disabled={isActionLoading}
                      onPress={onRestorePost}
                    />
                  ) : (
                    <SheetActionButton
                      icon="eye-off-outline"
                      label={updatingStatus ? "Hiding..." : "Hide post"}
                      disabled={isActionLoading}
                      onPress={onHidePost}
                    />
                  )}

                  <SheetActionButton
                    icon="trash-outline"
                    label={deletingPost ? "Deleting..." : "Delete post"}
                    danger
                    disabled={isActionLoading}
                    onPress={onDeletePost}
                  />
                </>
              ) : null}

              {isCommentAction && target?.comment ? (
                <SheetActionButton
                  icon="trash-outline"
                  label={
                    deletingCommentId === target.comment.id
                      ? "Deleting..."
                      : target.type === "reply"
                        ? "Delete reply"
                        : "Delete comment"
                  }
                  danger
                  disabled={deletingCommentId === target.comment.id}
                  onPress={() =>
                    onDeleteComment(
                      target.comment,
                      target.type === "reply" ? "reply" : "comment",
                    )
                  }
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function SheetActionButton({
    icon,
    label,
    danger,
    disabled,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    danger?: boolean;
    disabled?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.sheetActionButton,
          pressed && { opacity: 0.75 },
          disabled && { opacity: 0.55 },
        ]}
      >
        <View
          style={[
            styles.sheetActionIcon,
            danger && {
              borderColor: colors.danger,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={19}
            color={danger ? colors.danger : colors.accent}
          />
        </View>

        <Text
          style={[
            styles.sheetActionText,
            {
              color: danger ? colors.danger : colors.foreground,
            },
          ]}
        >
          {label}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={17}
          color={danger ? colors.danger : colors.muted}
        />
      </Pressable>
    );
  }
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
  if (!author) return "Unknown";

  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown";
}

function getCommentAuthorName(comment: any) {
  const author = comment.author;

  if (!author) return "Unknown user";

  const fullName = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim();

  if (fullName) return fullName;
  if (author.name?.trim()) return author.name.trim();
  if (author.businessName?.trim()) return author.businessName.trim();

  return "Unknown user";
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function getPostTagLabel(value?: string | null) {
  if (!value) return null;

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getNormalizedImageMedia(media: any[]): PostMedia[] {
  return media
    .map((item, index) => {
      const url = toAbsoluteFileUrl(item.url ?? item.fileUrl);

      if (!url) return null;

      return {
        id: item.id ?? `${url}-${index}`,
        url,
        type: item.type ?? "IMAGE",
      } as PostMedia;
    })
    .filter(Boolean) as PostMedia[];
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCommentTime(dateValue?: string) {
  if (!dateValue) return "now";

  const date = new Date(dateValue);
  const time = date.getTime();

  if (Number.isNaN(time)) return "now";

  const diffSeconds = Math.max(1, Math.floor((Date.now() - time) / 1000));

  if (diffSeconds < 60) return "now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return `${Math.floor(diffDays / 7)}w`;
}

function formatCount(value?: number | null) {
  const safeValue = Number(value ?? 0);

  if (safeValue <= 0) return "0";
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;

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

    moreButton: {
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

    card: {
      borderRadius: 28,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    avatarWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    avatarImage: {
      width: "100%",
      height: "100%",
    },

    avatarInitial: {
      color: colors.accent,
      fontSize: 15,
      fontFamily: "Poppins_700Bold",
    },

    authorMeta: {
      flex: 1,
      minWidth: 0,
    },

    authorName: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Poppins_700Bold",
    },

    postDate: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    tagPill: {
      maxWidth: 96,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    tagText: {
      color: colors.accent,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    innerDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },

    contentSection: {
      gap: 8,
    },

    postTitle: {
      color: colors.foreground,
      fontSize: 18,
      lineHeight: 25,
      fontFamily: "Poppins_700Bold",
    },

    noContent: {
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    mediaSection: {
      marginTop: 16,
    },

    mediaSingle: {
      height: 260,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
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
      height: 170,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },

    mediaThird: {
      flex: 1,
      height: 105,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },

    mediaHero: {
      height: 215,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },

    mediaTileImg: {
      width: "100%",
      height: "100%",
    },

    moreOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
    },

    moreText: {
      color: "#fff",
      fontSize: 20,
      fontFamily: "Poppins_700Bold",
    },

    mediaHint: {
      marginTop: 7,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
      textAlign: "center",
    },

    linkCard: {
      marginTop: 16,
      borderRadius: 20,
      padding: 12,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    linkIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    linkTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    linkDesc: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_400Regular",
    },

    linkUrl: {
      marginTop: 2,
      color: colors.link,
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },

    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    statCard: {
      flex: 1,
      minWidth: "45%",
      minHeight: 78,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    statVal: {
      marginTop: 5,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Poppins_700Bold",
    },

    statLabel: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    commentSectionCard: {
      marginTop: 14,
      borderRadius: 28,
      paddingTop: 16,
      paddingBottom: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },

    commentHeaderRow: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    commentSectionTitle: {
      color: colors.foreground,
      fontSize: 16,
      fontFamily: "Poppins_700Bold",
    },

    commentSectionSub: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    commentLoadingBox: {
      paddingVertical: 32,
      alignItems: "center",
      justifyContent: "center",
    },

    commentEmptyBox: {
      alignItems: "center",
      paddingVertical: 42,
      paddingHorizontal: 20,
    },

    commentBlock: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 2,
    },

    commentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },

    commentAvatar: {
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    commentAvatarImage: {
      width: "100%",
      height: "100%",
    },

    commentAvatarInitial: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    commentBody: {
      flex: 1,
    },

    commentBubbleWrap: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
    },

    commentBubble: {
      flexShrink: 1,
      alignSelf: "flex-start",
      maxWidth: "92%",
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surfaceSecondary,
    },

    commentMoreButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    commentAuthor: {
      color: colors.foreground,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    commentText: {
      marginTop: 2,
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
    },

    commentActions: {
      marginTop: 4,
      marginLeft: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    commentTime: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    commentReactionCount: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    replyContainer: {
      marginLeft: 45,
      marginTop: 8,
      gap: 8,
      position: "relative",
    },

    replyThreadLine: {
      position: "absolute",
      left: -22,
      top: -6,
      bottom: 8,
      width: 2,
      borderRadius: 999,
      backgroundColor: colors.border,
    },

    replyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 7,
    },

    replyBody: {
      flex: 1,
    },

    replyBubbleWrap: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
    },

    replyBubble: {
      flexShrink: 1,
      alignSelf: "flex-start",
      maxWidth: "92%",
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: colors.surfaceSecondary,
    },

    replyMoreButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    replyAuthor: {
      color: colors.foreground,
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    replyText: {
      marginTop: 1,
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    replyActions: {
      marginTop: 3,
      marginLeft: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    replyTime: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    replyReactionCount: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },

    viewRepliesButton: {
      marginLeft: 34,
      alignSelf: "flex-start",
    },

    viewMoreReplies: {
      color: colors.accent,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    hideReplies: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    loadMoreButton: {
      minHeight: 44,
      borderRadius: 22,
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    loadMoreText: {
      color: colors.accent,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    sheetOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.backdrop ?? "rgba(0,0,0,0.45)",
    },

    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },

    sheetContainer: {
      width: "100%",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
      paddingBottom: 26,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderColor: colors.border,
    },

    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      alignSelf: "center",
      marginBottom: 12,
      backgroundColor: colors.border,
    },

    sheetHeader: {
      paddingHorizontal: 18,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    sheetTitle: {
      color: colors.foreground,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },

    sheetSub: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    sheetCloseButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    sheetActionList: {
      paddingHorizontal: 18,
      paddingTop: 14,
      gap: 10,
    },

    sheetActionButton: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    sheetActionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    sheetActionText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },
  });
}