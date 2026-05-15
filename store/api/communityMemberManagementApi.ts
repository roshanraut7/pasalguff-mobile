import { baseApi } from "./baseApi";

import type {
  CommunityMembersResponse,
  CommunityMemberItem,
  MemberListQuery,
} from "@/types/community";

export type CommunityMemberActionPayload = {
  communityId: string;
  targetUserId: string;
  reason?: string;
};

export const communityMemberManagementApi = baseApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    /* =========================================================
       GET COMMUNITY MEMBERS
       ========================================================= */

    getCommunityMembers: builder.query<
      CommunityMembersResponse,
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

    /* =========================================================
       BAN MEMBER
       Backend:
       PATCH /communities/:communityId/members/:targetUserId/ban
       ========================================================= */

    banCommunityMember: builder.mutation<
      CommunityMemberItem,
      CommunityMemberActionPayload
    >({
      query: ({ communityId, targetUserId, reason }) => ({
        url: `/communities/${communityId}/members/${targetUserId}/ban`,
        method: "PATCH",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityModerators" as const, id: communityId },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),

    /* =========================================================
       UNBAN MEMBER
       Backend:
       PATCH /communities/:communityId/members/:targetUserId/unban
       ========================================================= */

    unbanCommunityMember: builder.mutation<
      CommunityMemberItem,
      CommunityMemberActionPayload
    >({
      query: ({ communityId, targetUserId, reason }) => ({
        url: `/communities/${communityId}/members/${targetUserId}/unban`,
        method: "PATCH",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityModerators" as const, id: communityId },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),

    /* =========================================================
       REMOVE MEMBER
       Backend:
       PATCH /communities/:communityId/members/:targetUserId/remove
       ========================================================= */

    removeCommunityMember: builder.mutation<
      CommunityMemberItem,
      CommunityMemberActionPayload
    >({
      query: ({ communityId, targetUserId, reason }) => ({
        url: `/communities/${communityId}/members/${targetUserId}/remove`,
        method: "PATCH",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "CommunityMembers" as const, id: communityId },
        { type: "CommunityModerators" as const, id: communityId },
        { type: "CommunityAccess" as const, id: communityId },
        { type: "Community" as const, id: communityId },
        { type: "Community" as const, id: "LIST" },
        { type: "MyCommunity" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCommunityMembersQuery,
  useBanCommunityMemberMutation,
  useUnbanCommunityMemberMutation,
  useRemoveCommunityMemberMutation,
} = communityMemberManagementApi;