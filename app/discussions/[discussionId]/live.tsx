
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "@/api/better-auth-client";
import type { AppColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useCommunityLiveSocket } from "@/lib/useCommunityLiveSocket";
import {
  useApproveContributorRequestMutation,
  useGetCommunityDiscussionQuery,
  useGetContributorRequestsQuery,
  useRejectContributorRequestMutation,
  useUpdateDiscussionParticipantModeMutation,
  type CommunityContributorRequest,
} from "@/store/api/communityDiscussionApi";
import {
  useDeleteLiveDiscussionMessageMutation,
  useEndLiveDiscussionMutation,
  useGetLiveDiscussionMessagesQuery,
  useGetLiveDiscussionQuery,
  useRequestLiveContributorMutation,
  useSendLiveDiscussionMessageMutation,
  type CommunityDiscussionLiveMessage,
  type DiscussionLiveStatus,
} from "@/store/api/communityDiscussionLiveApi";

import { styles } from "@/constants/styles/livechat.styles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type BasicAuthor = {
  id?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  businessName?: string | null;
};

function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getAuthorName(author?: BasicAuthor | null) {
  if (!author) return "Unknown user";

  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown user";
}

function getInitials(name?: string | null) {
  const cleanName = name?.trim();

  if (!cleanName) return "U";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMessageTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data
  ) {
    const message = error.data.message;

    if (Array.isArray(message)) return message.join("\n");
    if (typeof message === "string") return message;
  }

  return "Please try again.";
}

function makeClientMessageId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getLiveStatusMeta(status?: DiscussionLiveStatus | null) {
  if (status === "LIVE") {
    return {
      label: "Live now",
      icon: "radio" as const,
      tone: "danger" as const,
    };
  }

  if (status === "SCHEDULED") {
    return {
      label: "Scheduled",
      icon: "calendar-outline" as const,
      tone: "warning" as const,
    };
  }

  if (status === "ENDED") {
    return {
      label: "Ended",
      icon: "checkmark-circle-outline" as const,
      tone: "success" as const,
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Cancelled",
      icon: "close-circle-outline" as const,
      tone: "danger" as const,
    };
  }

  return {
    label: "Not active",
    icon: "chatbubbles-outline" as const,
    tone: "default" as const,
  };
}

function getToneColor(
  tone: "default" | "success" | "warning" | "danger",
  colors: AppColors,
) {
  if (tone === "success") return colors.success;
  if (tone === "warning") return colors.warning;
  if (tone === "danger") return colors.danger;

  return colors.accent;
}

function getRequestDiscussionId(request: CommunityContributorRequest) {
  return (
    request.requestedFromDiscussionId ??
    request.requestedFromDiscussion?.id ??
    null
  );
}

