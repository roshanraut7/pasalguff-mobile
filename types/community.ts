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
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  filters?: Record<string, unknown>;
};

/* =========================================================
   COMMUNITY BASIC TYPES
   ========================================================= */

export type CommunityRole = "ADMIN" | "MODERATOR" | "MEMBER";

export type CommunityVisibility = "PUBLIC" | "PRIVATE" | "RESTRICTED" |"BUSINESS";

export type CommunityStatus = "ACTIVE" | "INACTIVE";

export type CommunityMemberStatus = "ACTIVE" | "LEFT" | "BANNED";
export type CommunityPurpose = "GENERAL" | "DISTRICT_OFFICIAL" | "BUSINESS";

export type CommunityJoinRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type CommunitySortBy = "newest" | "oldest" | "name_asc" | "name_desc";

export type BusinessCommunityKind =
  | "BUSINESS"
  | "INSTITUTE";

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
  purpose: CommunityPurpose;

  /**
   * Null for GENERAL and DISTRICT_OFFICIAL communities.
   */
  communityKind?:
    | BusinessCommunityKind
    | null;

  isBusinessCommunity?: boolean;
  isInstituteCommunity?: boolean;

  categoryId?: string;
  adminId?: string;

  createdAt?: string;
  updatedAt?: string;

  myJoinRequestId?: string | null;

  myJoinRequestStatus?:
    | CommunityJoinRequestStatus
    | null;

  isOwner: boolean;

  category?: CommunityCategory | null;

  postCount: number;
  memberCount: number;

  isJoined: boolean;

  myRole:
    | CommunityRole
    | null;

  myMemberStatus:
    | CommunityMemberStatus
    | null;
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
  joinRequestStatus:any;
  
};

export type CommunityMemberUser = {
  id: string;
  name: string | null;
  image?: string | null;
  firstName?: string | null; 
  lastName?: string | null;
  businessName?: string| null;

  /**
   * These only come for owner/admin/member manager.
   */
  email?: string | null;
  role?: string | null;
  createdAt?: string | null;
};
export type CommunityMemberItem = {
  id: string;
  communityId: string;
  userId: string;

  role: CommunityRole;

  /**
   * Management member endpoints return status.
   * Some public member endpoints may omit it.
   */
  status?: CommunityMemberStatus;

  joinedAt: string;

  /**
   * Student fields are meaningful only for
   * institute communities.
   */
  isVerifiedStudent?: boolean;
  studentBatch?: string | null;

  permissions?: CommunityPermissions;

  /**
   * Some existing moderator screens use
   * permission fields directly.
   */
  canEditCommunity?: boolean;
  canManageMembers?: boolean;
  canManagePosts?: boolean;
  canManageComments?: boolean;
  canManageReports?: boolean;

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


export type VisibleCommunityMembersQuery = {
  communityId: string;
  page?: number;
  limit?: number;
  search?: string;
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

export type CommunityMembersResponse =
  PaginatedResponse<CommunityMemberItem> & {
    community: {
      id: string;
      name: string;
      slug: string;

      visibility:
        CommunityVisibility;

      purpose:
        CommunityPurpose;

      communityKind:
        | BusinessCommunityKind
        | null;

      isBusinessCommunity:
        boolean;

      isInstituteCommunity:
        boolean;
    };

    viewer: {
      isOwner: boolean;
      canManageMembers: boolean;

      role:
        | CommunityRole
        | null;

      status:
        | CommunityMemberStatus
        | null;
    };

    filters: {
      search:
        | string
        | null;

      status:
        CommunityMemberStatus;
    };
  };
export type CommunityModeratorsResponse =
  PaginatedResponse<CommunityMemberItem> & {
    community: {
      id: string;
      name: string;
      slug: string;

      visibility:
        CommunityVisibility;

      purpose?:
        CommunityPurpose;

      communityKind?:
        | BusinessCommunityKind
        | null;

      isBusinessCommunity?:
        boolean;

      isInstituteCommunity?:
        boolean;
    };

    viewer: {
      isOwner: boolean;
      canManageMembers: boolean;

      role:
        | CommunityRole
        | null;

      status:
        | CommunityMemberStatus
        | null;
    };

    filters: {
      search:
        | string
        | null;

      status:
        CommunityMemberStatus;
    };
  };

export type ModeratorListQuery = {
  communityId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: CommunityMemberStatus;
};

export type CommunityDashboardOverviewResponse = {
  community: {
    id: string;
    name: string;
    slug: string;

    visibility:
      CommunityVisibility;

    purpose:
      CommunityPurpose;

    communityKind:
      | BusinessCommunityKind
      | null;

    isBusinessCommunity:
      boolean;

    isInstituteCommunity:
      boolean;
  };

  kpis: {
    members: number;
    posts: number;
    banned: number;
    moderators: number;

    pendingJoinRequests:
      number;

    verifiedStudents:
      number;
  };

  chartFilter: {
    year: number;

    month:
      | number
      | null;

    mode:
      | "DAILY"
      | "MONTHLY";
  };

  growth: {
    members: {
      value: number;
      label: string;
    }[];

    posts: {
      value: number;
      label: string;
    }[];
  };

  viewer: {
    isOwner: boolean;

    role:
      | CommunityRole
      | null;

    canEditCommunity:
      boolean;

    canManageMembers:
      boolean;

    canManagePosts:
      boolean;

    canManageComments:
      boolean;

    canManageReports:
      boolean;
  };
};
 export type CommunityDashboardOverviewQuery = {
  communityId: string;
  year: number;
  month?: number | null;
};