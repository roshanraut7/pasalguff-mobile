// lib/post-comment-utils.ts

import type { FeedComment } from "./comment";

type CommentLike = FeedComment & {
  children?: FeedComment[];
  comment?: FeedComment;
  data?: FeedComment;
};

export function getSessionUserAsCommentAuthor(sessionUser: unknown) {
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
    email: user.email ?? null,
    image: user.image ?? null,
  };
}

export function unwrapCommentPayload(value: unknown): FeedComment {
  const payload = value as {
    data?: unknown;
    comment?: unknown;
    result?: unknown;
  };

  const nestedData = payload?.data as
    | {
        comment?: unknown;
        data?: unknown;
      }
    | undefined;

  return (
    (nestedData?.comment as FeedComment | undefined) ??
    (nestedData?.data as FeedComment | undefined) ??
    (payload?.comment as FeedComment | undefined) ??
    (payload?.result as FeedComment | undefined) ??
    (payload?.data as FeedComment | undefined) ??
    (value as FeedComment)
  );
}

export function getCommentCreatedAt(comment: FeedComment) {
  const time = new Date(comment.createdAt ?? 0).getTime();

  return Number.isNaN(time) ? 0 : time;
}

export function sortCommentsNewestFirst(items: FeedComment[]) {
  return [...items].sort(
    (a, b) => getCommentCreatedAt(b) - getCommentCreatedAt(a),
  );
}

export function sortRepliesOldestFirst(items: FeedComment[]) {
  return [...items].sort(
    (a, b) => getCommentCreatedAt(a) - getCommentCreatedAt(b),
  );
}

export function addUniqueById(items: FeedComment[], incoming: FeedComment) {
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

export function getRawCommentsArray(response: unknown) {
  const payload = response as {
    data?: unknown;
    comments?: unknown;
    items?: unknown;
    results?: unknown;
  };

  const data = payload?.data as
    | {
        data?: unknown;
        comments?: unknown;
        items?: unknown;
        results?: unknown;
      }
    | undefined;

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

export function flattenCommentWithReplies(
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

export function buildCommentTree(rawComments: FeedComment[]) {
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

      parent.replyCount = Math.max(
        parent.replyCount ?? 0,
        parent.replies.length,
      );

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

export function extractCommentsFromResponse(
  response: unknown,
  postId?: string,
) {
  const raw = getRawCommentsArray(response);

  const filtered = raw.filter(
    (comment) => !postId || !comment.postId || comment.postId === postId,
  );

  return buildCommentTree(filtered);
}

export function mergeCommentTrees(
  current: FeedComment[],
  incoming: FeedComment[],
) {
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
      replies: sortRepliesOldestFirst(
        [...(existing?.replies ?? []), ...(comment.replies ?? [])].reduce<
          FeedComment[]
        >((acc, reply) => addUniqueById(acc, reply), []),
      ),
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
    replyCount: Math.max(comment.replyCount ?? 0, comment.replies?.length ?? 0),
  }));
}

export function normalizeCreatedComment(
  payload: unknown,
  fallback: FeedComment,
) {
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

export function replaceRootComment(
  comments: FeedComment[],
  tempId: string,
  createdComment: FeedComment,
) {
  return comments
    .filter((item) => item.id !== createdComment.id || item.id === tempId)
    .map((item) => (item.id === tempId ? createdComment : item));
}

export function addReplyToComment(
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

export function replaceReplyInComment(
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