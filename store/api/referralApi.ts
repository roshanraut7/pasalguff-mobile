import { baseApi } from "./baseApi";

export type ReferralShareStats = {
  id: string;
  token: string;
  shareUrl: string;
  sharedAt: string | null;
  shareCount: number;
  pageOpenCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
};

export const referralApi = baseApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    createReferralShareLink: builder.mutation<
      ReferralShareStats,
      void
    >({
      query: () => ({
        url: "/app-download/share-links",
        method: "POST",
      }),
    }),

    completeReferralShare: builder.mutation<
      ReferralShareStats,
      { token: string }
    >({
      query: ({ token }) => ({
        url: `/app-download/share-links/${encodeURIComponent(
          token,
        )}/complete`,
        method: "PATCH",
      }),
    }),

    getReferralShareStats: builder.query<
      ReferralShareStats,
      string
    >({
      query: (token) => ({
        url: `/app-download/share-links/${encodeURIComponent(
          token,
        )}/stats`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useCreateReferralShareLinkMutation,
  useCompleteReferralShareMutation,
  useGetReferralShareStatsQuery,
} = referralApi;