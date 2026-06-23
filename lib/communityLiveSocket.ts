import { io, type Socket } from "socket.io-client";

import type {
  CommunityDiscussionLiveMessage,
  GetLiveDiscussionResponse,
} from "@/store/api/communityDiscussionLiveApi";

export type LiveSocketJoinPayload = {
  communityId: string;
  discussionId: string;
};

export type LiveSocketSendMessagePayload = {
  communityId: string;
  discussionId: string;
  body: string;
  clientMessageId?: string;
};

export type LiveSocketDeleteMessagePayload = {
  communityId: string;
  discussionId: string;
  messageId: string;
};

export type LiveSocketTypingPayload = {
  communityId: string;
  discussionId: string;
  isTyping: boolean;
};

export type LiveSocketRequestContributorPayload = {
  communityId: string;
  discussionId: string;
  message?: string;
};

type SocketAck<T = unknown> = {
  ok: boolean;
  data?: T;
  message?: string;
};

export type LiveContributorRequestSocketPayload = {
  communityId?: string;
  discussionId?: string;
  requestId?: string;
  userId?: string;
};

export type LiveUserModerationSocketPayload = {
  communityId?: string;
  discussionId?: string;
  targetUserId?: string;
  mode?: "NORMAL" | "VIEWER_LIMITED" | "BLOCKED";
  message?: string;
};

type ServerToClientEvents = {
  "live:connected": (payload: { message: string; userId: string }) => void;

  "live:joined": (payload: {
    message: string;
    room: string;
    live: GetLiveDiscussionResponse;
  }) => void;

  "live:userJoined": (payload: {
    userId: string;
    discussionId: string;
  }) => void;

  "live:userLeft": (payload: {
    userId: string;
    discussionId: string;
  }) => void;

  "live:newMessage": (message: CommunityDiscussionLiveMessage) => void;

  "live:messageDeleted": (payload: {
    messageId: string;
    discussionId: string;
    data?: CommunityDiscussionLiveMessage;
  }) => void;

  "live:memberCount": (payload: {
    discussionId: string;
    count: number;
  }) => void;

  "live:userTyping": (payload: {
    userId: string;
    discussionId: string;
    isTyping: boolean;
  }) => void;

  "live:contributorRequestSent": (
    payload: LiveContributorRequestSocketPayload,
  ) => void;

  "live:contributorRequestReviewed": (
    payload: LiveContributorRequestSocketPayload,
  ) => void;

  "live:userBlocked": (payload: LiveUserModerationSocketPayload) => void;

  "live:userLimited": (payload: LiveUserModerationSocketPayload) => void;

  "live:error": (payload: { message: string }) => void;
};

type ClientToServerEvents = {
  "live:join": (
    payload: LiveSocketJoinPayload,
    callback?: (response: SocketAck<GetLiveDiscussionResponse>) => void,
  ) => void;

  "live:leave": (
    payload: LiveSocketJoinPayload,
    callback?: (response: SocketAck) => void,
  ) => void;

  "live:sendMessage": (
    payload: LiveSocketSendMessagePayload,
    callback?: (response: SocketAck<CommunityDiscussionLiveMessage>) => void,
  ) => void;

  "live:deleteMessage": (
    payload: LiveSocketDeleteMessagePayload,
    callback?: (response: SocketAck<CommunityDiscussionLiveMessage>) => void,
  ) => void;

  "live:typing": (
    payload: LiveSocketTypingPayload,
    callback?: (response: SocketAck) => void,
  ) => void;

  "live:requestContributor": (
    payload: LiveSocketRequestContributorPayload,
    callback?: (response: SocketAck) => void,
  ) => void;
};

export type CommunityLiveSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

function getSocketBaseUrl() {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

  return apiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function createCommunityLiveSocket(params: {
  userId: string;
  token?: string;
}) {
  const socketBaseUrl = getSocketBaseUrl();

  return io(`${socketBaseUrl}/community-live`, {
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    auth: {
      userId: params.userId,
      ...(params.token ? { token: params.token } : {}),
    },
  }) as CommunityLiveSocket;
}

export function makeLiveClientMessageId() {
  return `live-mobile-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}