// src/store/api/category.api.ts

import { baseApi } from "@/store/api/baseApi";

export type CategoryStatus = "ACTIVE" | "INACTIVE";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: CategoryStatus;
  sortOrder: number;
  communityCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GetCategoriesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
  sortBy?: "sortOrder" | "name" | "createdAt" | "updatedAt" | "status";
  sortDirection?: "asc" | "desc";
};

export type GetCategoriesResponse = {
  data: CategoryRow[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  filters: {
    search: string | null;
    status: CategoryStatus | null;
    sortBy: string;
    sortDirection: "asc" | "desc";
  };
};

export type CreateCategoryBody = {
  name: string;
  description?: string;
};

export type UpdateCategoryBody = {
  name?: string;
  description?: string;
};

export type UpdateCategoryStatusBody = {
  status: CategoryStatus;
};

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<GetCategoriesResponse, GetCategoriesQuery>({
      query: (params) => ({
        url: "/categories",
        method: "GET",
        params,
      }),
      providesTags: ["Category"],
    }),

    createCategory: builder.mutation<CategoryRow, CreateCategoryBody>({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Category"],
    }),

    updateCategory: builder.mutation<
      CategoryRow,
      { id: string; body: UpdateCategoryBody }
    >({
      query: ({ id, body }) => ({
        url: `/categories/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Category"],
    }),

    updateCategoryStatus: builder.mutation<
      CategoryRow,
      { id: string; body: UpdateCategoryStatusBody }
    >({
      query: ({ id, body }) => ({
        url: `/categories/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Category"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useUpdateCategoryStatusMutation,
} = categoryApi;