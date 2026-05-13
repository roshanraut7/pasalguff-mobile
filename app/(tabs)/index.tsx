import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useSession } from "@/api/better-auth-client";
import {
  useCreateCommentReplyMutation,
  useCreatePostCommentMutation,
  useGetHomeFeedPostsQuery,
  useGetPostCommentsQuery,
  useLikePostMutation,
  useSharePostMutation,
  useUnlikePostMutation,
} from "@/store/api/postApi";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import CommentPostModal, {
  type FeedComment,
} from "@/components/post/CommentsModal";
import type { CommunityPost, PostMedia } from "@/types/post";

type MediaViewerState = {
  visible: boolean;
  media: PostMedia[];
  index: number;
};

type HomePostItemProps = {
  item: CommunityPost;
  viewerVisible: boolean;
  onPressLike: (post: CommunityPost) => void;
  onPressComment: (post: CommunityPost) => void;
  onPressShare: (post: CommunityPost) => void;
  onPressAuthor: (authorId: string) => void;
  onPressMedia: (media: PostMedia[], startIndex: number) => void;
};

type ShareableCommunityPost = CommunityPost & {
  content?: string | null;
  linkUrl?: string | null;
  shareUrl?: string | null;
  publicUrl?: string | null;
  slug?: string | null;
};

type CommentLike = FeedComment & {
  children?: FeedComment[];
  comment?: FeedComment;
  data?: FeedComment;
};

const HomePostItem = memo(function HomePostItem({
  item,
  viewerVisible,
  onPressLike,
  onPressComment,
  onPressShare,
  onPressAuthor,
  onPressMedia,
}: HomePostItemProps) {
  return (
    <CommunityPostCard
      post={item}
      disableMediaPlayback={viewerVisible}
      onPressLike={onPressLike}
      onPressComment={onPressComment}
      onPressShare={onPressShare}
      onPressAuthor={onPressAuthor}
      onPressMedia={onPressMedia}
    />
  );
});

function stripHtmlToText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeShareUrl(value?: string | null) {
  if (!value?.trim()) return null;

  const cleanUrl = value.trim();

  if (/^(https?:|mailto:|tel:|pasalguff:)/i.test(cleanUrl)) {
    return cleanUrl;
  }

  return `https://${cleanUrl}`;
}

function getWebBaseUrl() {
  const rawBaseUrl =
    process.env.EXPO_PUBLIC_APP_WEB_URL ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    process.env.EXPO_PUBLIC_SITE_URL ??
    "";

  const cleanBaseUrl = rawBaseUrl.trim().replace(/\/$/, "");

  return cleanBaseUrl || null;
}

function getPostPublicLink(post: CommunityPost) {
  const shareablePost = post as ShareableCommunityPost;

  const existingPublicLink = normalizeShareUrl(
    shareablePost.shareUrl ?? shareablePost.publicUrl ?? null,
  );

  if (existingPublicLink) {
    return existingPublicLink;
  }

  const webBaseUrl = getWebBaseUrl();

  if (webBaseUrl) {
    return `${webBaseUrl}/posts/${post.id}`;
  }

  const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? "pasalguff";

  return `${appScheme}://posts/${post.id}`;
}

function getPostShareMessage(post: CommunityPost) {
  const shareablePost = post as ShareableCommunityPost;

  const content = stripHtmlToText(shareablePost.content);
  const postPublicLink = getPostPublicLink(post);
  const attachedLink = normalizeShareUrl(shareablePost.linkUrl);

  const parts = [
    content || "Check out this post",
    attachedLink ? `Link: ${attachedLink}` : null,
    `Post: ${postPublicLink}`,
  ].filter(Boolean);

  return parts.join("\n\n");
}

function getSessionUserAsCommentAuthor(sessionUser: unknown) {
  const user = sessionUser as {
    id: string;
    name?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  };

  return {
    id: user.id,
    name: user.name ?? user.email ?? "You",
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    image: user.image ?? null,
  };
}

