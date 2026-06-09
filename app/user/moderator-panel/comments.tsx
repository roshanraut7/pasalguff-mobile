import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

import {
  useDeleteCommentMutation,
  useGetPostCommentsQuery,
} from "@/store/api/postApi";

import type { PostComment } from "@/types/post";

export default function CommentModerationScreen() {
  const { slug, postId, postTitle } = useLocalSearchParams<{
    slug: string;
    postId: string;
    postTitle?: string;
  }>();

  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );

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

  const canManageComments =
    isOwner || Boolean(access?.permissions?.canManageComments);

  const canOpenScreen = isOwner || isModerator;

  const {
    data: commentsResponse,
    isLoading: commentsLoading,
    isFetching: commentsFetching,
    refetch: refetchComments,
  } = useGetPostCommentsQuery(
    {
      communityId: community?.id ?? "",
      postId: postId ?? "",
      limit: 20,
      cursor,
    },
    {
      skip: !community?.id || !postId || !canManageComments,
      refetchOnMountOrArgChange: true,
    },
  );

  const [deleteComment] = useDeleteCommentMutation();

  useEffect(() => {
    setCursor(undefined);
    setComments([]);
    setDeletingCommentId(null);
  }, [community?.id, postId]);

  useEffect(() => {
    if (!commentsResponse) {
      return;
    }

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

  const totalLoadedComments = useMemo(() => {
    return comments.reduce((total, comment: any) => {
      const replies = Array.isArray(comment.replies)
        ? comment.replies.length
        : 0;

      return total + 1 + replies;
    }, 0);
  }, [comments]);

  const handleLoadMore = useCallback(() => {
    if (commentsLoading || commentsFetching) {
      return;
    }

    if (!commentsResponse?.meta?.hasMore) {
      return;
    }

    if (!commentsResponse?.meta?.nextCursor) {
      return;
    }

    if (cursor === commentsResponse.meta.nextCursor) {
      return;
    }

    setCursor(commentsResponse.meta.nextCursor ?? undefined);
  }, [
    commentsLoading,
    commentsFetching,
    commentsResponse?.meta?.hasMore,
    commentsResponse?.meta?.nextCursor,
    cursor,
  ]);

  const handleDeleteComment = useCallback(
    (comment: PostComment) => {
      if (!community?.id || !postId) {
        return;
      }

      Alert.alert(
        "Delete comment",
        "Are you sure you want to delete this comment?",
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
                  communityId: community.id,
                  postId,
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

                Alert.alert("Success", "Comment deleted successfully.");
              } catch (error: any) {
                console.log("Delete comment failed:", error);

                Alert.alert(
                  "Could not delete comment",
                  error?.data?.message ??
                    "Something went wrong while deleting this comment.",
                );
              } finally {
                setDeletingCommentId(null);
              }
            },
          },
        ],
      );
    },
    [community?.id, postId, deleteComment, refetchComments],
  );

  const handleOpenProfile = useCallback(
    (userId?: string | null) => {
      if (!userId || !community?.id || userId === session?.user?.id) {
        return;
      }

      router.push({
        pathname: "/user/profile/[userId]",
        params: {
          userId,
          sourceCommunityId: community.id,
        },
      });
    },
    [community?.id, session?.user?.id],
  );

  if (isPending || communityLoading || accessLoading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
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
        <Header title="Comment Moderation" colors={colors} />

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

  if (!postId) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Header title="Comment Moderation" colors={colors} />

        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
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
            Post missing
          </Text>

          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Open comment moderation from a post inside Post Moderation.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canOpenScreen || !canManageComments) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Header title="Comment Moderation" colors={colors} />

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
            Only the owner or moderators with comment-management permission can
            manage comments.
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
        <Header title="Comment Moderation" colors={colors} />

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color={colors.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={[styles.summaryTitle, { color: colors.foreground }]}
            >
              {postTitle || "Post Comments"}
            </Text>

            <Text style={[styles.summaryText, { color: colors.muted }]}>
              Review and delete comments from this selected post.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Comments
          </Text>

          <Text style={[styles.sectionCount, { color: colors.muted }]}>
            {totalLoadedComments} loaded
          </Text>
        </View>

        {commentsLoading && comments.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : comments.length === 0 ? (
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
              name="chatbubble-outline"
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
              No comments found
            </Text>

            <Text style={[styles.emptyText, { color: colors.muted }]}>
              This post has no comments yet.
            </Text>
          </View>
        ) : (
          <View style={styles.commentList}>
            {comments.map((comment: any) => (
              <View key={comment.id}>
                <CommentCard
                  comment={comment}
                  colors={colors}
                  isReply={false}
                  isDeleting={deletingCommentId === comment.id}
                  onPressProfile={() =>
                    handleOpenProfile(comment.author?.id ?? comment.authorId)
                  }
                  onDelete={() => handleDeleteComment(comment)}
                />

                {Array.isArray(comment.replies) &&
                comment.replies.length > 0 ? (
                  <View style={styles.replyList}>
                    {comment.replies.map((reply: any) => (
                      <CommentCard
                        key={reply.id}
                        comment={reply}
                        colors={colors}
                        isReply
                        isDeleting={deletingCommentId === reply.id}
                        onPressProfile={() =>
                          handleOpenProfile(reply.author?.id ?? reply.authorId)
                        }
                        onDelete={() => handleDeleteComment(reply)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}

            {commentsResponse?.meta?.hasMore ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={commentsFetching}
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {commentsFetching ? (
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
        <Ionicons
          name="chevron-back"
          size={20}
          color={colors.foreground}
        />
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

function CommentCard({
  comment,
  colors,
  isReply,
  isDeleting,
  onPressProfile,
  onDelete,
}: {
  comment: any;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isReply: boolean;
  isDeleting: boolean;
  onPressProfile: () => void;
  onDelete: () => void;
}) {
  const author = comment.author;
  const avatarUrl = toAbsoluteFileUrl(author?.image);
  const authorName = getAuthorName(author);

  return (
    <View
      style={[
        styles.commentCard,
        {
          marginLeft: isReply ? 20 : 0,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable onPress={onPressProfile} style={styles.commentTop}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.accent}
            />
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
            style={[styles.commentDate, { color: colors.muted }]}
          >
            {isReply ? "Reply" : "Comment"} • {formatDate(comment.createdAt)}
          </Text>
        </View>
      </Pressable>

      <View
        style={[
          styles.commentBody,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Text style={[styles.commentText, { color: colors.foreground }]}>
          {comment.content || "No comment content."}
        </Text>
      </View>

      <Pressable
        onPress={onDelete}
        disabled={isDeleting}
        style={[
          styles.deleteButton,
          {
            backgroundColor: colors.danger,
            borderColor: colors.danger,
            opacity: isDeleting ? 0.7 : 1,
          },
        ]}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color={colors.dangerForeground} />
        ) : (
          <>
            <Ionicons
              name="trash-outline"
              size={15}
              color={colors.dangerForeground}
            />

            <Text
              style={[
                styles.deleteButtonText,
                {
                  color: colors.dangerForeground,
                },
              ]}
            >
              Delete {isReply ? "Reply" : "Comment"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function getAuthorName(author?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
}) {
  if (!author) {
    return "Unknown User";
  }

  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown User";
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

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  summaryText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
  },

  sectionCount: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },

  loadingBox: {
    paddingVertical: 30,
  },

  commentList: {
    gap: 14,
  },

  replyList: {
    marginTop: 10,
    gap: 10,
  },

  commentCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },

  commentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  authorName: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },

  commentDate: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  commentBody: {
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
  },

  commentText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  deleteButton: {
    marginTop: 14,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    fontSize: 13,
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