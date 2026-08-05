import { baseApi } from "./baseApi";
import type { UserProfileType } from "./onboardingApi";

export type VerificationTrack =
  | "BUSINESS"
  | "INDIVIDUAL"
  | "TRAINING";

/**
 * Keep INSTITUTE_CERTIFICATE because older requests
 * may already contain it in the database.
 *
 * New requests will use only:
 * - PAN
 * - CITIZENSHIP
 */
export type VerificationDocumentType =
  | "PAN"
  | "CITIZENSHIP"
  | "INSTITUTE_CERTIFICATE";

export type ExpectedVerificationDocumentType =
  | "PAN"
  | "CITIZENSHIP";

export type VerificationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type VerificationRequestItem = {
  id: string;
  userId: string;

  track: VerificationTrack;
  documentType: VerificationDocumentType;

  documentNumber: string | null;
  documentFrontUrl: string;
  documentBackUrl: string | null;

  status: VerificationStatus;

  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

/**
 * GET /verification/me
 */
export type MyVerificationStatusResponse = {
  profileType: UserProfileType | null;
  profileRole: string | null;

  isVerified: boolean;
  verifiedAt: string | null;
  verificationTrack: VerificationTrack | null;

  /**
   * Automatically determined by the backend.
   *
   * BUSINESS   -> BUSINESS
   * INSTITUTE  -> TRAINING
   * INDIVIDUAL -> INDIVIDUAL
   */
  expectedTrack: VerificationTrack;

  /**
   * Automatically determined by the backend.
   *
   * BUSINESS   -> PAN
   * INSTITUTE  -> PAN
   * INDIVIDUAL -> CITIZENSHIP
   */
  expectedDocumentType: ExpectedVerificationDocumentType;

  latestRequest: VerificationRequestItem | null;
};

export type VerificationHistoryQuery = {
  page?: number;
  limit?: number;
};

export type VerificationHistoryResponse = {
  data: VerificationRequestItem[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

/**
 * POST /verification/submit
 *
 * Do not send track or documentType.
 * The backend determines those from profileType.
 */
export type SubmitVerificationPayload = {
  /**
   * PAN number for BUSINESS and INSTITUTE.
   * Citizenship number for INDIVIDUAL.
   */
  documentNumber: string;

  /**
   * PAN document or citizenship front image.
   */
  documentFrontUrl: string;

  /**
   * Required for citizenship.
   * Optional for PAN.
   */
  documentBackUrl?: string | null;
};

export type SubmitVerificationResponse = {
  message: string;

  profileType: UserProfileType;
  profileRole: string | null;

  expectedTrack: VerificationTrack;
  documentType: ExpectedVerificationDocumentType;

  request: VerificationRequestItem;
};

function buildQueryParams(
  params?: Record<
    string,
    string | number | undefined
  >,
) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        query.append(
          key,
          String(value),
        );
      }
    },
  );

  const queryString =
    query.toString();

  return queryString
    ? `?${queryString}`
    : "";
}

export const verificationApi =
  baseApi.injectEndpoints({
    endpoints: (builder) => ({
      /**
       * GET /verification/me
       */
      getMyVerificationStatus:
        builder.query<
          MyVerificationStatusResponse,
          void
        >({
          query: () => ({
            url: "/verification/me",
            method: "GET",
          }),

          providesTags: [
            "Verification",
          ],
        }),

      /**
       * GET /verification/me/history
       */
      getMyVerificationHistory:
        builder.query<
          VerificationHistoryResponse,
          VerificationHistoryQuery | void
        >({
          query: (params) => ({
            url:
              `/verification/me/history${buildQueryParams(
                {
                  page:
                    params?.page ?? 1,

                  limit:
                    params?.limit ?? 20,
                },
              )}`,

            method: "GET",
          }),

          providesTags: [
            "Verification",
          ],
        }),

      /**
       * POST /verification/submit
       *
       * Upload documents first, then pass
       * the returned URLs here.
       */
      submitVerificationRequest:
        builder.mutation<
          SubmitVerificationResponse,
          SubmitVerificationPayload
        >({
          query: (body) => ({
            url: "/verification/submit",
            method: "POST",
            body,
          }),

          invalidatesTags: [
            "Verification",
            "Profile",
          ],
        }),
    }),

    overrideExisting: false,
  });

export const {
  useGetMyVerificationStatusQuery,
  useGetMyVerificationHistoryQuery,
  useSubmitVerificationRequestMutation,
} = verificationApi;