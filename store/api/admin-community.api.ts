// src/api/admin-community.api.ts

import { baseApi } from "@/store/api/baseApi";

export type AdminCommunityVisibility = "PUBLIC" | "PRIVATE";
export type AdminCommunityStatus = "ACTIVE" | "INACTIVE";
export type AdminUserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export type AdminCommunityRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarImage: string | null;
  coverImage: string | null;

  visibility: AdminCommunityVisibility;
  status: AdminCommunityStatus;

  categoryId: string;
  categoryName: string;
  categorySlug: string;

  adminId: string;
  adminName: string;
  adminEmail: string;
  adminImage: string | null;
  adminRole: AdminUserRole;

  memberCount: number;
  postCount: number;
  joinRequestCount: number;
  bannedCount: number;

  createdAt: string;
  updatedAt: string;
};

export type AdminCommunityStats = {
  totalCommunities: number;
  activeCommunities: number;
  inactiveCommunities: number;
  publicCommunities: number;
  privateCommunities: number;
  totalMembers: number;
  bannedMembers: number;
  totalPosts: number;
  pendingJoinRequests: number;
};

export type GetAdminCommunitiesResponse = {
  data: AdminCommunityRow[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  stats: AdminCommunityStats;

  filters: {
    search: string | null;
    status: AdminCommunityStatus | null;
    visibility: AdminCommunityVisibility | null;
    categoryId: string | null;
    sortBy: string;
    sortDirection: "asc" | "desc";
  };
};

export type GetAdminCommunitiesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminCommunityStatus;
  visibility?: AdminCommunityVisibility;
  categoryId?: string;
  sortBy?: "createdAt" | "updatedAt" | "name" | "status" | "visibility";
  sortDirection?: "asc" | "desc";
};

export const adminCommunityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminCommunities: builder.query<
      GetAdminCommunitiesResponse,
      GetAdminCommunitiesQuery
    >({
      query: (params) => ({
        url: "/admin/communities",
        method: "GET",
        params,
      }),
      providesTags: ["AdminCommunities"],
    }),
  }),
});

export const { useGetAdminCommunitiesQuery } = adminCommunityApi;