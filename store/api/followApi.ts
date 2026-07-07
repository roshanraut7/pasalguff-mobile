import { baseApi } from "./baseApi";

export type FollowSortBy = "newest" | "oldest" | "name_asc" | "name_desc";

export type FollowButtonText =
  | "Follow"
  | "Follow Back"
  | "Following"
  | "Friends";

export type FollowUser = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
    coverImage: string | null;  
  businessName: string | null;
  businessType?: string | null;
  displayName: string;
  createdAt: string;
};

export type FollowRelationship = {
  isFollowing: boolean;
  followsMe: boolean;
  isMutual: boolean;
  canMessage: boolean;
  buttonText: FollowButtonText;
};

export type FollowItem = {
  id: string;
  followedAt: string;
  user: FollowUser;
  relationship?: FollowRelationship;
};

export type FollowMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type FollowListResponse = {
  data: FollowItem[];
  meta: FollowMeta;
};

export type DiscoverFollowUser = FollowUser & {
  relationship?: FollowRelationship;
};

export type DiscoverFollowResponse = {
  data: DiscoverFollowUser[];
  meta: FollowMeta;
  filters: {
    search: string | null;
    sortBy: FollowSortBy;
  };
};

export type FollowStatusResponse = {
  user: FollowUser;
  relationship: FollowRelationship;
};

export type FollowResponse = {
  message: string;
  follow: {
    id: string;
    createdAt: string;
    user: FollowUser;
    relationship?: FollowRelationship;
  };
};

export type UnfollowResponse = {
  message: string;
  user?: FollowUser;
  relationship?: FollowRelationship;
};

export type FollowListQuery = {
  page?: number;
  limit?: number;
   search?: string; 
};

export type DiscoverFollowQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: FollowSortBy;
};

function buildQueryParams(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

export const followApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Discover users.
     *
     * GET /follows/discover?page=1&limit=20&search=ram&sortBy=newest
     */
    discoverUsersToFollow: builder.query<
      DiscoverFollowResponse,
      DiscoverFollowQuery | void
    >({
      query: (params) => ({
        url: `/follows/discover${buildQueryParams({
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          search: params?.search,
          sortBy: params?.sortBy,
        })}`,
        method: "GET",
      }),
      providesTags: ["Follow", "Following"],
    }),

    /**
     * Get my followers.
     *
     * GET /follows/me/followers?page=1&limit=20
     */
    getMyFollowers: builder.query<FollowListResponse, FollowListQuery | void>({
      query: (params) => ({
        url: `/follows/me/followers${buildQueryParams({
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
        })}`,
        method: "GET",
      }),
      providesTags: ["Follower"],
    }),

    /**
     * Get users I am following.
     *
     * GET /follows/me/following?page=1&limit=20
     */
    getMyFollowing: builder.query<FollowListResponse, FollowListQuery | void>({
      query: (params) => ({
        url: `/follows/me/following${buildQueryParams({
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
             search: params?.search, 
        })}`,
        method: "GET",
      }),
      providesTags: ["Following"],
    }),

    /**
     * Get followers of another user.
     *
     * GET /follows/users/:userId/followers?page=1&limit=20
     */
    getUserFollowers: builder.query<
      FollowListResponse,
      { userId: string } & FollowListQuery
    >({
      query: ({ userId, page = 1, limit = 20 }) => ({
        url: `/follows/users/${userId}/followers${buildQueryParams({
          page,
          limit,
        })}`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        "Follower",
        { type: "Follow" as const, id: arg.userId },
      ],
    }),

    /**
     * Get users another user is following.
     *
     * GET /follows/users/:userId/following?page=1&limit=20
     */
    getUserFollowing: builder.query<
      FollowListResponse,
      { userId: string } & FollowListQuery
    >({
      query: ({ userId, page = 1, limit = 20 }) => ({
        url: `/follows/users/${userId}/following${buildQueryParams({
          page,
          limit,
        })}`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        "Following",
        { type: "Follow" as const, id: arg.userId },
      ],
    }),

    /**
     * Get follow status between me and another user.
     *
     * GET /follows/status/:userId
     */
    getFollowStatus: builder.query<FollowStatusResponse, string>({
      query: (userId) => ({
        url: `/follows/status/${userId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, userId) => [
        "Follow",
        { type: "Follow" as const, id: userId },
      ],
    }),

    /**
     * Follow a user.
     *
     * POST /follows/:userId
     */
    followUser: builder.mutation<FollowResponse, string>({
      query: (userId) => ({
        url: `/follows/${userId}`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, userId) => [
        "Follow",
        "Follower",
        "Following",
        "Profile",
        { type: "Follow" as const, id: userId },
      ],
    }),

    /**
     * Unfollow a user.
     *
     * DELETE /follows/:userId
     */
    unfollowUser: builder.mutation<UnfollowResponse, string>({
      query: (userId) => ({
        url: `/follows/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, userId) => [
        "Follow",
        "Follower",
        "Following",
        "Profile",
        { type: "Follow" as const, id: userId },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useDiscoverUsersToFollowQuery,
  useGetMyFollowersQuery,
  useGetMyFollowingQuery,
  useGetUserFollowersQuery,
  useGetUserFollowingQuery,
  useGetFollowStatusQuery,
  useFollowUserMutation,
  useUnfollowUserMutation,
} = followApi;