function unwrapCommentPayload(value: unknown): FeedComment {
  const payload = value as {
    data?: unknown;
    comment?: unknown;
    result?: unknown;
  };

  const nestedData = payload?.data as { comment?: unknown; data?: unknown } | undefined;

  return (
    (nestedData?.comment as FeedComment | undefined) ??
    (nestedData?.data as FeedComment | undefined) ??
    (payload?.comment as FeedComment | undefined) ??
    (payload?.result as FeedComment | undefined) ??
    (payload?.data as FeedComment | undefined) ??
    (value as FeedComment)
  );
}

function getCommentCreatedAt(comment: FeedComment) {
  const time = new Date(comment.createdAt ?? 0).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function sortCommentsNewestFirst(items: FeedComment[]) {
  return [...items].sort(
    (a, b) => getCommentCreatedAt(b) - getCommentCreatedAt(a),
  );
}

function sortRepliesOldestFirst(items: FeedComment[]) {
  return [...items].sort(
    (a, b) => getCommentCreatedAt(a) - getCommentCreatedAt(b),
  );
}

function addUniqueById(items: FeedComment[], incoming: FeedComment) {
  if (!incoming.id) return items;

  const existingIndex = items.findIndex((item) => item.id === incoming.id);

  if (existingIndex === -1) {
    return [...items, incoming];
  }

  return items.map((item, index) =>
    index === existingIndex
      ? {
          ...item,
          ...incoming,
          author: incoming.author ?? item.author,
          replies: incoming.replies?.length ? incoming.replies : item.replies,
          replyCount: Math.max(
            incoming.replyCount ?? 0,
            item.replyCount ?? 0,
            incoming.replies?.length ?? 0,
            item.replies?.length ?? 0,
          ),
        }
      : item,
  );
}

function getRawCommentsArray(response: unknown) {
  const payload = response as {
    data?: unknown;
    comments?: unknown;
    items?: unknown;
    results?: unknown;
  };

  const data = payload?.data as {
    data?: unknown;
    comments?: unknown;
    items?: unknown;
    results?: unknown;
  };

  if (Array.isArray(response)) return response as FeedComment[];
  if (Array.isArray(payload?.comments)) return payload.comments as FeedComment[];
  if (Array.isArray(payload?.items)) return payload.items as FeedComment[];
  if (Array.isArray(payload?.results)) return payload.results as FeedComment[];
  if (Array.isArray(payload?.data)) return payload.data as FeedComment[];
  if (Array.isArray(data?.comments)) return data.comments as FeedComment[];
  if (Array.isArray(data?.items)) return data.items as FeedComment[];
  if (Array.isArray(data?.results)) return data.results as FeedComment[];
  if (Array.isArray(data?.data)) return data.data as FeedComment[];

  return [];
}

function flattenCommentWithReplies(
  comment: FeedComment,
  parentId: string | null = null,
  output: FeedComment[] = [],
) {
  if (!comment?.id) return output;

  const commentWithPossibleChildren = comment as CommentLike;
  const nestedReplies = [
    ...(Array.isArray(comment.replies) ? comment.replies : []),
    ...(Array.isArray(commentWithPossibleChildren.children)
      ? commentWithPossibleChildren.children
      : []),
  ];

  output.push({
    ...comment,
    parentId: comment.parentId ?? parentId,
    replies: [],
    replyCount: Math.max(comment.replyCount ?? 0, nestedReplies.length),
  });

  nestedReplies.forEach((reply) => {
    flattenCommentWithReplies(
      {
        ...reply,
        parentId: reply.parentId ?? comment.id,
      },
      comment.id,
      output,
    );
  });

  return output;
}

function buildCommentTree(rawComments: FeedComment[]) {
  const flatComments: FeedComment[] = [];

  rawComments.forEach((comment) => {
    flattenCommentWithReplies(comment, comment.parentId ?? null, flatComments);
  });

  const map = new Map<string, FeedComment>();

  flatComments.forEach((comment) => {
    if (!comment?.id) return;

    const existing = map.get(comment.id);

    map.set(comment.id, {
      ...(existing ?? {}),
      ...comment,
      author: comment.author ?? existing?.author ?? null,
      replies: existing?.replies ?? [],
      replyCount: Math.max(
        existing?.replyCount ?? 0,
        comment.replyCount ?? 0,
        existing?.replies?.length ?? 0,
      ),
    });
  });

  const roots: FeedComment[] = [];

  map.forEach((comment) => {
    const parentId = comment.parentId ?? null;

    if (parentId && map.has(parentId)) {
      const parent = map.get(parentId)!;

      parent.replies = addUniqueById(parent.replies ?? [], {
        ...comment,
        replies: comment.replies ?? [],
      });
      parent.replyCount = Math.max(parent.replyCount ?? 0, parent.replies.length);

      return;
    }

    roots.push(comment);
  });

  return sortCommentsNewestFirst(
    roots.map((comment) => ({
      ...comment,
      parentId: null,
      replies: sortRepliesOldestFirst(comment.replies ?? []),
      replyCount: Math.max(
        comment.replyCount ?? 0,
        comment.replies?.length ?? 0,
      ),
    })),
  );
}

function extractCommentsFromResponse(response: unknown, postId?: string) {
  const raw = getRawCommentsArray(response);

  const filtered = raw.filter(
    (comment) => !postId || !comment.postId || comment.postId === postId,
  );

  return buildCommentTree(filtered);
}

function mergeCommentTrees(current: FeedComment[], incoming: FeedComment[]) {
  const map = new Map<string, FeedComment>();

  current.forEach((comment) => {
    map.set(comment.id, comment);
  });

  incoming.forEach((comment) => {
    const existing = map.get(comment.id);

    map.set(comment.id, {
      ...(existing ?? {}),
      ...comment,
      author: comment.author ?? existing?.author ?? null,
      replies: sortRepliesOldestFirst([
        ...(existing?.replies ?? []),
        ...(comment.replies ?? []),
      ].reduce<FeedComment[]>((acc, reply) => addUniqueById(acc, reply), [])),
      replyCount: Math.max(
        existing?.replyCount ?? 0,
        comment.replyCount ?? 0,
        existing?.replies?.length ?? 0,
        comment.replies?.length ?? 0,
      ),
    });
  });

  return sortCommentsNewestFirst(Array.from(map.values())).map((comment) => ({
    ...comment,
    replies: sortRepliesOldestFirst(comment.replies ?? []),
    replyCount: Math.max(
      comment.replyCount ?? 0,
      comment.replies?.length ?? 0,
    ),
  }));
}

function normalizeCreatedComment(payload: unknown, fallback: FeedComment) {
  const created = unwrapCommentPayload(payload);

  return {
    ...fallback,
    ...created,
    id: created.id ?? fallback.id,
    postId: created.postId ?? fallback.postId,
    parentId: created.parentId ?? fallback.parentId ?? null,
    content: created.content ?? fallback.content,
    createdAt: created.createdAt ?? fallback.createdAt,
    author: created.author ?? fallback.author,
    replies: created.replies ?? fallback.replies ?? [],
    replyCount: created.replyCount ?? fallback.replyCount ?? 0,
  } as FeedComment;
}

function replaceRootComment(
  comments: FeedComment[],
  tempId: string,
  createdComment: FeedComment,
) {
  return comments
    .filter((item) => item.id !== createdComment.id || item.id === tempId)
    .map((item) => (item.id === tempId ? createdComment : item));
}

function addReplyToComment(
  comments: FeedComment[],
  parentId: string,
  reply: FeedComment,
) {
  return comments.map((comment) => {
    if (comment.id !== parentId) return comment;

    const nextReplies = addUniqueById(comment.replies ?? [], reply);

    return {
      ...comment,
      replies: sortRepliesOldestFirst(nextReplies),
      replyCount: Math.max((comment.replyCount ?? 0) + 1, nextReplies.length),
    };
  });
}

function replaceReplyInComment(
  comments: FeedComment[],
  parentId: string,
  tempId: string,
  createdReply: FeedComment,
) {
  return comments.map((comment) => {
    if (comment.id !== parentId) return comment;

    const repliesWithoutDuplicate = (comment.replies ?? []).filter(
      (reply) => reply.id !== createdReply.id || reply.id === tempId,
    );

    const nextReplies = repliesWithoutDuplicate.map((reply) =>
      reply.id === tempId ? createdReply : reply,
    );

    return {
      ...comment,
      replies: sortRepliesOldestFirst(nextReplies),
      replyCount: Math.max(comment.replyCount ?? 0, nextReplies.length),
    };
  });
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { data: session, isPending } = useSession();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [likingPostIds, setLikingPostIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [viewer, setViewer] = useState<MediaViewerState>({
    visible: false,
    media: [],
    index: 0,
  });

  const [commentPost, setCommentPost] = useState<CommunityPost | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<FeedComment[]>([]);

  const activeCommentPost = useMemo(() => {
    if (!commentPost) return null;

    return posts.find((item) => item.id === commentPost.id) ?? commentPost;
  }, [commentPost, posts]);

  const {
    data: feedResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetHomeFeedPostsQuery(
    {
      limit: 8,
      cursor,
      sortBy: "newest",
    },
    {
      skip: !session?.user,
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: commentsResponse,
    isLoading: isLoadingComments,
    isFetching: isFetchingComments,
    refetch: refetchComments,
  } = useGetPostCommentsQuery(
    {
      communityId: activeCommentPost?.communityId ?? "",
      postId: activeCommentPost?.id ?? "",
      // Higher limit helps because replies are often returned as flat comments.
      limit: 50,
    },
    {
      skip: !activeCommentPost,
      refetchOnMountOrArgChange: true,
    },
  );

  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [sharePost] = useSharePostMutation();
  const [createPostComment, { isLoading: isCreatingComment }] =
    useCreatePostCommentMutation();
  const [createCommentReply, { isLoading: isCreatingReply }] =
    useCreateCommentReplyMutation();

  useEffect(() => {
    if (!feedResponse) return;

    const incomingPosts = feedResponse.data ?? [];

    setPosts((prev) => {
      if (!cursor) {
        return incomingPosts;
      }

      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = incomingPosts.filter((item) => !existingIds.has(item.id));

      return [...prev, ...newItems];
    });
  }, [feedResponse, cursor]);

  useEffect(() => {
    if (!commentsResponse || !activeCommentPost?.id) return;

    const serverComments = extractCommentsFromResponse(
      commentsResponse,
      activeCommentPost.id,
    );

    setComments((prev) => mergeCommentTrees(prev, serverComments));
  }, [commentsResponse, activeCommentPost?.id]);

  const updatePostCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              commentCount: Math.max(0, (item.commentCount ?? 0) + delta),
            }
          : item,
      ),
    );

    setCommentPost((prev) =>
      prev?.id === postId
        ? {
            ...prev,
            commentCount: Math.max(0, (prev.commentCount ?? 0) + delta),
          }
        : prev,
    );
  }, []);

  const openViewer = useCallback((media: PostMedia[], startIndex: number = 0) => {
    setViewer({
      visible: true,
      media,
      index: startIndex,
    });
  }, []);

  const closeViewer = useCallback(() => {
    setViewer((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const openComments = useCallback((post: CommunityPost) => {
    setCommentPost(post);
    setCommentInput("");
    setComments([]);
  }, []);

  const closeComments = useCallback(() => {
    setCommentPost(null);
    setCommentInput("");
    setComments([]);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);

    if (cursor !== undefined) {
      setCursor(undefined);
      return;
    }

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [cursor, refetch, refreshing]);

  useEffect(() => {
    if (!refreshing) return;
    if (cursor !== undefined) return;
    if (isLoading || isFetching) return;

    setRefreshing(false);
  }, [refreshing, cursor, isLoading, isFetching]);

  const loadMorePosts = useCallback(() => {
    if (isLoading || isFetching) return;
    if (!feedResponse?.meta?.hasMore) return;
    if (!feedResponse?.meta?.nextCursor) return;
    if (cursor === feedResponse.meta.nextCursor) return;

    setCursor(feedResponse.meta.nextCursor);
  }, [
    isLoading,
    isFetching,
    cursor,
    feedResponse?.meta?.hasMore,
    feedResponse?.meta?.nextCursor,
  ]);

  const handleLikePost = useCallback(
    async (post: CommunityPost) => {
      if (likingPostIds.has(post.id)) return;

      setLikingPostIds((prev) => {
        const next = new Set(prev);
        next.add(post.id);
        return next;
      });

      const wasLiked = Boolean(post.isLikedByMe);
      const previousLikeCount = post.likeCount ?? 0;

      setPosts((prev) =>
        prev.map((item) => {
          if (item.id !== post.id) return item;

          return {
            ...item,
            isLikedByMe: !wasLiked,
            likeCount: wasLiked
              ? Math.max(0, (item.likeCount ?? 0) - 1)
              : (item.likeCount ?? 0) + 1,
          };
        }),
      );

      setCommentPost((prev) =>
        prev?.id === post.id
          ? {
              ...prev,
              isLikedByMe: !wasLiked,
              likeCount: wasLiked
                ? Math.max(0, (prev.likeCount ?? 0) - 1)
                : (prev.likeCount ?? 0) + 1,
            }
          : prev,
      );

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

        setPosts((prev) =>
          prev.map((item) => {
            if (item.id !== post.id) return item;

            return {
              ...item,
              isLikedByMe: result.liked,
              likeCount:
                typeof result.likeCount === "number"
                  ? result.likeCount
                  : item.likeCount,
            };
          }),
        );

        setCommentPost((prev) =>
          prev?.id === post.id
            ? {
                ...prev,
                isLikedByMe: result.liked,
                likeCount:
                  typeof result.likeCount === "number"
                    ? result.likeCount
                    : prev.likeCount,
              }
            : prev,
        );
      } catch (likeError) {
        console.log("Like/unlike failed:", likeError);

        setPosts((prev) =>
          prev.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  isLikedByMe: wasLiked,
                  likeCount: previousLikeCount,
                }
              : item,
          ),
        );

        setCommentPost((prev) =>
          prev?.id === post.id
            ? {
                ...prev,
                isLikedByMe: wasLiked,
                likeCount: previousLikeCount,
              }
            : prev,
        );
      } finally {
        setLikingPostIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
    },
    [likePost, unlikePost, likingPostIds],
  );

  const handleSharePost = useCallback(
    async (post: CommunityPost) => {
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
          prev.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  shareCount:
                    typeof result.shareCount === "number"
                      ? result.shareCount
                      : (item.shareCount ?? 0) + 1,
                }
              : item,
          ),
        );

        setCommentPost((prev) =>
          prev?.id === post.id
            ? {
                ...prev,
                shareCount:
                  typeof result.shareCount === "number"
                    ? result.shareCount
                    : (prev.shareCount ?? 0) + 1,
              }
            : prev,
        );
      } catch (shareError) {
        console.log("Share post failed:", shareError);
      }
    },
    [sharePost],
  );
