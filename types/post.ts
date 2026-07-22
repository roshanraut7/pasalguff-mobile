/* =========================================================
   BASIC TYPES
   ========================================================= */

import { VerificationTrack } from "@/store/api/verificationApi";

export type CommunityPostType =
  | "TEXT"
  | "MEDIA"
  | "LINK"
  | "POLL"
  | "SHARE"
  | "LIVE_HIGHLIGHT"; // <-- ADD THIS

export type PostVisibility =
  | "PUBLIC"
  | "COMMUNITY"
  | "FOLLOWERS"
  | "PRIVATE";

export type CommunityPostTag =
  | "GENERAL"
  | "ANNOUNCEMENT"
  | "QUESTION"
  | "OFFER"
  | "EVENT"
  | "NEWS"
  | "HELP";

export type CommunityPostMediaType = "IMAGE";

export type CommunityPostStatus = "DRAFT" | "PUBLISHED" | "DELETED";

export type CommunityCommentStatus = "ACTIVE" | "DELETED";

export type CommunityVisibility = "PUBLIC" | "PRIVATE" | "RESTRICTED";
export type CommunityPostLinkType =
  | "VIDEO"
  | "IMAGE"
  | "WEBSITE";

export type CommunityPostLinkProvider =
  | "YOUTUBE"
  | "DIRECT"
  |"TIKTOK"
  | "EXTERNAL";

export type AdminPostSortBy =
  | "newest"
  | "oldest"
  | "mostLiked"
  | "mostCommented"
  | "mostShared";

export type FeedSortBy = "newest" | "oldest";
export type HomeFeedType ="FOR_YOU" | "COMMUNITY";
export type SharedPostPreview = {
  id: string;
  communityId: string;
  authorId: string;
  type: string;
  title: string | null;
  content: string | null;
  status: string;
  linkUrl: string | null;
  linkType: string | null;
  linkProvider: string | null;
  linkThumbnailUrl: string | null;
  createdAt: string;
  publishedAt: string | null;
  community: { id: string; name: string; slug: string; avatarImage: string | null; visibility?: string } | null;
  author: PostAuthor; 
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
};

/**
 * Optional aliases.
 * These are useful if some older files still use PostType, PostTag, or PostMediaType.
 */
export type PostType = CommunityPostType;
export type PostTag = CommunityPostTag;
export type PostMediaType = CommunityPostMediaType;
export type DislikePostBody = {
  reason: string;
};

export type DislikePostArgs = {
  communityId: string;
  postId: string;
  body: DislikePostBody;
};

export type PostReactionResponse = {
  message: string;
  likeCount: number;
  dislikeCount: number;
  liked: boolean;
  disliked: boolean;
  myDislikeReason: string | null;
  approvalRate: number | null;
};

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

export type PostPollOption = {
  id: string;
  text: string;
  sortOrder: number;
  voteCount: number;
  percentage: number;
  isVotedByMe?: boolean;
};

export type PostPoll = {
  id: string;
  question: string;
  isClosed: boolean;
  closesAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  totalVotes: number;
  hasVotedByMe?: boolean;
  options: PostPollOption[];
};

export type PostCommunity = {
  id: string;
  name: string;
  slug: string;
  visibility: CommunityVisibility;
  avatarImage?: string | null;
  isJoinedByMe?: boolean;
  isMember?: boolean;
  isCommunityFollowedByMe?: boolean;
   isOwner?: boolean;
  myRole?: "ADMIN" | "MODERATOR" | "MEMBER" | null;
  purpose:"BUSINESS" 
};

export type PostAuthor = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  businessName: string | null;
  isVerified: boolean;                          // add
  verificationTrack: VerificationTrack | null; 
    isVerifiedStudentHere?: boolean;
};

export type CommunityPost = {
  id: string;
  communityId: string;
  authorId: string;

  title: string | null;

  type: CommunityPostType;
  tag: CommunityPostTag;
  status: CommunityPostStatus;
  visibility: PostVisibility;
  isLiveHighlight?: boolean;
  highlightDiscussionId?: string | null;
  highlightParticipantCount?: number | null;
  highlightMessageCount?: number | null;
  highlightDurationMinutes?: number | null;
  shareUrl?: string;   // your formatPostResponse also returns this, currently unused on frontend
  // --------------------


  content: string | null;
  linkUrl: string | null;
   linkType?: CommunityPostLinkType | null;
  linkProvider?: CommunityPostLinkProvider | null;
  linkExternalId?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkThumbnailUrl?: string | null;
  dislikeCount: number;
isDislikedByMe: boolean;
myDislikeReason: string | null;
approvalRate: number | null;

  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;

  community: PostCommunity;
  author: PostAuthor;
  media: PostMedia[];
  

  poll: PostPoll | null;
   sharedPostId?: string | null;          // <-- ADD THIS
  sharedPost?: SharedPostPreview | null; 

  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLikedByMe: boolean;
     // ✅ ADD THESE OPTIONAL FIELDS
  isJoinedByMe?: boolean;
  isMember?: boolean;
  isCommunityFollowedByMe?: boolean;
  
};

export type PostCommentAuthor = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  businessName: string | null;
};

export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  status: CommunityCommentStatus;
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
    title: string | null;
    content: string | null;
    linkUrl: string | null;
    type: CommunityPostType;
    tag: CommunityPostTag;
    status: "PUBLISHED";
    visibility: PostVisibility;
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
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
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
    visibility: PostVisibility;
    publishedAt: string | null;
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

