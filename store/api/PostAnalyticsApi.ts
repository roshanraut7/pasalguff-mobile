import { baseApi } from "./baseApi";
import type {
  GetPostAnalyticsArgs,
  PostAnalyticsResponse,
  RecordPostViewArgs,
  RecordPostViewResponse,
  UpdatePostViewDurationArgs,
  UpdatePostViewDurationResponse,
} from "@/types/analytics";

export const postAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPostAnalytics: builder.query<
      PostAnalyticsResponse,
      GetPostAnalyticsArgs
    >({
      query: ({ communityId, postId, range }) => ({
        url: `/communities/${communityId}/posts/${postId}/analytics`,
        method: "GET",
        params: {
          range,
        },
      }),
      providesTags: (_result, _error, { postId }) => [
        {
          type: "PostAnalytics" as const,
          id: postId,
        },
      ],
    }),

    recordPostView: builder.mutation<
      RecordPostViewResponse,
      RecordPostViewArgs
    >({
      query: ({ communityId, postId, source = "OTHER" }) => ({
        url: `/communities/${communityId}/posts/${postId}/analytics/views`,
        method: "POST",
        body: {
          source,
        },
      }),
      invalidatesTags: (_result, _error, { postId }) => [
        {
          type: "PostAnalytics" as const,
          id: postId,
        },
      ],
    }),

    heartbeatPostView: builder.mutation<
      UpdatePostViewDurationResponse,
      UpdatePostViewDurationArgs
    >({
      query: ({ communityId, postId, viewId, durationSeconds }) => ({
        url: `/communities/${communityId}/posts/${postId}/analytics/views/${viewId}/heartbeat`,
        method: "PATCH",
        body: {
          durationSeconds,
        },
      }),
    }),

    endPostView: builder.mutation<
      UpdatePostViewDurationResponse,
      UpdatePostViewDurationArgs
    >({
      query: ({ communityId, postId, viewId, durationSeconds }) => ({
        url: `/communities/${communityId}/posts/${postId}/analytics/views/${viewId}/end`,
        method: "PATCH",
        body: {
          durationSeconds,
        },
      }),
      invalidatesTags: (_result, _error, { postId }) => [
        {
          type: "PostAnalytics" as const,
          id: postId,
        },
      ],
    }),
  }),

  overrideExisting: true,
});

export const {
  useGetPostAnalyticsQuery,
  useRecordPostViewMutation,
  useHeartbeatPostViewMutation,
  useEndPostViewMutation,
} = postAnalyticsApi;
