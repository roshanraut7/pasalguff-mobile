// src/store/api/admin-user.api.ts

import { baseApi } from "@/store/api/baseApi";

export type AdminUserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export type AdminUserRow = {
  id: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  coverImage: string | null;

  name: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  panNo: string;
  registrationNo: string;
  address: string;
  role: AdminUserRole;

  createdAt: string;
  updatedAt: string;

  counts: {
    communitiesCreated: number;
    communityMemberships: number;
    communityJoinRequests: number;
    communityPosts: number;
    postLikes: number;
    postComments: number;
    postShares: number;
  };
};

export type AdminUserStats = {
  totalUsers: number;
  normalUsers: number;
  adminUsers: number;
  superAdminUsers: number;
  verifiedUsers: number;
};

export type GetAdminUsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRole;
  sortBy?: "createdAt" | "updatedAt" | "name" | "email" | "role" | "businessName";
  sortDirection?: "asc" | "desc";
};

export type GetAdminUsersResponse = {
  data: AdminUserRow[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  stats: AdminUserStats;

  filters: {
    search: string | null;
    role: AdminUserRole | null;
    sortBy: string;
    sortDirection: "asc" | "desc";
  };
};

export type UpdateAdminUserRoleBody = {
  role: AdminUserRole;
};

export const adminUserApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsers: builder.query<GetAdminUsersResponse, GetAdminUsersQuery>({
      query: (params) => ({
        url: "/admin/users",
        method: "GET",
        params,
      }),
      providesTags: [{ type: "AdminUsers", id: "LIST" }],
    }),

    getAdminUserDetails: builder.query<AdminUserRow, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, userId) => [
        { type: "AdminUsers", id: userId },
      ],
    }),

    updateAdminUserRole: builder.mutation<
      AdminUserRow,
      { userId: string; body: UpdateAdminUserRoleBody }
    >({
      query: ({ userId, body }) => ({
        url: `/admin/users/${userId}/role`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "AdminUsers", id: "LIST" },
        { type: "AdminUsers", id: userId },
      ],
    }),
  }),
});

export const {
  useGetAdminUsersQuery,
  useGetAdminUserDetailsQuery,
  useUpdateAdminUserRoleMutation,
} = adminUserApi;