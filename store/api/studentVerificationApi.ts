import { baseApi } from "./baseApi";

export type StudentInviteStatus = "PENDING" | "SUBMITTED" | "EXPIRED";

export type StudentVerificationInviteItem = {
  id: string;
  communityId: string;
  invitedById: string;
  targetUserId: string;
  token: string;
  status: StudentInviteStatus;
  expiresAt: string;
  submittedAt: string | null;
  batch: string | null;
  createdAt: string;
  targetUser?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
};

export type VerifiedStudentMember = {
  id: string;
  communityId: string;
  userId: string;
  role: string;
  status: string;
  isVerifiedStudent: boolean;
  studentBatch: string | null;
  verifiedStudentAt: string | null;
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
};

export type EligibleMemberItem = {
  id: string;
  communityId: string;
  userId: string;
  role: string;
  status: string;
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
};

export type StudentVerificationCommunity = {
  id: string;
  name: string;
  avatarImage: string | null;
  purpose: string;
};

export type StudentVerificationInviteDetail = StudentVerificationInviteItem & {
  community: StudentVerificationCommunity;
};

export type SendStudentInvitePayload = {
  communityId: string;
  targetUserId: string;
};

export type SendStudentInviteResponse = {
  message: string;
  invite: StudentVerificationInviteItem;
};

export type SubmitStudentInvitePayload = {
  token: string;
  batch: string;
};

export type SubmitStudentInviteResponse = {
  message: string;
  membership: {
    isVerifiedStudent: boolean;
    studentBatch: string | null;
    verifiedStudentAt: string | null;
  };
};

export type RevokeInvitePayload = {
  communityId: string;
  inviteId: string;
};

export type RevokeVerificationPayload = {
  communityId: string;
  memberUserId: string;
};

export type SimpleMessageResponse = {
  message: string;
};

export const studentVerificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Admin sends a verification invite to an active member.
     *
     * POST /communities/:communityId/student-verification/invite
     */
    sendStudentInvite: builder.mutation<
      SendStudentInviteResponse,
      SendStudentInvitePayload
    >({
      query: ({ communityId, targetUserId }) => ({
        url: `/communities/${communityId}/student-verification/invite`,
        method: "POST",
        body: { targetUserId },
      }),
      invalidatesTags: ["StudentVerification", "CommunityMembers"],
    }),

    /**
     * Admin lists pending invites for a community.
     *
     * GET /communities/:communityId/student-verification/pending
     */
    getPendingStudentInvites: builder.query<
      StudentVerificationInviteItem[],
      string
    >({
      query: (communityId) => ({
        url: `/communities/${communityId}/student-verification/pending`,
        method: "GET",
      }),
      providesTags: ["StudentVerification"],
    }),

    /**
     * Admin revokes a still-pending invite.
     *
     * DELETE /communities/:communityId/student-verification/invite/:inviteId
     */
    revokeStudentInvite: builder.mutation<
      SimpleMessageResponse,
      RevokeInvitePayload
    >({
      query: ({ communityId, inviteId }) => ({
        url: `/communities/${communityId}/student-verification/invite/${inviteId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StudentVerification"],
    }),

    /**
     * Admin revokes an already-granted verification badge.
     *
     * DELETE /communities/:communityId/student-verification/member/:memberUserId
     */
    revokeStudentVerification: builder.mutation<
      SimpleMessageResponse,
      RevokeVerificationPayload
    >({
      query: ({ communityId, memberUserId }) => ({
        url: `/communities/${communityId}/student-verification/member/${memberUserId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StudentVerification", "CommunityMembers"],
    }),

    /**
     * Invited student loads the invite details by token.
     *
     * GET /student-verification/:token
     */
    getStudentInviteByToken: builder.query<
      StudentVerificationInviteDetail,
      string
    >({
      query: (token) => ({
        url: `/student-verification/${token}`,
        method: "GET",
      }),
      providesTags: ["StudentVerification"],
    }),

    getVerifiedStudents: builder.query<VerifiedStudentMember[], string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/student-verification/students`,
        method: "GET",
      }),
      providesTags: ["StudentVerification"],
    }),

    /**
     * Admin lists active members not yet verified (to invite).
     *
     * GET /communities/:communityId/student-verification/eligible-members
     */
    getEligibleMembers: builder.query<EligibleMemberItem[], string>({
      query: (communityId) => ({
        url: `/communities/${communityId}/student-verification/eligible-members`,
        method: "GET",
      }),
      providesTags: ["StudentVerification"],
    }),

    /**
     * Invited student submits their batch to complete verification.
     *
     * POST /student-verification/:token/submit
     */
    submitStudentInvite: builder.mutation<
      SubmitStudentInviteResponse,
      SubmitStudentInvitePayload
    >({
      query: ({ token, batch }) => ({
        url: `/student-verification/${token}/submit`,
        method: "POST",
        body: { batch },
      }),
      invalidatesTags: ["StudentVerification", "Profile"],
    }),
  }),

  overrideExisting: false,
});

export const {
  useSendStudentInviteMutation,
  useGetPendingStudentInvitesQuery,
  useRevokeStudentInviteMutation,
  useRevokeStudentVerificationMutation,
  useGetStudentInviteByTokenQuery,
  useSubmitStudentInviteMutation,
   useGetVerifiedStudentsQuery,      // ADD
  useGetEligibleMembersQuery, 
} = studentVerificationApi;