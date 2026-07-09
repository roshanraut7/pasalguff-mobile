import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Share } from "react-native";

import {
  useCreateCommentReplyMutation,
  useCreatePostCommentMutation,
  useDislikePostMutation,
  useGetPostCommentsQuery,
  useLikeCommentMutation,
  useLikePostMutation,
  useRemoveDislikePostMutation,
  useSharePostMutation,
  useUnlikeCommentMutation,
  useUnlikePostMutation,
} from "@/store/api/postApi";

import type { CommunityPost } from "@/types/post";
import type { FeedComment } from "@/utils/post/comment";

import {
  addReplyToComment,
  extractCommentsFromResponse,
  getSessionUserAsCommentAuthor,
  mergeCommentTrees,
  normalizeCreatedComment,
  replaceReplyInComment,
  replaceRootComment,
} from "@/utils/post/post-comment-utils";

import {
  getPostPublicLink,
  getPostShareMessage,
} from "@/utils/post/post-share-utils";

type UsePostInteractionsParams<TPost extends CommunityPost> = {
  posts: TPost[];
  setPosts: Dispatch<SetStateAction<TPost[]>>;
  sessionUser?: unknown;
  commentsLimit?: number;
};

type ReactionResponse = {
  likeCount: number;
  dislikeCount: number;
  liked: boolean;
  disliked: boolean;
  myDislikeReason: string | null;
  approvalRate: number | null;
};

type CommentReactionResponse = {
  message?: string;
  commentId: string;
  likeCount: number;
  liked: boolean;
};

function updatePostInList<TPost extends CommunityPost>(
  posts: TPost[],
  postId: string,
  updater: (post: TPost) => TPost,
) {
  return posts.map((post) => (post.id === postId ? updater(post) : post));
}

function updateCommentInTree(
  comments: FeedComment[],
  commentId: string,
  updater: (comment: FeedComment) => FeedComment,
): FeedComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    if (comment.replies?.length) {
      return {
        ...comment,
        replies: updateCommentInTree(comment.replies, commentId, updater),
      };
    }

    return comment;
  });
}

function getCommentLiked(comment: FeedComment) {
  const normalizedComment = comment as FeedComment & {
    liked?: boolean;
    isLiked?: boolean;
    isLikedByMe?: boolean;
  };

  return Boolean(
    normalizedComment.liked ||
      normalizedComment.isLiked ||
      normalizedComment.isLikedByMe,
  );
}

function getCommentLikeCount(comment: FeedComment) {
  const normalizedComment = comment as FeedComment & {
    likeCount?: number | null;
  };

  const count = Number(normalizedComment.likeCount ?? 0);

  return Number.isFinite(count) && count > 0 ? count : 0;
}

function applyCommentReactionToComment(
  comment: FeedComment,
  reaction: {
    liked: boolean;
    likeCount: number;
  },
): FeedComment {
  return {
    ...(comment as any),
    liked: reaction.liked,
    isLiked: reaction.liked,
    isLikedByMe: reaction.liked,
    likeCount: reaction.likeCount,
  } as FeedComment;
}