function RequestUserLine({
  request,
  colors,
}: {
  request: CommunityContributorRequest;
  colors: AppColors;
}) {
  const userName = getAuthorName(request.user);
  const userImage = request.user?.image
    ? toAbsoluteFileUrl(request.user.image) ?? undefined
    : undefined;

  return (
    <View style={styles.requestUserLine}>
      <View
        style={[
          styles.requestAvatar,
          {
            backgroundColor: colors.surfaceTertiary,
            overflow: "hidden",
          },
        ]}
      >
        {userImage ? (
          <Image source={{ uri: userImage }} style={styles.messageAvatarImage} />
        ) : (
          <Text
            style={[
              styles.messageAvatarText,
              {
                color: colors.segmentForeground,
              },
            ]}
          >
            {getInitials(userName)}
          </Text>
        )}
      </View>

      <View style={styles.requestInfo}>
        <Text
          numberOfLines={1}
          style={[styles.requestUserName, { color: colors.foreground }]}
        >
          {userName}
        </Text>

        <Text
          numberOfLines={2}
          style={[styles.requestMessage, { color: colors.muted }]}
        >
          {request.message || "Wants contributor access."}
        </Text>
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  isMine,
  canManageLive,
  canDelete,
  colors,
  onLongPressMessage,
}: {
  message: CommunityDiscussionLiveMessage;
  isMine: boolean;
  canManageLive: boolean;
  canDelete: boolean;
  colors: AppColors;
  onLongPressMessage: (message: CommunityDiscussionLiveMessage) => void;
}) {
  const author = message.author as BasicAuthor | undefined;
  const authorName = getAuthorName(author);
  const initials = getInitials(authorName);

  const authorImage = author?.image
    ? toAbsoluteFileUrl(author.image) ?? undefined
    : undefined;

  return (
    <Pressable
      onLongPress={() => {
        if (canDelete || canManageLive) {
          onLongPressMessage(message);
        }
      }}
      style={[
        styles.messageRow,
        {
          justifyContent: isMine ? "flex-end" : "flex-start",
        },
      ]}
    >
      {!isMine ? (
        <View
          style={[
            styles.messageAvatar,
            {
              backgroundColor: colors.surfaceTertiary,
              overflow: "hidden",
            },
          ]}
        >
          {authorImage ? (
            <Image
              source={{ uri: authorImage }}
              style={styles.messageAvatarImage}
            />
          ) : (
            <Text
              style={[
                styles.messageAvatarText,
                {
                  color: colors.segmentForeground,
                },
              ]}
            >
              {initials}
            </Text>
          )}
        </View>
      ) : null}

      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isMine ? colors.accent : colors.surface,
            borderColor: isMine ? colors.accent : colors.border,
            borderBottomLeftRadius: isMine ? 18 : 6,
            borderBottomRightRadius: isMine ? 6 : 18,
          },
        ]}
      >
        {!isMine ? (
          <Text
            numberOfLines={1}
            style={[styles.messageAuthor, { color: colors.foreground }]}
          >
            {authorName}
          </Text>
        ) : null}

        <Text
          style={[
            styles.messageText,
            {
              color: isMine ? colors.accentForeground : colors.foreground,
            },
          ]}
        >
          {message.body}
        </Text>

        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.messageTime,
              {
                color: isMine ? colors.accentForeground : colors.muted,
                opacity: isMine ? 0.85 : 1,
              },
            ]}
          >
            {formatMessageTime(message.createdAt)}
          </Text>

          {canDelete || canManageLive ? (
            <Ionicons
              name="ellipsis-horizontal"
              size={13}
              color={isMine ? colors.accentForeground : colors.muted}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function LiveDiscussionPage() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();

  const listRef = useRef<FlatList<CommunityDiscussionLiveMessage> | null>(null);
  const liveBlinkOpacity = useRef(new Animated.Value(1)).current;

  const params = useLocalSearchParams<{
    discussionId?: string | string[];
    communityId?: string | string[];
    communityName?: string | string[];
  }>();

  const discussionId = getParamValue(params.discussionId);
  const communityId = getParamValue(params.communityId);
  const paramCommunityName = getParamValue(params.communityName);

  const shouldSkipQuery = !communityId || !discussionId;
  const viewerId = session?.user?.id ?? "";

  const [messageDraft, setMessageDraft] = useState("");
  const [composerHeight, setComposerHeight] = useState(86);
  const [showTopicDetails, setShowTopicDetails] = useState(true);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated });
      }, 80);
    });
  }, []);

  const {
    data: discussionResponse,
    isLoading: isLoadingDiscussion,
    isFetching: isFetchingDiscussion,
    error: discussionError,
    refetch: refetchDiscussion,
  } = useGetCommunityDiscussionQuery(
    {
      communityId: communityId ?? "",
      discussionId: discussionId ?? "",
    },
    {
      skip: shouldSkipQuery,
    },
  );

  const {
    data: liveResponse,
    isLoading: isLoadingLive,
    isFetching: isFetchingLive,
    error: liveError,
    refetch: refetchLive,
  } = useGetLiveDiscussionQuery(
    {
      communityId: communityId ?? "",
      discussionId: discussionId ?? "",
    },
    {
      skip: shouldSkipQuery,
      pollingInterval: 8000,
    },
  );

  const liveChat = liveResponse?.data ?? null;
  const viewerContext = liveResponse?.viewerContext;

  const liveStatus = liveChat?.status ?? null;
  const isLive = liveStatus === "LIVE";
  const isScheduled = liveStatus === "SCHEDULED";
  const isEnded = liveStatus === "ENDED";
  const isCancelled = liveStatus === "CANCELLED";

  const {
    data: messagesResponse,
    isLoading: isLoadingMessages,
    isFetching: isFetchingMessages,
    error: messagesError,
    refetch: refetchMessages,
  } = useGetLiveDiscussionMessagesQuery(
    {
      communityId: communityId ?? "",
      discussionId: discussionId ?? "",
      limit: 80,
    },
    {
      skip: shouldSkipQuery || !liveChat,
      pollingInterval: isLive ? 15000 : 0,
    },
  );

  const [sendLiveMessage, { isLoading: isSendingMessage }] =
    useSendLiveDiscussionMessageMutation();

  const [deleteLiveMessage, { isLoading: isDeletingMessage }] =
    useDeleteLiveDiscussionMessageMutation();

  const [endLiveDiscussion, { isLoading: isEndingLive }] =
    useEndLiveDiscussionMutation();

  const [requestLiveContributor, { isLoading: isRequestingContributor }] =
    useRequestLiveContributorMutation();

  const [approveContributorRequest, { isLoading: isApprovingRequest }] =
    useApproveContributorRequestMutation();

  const [rejectContributorRequest, { isLoading: isRejectingRequest }] =
    useRejectContributorRequestMutation();

  const [updateDiscussionParticipantMode, { isLoading: isUpdatingUserMode }] =
    useUpdateDiscussionParticipantModeMutation();

  const discussion = discussionResponse?.data;

  const communityName =
    discussion?.community?.name ?? paramCommunityName ?? "Selected community";

  const messages = useMemo(
    () => messagesResponse?.data ?? [],
    [messagesResponse?.data],
  );

  const canSendFromPermission = Boolean(viewerContext?.canSendMessage);
  const canRequestContributor = Boolean(viewerContext?.canRequestContributor);
  const canDeleteMessages = Boolean(viewerContext?.canDeleteMessages);
  const canEndLive = Boolean(viewerContext?.canEndLive);

  const viewerRole = viewerContext?.role ?? "VIEWER";

  const discussionAuthorId =
    discussion?.authorId ?? discussion?.author?.id ?? null;

  const isDiscussionCreator = Boolean(
    viewerId && discussionAuthorId && discussionAuthorId === viewerId,
  );

  const isLiveCreator = Boolean(
    viewerId && liveChat?.createdById && liveChat.createdById === viewerId,
  );

  const isLiveStarter = Boolean(
    viewerId && liveChat?.startedById && liveChat.startedById === viewerId,
  );

  const isManagerRole =
    viewerRole === "MANAGER" ||
    viewerRole === "DISCUSSION_CREATOR" ||
    viewerRole === "LIVE_CREATOR";

  const canManageLive = Boolean(
    isManagerRole ||
      canEndLive ||
      canDeleteMessages ||
      isDiscussionCreator ||
      isLiveCreator ||
      isLiveStarter,
  );

  const canReviewContributorRequests = Boolean(
    canManageLive && communityId && discussionId,
  );

 const {
  data: contributorRequestsResponse,
  isFetching: isFetchingContributorRequests,
  error: contributorRequestsError,
  refetch: refetchContributorRequests,
} = useGetContributorRequestsQuery(
    {
      communityId: communityId ?? "",
      status: "PENDING",
    },
    {
  skip: !communityId || !discussionId || !viewerId,
  pollingInterval: 4000,
},
  );

  const {
    connected: socketConnected,
    socketError,
    liveMessages,
    liveMemberCount,
    sendSocketMessage,
    requestContributor: requestContributorViaSocket,
    deleteSocketMessage,
  } = useCommunityLiveSocket({
    enabled: Boolean(isLive && viewerId && communityId && discussionId),
    userId: viewerId,
    communityId: communityId ?? "",
    discussionId: discussionId ?? "",
    initialMessages: messages,
    onContributorRequestSent: () => {
      if (canReviewContributorRequests) {
        void refetchContributorRequests();
      }
    },
    onContributorRequestReviewed: () => {
      void refetchLive();

      if (canReviewContributorRequests) {
        void refetchContributorRequests();
      }
    },
    onUserBlocked: () => {
      void refetchLive();
      void refetchMessages();
    },
    onNeedRefresh: () => {
      void refetchLive();

      if (canReviewContributorRequests) {
        void refetchContributorRequests();
      }
    },
  });

  const displayMessages = socketConnected ? liveMessages : messages;

  const displayMemberCount = socketConnected
    ? liveMemberCount
    : liveChat?._count?.participants ?? 0;

  const displayMessageCount =
    displayMessages.length > 0
      ? displayMessages.length
      : liveChat?._count?.messages ?? 0;

  const pendingLiveRequests = useMemo(() => {
    const requests = contributorRequestsResponse?.data ?? [];

    return requests.filter((request) => {
      const linkedDiscussionId = getRequestDiscussionId(request);

      if (linkedDiscussionId) {
        return linkedDiscussionId === discussionId;
      }

      return canReviewContributorRequests;
    });
  }, [
    contributorRequestsResponse?.data,
    discussionId,
    canReviewContributorRequests,
  ]);
