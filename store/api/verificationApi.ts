import { baseApi } from "./baseApi";

export type VerificationTrack = "BUSINESS" | "INDIVIDUAL" | "TRAINING";

export type VerificationDocumentType =
  | "PAN"
  | "CITIZENSHIP"
  | "INSTITUTE_CERTIFICATE";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

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

export type MyVerificationStatusResponse = {
  isVerified: boolean;
  verifiedAt: string | null;
  verificationTrack: VerificationTrack | null;
  expectedTrack: VerificationTrack;
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

export type SubmitVerificationPayload = {
  track: VerificationTrack;
  documentType: VerificationDocumentType;
  documentNumber?: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
};

export type SubmitVerificationResponse = {
  message: string;
  request: VerificationRequestItem;
};

function buildQueryParams(
  params?: Record<string, string | number | undefined>,
) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

export const verificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Logged-in user's current verification status + latest request.
     *
     * GET /verification/me
     */
    getMyVerificationStatus: builder.query<MyVerificationStatusResponse, void>({
      query: () => ({
        url: "/verification/me",
        method: "GET",
      }),
      providesTags: ["Verification"],
    }),

    /**
     * Logged-in user's full verification request history.
     *
     * GET /verification/me/history?page=1&limit=20
     */
    getMyVerificationHistory: builder.query<
      VerificationHistoryResponse,
      VerificationHistoryQuery | void
    >({
      query: (params) => ({
        url: `/verification/me/history${buildQueryParams({
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
        })}`,
        method: "GET",
      }),
      providesTags: ["Verification"],
    }),

    /**
     * Submit a new verification request. Upload document(s) via
     * useUploadVerificationDocumentMutation first, then pass the
     * returned URL(s) here.
     *
     * POST /verification/submit
     */
    submitVerificationRequest: builder.mutation<
      SubmitVerificationResponse,
      SubmitVerificationPayload
    >({
      query: (body) => ({
        url: "/verification/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Verification", "Profile"],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetMyVerificationStatusQuery,
  useGetMyVerificationHistoryQuery,
  useSubmitVerificationRequestMutation,
} = verificationApi;