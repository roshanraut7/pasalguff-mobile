
import { baseApi } from "./baseApi";
import type { DiscussionAuthor } from "./communityDiscussionApi";

export type DiscussionLiveStatus =
  | "SCHEDULED"
  | "LIVE"
  | "ENDED"
  | "CANCELLED";

export type LiveViewerRole =
  | "VIEWER"
  | "CONTRIBUTOR"
  | "LIVE_CREATOR"
  | "DISCUSSION_CREATOR"
  | "MANAGER";

export type DiscussionParticipantMode =
  | "NORMAL"
  | "VIEWER_LIMITED"
  | "BLOCKED";

export type LiveViewerContext = {
  role: LiveViewerRole;
  participantMode: DiscussionParticipantMode;

  canWatchLive: boolean;
  canSendMessage: boolean;
  canRequestContributor: boolean;

  canScheduleLive: boolean;
  canStartLive: boolean;
  canEndLive: boolean;
  canCancelLive: boolean;
  canDeleteMessages: boolean;

  isViewerLimited: boolean;
  message?: string | null;
};

export type CommunityDiscussionLiveChat = {
  id: string;
  discussionId: string;

  status: DiscussionLiveStatus;

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

export type CommunityDiscussionLiveMessage = {
  id: string;
  liveChatId: string;
  authorId: string;

  body: string;
  status: "ACTIVE" | "DELETED";
  clientMessageId?: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  author: DiscussionAuthor;
};

export type LiveDiscussionPayload = {
  communityId: string;
  discussionId: string;
};

export type ScheduleLiveDiscussionPayload = {
  communityId: string;
  discussionId: string;
  scheduledAt: string;
  scheduledEndAt: string;
};

export type GetLiveDiscussionResponse = {
  data: CommunityDiscussionLiveChat | null;
  viewerContext: LiveViewerContext;
};

export type LiveDiscussionResponse = {
  message: string;
  data: CommunityDiscussionLiveChat;
};

export type JoinLiveDiscussionResponse = {
  message: string;
  data: {
    liveChat: CommunityDiscussionLiveChat;
    participant: {
      id: string;
      liveChatId: string;
      userId: string;
      joinedAt?: string;
      leftAt?: string | null;
      lastSeenAt?: string;
    };
  };
};

export type LeaveLiveDiscussionResponse = {
  message: string;
};

export type GetLiveDiscussionMessagesPayload = {
  communityId: string;
  discussionId: string;
  limit?: number;
  cursor?: string;
};

export type GetLiveDiscussionMessagesResponse = {
  data: CommunityDiscussionLiveMessage[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type SendLiveDiscussionMessagePayload = {
  communityId: string;
  discussionId: string;
  body: string;
  clientMessageId?: string;
};

export type SendLiveDiscussionMessageResponse = {
  message: string;
  data: CommunityDiscussionLiveMessage;
};

export type DeleteLiveDiscussionMessagePayload = {
  communityId: string;
  discussionId: string;
  messageId: string;
};

export type DeleteLiveDiscussionMessageResponse = {
  message: string;
  data: CommunityDiscussionLiveMessage;
};

export type RequestLiveContributorPayload = {
  communityId: string;
  discussionId: string;
  message?: string;
};

export type RequestLiveContributorResponse = {
  message: string;
  data: {
    id: string;
    communityId: string;
    userId: string;

    message?: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

    requestedFromDiscussionId?: string | null;

    reviewedById?: string | null;
    reviewedAt?: string | null;
    reviewNote?: string | null;

    createdAt: string;
    updatedAt: string;
  };
};

export const communityDiscussionLiveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLiveDiscussion: builder.query<
      GetLiveDiscussionResponse,
      LiveDiscussionPayload
    >({
      query: ({ communityId, discussionId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live`,
        method: "GET",
      }),
      providesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        "CommunityDiscussionLive",
      ],
    }),

    requestLiveContributor: builder.mutation<
      RequestLiveContributorResponse,
      RequestLiveContributorPayload
    >({
      query: ({ communityId, discussionId, message }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/contributor-request`,
        method: "POST",
        body: {
          message:
            message ??
            "I want contributor access so I can ask questions in this live discussion.",
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.discussionId },
        "CommunityDiscussionLive",
        "CommunityDiscussion",
      ],
    }),

    scheduleLiveDiscussion: builder.mutation<
      LiveDiscussionResponse,
      ScheduleLiveDiscussionPayload
    >({
      query: ({
        communityId,
        discussionId,
        scheduledAt,
        scheduledEndAt,
      }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/schedule`,
        method: "PATCH",
        body: {
          scheduledAt,
          scheduledEndAt,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.discussionId },
        "CommunityDiscussionLive",
        "CommunityDiscussion",
      ],
    }),

    startLiveDiscussion: builder.mutation<
      LiveDiscussionResponse,
      LiveDiscussionPayload
    >({
      query: ({ communityId, discussionId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/start`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.discussionId },
        "CommunityDiscussionLive",
        "CommunityDiscussion",
      ],
    }),

    endLiveDiscussion: builder.mutation<
      LiveDiscussionResponse,
      LiveDiscussionPayload
    >({
      query: ({ communityId, discussionId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/end`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.discussionId },
        "CommunityDiscussionLive",
        "CommunityDiscussion",
      ],
    }),

    cancelLiveDiscussion: builder.mutation<
      LiveDiscussionResponse,
      LiveDiscussionPayload
    >({
      query: ({ communityId, discussionId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/cancel`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        { type: "CommunityDiscussion", id: arg.discussionId },
        "CommunityDiscussionLive",
        "CommunityDiscussion",
      ],
    }),

    joinLiveDiscussion: builder.mutation<
      JoinLiveDiscussionResponse,
      LiveDiscussionPayload
    >({
      query: ({ communityId, discussionId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/join`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        "CommunityDiscussionLive",
      ],
    }),

    leaveLiveDiscussion: builder.mutation<
      LeaveLiveDiscussionResponse,
      LiveDiscussionPayload
    >({
      query: ({ communityId, discussionId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/leave`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        "CommunityDiscussionLive",
      ],
    }),

    getLiveDiscussionMessages: builder.query<
      GetLiveDiscussionMessagesResponse,
      GetLiveDiscussionMessagesPayload
    >({
      query: ({ communityId, discussionId, limit, cursor }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/messages`,
        method: "GET",
        params: {
          ...(limit ? { limit } : {}),
          ...(cursor ? { cursor } : {}),
        },
      }),
      providesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLiveMessage", id: arg.discussionId },
        "CommunityDiscussionLiveMessage",
      ],
    }),

    sendLiveDiscussionMessage: builder.mutation<
      SendLiveDiscussionMessageResponse,
      SendLiveDiscussionMessagePayload
    >({
      query: ({ communityId, discussionId, body, clientMessageId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/messages`,
        method: "POST",
        body: {
          body,
          ...(clientMessageId ? { clientMessageId } : {}),
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLiveMessage", id: arg.discussionId },
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        "CommunityDiscussionLiveMessage",
        "CommunityDiscussionLive",
      ],
    }),

    deleteLiveDiscussionMessage: builder.mutation<
      DeleteLiveDiscussionMessageResponse,
      DeleteLiveDiscussionMessagePayload
    >({
      query: ({ communityId, discussionId, messageId }) => ({
        url: `/communities/${communityId}/discussions/${discussionId}/live/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "CommunityDiscussionLiveMessage", id: arg.discussionId },
        { type: "CommunityDiscussionLive", id: arg.discussionId },
        "CommunityDiscussionLiveMessage",
        "CommunityDiscussionLive",
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetLiveDiscussionQuery,
  useRequestLiveContributorMutation,
  useScheduleLiveDiscussionMutation,
  useStartLiveDiscussionMutation,
  useEndLiveDiscussionMutation,
  useCancelLiveDiscussionMutation,
  useJoinLiveDiscussionMutation,
  useLeaveLiveDiscussionMutation,
  useGetLiveDiscussionMessagesQuery,
  useSendLiveDiscussionMessageMutation,
  useDeleteLiveDiscussionMessageMutation,
} = communityDiscussionLiveApi;
