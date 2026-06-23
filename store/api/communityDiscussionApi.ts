
import { baseApi } from "./baseApi";

export type DiscussionVisibility = "PUBLIC" | "COMMUNITY";

export type DiscussionStatus =
  | "OPEN"
  | "SOLVED"
  | "LOCKED"
  | "CLOSED"
  | "DELETED";

export type DiscussionSource =
  | "MEMBER"
  | "VIEWER_LIMITED"
  | "MODERATOR"
  | "ADMIN";

export type DiscussionAnswerStatus = "ACTIVE" | "DELETED";
export type DiscussionAnswerVoteValue = "UP" | "DOWN" | "REMOVE";
export type ViewerVoteValue = "UP" | "DOWN" | null;
export type CommunityDiscussionLivePreview = {
  id: string;
  discussionId: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdById: string;
  startedById?: string | null;
  endedById?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
    participants: number;
  };
};

export type DiscussionParticipantMode =
  | "NORMAL"
  | "VIEWER_LIMITED"
  | "BLOCKED";

export type CommunityContributorRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type DiscussionAuthor = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  businessName?: string | null;
};

export type DiscussionCommunity = {
  id: string;
  name: string;
  slug: string;
  visibility: "PUBLIC" | "PRIVATE" | "RESTRICTED";
  avatarImage?: string | null;
};

export type CommunityDiscussion = {
  id: string;
  communityId: string;
  authorId: string;

  title: string;
  body: string;

  status: DiscussionStatus;
  visibility: DiscussionVisibility;
  source: DiscussionSource;

  viewCount: number;
  answerCount: number;
  shareCount: number;
  followerCount: number;

  acceptedAnswerId?: string | null;

  createdAt: string;
  updatedAt: string;
  solvedAt?: string | null;
  lockedAt?: string | null;
  closedAt?: string | null;

  community: DiscussionCommunity;
  author: DiscussionAuthor;
  liveChat?:CommunityDiscussionLivePreview | null;
};

export type CommunityDiscussionAnswerReply = {
  id: string;
  discussionId: string;
  authorId: string;
  parentId: string | null;

  body: string;
  status: DiscussionAnswerStatus;
  voteScore: number;
  viewerVote?: ViewerVoteValue;

  isAcceptedAnswer: boolean;
  isAuthorHighlighted: boolean;
  isModeratorPinned: boolean;

  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;

  author: DiscussionAuthor;
};

export type CommunityDiscussionAnswer = {
  id: string;
  discussionId: string;
  authorId: string;
  parentId: string | null;

  body: string;
  status: DiscussionAnswerStatus;
  voteScore: number;
  viewerVote?: ViewerVoteValue;

  isAcceptedAnswer: boolean;
  isAuthorHighlighted: boolean;
  isModeratorPinned: boolean;

  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;

  author: DiscussionAuthor;
  replies: CommunityDiscussionAnswerReply[];
};

export type ViewerLimitInfo = {
  usedCount: number;
  remaining: number;
};

export type DiscussionParticipantOverride = {
  id?: string;
  discussionId: string;
  userId: string;
  mode: DiscussionParticipantMode;
  reason?: string | null;
  changedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: DiscussionAuthor;
  changedBy?: DiscussionAuthor;
};

export type CommunityContributorRequest = {
  id: string;
  communityId: string;
  userId: string;

  message?: string | null;
  status: CommunityContributorRequestStatus;

  requestedFromDiscussionId?: string | null;

  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;

  createdAt: string;
  updatedAt: string;

  user?: DiscussionAuthor;
  reviewedBy?: DiscussionAuthor | null;
  requestedFromDiscussion?: CommunityDiscussion | null;
};

export type CreateCommunityDiscussionPayload = {
  communityId: string;
  title: string;
  body: string;
  visibility?: DiscussionVisibility;
};

export type CreateCommunityDiscussionResponse = {
  message: string;
  data: CommunityDiscussion;
};

export type GetCommunityDiscussionsPayload = {
  communityId: string;
  limit?: number;
  cursor?: string;
  search?: string;
  sortBy?: "newest" | "oldest";
};

