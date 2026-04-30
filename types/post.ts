export type CursorMeta = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type CursorResponse<T> = {
  data: T[];
  meta: CursorMeta;
  filters?: Record<string, unknown>;
};

export type CommunityPostTag =
  | "GENERAL"
  | "ANNOUNCEMENT"
  | "QUESTION"
  | "OFFER"
  | "EVENT"
  | "NEWS"
  | "HELP";

export type CommunityPostMediaType = "IMAGE" | "VIDEO";
export type CommunityPostType = "TEXT" | "MEDIA" | "LINK";
export type CommunityPostStatus = "DRAFT" | "PUBLISHED" | "DELETED";

export type CommunityPostMedia = {
  id?: string;
  type?: CommunityPostMediaType;
  url: string;
  sortOrder?: number;
};

export type CommunityPost = {
  id: string;
  communityId: string;
  authorId: string;
  type: CommunityPostType;
  tag: CommunityPostTag;
  status: CommunityPostStatus;
  content: string | null;
  linkUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  community?: {
    id: string;
    name: string;
    slug: string;
    visibility: "PUBLIC" | "PRIVATE";
  };
  author?: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    image?: string | null;
    businessName?: string;
  };
  media: CommunityPostMedia[];

  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLikedByMe: boolean;
};

export type CreateCommunityPostPayload = {
  tag?: CommunityPostTag;
  content?: string;
  linkUrl?: string;
  media?: CommunityPostMedia[];
};

export type UpdateCommunityPostPayload = {
  tag?: CommunityPostTag;
  content?: string;
  linkUrl?: string | null;
  media?: CommunityPostMedia[];
};

export type PostCommentStatus = "ACTIVE" | "DELETED";

export type PostCommentAuthor = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
  businessName?: string;
};

export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string | null;
  displayText: string | null;
  status: PostCommentStatus;
  author: PostCommentAuthor;
  replyCount: number;
  repliesPreview: PostComment[];
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type CreatePostCommentPayload = {
  content: string;
};

export type UpdatePostCommentPayload = {
  content: string;
};

export type SharePostPayload = {
  platform?: "copy_link" | "facebook" | "whatsapp" | "messenger" | string;
};