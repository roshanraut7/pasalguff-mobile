import { baseApi } from "@/store/api/baseApi";

import type {
  FriendActionResponse,
  FriendListResponse,
  FriendRequest,
  FriendUser,
  GetFriendRequestsArgs,
  PublicProfileCommunity,
  PublicProfilePageArgs,
  PublicProfilePost,
  PublicUserProfile,
  SendFriendRequestArgs,
  SendFriendRequestResponse,
} from "@/types/friend";

export const friendApi = baseApi.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    /* =========================================================
       FRIEND LIST
       ========================================================= */

    getMyFriends: builder.query<
      FriendListResponse<FriendUser>,
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (args) => ({
        url: "/friends",
        method: "GET",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 20,
          ...(args?.search ? { search: args.search } : {}),
        },
      }),

      providesTags: (result) =>
        result?.data
          ? [
              { type: "Friend" as const, id: "LIST" },
              ...result.data.map((friend) => ({
                type: "Friend" as const,
                id: friend.id,
              })),
            ]
          : [{ type: "Friend" as const, id: "LIST" }],
    }),

    discoverFriends: builder.query<
      FriendListResponse<FriendUser>,
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (args) => ({
        url: "/friends/discover",
        method: "GET",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 20,
          ...(args?.search ? { search: args.search } : {}),
        },
      }),

      providesTags: [{ type: "Friend" as const, id: "DISCOVER" }],
    }),

    /* =========================================================
       FRIEND REQUESTS
       ========================================================= */

    sendFriendRequest: builder.mutation<
      SendFriendRequestResponse,
      SendFriendRequestArgs
    >({
      query: ({ receiverId, message }) => ({
        url: `/friends/requests/${receiverId}`,
        method: "POST",
        body: {
          ...(message?.trim() ? { message: message.trim() } : {}),
        },
      }),

      invalidatesTags: (_result, _error, { receiverId }) => [
        { type: "Friend" as const, id: "DISCOVER" },
        { type: "Friend" as const, id: "OUTGOING" },
        { type: "Profile" as const, id: receiverId },
      ],
    }),

    getIncomingFriendRequests: builder.query<
      FriendListResponse<FriendRequest>,
      GetFriendRequestsArgs | void
    >({
      query: (args) => ({
        url: "/friends/requests/incoming",
        method: "GET",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 20,
        },
      }),

      providesTags: (result) =>
        result?.data
          ? [
              { type: "Friend" as const, id: "INCOMING" },
              ...result.data.map((request) => ({
                type: "Friend" as const,
                id: request.id,
              })),
            ]
          : [{ type: "Friend" as const, id: "INCOMING" }],
    }),

    getOutgoingFriendRequests: builder.query<
      FriendListResponse<FriendRequest>,
      GetFriendRequestsArgs | void
    >({
      query: (args) => ({
        url: "/friends/requests/outgoing",
        method: "GET",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 20,
        },
      }),

      providesTags: (result) =>
        result?.data
          ? [
              { type: "Friend" as const, id: "OUTGOING" },
              ...result.data.map((request) => ({
                type: "Friend" as const,
                id: request.id,
              })),
            ]
          : [{ type: "Friend" as const, id: "OUTGOING" }],
    }),

    acceptFriendRequest: builder.mutation<FriendActionResponse, string>({
      query: (requestId) => ({
        url: `/friends/requests/${requestId}/accept`,
        method: "PATCH",
      }),

      invalidatesTags: [
        { type: "Friend" as const, id: "INCOMING" },
        { type: "Friend" as const, id: "LIST" },
        { type: "Friend" as const, id: "DISCOVER" },
      ],
    }),

    rejectFriendRequest: builder.mutation<FriendActionResponse, string>({
      query: (requestId) => ({
        url: `/friends/requests/${requestId}/reject`,
        method: "PATCH",
      }),

      invalidatesTags: [
        { type: "Friend" as const, id: "INCOMING" },
        { type: "Friend" as const, id: "DISCOVER" },
      ],
    }),

    cancelFriendRequest: builder.mutation<FriendActionResponse, string>({
      query: (requestId) => ({
        url: `/friends/requests/${requestId}/cancel`,
        method: "PATCH",
      }),

      invalidatesTags: [
        { type: "Friend" as const, id: "OUTGOING" },
        { type: "Friend" as const, id: "DISCOVER" },
      ],
    }),

    removeFriend: builder.mutation<FriendActionResponse, string>({
      query: (friendUserId) => ({
        url: `/friends/${friendUserId}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, friendUserId) => [
        { type: "Friend" as const, id: "LIST" },
        { type: "Friend" as const, id: "DISCOVER" },
        { type: "Profile" as const, id: friendUserId },
      ],
    }),

    /* =========================================================
       PUBLIC PROFILE VIEW
       ========================================================= */

    getPublicProfile: builder.query<PublicUserProfile, string>({
      query: (userId) => ({
        url: `/profile/${userId}/public`,
        method: "GET",
      }),

      providesTags: (_result, _error, userId) => [
        { type: "Profile" as const, id: userId },
      ],
    }),

    getPublicProfilePosts: builder.query<
      FriendListResponse<PublicProfilePost>,
      PublicProfilePageArgs
    >({
      query: ({ userId, page = 1, limit = 20 }) => ({
        url: `/profile/${userId}/posts`,
        method: "GET",
        params: {
          page,
          limit,
        },
      }),

      providesTags: (_result, _error, { userId }) => [
        { type: "Profile" as const, id: `${userId}-POSTS` },
      ],
    }),

    getPublicProfileCommunities: builder.query<
      FriendListResponse<PublicProfileCommunity>,
      PublicProfilePageArgs
    >({
      query: ({ userId, page = 1, limit = 20 }) => ({
        url: `/profile/${userId}/communities`,
        method: "GET",
        params: {
          page,
          limit,
        },
      }),

      providesTags: (_result, _error, { userId }) => [
        { type: "Profile" as const, id: `${userId}-COMMUNITIES` },
      ],
    }),

    getPublicProfileMutualFriends: builder.query<
      FriendListResponse<FriendUser>,
      PublicProfilePageArgs
    >({
      query: ({ userId, page = 1, limit = 20 }) => ({
        url: `/profile/${userId}/mutual-friends`,
        method: "GET",
        params: {
          page,
          limit,
        },
      }),

      providesTags: (_result, _error, { userId }) => [
        { type: "Profile" as const, id: `${userId}-MUTUAL-FRIENDS` },
      ],
    }),
  }),
});

export const {
  /**
   * Friends
   */
  useGetMyFriendsQuery,
  useDiscoverFriendsQuery,
  useSendFriendRequestMutation,
  useGetIncomingFriendRequestsQuery,
  useGetOutgoingFriendRequestsQuery,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useCancelFriendRequestMutation,
  useRemoveFriendMutation,

  /**
   * Public profile
   */
  useGetPublicProfileQuery,
  useGetPublicProfilePostsQuery,
  useGetPublicProfileCommunitiesQuery,
  useGetPublicProfileMutualFriendsQuery,
} = friendApi;