export function usePostInteractions<TPost extends CommunityPost>({
  posts,
  setPosts,
  sessionUser,
  commentsLimit = 50,
}: UsePostInteractionsParams<TPost>) {
  const [commentPost, setCommentPost] = useState<TPost | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<FeedComment[]>([]);

  const [likingPostIds, setLikingPostIds] = useState<Set<string>>(
    () => new Set(),
  );

  /**
   * Dislike is used only from the main post card for now.
   * Do not pass these controls into CommentPostModal.
   */
  const [dislikePostTarget, setDislikePostTarget] = useState<TPost | null>(
    null,
  );
  const [dislikeReason, setDislikeReason] = useState("");
  const [dislikeError, setDislikeError] = useState<string | null>(null);
  const [isSubmittingDislike, setIsSubmittingDislike] = useState(false);

  const likingPostIdsRef = useRef<Set<string>>(new Set());
  const likingCommentIdsRef = useRef<Set<string>>(new Set());
  const dislikingPostIdsRef = useRef<Set<string>>(new Set());

  const activeCommentPost = useMemo(() => {
    if (!commentPost) return null;

    return posts.find((item) => item.id === commentPost.id) ?? commentPost;
  }, [commentPost, posts]);

  const {
    data: commentsResponse,
    isLoading: isLoadingComments,
    isFetching: isFetchingComments,
    refetch: refetchComments,
  } = useGetPostCommentsQuery(
    {
      communityId: activeCommentPost?.communityId ?? "",
      postId: activeCommentPost?.id ?? "",
      limit: commentsLimit,
    },
    {
      skip: !activeCommentPost,
      refetchOnMountOrArgChange: true,
    },
  );

  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();

  const [likeComment] = useLikeCommentMutation();
  const [unlikeComment] = useUnlikeCommentMutation();

  const [dislikePost] = useDislikePostMutation();
  const [removeDislikePost] = useRemoveDislikePostMutation();
  const [sharePost] = useSharePostMutation();

  const [createPostComment, { isLoading: isCreatingComment }] =
    useCreatePostCommentMutation();

  const [createCommentReply, { isLoading: isCreatingReply }] =
    useCreateCommentReplyMutation();

  useEffect(() => {
    if (!commentsResponse || !activeCommentPost?.id) return;

    const serverComments = extractCommentsFromResponse(
      commentsResponse,
      activeCommentPost.id,
    );

    setComments((prev) => mergeCommentTrees(prev, serverComments));
  }, [commentsResponse, activeCommentPost?.id]);

  const updateCommentPost = useCallback(
    (postId: string, updater: (post: TPost) => TPost) => {
      setCommentPost((prev) => {
        if (!prev || prev.id !== postId) return prev;
        return updater(prev);
      });
    },
    [],
  );

  const updatePostCommentCount = useCallback(
    (postId: string, delta: number) => {
      setPosts((prev) =>
        updatePostInList(prev, postId, (item) => ({
          ...item,
          commentCount: Math.max(0, (item.commentCount ?? 0) + delta),
        })),
      );

      updateCommentPost(postId, (item) => ({
        ...item,
        commentCount: Math.max(0, (item.commentCount ?? 0) + delta),
      }));
    },
    [setPosts, updateCommentPost],
  );

  /**
   * Apply Like/Dislike state to the feed card only.
   * Dislike is intentionally not rendered or updated in CommentPostModal yet.
   */
  const applyFeedReactionResponse = useCallback(
    (postId: string, result: ReactionResponse) => {
      setPosts((prev) =>
        updatePostInList(prev, postId, (item) => ({
          ...item,
          likeCount: result.likeCount,
          dislikeCount: result.dislikeCount,
          isLikedByMe: result.liked,
          isDislikedByMe: result.disliked,
          myDislikeReason: result.myDislikeReason,
          approvalRate: result.approvalRate,
        })),
      );
    },
    [setPosts],
  );

  const openComments = useCallback((post: TPost) => {
    setCommentPost(post);
    setCommentInput("");
    setComments([]);
  }, []);

  const closeComments = useCallback(() => {
    setCommentPost(null);
    setCommentInput("");
    setComments([]);
  }, []);

  const handleLikePost = useCallback(
    async (post: TPost) => {
      if (likingPostIdsRef.current.has(post.id)) return;

      likingPostIdsRef.current.add(post.id);

      setLikingPostIds((prev) => {
        const next = new Set(prev);
        next.add(post.id);
        return next;
      });

      const wasLiked = Boolean(post.isLikedByMe);
      const previousLikeCount = post.likeCount ?? 0;
      const previousDislikeCount = post.dislikeCount ?? 0;
      const wasDisliked = Boolean(post.isDislikedByMe);
      const previousDislikeReason = post.myDislikeReason ?? null;
      const previousApprovalRate = post.approvalRate ?? null;

      setPosts((prev) =>
        updatePostInList(prev, post.id, (item) => ({
          ...item,
          isLikedByMe: !wasLiked,
          likeCount: wasLiked
            ? Math.max(0, (item.likeCount ?? 0) - 1)
            : (item.likeCount ?? 0) + 1,
          isDislikedByMe: wasLiked ? item.isDislikedByMe : false,
          dislikeCount:
            !wasLiked && wasDisliked
              ? Math.max(0, (item.dislikeCount ?? 0) - 1)
              : item.dislikeCount,
          myDislikeReason:
            !wasLiked && wasDisliked ? null : item.myDislikeReason,
        })),
      );

      updateCommentPost(post.id, (item) => ({
        ...item,
        isLikedByMe: !wasLiked,
        likeCount: wasLiked
          ? Math.max(0, (item.likeCount ?? 0) - 1)
          : (item.likeCount ?? 0) + 1,
      }));

      try {
        const result = wasLiked
          ? await unlikePost({
              communityId: post.communityId,
              postId: post.id,
            }).unwrap()
          : await likePost({
              communityId: post.communityId,
              postId: post.id,
            }).unwrap();

        applyFeedReactionResponse(post.id, result);

        updateCommentPost(post.id, (item) => ({
          ...item,
          isLikedByMe: result.liked,
          likeCount:
            typeof result.likeCount === "number"
              ? result.likeCount
              : item.likeCount,
        }));
      } catch (error) {
        console.log("Like/unlike failed:", error);

        setPosts((prev) =>
          updatePostInList(prev, post.id, (item) => ({
            ...item,
            isLikedByMe: wasLiked,
            isDislikedByMe: wasDisliked,
            likeCount: previousLikeCount,
            dislikeCount: previousDislikeCount,
            myDislikeReason: previousDislikeReason,
            approvalRate: previousApprovalRate,
          })),
        );

        updateCommentPost(post.id, (item) => ({
          ...item,
          isLikedByMe: wasLiked,
          likeCount: previousLikeCount,
        }));
      } finally {
        likingPostIdsRef.current.delete(post.id);

        setLikingPostIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
    },
    [
      applyFeedReactionResponse,
      likePost,
      unlikePost,
      setPosts,
      updateCommentPost,
    ],
  );

  const handleCommentLike = useCallback(
    async (comment: FeedComment) => {
      if (!activeCommentPost) return;
      if (likingCommentIdsRef.current.has(comment.id)) return;

      likingCommentIdsRef.current.add(comment.id);

      const wasLiked = getCommentLiked(comment);
      const previousLikeCount = getCommentLikeCount(comment);

      const optimisticLiked = !wasLiked;
      const optimisticLikeCount = optimisticLiked
        ? previousLikeCount + 1
        : Math.max(0, previousLikeCount - 1);

      setComments((prev) =>
        updateCommentInTree(prev, comment.id, (item) =>
          applyCommentReactionToComment(item, {
            liked: optimisticLiked,
            likeCount: optimisticLikeCount,
          }),
        ),
      );

      try {
        const result: CommentReactionResponse = wasLiked
          ? await unlikeComment({
              communityId: activeCommentPost.communityId,
              postId: activeCommentPost.id,
              commentId: comment.id,
            }).unwrap()
          : await likeComment({
              communityId: activeCommentPost.communityId,
              postId: activeCommentPost.id,
              commentId: comment.id,
            }).unwrap();

        setComments((prev) =>
          updateCommentInTree(prev, comment.id, (item) =>
            applyCommentReactionToComment(item, {
              liked: result.liked,
              likeCount:
                typeof result.likeCount === "number"
                  ? result.likeCount
                  : optimisticLikeCount,
            }),
          ),
        );
      } catch (error) {
        console.log("Comment like/unlike failed:", error);

        setComments((prev) =>
          updateCommentInTree(prev, comment.id, (item) =>
            applyCommentReactionToComment(item, {
              liked: wasLiked,
              likeCount: previousLikeCount,
            }),
          ),
        );
      } finally {
        likingCommentIdsRef.current.delete(comment.id);
      }
    },
    [activeCommentPost, likeComment, unlikeComment],
  );

  const closeDislikeModal = useCallback(() => {
    if (isSubmittingDislike) return;

    setDislikePostTarget(null);
    setDislikeReason("");
    setDislikeError(null);
  }, [isSubmittingDislike]);

  const handleDislikePost = useCallback(
    async (post: TPost) => {
      if (dislikingPostIdsRef.current.has(post.id)) return;

      if (!post.isDislikedByMe) {
        setDislikePostTarget(post);
        setDislikeReason("");
        setDislikeError(null);
        return;
      }

      dislikingPostIdsRef.current.add(post.id);

      try {
        const result = await removeDislikePost({
          communityId: post.communityId,
          postId: post.id,
        }).unwrap();

        applyFeedReactionResponse(post.id, result);
      } catch (error) {
        console.log("Remove dislike failed:", error);
      } finally {
        dislikingPostIdsRef.current.delete(post.id);
      }
    },
    [applyFeedReactionResponse, removeDislikePost],
  );

  const handleSubmitDislike = useCallback(async () => {
    if (!dislikePostTarget || isSubmittingDislike) return;

    const reason = dislikeReason.trim();

    if (reason.length < 3) {
      setDislikeError("Please write why you dislike this post.");
      return;
    }

    if (reason.length > 250) {
      setDislikeError("Reason cannot be longer than 250 characters.");
      return;
    }

    setIsSubmittingDislike(true);
    setDislikeError(null);

    try {
      const result = await dislikePost({
        communityId: dislikePostTarget.communityId,
        postId: dislikePostTarget.id,
        body: {
          reason,
        },
      }).unwrap();

      applyFeedReactionResponse(dislikePostTarget.id, result);

      setDislikePostTarget(null);
      setDislikeReason("");
      setDislikeError(null);
    } catch (error) {
      console.log("Dislike failed:", error);
      setDislikeError("Could not submit dislike. Please try again.");
    } finally {
      setIsSubmittingDislike(false);
    }
  }, [
    applyFeedReactionResponse,
    dislikePost,
    dislikePostTarget,
    dislikeReason,
    isSubmittingDislike,
  ]);

  const handleSharePost = useCallback(
    async (post: TPost) => {
      try {
        const postPublicLink = getPostPublicLink(post);
        const shareMessage = getPostShareMessage(post);

        const nativeShareResult = await Share.share({
          title: "Share post",
          message: shareMessage,
          url: postPublicLink,
        });

        if (nativeShareResult.action === Share.dismissedAction) {
          return;
        }

    const result = await sharePost({
  communityId: post.communityId,
  postId: post.id,
  body: {
    shareType: "EXTERNAL",
    platform: "native_share",
  },
}).unwrap();

        setPosts((prev) =>
          updatePostInList(prev, post.id, (item) => ({
            ...item,
            shareCount:
              typeof result.shareCount === "number"
                ? result.shareCount
                : (item.shareCount ?? 0) + 1,
          })),
        );

        updateCommentPost(post.id, (item) => ({
          ...item,
          shareCount:
            typeof result.shareCount === "number"
              ? result.shareCount
              : (item.shareCount ?? 0) + 1,
        }));
      } catch (error) {
        console.log("Share post failed:", error);
      }
    },
    [sharePost, setPosts, updateCommentPost],
  );
  const handleShareToFriends = useCallback(
  async (post: TPost, targetUserIds: string[], message?: string) => {
    if (!targetUserIds.length) return;

    const result = await sharePost({
      communityId: post.communityId,
      postId: post.id,
      body: {
        shareType: "FRIENDS",
        targetUserIds,
        message: message?.trim() || undefined,
      },
    }).unwrap();

    setPosts((prev) =>
      updatePostInList(prev, post.id, (item) => ({
        ...item,
        shareCount:
          typeof result.shareCount === "number"
            ? result.shareCount
            : (item.shareCount ?? 0) + 1,
      })),
    );

    updateCommentPost(post.id, (item) => ({
      ...item,
      shareCount:
        typeof result.shareCount === "number"
          ? result.shareCount
          : (item.shareCount ?? 0) + 1,
    }));

    return result;
  },
  [sharePost, setPosts, updateCommentPost],
);

const handleCreateComment = useCallback(
  async (content: string, replyingTo?: FeedComment | null) => {
    if (!activeCommentPost || !sessionUser) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    const tempId = `local-${activeCommentPost.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    const currentAuthor = getSessionUserAsCommentAuthor(sessionUser);

    if (replyingTo?.id) {
      const rootCommentId = replyingTo.parentId ?? replyingTo.id;
      const replyToCommentId = replyingTo.id;

      const tempReply: FeedComment = {
        id: tempId,
        postId: activeCommentPost.id,
        authorId: currentAuthor.id,
        parentId: rootCommentId,
        content: trimmedContent,
        createdAt: new Date().toISOString(),
        author: currentAuthor,
        replies: [],
        replyCount: 0,
        likeCount: 0,
        liked: false,
        isLiked: false,
        isLikedByMe: false,
      } as FeedComment;

      setComments((prev) => addReplyToComment(prev, rootCommentId, tempReply));
      updatePostCommentCount(activeCommentPost.id, 1);

      try {
        const payload = await createCommentReply({
          communityId: activeCommentPost.communityId,
          postId: activeCommentPost.id,
          commentId: rootCommentId,
          body: {
            content: trimmedContent,
            replyToCommentId,
          },
        }).unwrap();

        const createdReply = normalizeCreatedComment(payload, tempReply);

        setComments((prev) =>
          replaceReplyInComment(prev, rootCommentId, tempId, createdReply),
        );

        setTimeout(() => {
          void refetchComments();
        }, 250);
      } catch (error) {
        console.log("Create reply failed:", error);

        setComments((prev) =>
          prev.map((comment) =>
            comment.id === rootCommentId
              ? {
                  ...comment,
                  replies: (comment.replies ?? []).filter(
                    (reply) => reply.id !== tempId,
                  ),
                  replyCount: Math.max(0, (comment.replyCount ?? 1) - 1),
                }
              : comment,
          ),
        );

        updatePostCommentCount(activeCommentPost.id, -1);
        // NOTE: no more setCommentInput(content) here — the modal
        // now owns its own input text locally, so there's nothing
        // to restore on this side anymore.
      }

      return;
    }

    const tempComment: FeedComment = {
      id: tempId,
      postId: activeCommentPost.id,
      authorId: currentAuthor.id,
      parentId: null,
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      author: currentAuthor,
      replies: [],
      replyCount: 0,
      likeCount: 0,
      liked: false,
      isLiked: false,
      isLikedByMe: false,
    } as FeedComment;

    setComments((prev) => mergeCommentTrees([tempComment], prev));
    updatePostCommentCount(activeCommentPost.id, 1);

    try {
      const payload = await createPostComment({
        communityId: activeCommentPost.communityId,
        postId: activeCommentPost.id,
        body: {
          content: trimmedContent,
        },
      }).unwrap();

      const createdComment = normalizeCreatedComment(payload, tempComment);

      setComments((prev) => replaceRootComment(prev, tempId, createdComment));

      setTimeout(() => {
        void refetchComments();
      }, 250);
    } catch (error) {
      console.log("Create comment failed:", error);

      setComments((prev) => prev.filter((item) => item.id !== tempId));
      updatePostCommentCount(activeCommentPost.id, -1);
      // Same here — no setCommentInput(content) needed anymore.
    }
  },
  [
    activeCommentPost,
    sessionUser,
    createPostComment,
    createCommentReply,
    refetchComments,
    updatePostCommentCount,
  ],
);
  return {
    commentPost,
    activeCommentPost,
    comments,
    commentInput,
    setCommentInput,

    likingPostIds,
    isLoadingComments,
    handleShareToFriends, 
    isFetchingComments,
    isCreatingComment,
    isCreatingReply,

    /**
     * Feed-only Dislike modal state.
     * Do not pass these into CommentPostModal for now.
     */
    dislikePostTarget,
    dislikeReason,
    setDislikeReason,
    dislikeError,
    isSubmittingDislike,

    openComments,
    closeComments,
    handleLikePost,
    handleCommentLike,
    handleDislikePost,
    handleSubmitDislike,
    closeDislikeModal,
    handleSharePost,
    handleCreateComment,
    refetchComments,
  };
}