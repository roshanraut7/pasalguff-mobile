import { baseApi } from "./baseApi";

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

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

export type CreateCategoryPayload = {
  name: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export type CommunityRole = "ADMIN" | "MODERATOR" | "MEMBER";
export type CommunityVisibility = "PUBLIC" | "PRIVATE";
export type CommunityStatus = "ACTIVE" | "INACTIVE";
export type CommunityMemberStatus = "ACTIVE" | "LEFT" | "BANNED";

export type CommunityPermissions = {
  canEditCommunity: boolean;
  canManageMembers: boolean;
  canManagePosts: boolean;
  canManageComments: boolean;
  canManageReports: boolean;
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

  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;

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
  user: {
    id: string;
    email?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    image?: string | null;
    businessName?: string;
  };
};

export type CommunityJoinRequestItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  message?: string | null;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  user?: {
    id: string;
    email?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    image?: string | null;
    businessName?: string;
  };
};

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

export type CommunityListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  visibility?: CommunityVisibility;
  sortBy?: "newest" | "oldest" | "name_asc" | "name_desc";
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
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
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

export const communityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Categories
     */
    getCategories: builder.query<CategoryItem[], void>({
      query: () => ({
        url: "/categories",
        method: "GET",
      }),
      providesTags: [{ type: "Category", id: "LIST" }],
      keepUnusedDataFor: 300,
    }),

    createCategory: builder.mutation<CategoryItem, CreateCategoryPayload>({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),

    /**
     * Explore communities
     *
     * Backend response:
     * {
     *   data: CommunityItem[],
     *   meta: { total, page, limit, totalPages },
     *   filters: {...}
     * }
     */
    getExploreCommunities: builder.query<
      PaginatedResponse<CommunityItem>,
      CommunityListQuery | void
    >({
      query: (params) => ({
        url: "/communities/explore",
        method: "GET",
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
          ...(params?.visibility ? { visibility: params.visibility } : {}),
          ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
        },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              { type: "Community", id: "LIST" },
              ...result.data.map((community) => ({
                type: "Community" as const,
                id: community.id,
              })),
            ]
          : [{ type: "Community", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    /**
     * My joined communities.
     *
     * Includes communities where current user is ACTIVE member.
     * Admin-created communities also appear here with myRole = ADMIN.
     */
    getMyCommunities: builder.query<
      PaginatedResponse<CommunityItem>,
      CommunityListQuery | void
    >({
      query: (params) => ({
        url: "/communities/my",
        method: "GET",
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
          ...(params?.visibility ? { visibility: params.visibility } : {}),
          ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
        },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              { type: "MyCommunity", id: "LIST" },
              ...result.data.map((community) => ({
                type: "Community" as const,
                id: community.id,
              })),
            ]
          : [{ type: "MyCommunity", id: "LIST" }],
    }),

    /**
     * Community by slug.
     */
    getCommunityBySlug: builder.query<CommunityItem, string>({
      query: (slug) => ({
        url: `/communities/${slug}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [{ type: "Community", id: result.id }]
          : [{ type: "Community", id: "DETAIL" }],
    }),

    /**
     * Community details by ID.
     *
     * Useful when frontend already has communityId from post, notification,
     * joined communities, moderation screens, etc.
     */
    getCommunityDetailsById: builder.query<CommunityItem, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/details`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "Community", id: communityId },
      ],
    }),

    getCommunityAccess: builder.query<CommunityAccessItem, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/access`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "CommunityAccess", id: communityId },
      ],
    }),

    /**
     * Community create/update/status
     */
    createCommunity: builder.mutation<CommunityItem, CreateCommunityPayload>({
      query: (body) => ({
        url: "/communities",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Community", id: "LIST" },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),

    updateCommunity: builder.mutation<CommunityItem, UpdateCommunityPayload>({
      query: ({ communityId, ...body }) => ({
        url: `/communities/${communityId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "Community", id: communityId },
        { type: "Community", id: "LIST" },
        { type: "MyCommunity", id: "LIST" },
        { type: "CommunityAccess", id: communityId },
      ],
    }),

    updateCommunityStatus: builder.mutation<
      { message: string; community: CommunityItem },
      { communityId: string; status: CommunityStatus }
    >({
      query: ({ communityId, status }) => ({
        url: `/communities/${communityId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "Community", id: communityId },
        { type: "Community", id: "LIST" },
        { type: "MyCommunity", id: "LIST" },
        { type: "CommunityAccess", id: communityId },
      ],
    }),

    /**
     * Membership
     */
    joinCommunity: builder.mutation<unknown, JoinCommunityPayload>({
      query: (arg) => {
        const payload = typeof arg === "string" ? { communityId: arg } : arg;

        return {
          url: `/communities/${payload.communityId}/join`,
          method: "POST",
          body: payload.message ? { message: payload.message } : {},
        };
      },
      invalidatesTags: (_result, _error, arg) => {
        const communityId = typeof arg === "string" ? arg : arg.communityId;

        return [
          { type: "Community", id: "LIST" },
          { type: "Community", id: communityId },
          { type: "MyCommunity", id: "LIST" },
          { type: "CommunityAccess", id: communityId },
          { type: "CommunityMembers", id: communityId },
          { type: "CommunityJoinRequests", id: communityId },
        ];
      },
    }),

    leaveCommunity: builder.mutation<unknown, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/leave`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, communityId) => [
        { type: "Community", id: "LIST" },
        { type: "Community", id: communityId },
        { type: "MyCommunity", id: "LIST" },
        { type: "CommunityAccess", id: communityId },
        { type: "CommunityMembers", id: communityId },
        { type: "CommunityJoinRequests", id: communityId },
      ],
    }),

    /**
     * Current user's private join request status.
     */
    getMyJoinRequest: builder.query<CommunityJoinRequestItem, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/join-requests/me`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "CommunityJoinRequests", id: `${communityId}-ME` },
      ],
    }),

    cancelMyJoinRequest: builder.mutation<unknown, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/join-requests/me/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, communityId) => [
        { type: "Community", id: communityId },
        { type: "Community", id: "LIST" },
        { type: "CommunityAccess", id: communityId },
        { type: "CommunityJoinRequests", id: communityId },
        { type: "CommunityJoinRequests", id: `${communityId}-ME` },
      ],
    }),

    /**
     * Members with pagination/search/filter.
     */
    getCommunityMembers: builder.query<
      PaginatedResponse<CommunityMemberItem>,
      MemberListQuery
    >({
      query: ({ communityId, page = 1, limit = 20, search, role, status }) => ({
        url: `/communities/${communityId}/members`,
        method: "GET",
        params: {
          page,
          limit,
          ...(search ? { search } : {}),
          ...(role ? { role } : {}),
          ...(status ? { status } : {}),
        },
      }),
      providesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers", id: communityId },
      ],
    }),

    /**
     * Private join requests with pagination/status filter.
     */
    getCommunityJoinRequests: builder.query<
      PaginatedResponse<CommunityJoinRequestItem>,
      JoinRequestListQuery
    >({
      query: ({ communityId, page = 1, limit = 20, status }) => ({
        url: `/communities/${communityId}/join-requests`,
        method: "GET",
        params: {
          page,
          limit,
          ...(status ? { status } : {}),
        },
      }),
      providesTags: (_result, _error, { communityId }) => [
        { type: "CommunityJoinRequests", id: communityId },
      ],
    }),

    reviewCommunityJoinRequest: builder.mutation<
      unknown,
      ReviewCommunityJoinRequestPayload
    >({
      query: ({ communityId, requestId, action }) => ({
        url: `/communities/${communityId}/join-requests/${requestId}`,
        method: "PATCH",
        body: { action },
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityJoinRequests", id: communityId },
        { type: "CommunityJoinRequests", id: `${communityId}-ME` },
        { type: "CommunityMembers", id: communityId },
        { type: "Community", id: communityId },
        { type: "Community", id: "LIST" },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),

    /**
     * Moderator management.
     *
     * These match the latest backend routes:
     * POST   /communities/:communityId/moderators
     * PATCH  /communities/:communityId/moderators/:targetUserId/permissions
     * DELETE /communities/:communityId/moderators/:targetUserId
     */
    assignCommunityModerator: builder.mutation<
      CommunityMemberItem,
      AssignCommunityModeratorPayload
    >({
      query: ({ communityId, targetUserId, ...body }) => ({
        url: `/communities/${communityId}/moderators`,
        method: "POST",
        body: {
          targetUserId,
          ...body,
        },
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers", id: communityId },
        { type: "CommunityAccess", id: communityId },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),

    updateModeratorPermissions: builder.mutation<
      CommunityMemberItem,
      UpdateModeratorPermissionsPayload
    >({
      query: ({ communityId, targetUserId, ...body }) => ({
        url: `/communities/${communityId}/moderators/${targetUserId}/permissions`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers", id: communityId },
        { type: "CommunityAccess", id: communityId },
      ],
    }),

    removeModerator: builder.mutation<CommunityMemberItem, CommunityIdTargetUserPayload>({
      query: ({ communityId, targetUserId }) => ({
        url: `/communities/${communityId}/moderators/${targetUserId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers", id: communityId },
        { type: "CommunityAccess", id: communityId },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),

    /**
     * Remove/kick member.
     *
     * This is different from ban.
     * Remove = status becomes LEFT and user can join again.
     */
    removeCommunityMember: builder.mutation<
      CommunityMemberItem,
      CommunityIdTargetUserPayload
    >({
      query: ({ communityId, targetUserId }) => ({
        url: `/communities/${communityId}/members/${targetUserId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers", id: communityId },
        { type: "Community", id: communityId },
        { type: "Community", id: "LIST" },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),

    banCommunityMember: builder.mutation<unknown, BanCommunityMemberPayload>({
      query: ({ communityId, targetUserId, reason }) => ({
        url: `/communities/${communityId}/members/${targetUserId}/ban`,
        method: "PATCH",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers", id: communityId },
        { type: "CommunityJoinRequests", id: communityId },
        { type: "Community", id: communityId },
        { type: "Community", id: "LIST" },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),

    unbanCommunityMember: builder.mutation<
      CommunityMemberItem,
      CommunityIdTargetUserPayload
    >({
      query: ({ communityId, targetUserId }) => ({
        url: `/communities/${communityId}/members/${targetUserId}/unban`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers", id: communityId },
        { type: "Community", id: communityId },
        { type: "Community", id: "LIST" },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),

    transferCommunityAdmin: builder.mutation<
      unknown,
      TransferCommunityAdminPayload
    >({
      query: ({ communityId, newAdminUserId }) => ({
        url: `/communities/${communityId}/transfer-admin`,
        method: "PATCH",
        body: { newAdminUserId },
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "Community", id: "LIST" },
        { type: "Community", id: communityId },
        { type: "CommunityMembers", id: communityId },
        { type: "CommunityAccess", id: communityId },
        { type: "MyCommunity", id: "LIST" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,

  useGetExploreCommunitiesQuery,
  useGetMyCommunitiesQuery,
  useGetCommunityBySlugQuery,
  useGetCommunityDetailsByIdQuery,
  useGetCommunityAccessQuery,

  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useUpdateCommunityStatusMutation,

  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useGetMyJoinRequestQuery,
  useCancelMyJoinRequestMutation,

  useGetCommunityMembersQuery,
  useGetCommunityJoinRequestsQuery,
  useReviewCommunityJoinRequestMutation,

  useAssignCommunityModeratorMutation,
  useUpdateModeratorPermissionsMutation,
  useRemoveModeratorMutation,
  useRemoveCommunityMemberMutation,

  useBanCommunityMemberMutation,
  useUnbanCommunityMemberMutation,
  useTransferCommunityAdminMutation,
} = communityApi;