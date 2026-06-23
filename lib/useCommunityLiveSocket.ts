import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createCommunityLiveSocket,
  makeLiveClientMessageId,
  type CommunityLiveSocket,
} from "@/lib/communityLiveSocket";
import type {
  CommunityDiscussionLiveMessage,
  GetLiveDiscussionResponse,
} from "@/store/api/communityDiscussionLiveApi";

type SocketAck<T = unknown> = {
  ok: boolean;
  data?: T;
  message?: string;
};

type UseCommunityLiveSocketParams = {
  enabled: boolean;
  userId: string;
  communityId: string;
  discussionId: string;
  initialMessages: CommunityDiscussionLiveMessage[];

  onContributorRequestSent?: () => void;
  onContributorRequestReviewed?: () => void;
  onUserBlocked?: () => void;
  onNeedRefresh?: () => void;
};

function mergeMessages(
  previousMessages: CommunityDiscussionLiveMessage[],
  nextMessages: CommunityDiscussionLiveMessage[],
) {
  const map = new Map<string, CommunityDiscussionLiveMessage>();

  [...previousMessages, ...nextMessages].forEach((message) => {
    map.set(message.id, message);
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();

    if (timeA !== timeB) return timeA - timeB;

    return a.id.localeCompare(b.id);
  });
}

export function useCommunityLiveSocket({
  enabled,
  userId,
  communityId,
  discussionId,
  initialMessages,
  onContributorRequestSent,
  onContributorRequestReviewed,
  onUserBlocked,
  onNeedRefresh,
}: UseCommunityLiveSocketParams) {
  const socketRef = useRef<CommunityLiveSocket | null>(null);

  const callbacksRef = useRef({
    onContributorRequestSent,
    onContributorRequestReviewed,
    onUserBlocked,
    onNeedRefresh,
  });

  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<
    CommunityDiscussionLiveMessage[]
  >(initialMessages);
  const [liveMemberCount, setLiveMemberCount] = useState(0);

  useEffect(() => {
    callbacksRef.current = {
      onContributorRequestSent,
      onContributorRequestReviewed,
      onUserBlocked,
      onNeedRefresh,
    };
  }, [
    onContributorRequestSent,
    onContributorRequestReviewed,
    onUserBlocked,
    onNeedRefresh,
  ]);

  useEffect(() => {
    setLiveMessages((previousMessages) =>
      mergeMessages(previousMessages, initialMessages),
    );
  }, [initialMessages]);

  useEffect(() => {
    if (!enabled || !userId || !communityId || !discussionId) {
      setConnected(false);
      return;
    }

    const socket = createCommunityLiveSocket({
      userId,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSocketError(null);

      socket.emit(
        "live:join",
        {
          communityId,
          discussionId,
        },
        (response?: SocketAck<GetLiveDiscussionResponse>) => {
          if (!response?.ok && response?.message) {
            setSocketError(response.message);
          }

          callbacksRef.current.onNeedRefresh?.();
        },
      );
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (error) => {
      setConnected(false);
      setSocketError(error.message || "Socket connection failed");
    });

    socket.on("live:joined", () => {
      setConnected(true);
      setSocketError(null);
      callbacksRef.current.onNeedRefresh?.();
    });

    socket.on("live:newMessage", (message) => {
      setLiveMessages((previousMessages) =>
        mergeMessages(previousMessages, [message]),
      );
    });

    socket.on("live:messageDeleted", (payload) => {
      setLiveMessages((previousMessages) =>
        previousMessages.filter((message) => message.id !== payload.messageId),
      );

      callbacksRef.current.onNeedRefresh?.();
    });

    socket.on("live:memberCount", (payload) => {
      if (payload.discussionId !== discussionId) return;

      setLiveMemberCount(payload.count);
    });

    socket.on("live:contributorRequestSent", () => {
      callbacksRef.current.onContributorRequestSent?.();
      callbacksRef.current.onNeedRefresh?.();
    });

    socket.on("live:contributorRequestReviewed", () => {
      callbacksRef.current.onContributorRequestReviewed?.();
      callbacksRef.current.onNeedRefresh?.();
    });

    socket.on("live:userBlocked", () => {
      callbacksRef.current.onUserBlocked?.();
      callbacksRef.current.onNeedRefresh?.();
    });

    socket.on("live:userLimited", () => {
      callbacksRef.current.onNeedRefresh?.();
    });

    socket.on("live:error", (payload) => {
      setSocketError(payload.message);
    });

    socket.connect();

    return () => {
      socket.emit("live:leave", {
        communityId,
        discussionId,
      });

      socket.removeAllListeners();
      socket.disconnect();

      socketRef.current = null;
      setConnected(false);
      setLiveMemberCount(0);
    };
  }, [enabled, userId, communityId, discussionId]);

  const sendSocketMessage = useCallback(
    (body: string) => {
      const cleanBody = body.trim();

      if (!cleanBody || !socketRef.current || !connected) return;

      socketRef.current.emit(
        "live:sendMessage",
        {
          communityId,
          discussionId,
          body: cleanBody,
          clientMessageId: makeLiveClientMessageId(),
        },
        (response?: SocketAck<CommunityDiscussionLiveMessage>) => {
          if (!response?.ok) {
            if (response?.message) {
              setSocketError(response.message);
            }

            return;
          }

          if (response.data) {
            setLiveMessages((previousMessages) =>
              mergeMessages(previousMessages, [response.data!]),
            );
          }
        },
      );
    },
    [connected, communityId, discussionId],
  );

  const deleteSocketMessage = useCallback(
    (messageId: string) => {
      if (!socketRef.current || !connected) return;

      socketRef.current.emit(
        "live:deleteMessage",
        {
          communityId,
          discussionId,
          messageId,
        },
        (response?: SocketAck<CommunityDiscussionLiveMessage>) => {
          if (!response?.ok) {
            if (response?.message) {
              setSocketError(response.message);
            }

            return;
          }

          setLiveMessages((previousMessages) =>
            previousMessages.filter((message) => message.id !== messageId),
          );

          callbacksRef.current.onNeedRefresh?.();
        },
      );
    },
    [connected, communityId, discussionId],
  );

  const requestContributor = useCallback(
    (message?: string) => {
      if (!socketRef.current || !connected) return false;

      socketRef.current.emit(
        "live:requestContributor",
        {
          communityId,
          discussionId,
          message,
        },
        (response?: SocketAck) => {
          if (!response?.ok) {
            if (response?.message) {
              setSocketError(response.message);
            }

            return;
          }

          callbacksRef.current.onContributorRequestSent?.();
          callbacksRef.current.onNeedRefresh?.();
        },
      );

      return true;
    },
    [connected, communityId, discussionId],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || !connected) return;

      socketRef.current.emit("live:typing", {
        communityId,
        discussionId,
        isTyping,
      });
    },
    [connected, communityId, discussionId],
  );

  return useMemo(
    () => ({
      connected,
      socketError,
      liveMessages,
      liveMemberCount,
      sendSocketMessage,
      deleteSocketMessage,
      requestContributor,
      sendTyping,
    }),
    [
      connected,
      socketError,
      liveMessages,
      liveMemberCount,
      sendSocketMessage,
      deleteSocketMessage,
      requestContributor,
      sendTyping,
    ],
  );
}