export type GetCommunityDiscussionsResponse = {
  data: CommunityDiscussion[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    search: string | null;
    sortBy: "newest" | "oldest";
  };
};

export type GetCommunityDiscussionPayload = {
  communityId: string;
  discussionId: string;
};

export type GetCommunityDiscussionResponse = {
  data: CommunityDiscussion;
};

export type GetHomeFeedDiscussionsPayload = {
  limit?: number;
  cursor?: string;
  search?: string;
  sortBy?: "newest" | "oldest";
};

export type GetHomeFeedDiscussionsResponse = {
  data: CommunityDiscussion[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    search: string | null;
    sortBy: "newest" | "oldest";
  };
};

export type CreateDiscussionAnswerPayload = {
  communityId: string;
  discussionId: string;
  body: string;
};

export type CreateDiscussionAnswerResponse = {
  message: string;
  data: CommunityDiscussionAnswer;
};

export type GetDiscussionAnswersPayload = {
  communityId: string;
  discussionId: string;
  limit?: number;
  cursor?: string;
};

export type GetDiscussionAnswersResponse = {
  data: CommunityDiscussionAnswer[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type CreateDiscussionAnswerReplyPayload = {
  communityId: string;
  discussionId: string;
  answerId: string;
  body: string;
};

export type CreateDiscussionAnswerReplyResponse = {
  message: string;
  data: CommunityDiscussionAnswerReply;
  viewerLimit?: ViewerLimitInfo | null;
};

export type ManageDiscussionAnswerPayload = {
  communityId: string;
  discussionId: string;
  answerId: string;
};

export type ManageDiscussionAnswerResponse = {
  message: string;
  data: CommunityDiscussionAnswer;
};

export type VoteDiscussionAnswerPayload = {
  communityId: string;
  discussionId: string;
  answerId: string;
  vote: DiscussionAnswerVoteValue;
};

export type VoteDiscussionAnswerResponse = {
  message: string;
  data: CommunityDiscussionAnswer;
};

export type VoteDiscussionAnswerReplyPayload = {
  communityId: string;
  discussionId: string;
  answerId: string;
  replyId: string;
  vote: DiscussionAnswerVoteValue;
};

export type VoteDiscussionAnswerReplyResponse = {
  message: string;
  data: CommunityDiscussionAnswer;
};

export type DeleteDiscussionAnswerPayload = {
  communityId: string;
  discussionId: string;
  answerId: string;
};

export type DeleteDiscussionAnswerResponse = {
  message: string;
  data: CommunityDiscussionAnswer;
};

export type DeleteDiscussionAnswerReplyPayload = {
  communityId: string;
  discussionId: string;
  answerId: string;
  replyId: string;
};

export type DeleteDiscussionAnswerReplyResponse = {
  message: string;
  data: CommunityDiscussionAnswerReply;
};

export type UpdateDiscussionParticipantModePayload = {
  communityId: string;
  discussionId: string;
  targetUserId: string;
  mode: DiscussionParticipantMode;
  reason?: string;
};

export type UpdateDiscussionParticipantModeResponse = {
  message: string;
  data: DiscussionParticipantOverride;
};

export type CreateContributorRequestPayload = {
  communityId: string;
  message?: string;
  requestedFromDiscussionId?: string;
};

export type CreateContributorRequestResponse = {
  message: string;
  data: CommunityContributorRequest;
};

export type GetContributorRequestsPayload = {
  communityId: string;
  status?: CommunityContributorRequestStatus;
};

export type GetContributorRequestsResponse = {
  data: CommunityContributorRequest[];
};

export type ReviewContributorRequestPayload = {
  communityId: string;
  requestId: string;
  reviewNote?: string;
};

export type ReviewContributorRequestResponse = {
  message: string;
  data: CommunityContributorRequest;
};

export const communityDiscussionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createCommunityDiscussion: builder.mutation<
      CreateCommunityDiscussionResponse,
      CreateCommunityDiscussionPayload
    >({
      query: ({ communityId, ...body }) => ({
        url: `/communities/${communityId}/discussions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.communityId },
        "CommunityDiscussion",
      ],
    }),

    getCommunityDiscussions: builder.query<
      GetCommunityDiscussionsResponse,
      GetCommunityDiscussionsPayload
    >({
      query: ({ communityId, limit, cursor, search, sortBy }) => ({
        url: `/communities/${communityId}/discussions`,
        method: "GET",
        params: {
          ...(limit ? { limit } : {}),
          ...(cursor ? { cursor } : {}),
          ...(search ? { search } : {}),
          ...(sortBy ? { sortBy } : {}),
        },
      }),
      providesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.communityId },
        "CommunityDiscussion",
      ],
    }),

  getHomeFeedDiscussions: builder.query<
  GetHomeFeedDiscussionsResponse,
  GetHomeFeedDiscussionsPayload
>({
  query: ({ limit, cursor, search, sortBy }) => ({
    url: `/discussions/feed`,
    method: "GET",
    params: {
      ...(limit ? { limit } : {}),
      ...(cursor ? { cursor } : {}),
      ...(search ? { search } : {}),
      ...(sortBy ? { sortBy } : {}),
    },
  }),
  providesTags: ["CommunityDiscussion"],
}),

    getCommunityDiscussion: builder.query<
      GetCommunityDiscussionResponse,
      GetCommunityDiscussionPayload
    >({
      query: ({ communityId, discussionId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.discussionId },
      ],
    }),

    updateDiscussionParticipantMode: builder.mutation<
      UpdateDiscussionParticipantModeResponse,
      UpdateDiscussionParticipantModePayload
    >({
      query: ({
        communityId,
        discussionId,
        targetUserId,
        mode,
        reason,
      }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/participants/${targetUserId}/mode`,
        method: "PATCH",
        body: {
          mode,
          ...(reason ? { reason } : {}),
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.communityId },
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        "CommunityDiscussion",
        "CommunityDiscussionAnswer",
      ],
    }),

    createDiscussionAnswer: builder.mutation<
      CreateDiscussionAnswerResponse,
      CreateDiscussionAnswerPayload
    >({
      query: ({ communityId, discussionId, body }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers`,
        method: "POST",
        body: {
          body,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.communityId },
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        "CommunityDiscussion",
        "CommunityDiscussionAnswer",
      ],
    }),

    getDiscussionAnswers: builder.query<
      GetDiscussionAnswersResponse,
      GetDiscussionAnswersPayload
    >({
      query: ({ communityId, discussionId, limit, cursor }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers`,
        method: "GET",
        params: {
          ...(limit ? { limit } : {}),
          ...(cursor ? { cursor } : {}),
        },
      }),
      providesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        "CommunityDiscussionAnswer",
      ],
    }),

    createDiscussionAnswerReply: builder.mutation<
      CreateDiscussionAnswerReplyResponse,
      CreateDiscussionAnswerReplyPayload
    >({
      query: ({ communityId, discussionId, answerId, body }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}/replies`,
        method: "POST",
        body: {
          body,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        "CommunityDiscussionAnswer",
      ],
    }),

    toggleDiscussionAnswerHighlight: builder.mutation<
      ManageDiscussionAnswerResponse,
      ManageDiscussionAnswerPayload
    >({
      query: ({ communityId, discussionId, answerId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}/highlight`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        "CommunityDiscussionAnswer",
      ],
    }),

    toggleDiscussionAnswerPin: builder.mutation<
      ManageDiscussionAnswerResponse,
      ManageDiscussionAnswerPayload
    >({
      query: ({ communityId, discussionId, answerId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}/pin`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        "CommunityDiscussionAnswer",
      ],
    }),

    voteDiscussionAnswer: builder.mutation<
      VoteDiscussionAnswerResponse,
      VoteDiscussionAnswerPayload
    >({
      query: ({ communityId, discussionId, answerId, vote }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}/vote`,
        method: "POST",
        body: {
          vote,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        "CommunityDiscussionAnswer",
      ],
    }),

    voteDiscussionAnswerReply: builder.mutation<
      VoteDiscussionAnswerReplyResponse,
      VoteDiscussionAnswerReplyPayload
    >({
      query: ({ communityId, discussionId, answerId, replyId, vote }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}/replies/${replyId}/vote`,
        method: "POST",
        body: {
          vote,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        { type: "CommunityDiscussionAnswer", id: arg.replyId },
        "CommunityDiscussionAnswer",
      ],
    }),

    deleteDiscussionAnswer: builder.mutation<
      DeleteDiscussionAnswerResponse,
      DeleteDiscussionAnswerPayload
    >({
      query: ({ communityId, discussionId, answerId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.communityId },
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        "CommunityDiscussion",
        "CommunityDiscussionAnswer",
      ],
    }),

    deleteDiscussionAnswerReply: builder.mutation<
      DeleteDiscussionAnswerReplyResponse,
      DeleteDiscussionAnswerReplyPayload
    >({
      query: ({ communityId, discussionId, answerId, replyId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}/replies/${replyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        { type: "CommunityDiscussionAnswer", id: arg.replyId },
        "CommunityDiscussionAnswer",
      ],
    }),

    acceptDiscussionAnswer: builder.mutation<
      ManageDiscussionAnswerResponse,
      ManageDiscussionAnswerPayload
    >({
      query: ({ communityId, discussionId, answerId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/answers/${answerId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.communityId },
        { type: "CommunityDiscussionAnswer", id: arg.discussionId },
        { type: "CommunityDiscussionAnswer", id: arg.answerId },
        "CommunityDiscussion",
        "CommunityDiscussionAnswer",
      ],
    }),

    createContributorRequest: builder.mutation<
      CreateContributorRequestResponse,
      CreateContributorRequestPayload
    >({
      query: ({ communityId, message, requestedFromDiscussionId }) => ({
        url: `/communities/${communityId}/contributor-requests`,
        method: "POST",
        body: {
          ...(message ? { message } : {}),
          ...(requestedFromDiscussionId ? { requestedFromDiscussionId } : {}),
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.communityId },
        "CommunityDiscussion",
      ],
    }),

    getContributorRequests: builder.query<
      GetContributorRequestsResponse,
      GetContributorRequestsPayload
    >({
      query: ({ communityId, status }) => ({
        url: `/communities/${communityId}/contributor-requests`,
        method: "GET",
        params: {
          ...(status ? { status } : {}),
        },
      }),
      providesTags: ["CommunityDiscussion"],
    }),

    approveContributorRequest: builder.mutation<
      ReviewContributorRequestResponse,
      ReviewContributorRequestPayload
    >({
      query: ({ communityId, requestId, reviewNote }) => ({
        url: `/communities/${communityId}/contributor-requests/${requestId}/approve`,
        method: "PATCH",
        body: {
          ...(reviewNote ? { reviewNote } : {}),
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.communityId },
        "CommunityDiscussion",
      ],
    }),

    rejectContributorRequest: builder.mutation<
      ReviewContributorRequestResponse,
      ReviewContributorRequestPayload
    >({
      query: ({ communityId, requestId, reviewNote }) => ({
        url: `/communities/${communityId}/contributor-requests/${requestId}/reject`,
        method: "PATCH",
        body: {
          ...(reviewNote ? { reviewNote } : {}),
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussion", id: arg.communityId },
        "CommunityDiscussion",
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useCreateCommunityDiscussionMutation,
  useGetCommunityDiscussionsQuery,
  useGetCommunityDiscussionQuery,
  useGetHomeFeedDiscussionsQuery,

  useUpdateDiscussionParticipantModeMutation,

  useCreateDiscussionAnswerMutation,
  useGetDiscussionAnswersQuery,
  useCreateDiscussionAnswerReplyMutation,
  useToggleDiscussionAnswerHighlightMutation,
  useToggleDiscussionAnswerPinMutation,
  useAcceptDiscussionAnswerMutation,

  useVoteDiscussionAnswerMutation,
  useVoteDiscussionAnswerReplyMutation,
  useDeleteDiscussionAnswerMutation,
  useDeleteDiscussionAnswerReplyMutation,

  useCreateContributorRequestMutation,
  useGetContributorRequestsQuery,
  useApproveContributorRequestMutation,
  useRejectContributorRequestMutation,
} = communityDiscussionApi;

