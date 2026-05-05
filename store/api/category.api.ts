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
  overrideExisting: true,

  endpoints: (builder) => ({
    getCategories: builder.query<
      GetCategoriesResponse,
      GetCategoriesQuery | void
    >({
      query: (params) => ({
        url: "/categories",
        method: "GET",
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 100,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
          ...(params?.sortDirection
            ? { sortDirection: params.sortDirection }
            : {}),
        },
      }),

      providesTags: (result) =>
        result?.data
          ? [
              { type: "Category" as const, id: "LIST" },
              ...result.data.map((category) => ({
                type: "Category" as const,
                id: category.id,
              })),
            ]
          : [{ type: "Category" as const, id: "LIST" }],
    }),

    createCategory: builder.mutation<CategoryRow, CreateCategoryBody>({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),

      invalidatesTags: [{ type: "Category" as const, id: "LIST" }],
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

      invalidatesTags: (_result, _error, { id }) => [
        { type: "Category" as const, id },
        { type: "Category" as const, id: "LIST" },
        { type: "Community" as const, id: "LIST" },
      ],
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

      invalidatesTags: (_result, _error, { id }) => [
        { type: "Category" as const, id },
        { type: "Category" as const, id: "LIST" },
        { type: "Community" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useUpdateCategoryStatusMutation,
} = categoryApi;