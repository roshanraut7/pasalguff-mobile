/* =========================================================
   COMMON RESPONSE TYPES
   ========================================================= */

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters?: Record<string, unknown>;
};

/* =========================================================
   COMMUNITY BASIC TYPES
   ========================================================= */

export type CommunityRole = "ADMIN" | "MODERATOR" | "MEMBER";

export type CommunityVisibility = "PUBLIC" | "PRIVATE";

export type CommunityStatus = "ACTIVE" | "INACTIVE";

export type CommunityMemberStatus = "ACTIVE" | "LEFT" | "BANNED";

export type CommunityJoinRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type CommunitySortBy = "newest" | "oldest" | "name_asc" | "name_desc";

/* =========================================================
   PERMISSION TYPES
   ========================================================= */

export type CommunityPermissions = {
  canEditCommunity: boolean;
  canManageMembers: boolean;
  canManagePosts: boolean;
  canManageComments: boolean;
  canManageReports: boolean;
};

/* =========================================================
   COMMUNITY RESPONSE TYPES
   ========================================================= */

export type CommunityCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CommunityItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarImage?: string | null;
  coverImage?: string | null;
  visibility: CommunityVisibility;
  status: CommunityStatus;
  categoryId?: string;
  adminId?: string;
  createdAt?: string;
  updatedAt?: string;

  category?: CommunityCategory | null;

  postCount: number;
  memberCount: number;

  isJoined: boolean;
  myRole: CommunityRole | null;
  myMemberStatus: CommunityMemberStatus | null;

  canEditCommunity: boolean;
  canManageMembers: boolean;
  canManagePosts: boolean;
  canManageComments: boolean;
  canManageReports: boolean;
};

export type CommunityAccessItem = {
  communityId: string;
  slug: string;
  visibility: CommunityVisibility;
  isMember: boolean;
  role: CommunityRole | null;
  memberStatus: CommunityMemberStatus | null;
  canView: boolean;
  canPost: boolean;
  canManage: boolean;
  permissions: CommunityPermissions;
};

export type CommunityMemberUser = {
  id: string;
  email?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
  businessName?: string;
};

export type CommunityMemberItem = {
  id: string;
  role: CommunityRole;
  status: CommunityMemberStatus;
  joinedAt: string;
  updatedAt: string;
  canEditCommunity: boolean;
  canManageMembers: boolean;
  canManagePosts: boolean;
  canManageComments: boolean;
  canManageReports: boolean;
  user: CommunityMemberUser;
};

export type CommunityJoinRequestItem = {
  id: string;
  status: CommunityJoinRequestStatus;
  message?: string | null;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  user?: CommunityMemberUser;
};

/* =========================================================
   PAYLOAD TYPES
   ========================================================= */

export type CreateCommunityPayload = {
  name: string;
  categoryId: string;
  description?: string;
  avatarImage?: string;
  coverImage?: string;
  visibility?: CommunityVisibility;
};

export type UpdateCommunityPayload = {
  communityId: string;
  name?: string;
  categoryId?: string;
  description?: string;
  avatarImage?: string;
  coverImage?: string;
  visibility?: CommunityVisibility;
};

export type JoinCommunityPayload =
  | string
  | {
      communityId: string;
      message?: string;
    };

export type AssignCommunityModeratorPayload = {
  communityId: string;
  targetUserId: string;
  canEditCommunity?: boolean;
  canManageMembers?: boolean;
  canManagePosts?: boolean;
  canManageComments?: boolean;
  canManageReports?: boolean;
};

export type UpdateModeratorPermissionsPayload = {
  communityId: string;
  targetUserId: string;
  canEditCommunity?: boolean;
  canManageMembers?: boolean;
  canManagePosts?: boolean;
  canManageComments?: boolean;
  canManageReports?: boolean;
};

export type TransferCommunityAdminPayload = {
  communityId: string;
  newAdminUserId: string;
};

export type ReviewCommunityJoinRequestPayload = {
  communityId: string;
  requestId: string;
  action: "APPROVE" | "REJECT";
};

export type BanCommunityMemberPayload = {
  communityId: string;
  targetUserId: string;
  reason?: string;
};

export type CommunityIdTargetUserPayload = {
  communityId: string;
  targetUserId: string;
};

/* =========================================================
   QUERY TYPES
   ========================================================= */

export type CommunityListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  visibility?: CommunityVisibility;
  sortBy?: CommunitySortBy;
};

export type MemberListQuery = {
  communityId: string;
  page?: number;
  limit?: number;
  search?: string;
  role?: CommunityRole;
  status?: CommunityMemberStatus;
};

export type JoinRequestListQuery = {
  communityId: string;
  page?: number;
  limit?: number;
  status?: CommunityJoinRequestStatus;
};

/* =========================================================
   SIMPLE RESPONSE TYPES
   ========================================================= */

export type CommunityStatusResponse = {
  message: string;
  community: CommunityItem;
};