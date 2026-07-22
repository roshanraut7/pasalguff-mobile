import { baseApi } from "./baseApi";
import type { CommunityVisibility } from "@/types/community";

export type BusinessCommunityRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type BusinessCommunityRequestItem = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  categoryId: string;
  visibility: CommunityVisibility;
  avatarImage: string | null;
  coverImage: string | null;
  status: BusinessCommunityRequestStatus;
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdCommunityId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MyBusinessCommunityStatusResponse = {
  latestRequest: BusinessCommunityRequestItem | null;
};

export type SubmitBusinessCommunityPayload = {
  name: string;
  description?: string;
  categoryId: string;
  visibility?: CommunityVisibility;
  avatarImage?: string;
  coverImage?: string;
};

export type SubmitBusinessCommunityResponse = {
  message: string;
  request: BusinessCommunityRequestItem;
};

export const businessCommunityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Logged-in user's latest business community request + status.
     *
     * GET /business-community/request/me
     */
   getMyBusinessCommunityStatus: builder.query<
  MyBusinessCommunityStatusResponse,
  void
>({
  query: () => ({
    url: "/business-community/request/me",
    method: "GET",
  }),
  providesTags: ["BusinessCommunity"],
}),

    /**
     * Submit a request to create a dedicated business/institute community.
     * Only verified BUSINESS/TRAINING track accounts can call this —
     * the backend enforces it, but gate the UI too.
     *
     * POST /business-community/request
     */
    submitBusinessCommunityRequest: builder.mutation<
      SubmitBusinessCommunityResponse,
      SubmitBusinessCommunityPayload
    >({
      query: (body) => ({
        url: "/business-community/request",
        method: "POST",
        body,
      }),
      invalidatesTags: ["BusinessCommunity", "Community"],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetMyBusinessCommunityStatusQuery,
  useSubmitBusinessCommunityRequestMutation,
} = businessCommunityApi;