export type CreatePostPollPayload = {
  question: string;
  options: string[];
  closesAt?: string | null;
};

export type CreateCommunityPostPayload = {
  title?: string;
  content?: string;
  linkUrl?: string;
  tag?: CommunityPostTag;
  visibility?: PostVisibility;
  media?: CreatePostMediaPayload[];
  poll?: CreatePostPollPayload;
};
export type ShareType = "FRIENDS" | "FOLLOWING" | "OTHER" | "FEED";
export type UpdateCommunityPostPayload = {
  title?: string | null;
  content?: string | null;
  linkUrl?: string | null;
  tag?: CommunityPostTag;
  visibility?: PostVisibility;
  media?: CreatePostMediaPayload[];

  /**
   * Keep this optional only if your backend later supports poll update.
   * For now your updatePost service does not update poll.
   */
  poll?: CreatePostPollPayload;
};

export type CreatePostCommentPayload = {
  content: string;
};

export type UpdatePostCommentPayload = {
  content: string;
};

export type SharePostPayload = {
  shareType: ShareType;
  platform?: string;
  message?: string;
  targetUserIds?: string[];
};
export type VotePostPollPayload = {
  optionId: string;
};
export type SharePostToFeedPayload = {
  targetCommunityId: string;
  content?: string;
  visibility?: PostVisibility;
};

export type SharePostToFeedArgs = {
  postId: string;
  body: SharePostToFeedPayload;
};

export type SharePostToFeedResponse = CommunityPost;

/* =========================================================
   QUERY ARG TYPES
   ========================================================= */

export type GetCommunityPostsArgs = {
  communityId: string;
  feedType?:HomeFeedType;
  limit?: number;
  cursor?: string | null;
  search?: string;
  tag?: CommunityPostTag;
  type?: CommunityPostType;
  sortBy?: FeedSortBy;
};
export type GetHomeFeedPostsArgs = {
  feedType?: HomeFeedType;
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

export type VotePostPollArgs = {
  communityId: string;
  postId: string;
  body: VotePostPollPayload;
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
  body: {
    content: string;

    /**
     * This is the exact comment/reply clicked by user.
     * Example: user clicked reply on r1, send r1 here.
     */
    replyToCommentId?: string;
  };
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

  /**
   * This should be PostVisibility, not CommunityVisibility,
   * because post visibility can be PUBLIC, COMMUNITY, FOLLOWERS, PRIVATE.
   */
  visibility?: PostVisibility;

  tag?: CommunityPostTag;
  type?: CommunityPostType;
  sortBy?: AdminPostSortBy;
};

/* =========================================================
   MUTATION RESPONSE TYPES
   ========================================================= */

export type LikePostResponse = PostReactionResponse;

export type SharePostResponse = {
  message: string;
  shareCount: number;
};

export type VotePostPollResponse = {
  message: string;
  post: CommunityPost;
};

export type DeletePostResponse = {
  message: string;
  post: CommunityPost;
};

export type DeleteCommentResponse = {
  message: string;
  comment: PostComment;
};

/* =========================================================
   USER COMMUNITY POSTS TABLE
   ========================================================= */

export type CommunityPostTableItem = {
  id: string;
  communityId: string;
  authorId: string;

  title: string | null;

  type: CommunityPostType | string;
  tag: CommunityPostTag | string | null;
  status: CommunityPostStatus | "HIDDEN" | "REMOVED" | string;
  visibility?: PostVisibility | string;

  content: string | null;
  linkUrl: string | null;

  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  editedAt?: string | null;

  author: {
    id: string;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
    image?: string | null;
  };

  media: {
    id: string;
    type: string;
    url: string;
    sortOrder: number;
  }[];

  poll: PostPoll | null;

  likeCount: number;
  commentCount: number;
  shareCount: number;
};

export type CommunityPostsTableResponse = {
  data: CommunityPostTableItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  community: {
    id: string;
    name: string;
    slug: string;
    visibility: CommunityVisibility | string;
  };
  viewer: {
    isOwner: boolean;
    isActiveMember: boolean;
    canManagePosts: boolean;
    role: string | null;
  };
  filters: {
    search: string | null;
    status?: string | null;
    type: string | null;
    tag: string | null;
    visibility?: string | null;
    sortBy: string;
  };
};

export type CommunityPostsTableQuery = {
  communityId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: "PUBLISHED" | "HIDDEN" | "REMOVED";
  type?: CommunityPostType;
  tag?: string;
  visibility?: PostVisibility;
  sortBy?: "newest" | "oldest";
};


export type ContributorRequestStatus =
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "NOT_REQUIRED";

export type ContributorRequestUser = {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
 avatarImage?:  string | null;
};

export type ContributorRequestItem = {
  id: string;
  communityId: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  message: string | null;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: ContributorRequestUser;
  avatarImage?:  string | null;
};

export type MyContributorStatusResponse = {
  status: ContributorRequestStatus;
  isOwner: boolean;
  request: ContributorRequestItem | null;
};

export type ContributorRequestListResponse = {
  data: ContributorRequestItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: { status: string };
};

export type RequestContributorAccessArgs = {
  communityId: string;
  message?: string;
};

export type GetContributorRequestsArgs = {
  communityId: string;
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
};

export type ReviewContributorRequestArgs = {
  communityId: string;
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  note?: string;
};