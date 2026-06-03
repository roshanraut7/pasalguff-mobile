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
  useLikePostMutation,
  useRemoveDislikePostMutation,
  useSharePostMutation,
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

function updatePostInList<TPost extends CommunityPost>(
  posts: TPost[],
  postId: string,
  updater: (post: TPost) => TPost,
) {
  return posts.map((post) => (post.id === postId ? updater(post) : post));
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

  /**
   * Like remains available inside your existing comment preview.
   * If a previously disliked post is liked from the feed, the backend removes
   * its dislike and the main feed state is updated from the server response.
   */
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

      /**
       * Optimistic update for the main feed card.
       * Pressing Like also clears an existing Dislike in the UI.
       */
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

      /**
       * Keep the existing Like count working in the comments post preview.
       * Do not add or display Dislike controls/reasons there for now.
       */
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

  const closeDislikeModal = useCallback(() => {
    if (isSubmittingDislike) return;

    setDislikePostTarget(null);
    setDislikeReason("");
    setDislikeError(null);
  }, [isSubmittingDislike]);

  /**
   * First press on Dislike opens the free-text reason modal.
   * Second press on an already disliked post removes the dislike directly.
   *
   * This intentionally updates the main feed only, not CommentPostModal.
   */
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

  /**
   * Submit a written dislike reason.
   * No options/category list is used.
   */
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

  const handleCreateComment = useCallback(
    async (replyingTo?: FeedComment | null) => {
      if (!activeCommentPost || !sessionUser) return;

      const content = commentInput.trim();
      if (!content) return;

      const tempId = `local-${activeCommentPost.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const currentAuthor = getSessionUserAsCommentAuthor(sessionUser);

      setCommentInput("");

      if (replyingTo?.id) {
        const rootCommentId = replyingTo.parentId ?? replyingTo.id;
        const replyToCommentId = replyingTo.id;

        const tempReply: FeedComment = {
          id: tempId,
          postId: activeCommentPost.id,
          authorId: currentAuthor.id,
          parentId: rootCommentId,
          content,
          createdAt: new Date().toISOString(),
          author: currentAuthor,
          replies: [],
          replyCount: 0,
        };

        setComments((prev) => addReplyToComment(prev, rootCommentId, tempReply));
        updatePostCommentCount(activeCommentPost.id, 1);

        try {
          const payload = await createCommentReply({
            communityId: activeCommentPost.communityId,
            postId: activeCommentPost.id,
            commentId: rootCommentId,
            body: {
              content,
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
          setCommentInput(content);
        }

        return;
      }

      const tempComment: FeedComment = {
        id: tempId,
        postId: activeCommentPost.id,
        authorId: currentAuthor.id,
        parentId: null,
        content,
        createdAt: new Date().toISOString(),
        author: currentAuthor,
        replies: [],
        replyCount: 0,
      };

      setComments((prev) => mergeCommentTrees([tempComment], prev));
      updatePostCommentCount(activeCommentPost.id, 1);

      try {
        const payload = await createPostComment({
          communityId: activeCommentPost.communityId,
          postId: activeCommentPost.id,
          body: {
            content,
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
        setCommentInput(content);
      }
    },
    [
      activeCommentPost,
      sessionUser,
      commentInput,
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
    handleDislikePost,
    handleSubmitDislike,
    closeDislikeModal,
    handleSharePost,
    handleCreateComment,
    refetchComments,
  };
}