console.log("LIVE CONTRIBUTOR DEBUG:", {
  viewerId,
  viewerRole,
  canReviewContributorRequests,
  contributorRequestsResponse,
  contributorRequestsError,
  allRequests: contributorRequestsResponse?.data,
  pendingLiveRequests,
  discussionId,
});

  const statusMeta = getLiveStatusMeta(liveStatus);
  const statusColor = getToneColor(statusMeta.tone, colors);

  const isBusy =
    isLoadingDiscussion ||
    isFetchingDiscussion ||
    isLoadingLive ||
    isFetchingLive ||
    isLoadingMessages ||
    isFetchingMessages ||
    isSendingMessage ||
    isEndingLive ||
    isDeletingMessage ||
    isRequestingContributor ||
    isApprovingRequest ||
    isRejectingRequest ||
    isFetchingContributorRequests ||
    isUpdatingUserMode;

  const canSendMessage =
    isLive &&
    canSendFromPermission &&
    messageDraft.trim().length > 0 &&
    !isSendingMessage;

 const liveConnectionLabel = isLive
  ? socketConnected
    ? "Connected live"
    : socketError
      ? "Live now · socket offline"
      : "Live now"
  : "History";

  useEffect(() => {
    if (!isLive) {
      liveBlinkOpacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(liveBlinkOpacity, {
          toValue: 0.2,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(liveBlinkOpacity, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isLive, liveBlinkOpacity]);

  useEffect(() => {
    if (!displayMessages.length) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    scrollToBottom(true);
  }, [displayMessages.length, scrollToBottom]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      scrollToBottom(true);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      scrollToBottom(true);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollToBottom]);

  const refreshLivePage = useCallback(async () => {
    await Promise.all([
      refetchDiscussion(),
      refetchLive(),
      liveChat ? refetchMessages() : Promise.resolve(),
      canReviewContributorRequests
        ? refetchContributorRequests()
        : Promise.resolve(),
    ]);
  }, [
    refetchDiscussion,
    refetchLive,
    refetchMessages,
    liveChat,
    canReviewContributorRequests,
    refetchContributorRequests,
  ]);

  const handleSendMessage = useCallback(async () => {
    if (!communityId || !discussionId) return;

    const cleanMessage = messageDraft.trim();

    if (!cleanMessage) return;

    if (!isLive) {
      Alert.alert(
        "Live discussion not active",
        "Messages can only be sent while the live discussion is running.",
      );
      return;
    }

    if (!canSendFromPermission) {
      Alert.alert(
        "Contributor access required",
        "You need contributor access to ask questions in this live chat.",
      );
      return;
    }

    try {
      setMessageDraft("");

      if (socketConnected) {
        sendSocketMessage(cleanMessage);
        return;
      }

      await sendLiveMessage({
        communityId,
        discussionId,
        body: cleanMessage,
        clientMessageId: makeClientMessageId(),
      }).unwrap();

      await refetchMessages();
    } catch (error) {
      setMessageDraft(cleanMessage);
      Alert.alert("Could not send message", getErrorMessage(error));
    }
  }, [
    communityId,
    discussionId,
    isLive,
    canSendFromPermission,
    messageDraft,
    socketConnected,
    sendSocketMessage,
    sendLiveMessage,
    refetchMessages,
  ]);

  const handleRequestContributor = useCallback(async () => {
    if (!communityId || !discussionId) return;

    try {
      const message =
        "I want contributor access so I can ask questions in this live discussion.";

      const socketSent = socketConnected
        ? requestContributorViaSocket(message)
        : false;

      if (!socketSent) {
        await requestLiveContributor({
          communityId,
          discussionId,
          message,
        }).unwrap();
      }

      Alert.alert(
        "Request sent",
        "Your contributor request has been sent to the community team.",
      );

      await refetchLive();
    } catch (error) {
      Alert.alert(
        "Could not request contributor access",
        getErrorMessage(error),
      );
    }
  }, [
    communityId,
    discussionId,
    socketConnected,
    requestContributorViaSocket,
    requestLiveContributor,
    refetchLive,
  ]);

  const handleApproveContributorRequest = useCallback(
    async (requestId: string) => {
      if (!communityId) return;

      try {
        await approveContributorRequest({
          communityId,
          requestId,
          reviewNote: "Approved from live discussion.",
        }).unwrap();

        await Promise.all([refetchContributorRequests(), refetchLive()]);
      } catch (error) {
        Alert.alert("Could not approve request", getErrorMessage(error));
      }
    },
    [
      communityId,
      approveContributorRequest,
      refetchContributorRequests,
      refetchLive,
    ],
  );

  const handleRejectContributorRequest = useCallback(
    async (requestId: string) => {
      if (!communityId) return;

      try {
        await rejectContributorRequest({
          communityId,
          requestId,
          reviewNote: "Rejected from live discussion.",
        }).unwrap();

        await refetchContributorRequests();
      } catch (error) {
        Alert.alert("Could not reject request", getErrorMessage(error));
      }
    },
    [communityId, rejectContributorRequest, refetchContributorRequests],
  );

  const handleDeleteLiveMessage = useCallback(
    async (messageId: string) => {
      if (!communityId || !discussionId) return;

      try {
        if (socketConnected) {
          deleteSocketMessage(messageId);
          return;
        }

        await deleteLiveMessage({
          communityId,
          discussionId,
          messageId,
        }).unwrap();

        await refetchMessages();
      } catch (error) {
        Alert.alert("Could not delete message", getErrorMessage(error));
      }
    },
    [
      communityId,
      discussionId,
      socketConnected,
      deleteSocketMessage,
      deleteLiveMessage,
      refetchMessages,
    ],
  );

  const handleUpdateUserMode = useCallback(
    async (
      targetUserId: string,
      mode: "VIEWER_LIMITED" | "BLOCKED" | "NORMAL",
      reason: string,
    ) => {
      if (!communityId || !discussionId) return;

      try {
        await updateDiscussionParticipantMode({
          communityId,
          discussionId,
          targetUserId,
          mode,
          reason,
        }).unwrap();

        await Promise.all([
          refetchLive(),
          refetchMessages(),
          canReviewContributorRequests
            ? refetchContributorRequests()
            : Promise.resolve(),
        ]);
      } catch (error) {
        Alert.alert("Could not update user", getErrorMessage(error));
      }
    },
    [
      communityId,
      discussionId,
      updateDiscussionParticipantMode,
      refetchLive,
      refetchMessages,
      canReviewContributorRequests,
      refetchContributorRequests,
    ],
  );

  const handleLongPressMessage = useCallback(
    (message: CommunityDiscussionLiveMessage) => {
      const isMine = message.authorId === viewerId;
      const author = message.author as BasicAuthor | undefined;
      const targetName = getAuthorName(author);

      const actions: {
        text: string;
        style?: "default" | "cancel" | "destructive";
        onPress?: () => void;
      }[] = [];

      if (canDeleteMessages || isMine) {
        actions.push({
          text: "Delete message",
          style: "destructive",
          onPress: () => {
            void handleDeleteLiveMessage(message.id);
          },
        });
      }

      if (canManageLive && !isMine) {
        actions.push({
          text: `Limit ${targetName}`,
          onPress: () => {
            void handleUpdateUserMode(
              message.authorId,
              "VIEWER_LIMITED",
              "Limited from live discussion.",
            );
          },
        });

        actions.push({
          text: `Block ${targetName}`,
          style: "destructive",
          onPress: () => {
            void handleUpdateUserMode(
              message.authorId,
              "BLOCKED",
              "Blocked from live discussion.",
            );
          },
        });
      }

      actions.push({
        text: "Cancel",
        style: "cancel",
      });

      Alert.alert("Message options", targetName, actions);
    },
    [
      viewerId,
      canDeleteMessages,
      canManageLive,
      handleDeleteLiveMessage,
      handleUpdateUserMode,
    ],
  );

  const handleEndLive = useCallback(() => {
    if (!communityId || !discussionId) return;

    Alert.alert(
      "End live discussion",
      "Are you sure you want to end this live discussion?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "End Live",
          style: "destructive",
          onPress: async () => {
            try {
              await endLiveDiscussion({
                communityId,
                discussionId,
              }).unwrap();

              await refreshLivePage();
            } catch (error) {
              Alert.alert("Could not end live", getErrorMessage(error));
            }
          },
        },
      ],
    );
  }, [communityId, discussionId, endLiveDiscussion, refreshLivePage]);

  const emptyMessageText = isLive
    ? canSendFromPermission
      ? "Be the first to ask a question."
      : "You can watch this live chat. Request contributor access to ask questions."
    : "Messages will appear here when the live discussion starts.";

  if (shouldSkipQuery) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.centerBlock}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.danger}
          />

          <Text style={[styles.centerTitle, { color: colors.foreground }]}>
            Missing live discussion
          </Text>

          <Text style={[styles.centerText, { color: colors.muted }]}>
            communityId and discussionId are required.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingDiscussion || isLoadingLive) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.centerBlock}>
          <ActivityIndicator />

          <Text style={[styles.centerText, { color: colors.muted }]}>
            Loading live discussion...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (discussionError || liveError || !discussion) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.centerBlock}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.danger}
          />

          <Text style={[styles.centerTitle, { color: colors.foreground }]}>
            Could not load live discussion
          </Text>

          <Text style={[styles.centerText, { color: colors.muted }]}>
            {getErrorMessage(discussionError ?? liveError)}
          </Text>

          <Pressable
            onPress={refreshLivePage}
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: colors.accentForeground },
              ]}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.compactHeader,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View style={styles.liveHeaderRow}>
              {isLive ? (
                <Animated.View
                  style={[
                    styles.blinkDot,
                    {
                      opacity: liveBlinkOpacity,
                      backgroundColor: colors.danger,
                    },
                  ]}
                />
              ) : (
                <Ionicons
                  name={statusMeta.icon}
                  size={13}
                  color={statusColor}
                />
              )}

              <Text
                numberOfLines={1}
                style={[
                  styles.liveHeaderStatus,
                  {
                    color: isLive ? colors.danger : statusColor,
                  },
                ]}
              >
                {statusMeta.label}
              </Text>

              <Text
                numberOfLines={1}
                style={[styles.liveHeaderMeta, { color: colors.muted }]}
              >
                · {displayMemberCount} watching · {displayMessageCount} messages
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={[styles.headerTitle, { color: colors.foreground }]}
            >
              {discussion.title}
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.headerSubtitle, { color: colors.muted }]}
            >
              {communityName} · {liveConnectionLabel}
            </Text>
          </View>

          {isBusy ? <ActivityIndicator size="small" /> : null}

          <Pressable onPress={refreshLivePage} style={styles.iconButton}>
            <Ionicons
              name="refresh-outline"
              size={22}
              color={colors.foreground}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.topicStrip,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable
            onPress={() => setShowTopicDetails((previous) => !previous)}
            style={styles.topicMain}
          >
            <View style={styles.topicTopRow}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color={colors.accent}
              />

              <Text
                numberOfLines={2}
                style={[styles.topicTitle, { color: colors.foreground }]}
              >
                {discussion.title}
              </Text>

              <Ionicons
                name={showTopicDetails ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.muted}
              />
            </View>

            {showTopicDetails ? (
              <Text
                numberOfLines={4}
                style={[styles.topicDescription, { color: colors.muted }]}
              >
                {discussion.body || "No description provided."}
              </Text>
            ) : null}
          </Pressable>

          {isLive && canManageLive ? (
            <Pressable
              onPress={handleEndLive}
              disabled={isEndingLive}
              style={[
                styles.endButtonSmall,
                {
                  borderColor: colors.danger,
                  opacity: isEndingLive ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.endButtonSmallText, { color: colors.danger }]}>
                End
              </Text>
            </Pressable>
          ) : null}
        </View>

        {canReviewContributorRequests && pendingLiveRequests.length > 0 ? (
          <View
            style={[
              styles.requestPanel,
              {
                backgroundColor: colors.surfaceSecondary,
                borderBottomColor: colors.separator,
              },
            ]}
          >
            <View style={styles.requestPanelHeader}>
              <Text
                style={[styles.requestPanelTitle, { color: colors.foreground }]}
              >
                Contributor requests
              </Text>

              {isFetchingContributorRequests ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.requestCountText, { color: colors.muted }]}>
                  {pendingLiveRequests.length} pending
                </Text>
              )}
            </View>

            {pendingLiveRequests.map((request) => (
              <View
                key={request.id}
                style={[
                  styles.requestItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <RequestUserLine request={request} colors={colors} />

                <View style={styles.requestActions}>
                  <Pressable
                    disabled={isApprovingRequest || isRejectingRequest}
                    onPress={() => handleApproveContributorRequest(request.id)}
                    style={[
                      styles.approveButton,
                      {
                        backgroundColor: colors.success,
                        opacity:
                          isApprovingRequest || isRejectingRequest ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.requestActionText}>Accept</Text>
                  </Pressable>

                  <Pressable
                    disabled={isApprovingRequest || isRejectingRequest}
                    onPress={() => handleRejectContributorRequest(request.id)}
                    style={[
                      styles.rejectButton,
                      {
                        borderColor: colors.danger,
                        opacity:
                          isApprovingRequest || isRejectingRequest ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rejectButtonText,
                        { color: colors.danger },
                      ]}
                    >
                      Reject
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {isScheduled ||
        isEnded ||
        isCancelled ||
        socketError ||
        viewerContext?.message ? (
          <View
            style={[
              styles.noticeBar,
              {
                backgroundColor: colors.surfaceSecondary,
                borderBottomColor: colors.separator,
              },
            ]}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.noticeText,
                {
                  color: isCancelled
                    ? colors.danger
                    : isScheduled
                      ? colors.warning
                      : isEnded
                        ? colors.success
                        : colors.muted,
                },
              ]}
            >
              {socketError
                ? `Socket: ${socketError}`
                : viewerContext?.message
                  ? viewerContext.message
                  : isScheduled
                    ? `Scheduled: ${formatDateTime(liveChat?.scheduledAt)}`
                    : isEnded
                      ? "This live discussion has ended. You can view chat history."
                      : isCancelled
                        ? "This live discussion was cancelled."
                        : ""}
            </Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            {
              paddingBottom: composerHeight + Math.max(insets.bottom, 12) + 18,
            },
          ]}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.authorId === viewerId}
              canManageLive={canManageLive}
              canDelete={canDeleteMessages || item.authorId === viewerId}
              colors={colors}
              onLongPressMessage={handleLongPressMessage}
            />
          )}
          ListEmptyComponent={
            isLoadingMessages ? (
              <View style={styles.emptyBlock}>
                <ActivityIndicator />

                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  Loading messages...
                </Text>
              </View>
            ) : messagesError ? (
              <View style={styles.emptyBlock}>
                <Ionicons
                  name="alert-circle-outline"
                  size={34}
                  color={colors.danger}
                />

                <Text style={[styles.emptyText, { color: colors.danger }]}>
                  {getErrorMessage(messagesError)}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyBlock}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={36}
                  color={colors.muted}
                />

                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No messages yet
                </Text>

                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  {emptyMessageText}
                </Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onContentSizeChange={() => {
            scrollToBottom(true);
          }}
        />

        {isLive && canSendFromPermission ? (
          <View
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;

              setComposerHeight((previousHeight) => {
                if (Math.abs(previousHeight - nextHeight) <= 1) {
                  return previousHeight;
                }

                return nextHeight;
              });

              scrollToBottom(false);
            }}
            style={[
              styles.composerWrap,
              {
                paddingBottom: Math.max(insets.bottom, 10),
                backgroundColor: colors.background,
                borderTopColor: colors.separator,
              },
            ]}
          >
            <View
              style={[
                styles.composerBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={messageDraft}
                onChangeText={setMessageDraft}
                multiline
                placeholder="Ask a question..."
                placeholderTextColor={colors.placeholder}
                editable={!isSendingMessage}
                style={[
                  styles.messageInput,
                  {
                    color: colors.foreground,
                  },
                ]}
              />

              <Pressable
                onPress={handleSendMessage}
                disabled={!canSendMessage}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: canSendMessage
                      ? colors.accent
                      : colors.surfaceTertiary,
                  },
                ]}
              >
                {isSendingMessage ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.accentForeground}
                  />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={
                      canSendMessage
                        ? colors.accentForeground
                        : colors.muted
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        ) : isLive && canRequestContributor ? (
          <View
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;

              setComposerHeight((previousHeight) => {
                if (Math.abs(previousHeight - nextHeight) <= 1) {
                  return previousHeight;
                }

                return nextHeight;
              });

              scrollToBottom(false);
            }}
            style={[
              styles.composerWrap,
              {
                paddingBottom: Math.max(insets.bottom, 10),
                backgroundColor: colors.background,
                borderTopColor: colors.separator,
              },
            ]}
          >
            <View
              style={[
                styles.viewerRequestBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.viewerRequestTextWrap}>
                <Text
                  style={[
                    styles.viewerRequestTitle,
                    { color: colors.foreground },
                  ]}
                >
                  Watching as viewer
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.viewerRequestText,
                    { color: colors.muted },
                  ]}
                >
                  Request contributor access to ask.
                </Text>
              </View>

              <Pressable
                onPress={handleRequestContributor}
                disabled={isRequestingContributor}
                style={[
                  styles.requestButton,
                  {
                    backgroundColor: isRequestingContributor
                      ? colors.surfaceTertiary
                      : colors.accent,
                  },
                ]}
              >
                {isRequestingContributor ? (
                  <ActivityIndicator size="small" color={colors.muted} />
                ) : (
                  <Text
                    style={[
                      styles.requestButtonText,
                      { color: colors.accentForeground },
                    ]}
                  >
                    Request
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

