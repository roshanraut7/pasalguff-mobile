import { baseApi } from "./baseApi";

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
  sortOrder?: number;
};

export type CommunityRole = "ADMIN" | "MODERATOR" | "MEMBER";

export type CommunityItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarImage?: string | null;
  coverImage?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  status: "ACTIVE" | "INACTIVE";
  categoryId?: string;
  adminId?: string;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  isJoined?: boolean;
  memberRole?: CommunityRole | null;
  canViewContent?: boolean;
};

export type CommunityAccessItem = {
  communityId: string;
  communityName: string;
  visibility: "PUBLIC" | "PRIVATE";
  isJoined: boolean;
  role: CommunityRole | null;
  canViewContent: boolean;
  canCreatePost: boolean;
  canComment: boolean;
  permissions: {
    canEditCommunity: boolean;
    canManageMembers: boolean;
    canManagePosts: boolean;
    canManageComments: boolean;
    canManageReports: boolean;
  } | null;
};

export type CommunityMemberItem = {
  id: string;
  role: CommunityRole;
  status: "ACTIVE" | "LEFT" | "BANNED";
  joinedAt: string;
  canEditCommunity: boolean;
  canManageMembers: boolean;
  canManagePosts: boolean;
  canManageComments: boolean;
  canManageReports: boolean;
  user: {
    id: string;
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
  visibility?: "PUBLIC" | "PRIVATE";
};

export type UpdateCommunityMemberRolePayload = {
  communityId: string;
  targetUserId: string;
  role: "MODERATOR" | "MEMBER";
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

export const communityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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

    getExploreCommunities: builder.query<CommunityItem[], void>({
      query: () => ({
        url: "/communities/explore",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Community", id: "LIST" },
              ...result.map((community) => ({
                type: "Community" as const,
                id: community.id,
              })),
            ]
          : [{ type: "Community", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getMyCommunities: builder.query<CommunityItem[], void>({
      query: () => ({
        url: "/communities/my",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "MyCommunity", id: "LIST" },
              ...result.map((community) => ({
                type: "Community" as const,
                id: community.id,
              })),
            ]
          : [{ type: "MyCommunity", id: "LIST" }],
    }),

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

    getCommunityAccess: builder.query<CommunityAccessItem, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/access`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "CommunityAccess", id: communityId },
      ],
    }),

    getCommunityMembers: builder.query<CommunityMemberItem[], string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/members`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        { type: "CommunityMembers", id: communityId },
      ],
    }),

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

    joinCommunity: builder.mutation<unknown, string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/join`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, communityId) => [
        { type: "Community", id: "LIST" },
        { type: "Community", id: communityId },
        { type: "MyCommunity", id: "LIST" },
        { type: "CommunityAccess", id: communityId },
        { type: "CommunityMembers", id: communityId },
      ],
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
      ],
    }),

    updateCommunityMemberRole: builder.mutation<
      unknown,
      UpdateCommunityMemberRolePayload
    >({
      query: ({ communityId, targetUserId, ...body }) => ({
        url: `/communities/${communityId}/members/${targetUserId}/role`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "Community", id: "LIST" },
        { type: "Community", id: communityId },
        { type: "CommunityMembers", id: communityId },
        { type: "CommunityAccess", id: communityId },
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
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetExploreCommunitiesQuery,
  useGetMyCommunitiesQuery,
  useGetCommunityBySlugQuery,
  useGetCommunityAccessQuery,
  useGetCommunityMembersQuery,
  useCreateCommunityMutation,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useUpdateCommunityMemberRoleMutation,
  useTransferCommunityAdminMutation,
} = communityApi;