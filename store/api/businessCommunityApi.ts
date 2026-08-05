import { baseApi } from "./baseApi";
import type {
  CommunityVisibility,
} from "@/types/community";

export type BusinessCommunityRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type BusinessCommunityKind =
  | "BUSINESS"
  | "INSTITUTE";

export type CommunityPurpose =
  | "GENERAL"
  | "BUSINESS"
  | "DISTRICT_OFFICIAL";

export type BusinessCommunityRequestCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CreatedBusinessCommunity = {
  id: string;
  name: string;
  slug: string;

  visibility: CommunityVisibility;
  purpose: CommunityPurpose;

  communityKind:
    | BusinessCommunityKind
    | null;
};

export type BusinessCommunityRequestItem = {
  id: string;
  userId: string;

  name: string;
  description: string | null;

  categoryId: string;

  visibility: CommunityVisibility;

  avatarImage: string | null;
  coverImage: string | null;

  /**
   * This value comes from the backend.
   *
   * BUSINESS onboarding + BUSINESS verification
   * → BUSINESS
   *
   * INSTITUTE onboarding + TRAINING verification
   * → INSTITUTE
   */
  communityKind: BusinessCommunityKind;

  status: BusinessCommunityRequestStatus;

  rejectionReason: string | null;

  reviewedById: string | null;
  reviewedAt: string | null;

  createdCommunityId: string | null;

  category?:
    | BusinessCommunityRequestCategory
    | null;

  createdCommunity?:
    | CreatedBusinessCommunity
    | null;

  createdAt: string;
  updatedAt: string;
};

export type MyBusinessCommunityStatusResponse = {
  latestRequest:
    | BusinessCommunityRequestItem
    | null;
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

export const businessCommunityApi =
  baseApi.injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Get the logged-in user's latest
       * business/institute community request.
       *
       * GET /business-community/request/me
       */
      getMyBusinessCommunityStatus:
        builder.query<
          MyBusinessCommunityStatusResponse,
          void
        >({
          query: () => ({
            url:
              "/business-community/request/me",

            method:
              "GET",
          }),

          providesTags: [
            "BusinessCommunity",
          ],
        }),

      /**
       * Submit a dedicated community request.
       *
       * The frontend does not send communityKind.
       * The backend determines it from onboarding
       * profileType and verificationTrack.
       *
       * POST /business-community/request
       */
      submitBusinessCommunityRequest:
        builder.mutation<
          SubmitBusinessCommunityResponse,
          SubmitBusinessCommunityPayload
        >({
          query: (body) => ({
            url:
              "/business-community/request",

            method:
              "POST",

            body,
          }),

          invalidatesTags: [
            "BusinessCommunity",
            "Community",
          ],
        }),
    }),

    overrideExisting: false,
  });

export const {
  useGetMyBusinessCommunityStatusQuery,
  useSubmitBusinessCommunityRequestMutation,
} = businessCommunityApi;