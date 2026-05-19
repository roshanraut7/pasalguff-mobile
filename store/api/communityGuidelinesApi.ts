import { baseApi } from "./baseApi";

export type CommunityGuidelineItem = {
  id: string;
  communityId: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityGuidelinesResponse = {
  community: {
    id: string;
    name: string;
    slug: string;
    visibility: "PUBLIC" | "PRIVATE";
  };
  data: CommunityGuidelineItem[];
};

export type CreateCommunityGuidelinePayload = {
  communityId: string;
  title: string;
  description?: string | null;
};

export type UpdateCommunityGuidelinePayload = {
  communityId: string;
  guidelineId: string;
  title?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export const communityGuidelinesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommunityGuidelines: builder.query<
      CommunityGuidelinesResponse,
      string
    >({
      query: (communityId) => ({
        url: `/communities/${communityId}/guidelines`,
        method: "GET",
      }),
      providesTags: (_result, _error, communityId) => [
        {
          type: "CommunityGuidelines",
          id: communityId,
        },
      ],
    }),

    createCommunityGuideline: builder.mutation<
      CommunityGuidelineItem,
      CreateCommunityGuidelinePayload
    >({
      query: ({ communityId, ...body }) => ({
        url: `/communities/${communityId}/guidelines`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        {
          type: "CommunityGuidelines",
          id: communityId,
        },
      ],
    }),

    updateCommunityGuideline: builder.mutation<
      CommunityGuidelineItem,
      UpdateCommunityGuidelinePayload
    >({
      query: ({ communityId, guidelineId, ...body }) => ({
        url: `/communities/${communityId}/guidelines/${guidelineId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        {
          type: "CommunityGuidelines",
          id: communityId,
        },
      ],
    }),

    deleteCommunityGuideline: builder.mutation<
      { message: string },
      { communityId: string; guidelineId: string }
    >({
      query: ({ communityId, guidelineId }) => ({
        url: `/communities/${communityId}/guidelines/${guidelineId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        {
          type: "CommunityGuidelines",
          id: communityId,
        },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommunityGuidelinesQuery,
  useCreateCommunityGuidelineMutation,
  useUpdateCommunityGuidelineMutation,
  useDeleteCommunityGuidelineMutation,
} = communityGuidelinesApi;