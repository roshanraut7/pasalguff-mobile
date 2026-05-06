export type FriendshipStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "BLOCKED";

export type FriendUser = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  businessName: string | null;
  displayName: string;
  createdAt: string;
};

export type FriendRequest = {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendshipStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  otherUser: FriendUser;
};

export type FriendListResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters?: Record<string, unknown>;
};

export type GetFriendRequestsArgs = {
  page?: number;
  limit?: number;
};

export type SendFriendRequestArgs = {
  receiverId: string;
  message?: string;
};

export type SendFriendRequestResponse = {
  message: string;
  request: FriendRequest;
};

export type FriendActionResponse = {
  message: string;
  request?: FriendRequest;
};

/* =========================================================
   PUBLIC PROFILE TYPES
   ========================================================= */

export type PublicProfileFriendship = {
  id: string;
  status: FriendshipStatus;
  direction: "INCOMING" | "OUTGOING";
  createdAt: string;
  acceptedAt: string | null;
};

export type PublicProfileSharedCommunity = {
  id: string;
  name: string;
  slug: string;
  avatarImage: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
};

export type PublicUserProfile = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  businessType: string | null;
  image: string | null;
  coverImage: string | null;
  displayName: string;
  createdAt: string;
  friendship: PublicProfileFriendship | null;
  sharedCommunities: PublicProfileSharedCommunity[];
};

export type PublicProfilePost = {
  id: string;
  content: string | null;
  linkUrl: string | null;
  type: string;
  tag: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  editedAt: string | null;
  community: {
    id: string;
    name: string;
    slug: string;
    visibility: "PUBLIC" | "PRIVATE";
    avatarImage: string | null;
  };
  media: {
    id: string;
    type: "IMAGE" | "VIDEO";
    url: string;
    sortOrder: number;
  }[];
  engagement: {
    likeCount: number;
    commentCount: number;
    shareCount: number;
  };
};

export type PublicProfileCommunity = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarImage: string | null;
  coverImage: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  createdAt: string;
  memberCount: number;
  postCount: number;
};

export type PublicProfilePageArgs = {
  userId: string;
  page?: number;
  limit?: number;
};