/* =========================================================
   BASIC TYPES
   ========================================================= */

export type CommunityPostType = "TEXT" | "MEDIA" | "LINK";

export type CommunityPostTag =
  | "GENERAL"
  | "ANNOUNCEMENT"
  | "QUESTION"
  | "OFFER"
  | "EVENT"
  | "NEWS"
  | "HELP";

export type CommunityPostMediaType = "IMAGE" | "VIDEO";

export type CommunityPostStatus = "DRAFT" | "PUBLISHED" | "DELETED";

export type CommunityVisibility = "PUBLIC" | "PRIVATE";

export type AdminPostSortBy =
  | "newest"
  | "oldest"
  | "mostLiked"
  | "mostCommented"
  | "mostShared";

export type FeedSortBy = "newest" | "oldest";

/* =========================================================
   COMMON RESPONSE TYPES
   ========================================================= */

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

export type PageMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PageResponse<T> = {
  data: T[];
  meta: PageMeta;
  filters?: Record<string, unknown>;
};

/* =========================================================
   POST RESPONSE TYPES
   ========================================================= */

export type PostMedia = {
  id: string;
  type: CommunityPostMediaType;
  url: string;
  sortOrder: number;
};

export type PostCommunity = {
  id: string;
  name: string;
  slug: string;
  visibility: CommunityVisibility;
};

export type PostAuthor = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  image: string | null;
  businessName: string;
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
  community: PostCommunity;
  author: PostAuthor;
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLikedByMe: boolean;
};

export type PostCommentAuthor = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  image: string | null;
  businessName: string;
};

export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  status: "ACTIVE" | "DELETED";
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author: PostCommentAuthor;
  replies?: PostComment[];
  replyCount?: number;
};

/* =========================================================
   ADMIN POST RESPONSE TYPES
   ========================================================= */

export type AdminPost = {
  id: string;

  post: {
    content: string | null;
    linkUrl: string | null;
    type: CommunityPostType;
    tag: CommunityPostTag;
    status: "PUBLISHED";
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    editedAt: string | null;
  };

  media: {
    total: number;
    imageCount: number;
    videoCount: number;
    items: PostMedia[];
  };

  community: {
    id: string;
    name: string;
    slug: string;
    visibility: CommunityVisibility;
    status: "ACTIVE";
    avatarImage: string | null;
  };

  author: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    businessName: string;
    image: string | null;
    displayName: string;
  };

  engagement: {
    likeCount: number;
    commentCount: number;
    shareCount: number;
  };

  table: {
    postPreview: string;
    visibility: CommunityVisibility;
    publishedAt: string;
  };
};

/* =========================================================
   PAYLOAD TYPES
   ========================================================= */

export type CreatePostMediaPayload = {
  type?: CommunityPostMediaType;
  url: string;
  sortOrder?: number;
};

export type CreateCommunityPostPayload = {
  content?: string;
  linkUrl?: string;
  tag?: CommunityPostTag;
  media?: CreatePostMediaPayload[];
};

export type UpdateCommunityPostPayload = {
  content?: string;
  linkUrl?: string;
  tag?: CommunityPostTag;
  media?: CreatePostMediaPayload[];
};

export type CreatePostCommentPayload = {
  content: string;
};

export type UpdatePostCommentPayload = {
  content: string;
};

export type SharePostPayload = {
  platform?: string;
};

/* =========================================================
   QUERY ARG TYPES
   ========================================================= */

export type GetCommunityPostsArgs = {
  communityId: string;
  limit?: number;
  cursor?: string | null;
  search?: string;
  tag?: CommunityPostTag;
  type?: CommunityPostType;
  sortBy?: FeedSortBy;
};

export type GetCommunityPostArgs = {
  communityId: string;
  postId: string;
};

export type CreateCommunityPostArgs = {
  communityId: string;
  body: CreateCommunityPostPayload;
};

export type UpdateCommunityPostArgs = {
  communityId: string;
  postId: string;
  body: UpdateCommunityPostPayload;
};

export type PostActionArgs = {
  communityId: string;
  postId: string;
};

export type SharePostArgs = {
  communityId: string;
  postId: string;
  body: SharePostPayload;
};

export type GetMyPostsArgs = {
  limit?: number;
  cursor?: string | null;
  communityId?: string;
  search?: string;
  sortBy?: FeedSortBy;
};

export type GetPostCommentsArgs = {
  communityId: string;
  postId: string;
  limit?: number;
  cursor?: string | null;
};

export type CreatePostCommentArgs = {
  communityId: string;
  postId: string;
  body: CreatePostCommentPayload;
};

export type GetCommentRepliesArgs = {
  communityId: string;
  postId: string;
  commentId: string;
  limit?: number;
  cursor?: string | null;
};

export type CreateCommentReplyArgs = {
  communityId: string;
  postId: string;
  commentId: string;
  body: CreatePostCommentPayload;
};

export type UpdateCommentArgs = {
  communityId: string;
  postId: string;
  commentId: string;
  body: UpdatePostCommentPayload;
};

export type DeleteCommentArgs = {
  communityId: string;
  postId: string;
  commentId: string;
};

export type GetAdminPostsArgs = {
  page?: number;
  limit?: number;
  search?: string;
  communityId?: string;
  authorId?: string;
  visibility?: CommunityVisibility;
  tag?: CommunityPostTag;
  type?: CommunityPostType;
  sortBy?: AdminPostSortBy;
};

/* =========================================================
   MUTATION RESPONSE TYPES
   ========================================================= */

export type LikePostResponse = {
  message: string;
  liked: boolean;
  likeCount: number;
};

export type SharePostResponse = {
  message: string;
  shareCount: number;
};

export type DeletePostResponse = {
  message: string;
  post: CommunityPost;
};

export type DeleteCommentResponse = {
  message: string;
  comment: PostComment;
};