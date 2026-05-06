import { baseApi } from "./baseApi";

import type {
  AssignCommunityModeratorPayload,
  BanCommunityMemberPayload,
  CommunityAccessItem,
  CommunityIdTargetUserPayload,
  CommunityItem,
  CommunityJoinRequestItem,
  CommunityListQuery,
  CommunityMemberItem,
  CommunityStatus,
  CommunityStatusResponse,
  CreateCommunityPayload,
  JoinCommunityPayload,
  JoinRequestListQuery,
  MemberListQuery,
  PaginatedResponse,
  ReviewCommunityJoinRequestPayload,
  TransferCommunityAdminPayload,
  UpdateCommunityPayload,
  UpdateModeratorPermissionsPayload,
} from "@/types/community";

export const communityApi = baseApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    /* =========================================================
       COMMUNITY LISTS
       ========================================================= */

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
              { type: "Community" as const, id: "LIST" },
              ...result.data.map((community) => ({
                type: "Community" as const,
                id: community.id,
              })),
            ]
          : [{ type: "Community" as const, id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

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
              { type: "MyCommunity" as const, id: "LIST" },
              ...result.data.map((community) => ({
                type: "Community" as const,
                id: community.id,
              })),
            ]
          : [{ type: "MyCommunity" as const, id: "LIST" }],
    }),

    /* =========================================================
       COMMUNITY DETAILS / ACCESS
       ========================================================= */

    getCommunityBySlug: builder.query<CommunityItem, string>({
      query: (slug) => ({
        url: `/communities/${slug}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [{ type: "Community" as const, id: result.id }]
          : [{ type: "Community" as const, id: "DETAIL" }],
    }),

    getCommunityDetailsById: builder.query<CommunityItem, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/details`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "Community" as const, id: communityId },
      ],
    }),

    getCommunityAccess: builder.query<CommunityAccessItem, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/access`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "CommunityAccess" as const, id: communityId },
      ],
    }),

    /* =========================================================
       COMMUNITY CREATE / UPDATE / STATUS
       ========================================================= */

    createCommunity: builder.mutation<CommunityItem, CreateCommunityPayload>({
      query: (body) => ({
        url: "/communities",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),

    updateCommunity: builder.mutation<CommunityItem, UpdateCommunityPayload>({
      query: ({ communityId, ...body }) => ({
        url: `/communities/${communityId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
        { type: "CommunityAccess" as const, id: communityId },
      ],
    }),

    updateCommunityStatus: builder.mutation<
      CommunityStatusResponse,
      { communityId: string; status: CommunityStatus }
    >({
      query: ({ communityId, status }) => ({
        url: `/communities/${communityId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
        { type: "CommunityAccess" as const, id: communityId },
      ],
    }),

    /* =========================================================
       JOIN / LEAVE COMMUNITY
       ========================================================= */

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
          { type: "Community" as const, id: "LIST" },
          { type: "Community" as const, id: communityId },
          { type: "MyCommunity" as const, id: "LIST" },
          { type: "CommunityAccess" as const, id: communityId },
          { type: "CommunityMembers" as const, id: communityId },
          { type: "CommunityJoinRequests" as const, id: communityId },
        ];
      },
    }),

    leaveCommunity: builder.mutation<unknown, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/leave`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, communityId) => [
        { type: "Community" as const, id: "LIST" },
        { type: "Community" as const, id: communityId },
        { type: "MyCommunity" as const, id: "LIST" },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityJoinRequests" as const, id: communityId },
      ],
    }),

    /* =========================================================
       JOIN REQUESTS
       ========================================================= */

    getMyJoinRequest: builder.query<CommunityJoinRequestItem, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/join-requests/me`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "CommunityJoinRequests" as const, id: `${communityId}-ME` },
      ],
    }),

    cancelMyJoinRequest: builder.mutation<unknown, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/join-requests/me/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, communityId) => [
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "CommunityJoinRequests" as const, id: communityId },
        { type: "CommunityJoinRequests" as const, id: `${communityId}-ME` },
      ],
    }),

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
        { type: "CommunityJoinRequests" as const, id: communityId },
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
        { type: "CommunityJoinRequests" as const, id: communityId },
        { type: "CommunityJoinRequests" as const, id: `${communityId}-ME` },
        { type: "CommunityMembers" as const, id: communityId },
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),

    /* =========================================================
       MEMBERS
       ========================================================= */

  getCommunityMembers: builder.query<
  PaginatedResponse<CommunityMemberItem>,
  MemberListQuery
>({
  query: ({ communityId, page = 1, limit = 20, search, status }) => ({
    url: `/communities/${communityId}/members`,
    method: "GET",
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
    },
  }),
  providesTags: (_result, _error, { communityId }) => [
    { type: "CommunityMembers" as const, id: communityId },
  ],
}),

    removeCommunityMember: builder.mutation<
      CommunityMemberItem,
      CommunityIdTargetUserPayload
    >({
      query: ({ communityId, targetUserId }) => ({
        url: `/communities/${communityId}/members/${targetUserId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers" as const, id: communityId },
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),

    banCommunityMember: builder.mutation<unknown, BanCommunityMemberPayload>({
      query: ({ communityId, targetUserId, reason }) => ({
        url: `/communities/${communityId}/members/${targetUserId}/ban`,
        method: "PATCH",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityJoinRequests" as const, id: communityId },
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
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
        { type: "CommunityMembers" as const, id: communityId },
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),

    /* =========================================================
       MODERATORS
       ========================================================= */

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
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "MyCommunity" as const, id: "LIST" },
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
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityAccess" as const, id: communityId },
      ],
    }),

    removeModerator: builder.mutation<
      CommunityMemberItem,
      CommunityIdTargetUserPayload
    >({
      query: ({ communityId, targetUserId }) => ({
        url: `/communities/${communityId}/moderators/${targetUserId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),

    /* =========================================================
       ADMIN TRANSFER
       ========================================================= */

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
        { type: "Community" as const, id: "LIST" },
        { type: "Community" as const, id: communityId },
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
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