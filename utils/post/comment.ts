// types/comment.ts

export type CommentAuthor = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  email?: string | null;
  image?: string | null;
};

export type FeedComment = {
  id: string;

  postId?: string | null;
  authorId?: string | null;
  parentId?: string | null;

  content: string;

  status?: string | null;

  createdAt?: string;
  updatedAt?: string;
  editedAt?: string | null;
  deletedAt?: string | null;

  likeCount?: number | null;
  isLikedByMe?: boolean | null;

  author?: CommentAuthor | null;

  replies?: FeedComment[];
  replyCount?: number;
};

export type CommentTreeItem = FeedComment & {
  replies: FeedComment[];
  replyCount: number;
};

export type CreateCommentBody = {
  content: string;
};

export type CreateReplyBody = {
  content: string;
  replyToCommentId?: string | null;
};