const handleCreateComment = useCallback(
  async (replyingTo?: FeedComment | null) => {
    if (!activeCommentPost || !session?.user) return;

    const content = commentInput.trim();
    if (!content) return;

    const tempId = `local-${activeCommentPost.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    const currentAuthor = getSessionUserAsCommentAuthor(session.user);

    setCommentInput("");

    if (replyingTo?.id) {
      /**
       * IMPORTANT:
       * rootCommentId = main/root comment id
       * replyToCommentId = exact comment/reply user clicked Reply on
       *
       * Example:
       * Main comment id = c1
       * Reply id = r1
       *
       * If replying to r1:
       * rootCommentId = c1
       * replyToCommentId = r1
       */
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
      } catch (replyError) {
        console.log("Create reply failed:", replyError);

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
    } catch (commentError) {
      console.log("Create comment failed:", commentError);

      setComments((prev) => prev.filter((item) => item.id !== tempId));
      updatePostCommentCount(activeCommentPost.id, -1);
      setCommentInput(content);
    }
  },
  [
    activeCommentPost,
    commentInput,
    session?.user,
    createPostComment,
    createCommentReply,
    refetchComments,
    updatePostCommentCount,
  ],
);

  const handleCommentPost = useCallback(
    (post: CommunityPost) => {
      openComments(post);
    },
    [openComments],
  );

  const handleAuthorPress = useCallback((authorId: string) => {
    console.log("Author pressed:", authorId);
  }, []);

  const renderPostItem = useCallback(
    ({ item }: { item: CommunityPost }) => {
      return (
        <HomePostItem
          item={item}
          viewerVisible={viewer.visible}
          onPressLike={handleLikePost}
          onPressComment={handleCommentPost}
          onPressShare={handleSharePost}
          onPressAuthor={handleAuthorPress}
          onPressMedia={openViewer}
        />
      );
    },
    [
      viewer.visible,
      handleLikePost,
      handleCommentPost,
      handleSharePost,
      handleAuthorPress,
      openViewer,
    ],
  );

  const keyExtractor = useCallback((item: CommunityPost) => item.id, []);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.accent}
      />
    ),
    [refreshing, handleRefresh, colors.accent],
  );

  const emptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View className="py-10">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (error) {
      return (
        <View className="px-5 py-10">
          <Text
            className="text-center"
            style={{
              color: colors.danger,
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_500Medium",
            }}
          >
            Failed to load posts. Pull down to refresh.
          </Text>
        </View>
      );
    }

    return (
      <View className="px-5 py-10">
        <Text
          className="text-center text-muted"
          style={{
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "Poppins_400Regular",
          }}
        >
          No posts yet.
        </Text>
      </View>
    );
  }, [isLoading, error, colors.accent, colors.danger]);

  const footerComponent = useMemo(() => {
    if (isFetching && posts.length > 0) {
      return (
        <View className="py-5">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (feedResponse && posts.length > 0 && !feedResponse.meta?.hasMore) {
      return (
        <Text
          className="py-5 text-center text-muted"
          style={{
            fontSize: 12,
            fontFamily: "Poppins_400Regular",
          }}
        >
          No more posts.
        </Text>
      );
    }

    return null;
  }, [isFetching, posts.length, feedResponse, colors.accent]);

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text
            className="text-center text-foreground"
            style={{
              fontSize: 18,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Please login first
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-background" edges={[]}>
        <FlatList
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderPostItem}
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={footerComponent}
          removeClippedSubviews
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={80}
          windowSize={5}
        />
      </SafeAreaView>

      <CommentPostModal
        visible={!!commentPost}
        post={activeCommentPost}
        comments={comments}
        isLoading={(isLoadingComments || isFetchingComments) && comments.length === 0}
        isCreating={isCreatingComment || isCreatingReply}
        inputValue={commentInput}
        onChangeInput={setCommentInput}
        onClose={closeComments}
        onSubmit={handleCreateComment}
        onPressMedia={openViewer}
        onPressPostLike={handleLikePost}
        onPressPostShare={handleSharePost}
        onRefreshComments={() => {
          void refetchComments();
        }}
        colors={colors}
      />

      <PostMediaViewer
        visible={viewer.visible}
        media={viewer.media}
        initialIndex={viewer.index}
        onClose={closeViewer}
      />
    </>
  );
}