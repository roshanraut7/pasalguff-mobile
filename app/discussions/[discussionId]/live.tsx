
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
  Modal,
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
  useGetLiveDiscussionParticipantsQuery,
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

type LiveTab = "chat" | "members";

type LiveMember = {
  id: string;
  name: string;
  image?: string | null;
  subtitle?: string;
};

type JoinLeaveNotice = {
  id: string;
  type: "joined" | "left";
  text: string;
  createdAt: string;
  member: LiveMember;
};

type ChatListItem =
  | {
      type: "message";
      id: string;
      createdAt: string;
      message: CommunityDiscussionLiveMessage;
    }
  | {
      type: "notice";
      id: string;
      createdAt: string;
      notice: JoinLeaveNotice;
    };

type ActionTarget = {
  userId: string;
  name: string;
  image?: string | null;
  messageId?: string;
  isOwnMessage?: boolean;
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
  const safeRequest = request as CommunityContributorRequest & {
    discussionId?: string | null;
    requestedFromDiscussion?: { id?: string | null } | null;
  };

  return (
    safeRequest.requestedFromDiscussionId ??
    safeRequest.requestedFromDiscussion?.id ??
    safeRequest.discussionId ??
    null
  );
}

function Avatar({
  name,
  image,
  colors,
  size = 36,
}: {
  name: string;
  image?: string | null;
  colors: AppColors;
  size?: number;
}) {
  const uri = image ? toAbsoluteFileUrl(image) ?? undefined : undefined;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceTertiary,
        },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <Text
          style={[
            styles.avatarText,
            {
              color: colors.segmentForeground,
              fontSize: Math.max(10, size * 0.32),
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

function RequestCard({
  request,
  colors,
  disabled,
  onAccept,
  onReject,
}: {
  request: CommunityContributorRequest;
  colors: AppColors;
  disabled: boolean;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  const userName = getAuthorName(request.user);
  const userImage = request.user?.image ?? null;

  return (
    <View
      style={[
        styles.requestCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.requestUserRow}>
        <Avatar name={userName} image={userImage} colors={colors} size={34} />

        <View style={styles.requestTextWrap}>
          <Text
            numberOfLines={1}
            style={[styles.requestName, { color: colors.foreground }]}
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

      <View style={styles.requestActions}>
        <Pressable
          disabled={disabled}
          onPress={() => onAccept(request.id)}
          style={[
            styles.acceptButton,
            {
              backgroundColor: colors.success,
              opacity: disabled ? 0.65 : 1,
            },
          ]}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => onReject(request.id)}
          style={[
            styles.rejectButton,
            {
              borderColor: colors.danger,
              opacity: disabled ? 0.65 : 1,
            },
          ]}
        >
          <Text style={[styles.rejectButtonText, { color: colors.danger }]}>
            Reject
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function JoinLeaveCard({
  notice,
  colors,
}: {
  notice: JoinLeaveNotice;
  colors: AppColors;
}) {
  const isJoined = notice.type === "joined";

  return (
    <View
      style={[
        styles.messageCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.messageTopRow}>
        <View
          style={[
            styles.avatar,
            {
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name={isJoined ? "person-add-outline" : "person-remove-outline"}
            size={17}
            color={isJoined ? colors.success : colors.warning}
          />
        </View>

        <View style={styles.messageMain}>
          <View style={styles.messageHeaderRow}>
            <Text
              numberOfLines={1}
              style={[styles.messageAuthorName, { color: colors.foreground }]}
            >
              {notice.text}
            </Text>

            <Text style={[styles.messageTime, { color: colors.muted }]}>
              {formatMessageTime(notice.createdAt)}
            </Text>
          </View>

          <Text style={[styles.messageBody, { color: colors.muted }]}>
            {isJoined
              ? "This member joined the live discussion."
              : "This member left the live discussion."}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MessageCard({
  message,
  colors,
  canOpenActions,
  onOpenActions,
}: {
  message: CommunityDiscussionLiveMessage;
  colors: AppColors;
  canOpenActions: boolean;
  onOpenActions: (message: CommunityDiscussionLiveMessage) => void;
}) {
  const author = message.author as BasicAuthor | undefined;
  const authorName = getAuthorName(author);
  const authorImage = author?.image ?? null;

  return (
    <Pressable
      onLongPress={() => {
        if (canOpenActions) {
          onOpenActions(message);
        }
      }}
      style={[
        styles.messageCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.messageTopRow}>
        <Avatar name={authorName} image={authorImage} colors={colors} size={36} />

        <View style={styles.messageMain}>
          <View style={styles.messageHeaderRow}>
            <Text
              numberOfLines={1}
              style={[styles.messageAuthorName, { color: colors.foreground }]}
            >
              {authorName}
            </Text>

            <Text style={[styles.messageTime, { color: colors.muted }]}>
              {formatMessageTime(message.createdAt)}
            </Text>

            {canOpenActions ? (
              <Pressable
                onPress={() => onOpenActions(message)}
                hitSlop={10}
                style={styles.messageMenuButton}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.messageBody, { color: colors.foreground }]}>
            {message.body}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function MemberRow({
  member,
  colors,
  isSelf,
  canManage,
  onOpenActions,
}: {
  member: LiveMember;
  colors: AppColors;
  isSelf: boolean;
  canManage: boolean;
  onOpenActions: (member: LiveMember) => void;
}) {
  return (
    <View
      style={[
        styles.memberRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Avatar name={member.name} image={member.image} colors={colors} size={38} />

      <View style={styles.memberInfo}>
        <Text
          numberOfLines={1}
          style={[styles.memberName, { color: colors.foreground }]}
        >
          {member.name}
        </Text>

        <Text
          numberOfLines={1}
          style={[styles.memberSubtitle, { color: colors.muted }]}
        >
          {isSelf ? "You" : member.subtitle || "Watching live"}
        </Text>
      </View>

      {canManage && !isSelf ? (
        <Pressable
          onPress={() => onOpenActions(member)}
          hitSlop={10}
          style={styles.memberMenuButton}
        >
          <Ionicons
            name="ellipsis-horizontal-circle-outline"
            size={25}
            color={colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function ActionModal({
  visible,
  target,
  colors,
  canDeleteMessage,
  canManageUser,
  isWorking,
  onClose,
  onDeleteMessage,
  onLimitMessages,
  onAllowAgain,
  onRemoveFromLive,
}: {
  visible: boolean;
  target: ActionTarget | null;
  colors: AppColors;
  canDeleteMessage: boolean;
  canManageUser: boolean;
  isWorking: boolean;
  onClose: () => void;
  onDeleteMessage: () => void;
  onLimitMessages: () => void;
  onAllowAgain: () => void;
  onRemoveFromLive: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.actionModal,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text
                numberOfLines={1}
                style={[styles.modalTitle, { color: colors.foreground }]}
              >
                {target?.name || "Member actions"}
              </Text>

              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                Choose what you want to do with this member.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.modalCloseButton,
                {
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {canDeleteMessage ? (
            <Pressable
              disabled={isWorking}
              onPress={onDeleteMessage}
              style={[
                styles.modalActionButton,
                {
                  borderColor: colors.border,
                  opacity: isWorking ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
              <Text style={[styles.modalActionText, { color: colors.danger }]}>
                Delete this message
              </Text>
            </Pressable>
          ) : null}

          {canManageUser ? (
            <>
              <Pressable
                disabled={isWorking}
                onPress={onLimitMessages}
                style={[
                  styles.modalActionButton,
                  {
                    borderColor: colors.border,
                    opacity: isWorking ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={19}
                  color={colors.warning}
                />
                <Text
                  style={[styles.modalActionText, { color: colors.foreground }]}
                >
                  Limit messages
                </Text>
              </Pressable>

              <Pressable
                disabled={isWorking}
                onPress={onAllowAgain}
                style={[
                  styles.modalActionButton,
                  {
                    borderColor: colors.border,
                    opacity: isWorking ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={colors.success}
                />
                <Text
                  style={[styles.modalActionText, { color: colors.foreground }]}
                >
                  Allow again
                </Text>
              </Pressable>

              <Pressable
                disabled={isWorking}
                onPress={onRemoveFromLive}
                style={[
                  styles.modalActionButton,
                  {
                    borderColor: colors.border,
                    opacity: isWorking ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons name="ban-outline" size={19} color={colors.danger} />
                <Text style={[styles.modalActionText, { color: colors.danger }]}>
                  Remove from live discussion
                </Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function LiveDiscussionPage() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();

  const listRef = useRef<FlatList<ChatListItem> | null>(null);
  const liveBlinkOpacity = useRef(new Animated.Value(1)).current;
  const joinToastOpacity = useRef(new Animated.Value(0)).current;
  const previousMemberIdsRef = useRef<Set<string>>(new Set());
  const previousMembersRef = useRef<Map<string, LiveMember>>(new Map());
  const hasLoadedInitialMembersRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [activeTab, setActiveTab] = useState<LiveTab>("chat");
  const [messageDraft, setMessageDraft] = useState("");
  const [composerHeight, setComposerHeight] = useState(86);
  const [showTopicDetails, setShowTopicDetails] = useState(true);
  const [joinToastText, setJoinToastText] = useState<string | null>(null);
  const [joinLeaveNotices, setJoinLeaveNotices] = useState<JoinLeaveNotice[]>(
    [],
  );
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);

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
      refetchOnMountOrArgChange: true,
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
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: participantsResponse,
    isFetching: isFetchingParticipants,
    refetch: refetchParticipants,
  } = useGetLiveDiscussionParticipantsQuery(
    {
      communityId: communityId ?? "",
      discussionId: discussionId ?? "",
    },
    {
      skip: shouldSkipQuery || !liveChat,
      pollingInterval: isLive ? 4000 : 0,
      refetchOnMountOrArgChange: true,
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
      skip: !communityId || !discussionId || !viewerId || !canReviewContributorRequests,
      pollingInterval: canReviewContributorRequests ? 4000 : 0,
      refetchOnMountOrArgChange: true,
    },
  );

  const handleContributorRequestSentFromSocket = useCallback(() => {
    if (canReviewContributorRequests) {
      void refetchContributorRequests();
    }
  }, [canReviewContributorRequests, refetchContributorRequests]);

  const handleContributorRequestReviewedFromSocket = useCallback(() => {
    void refetchLive();

    if (canReviewContributorRequests) {
      void refetchContributorRequests();
    }
  }, [canReviewContributorRequests, refetchContributorRequests, refetchLive]);

  const handleUserBlockedFromSocket = useCallback(() => {
    void refetchLive();
    void refetchMessages();
    void refetchParticipants();
  }, [refetchLive, refetchMessages, refetchParticipants]);

  const handleNeedRefreshFromSocket = useCallback(() => {
    void refetchLive();
    void refetchParticipants();

    if (canReviewContributorRequests) {
      void refetchContributorRequests();
    }
  }, [
    canReviewContributorRequests,
    refetchContributorRequests,
    refetchLive,
    refetchParticipants,
  ]);

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
    onContributorRequestSent: handleContributorRequestSentFromSocket,
    onContributorRequestReviewed: handleContributorRequestReviewedFromSocket,
    onUserBlocked: handleUserBlockedFromSocket,
    onNeedRefresh: handleNeedRefreshFromSocket,
  });

  const displayMessages = socketConnected ? liveMessages : messages;

  const liveMembers = useMemo(() => {
    const map = new Map<string, LiveMember>();

    const sessionUser = session?.user as BasicAuthor | undefined;
    const sessionName = getAuthorName(sessionUser);

    if (viewerId) {
      map.set(viewerId, {
        id: viewerId,
        name: sessionName,
        image: sessionUser?.image ?? null,
        subtitle: "You",
      });
    }

    const participants = participantsResponse?.data ?? [];

    participants.forEach((participant) => {
      const user = participant.user as BasicAuthor | null | undefined;
      const userId = participant.userId || user?.id;

      if (!userId) return;

      map.set(userId, {
        id: userId,
        name: getAuthorName(user),
        image: user?.image ?? null,
        subtitle: "Watching live",
      });
    });

    displayMessages.forEach((message) => {
      const author = message.author as BasicAuthor | undefined;

      if (!message.authorId || map.has(message.authorId)) return;

      map.set(message.authorId, {
        id: message.authorId,
        name: getAuthorName(author),
        image: author?.image ?? null,
        subtitle: "Active in chat",
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.id === viewerId) return -1;
      if (b.id === viewerId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [displayMessages, participantsResponse?.data, session?.user, viewerId]);

  const restMemberCount = liveChat?._count?.participants ?? 0;

  const displayMemberCount = Math.max(
    liveMemberCount,
    restMemberCount,
    liveMembers.length,
  );

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

  const showJoinToast = useCallback(
    (text: string) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      setJoinToastText(text);

      joinToastOpacity.stopAnimation();
      joinToastOpacity.setValue(0);

      Animated.sequence([
        Animated.timing(joinToastOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.delay(1450),
        Animated.timing(joinToastOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();

      toastTimerRef.current = setTimeout(() => {
        setJoinToastText(null);
      }, 2000);
    },
    [joinToastOpacity],
  );

  const addJoinLeaveNotice = useCallback(
    (type: "joined" | "left", member: LiveMember) => {
      const text =
        type === "joined"
          ? `${member.name} joined live`
          : `${member.name} left live`;

      const notice: JoinLeaveNotice = {
        id: `${type}-${member.id}-${Date.now()}`,
        type,
        text,
        createdAt: new Date().toISOString(),
        member,
      };

      setJoinLeaveNotices((previous) => [...previous.slice(-20), notice]);
      showJoinToast(text);
    },
    [showJoinToast],
  );

  useEffect(() => {
    const currentIds = new Set(liveMembers.map((member) => member.id));
    const currentMap = new Map(liveMembers.map((member) => [member.id, member]));

    if (!hasLoadedInitialMembersRef.current) {
      previousMemberIdsRef.current = currentIds;
      previousMembersRef.current = currentMap;
      hasLoadedInitialMembersRef.current = true;
      return;
    }

    const previousIds = previousMemberIdsRef.current;
    const previousMap = previousMembersRef.current;

    liveMembers.forEach((member) => {
      if (!previousIds.has(member.id) && member.id !== viewerId) {
        addJoinLeaveNotice("joined", member);
      }
    });

    previousIds.forEach((memberId) => {
      if (!currentIds.has(memberId) && memberId !== viewerId) {
        const previousMember = previousMap.get(memberId);

        if (previousMember) {
          addJoinLeaveNotice("left", previousMember);
        }
      }
    });

    previousMemberIdsRef.current = currentIds;
    previousMembersRef.current = currentMap;
  }, [addJoinLeaveNotice, liveMembers, viewerId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const chatListItems = useMemo<ChatListItem[]>(() => {
    const messageItems: ChatListItem[] = displayMessages.map((message) => ({
      type: "message",
      id: `message-${message.id}`,
      createdAt: message.createdAt,
      message,
    }));

    const noticeItems: ChatListItem[] = joinLeaveNotices.map((notice) => ({
      type: "notice",
      id: `notice-${notice.id}`,
      createdAt: notice.createdAt,
      notice,
    }));

    return [...messageItems, ...noticeItems].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [displayMessages, joinLeaveNotices]);

  const statusMeta = getLiveStatusMeta(liveStatus);
  const statusColor = getToneColor(statusMeta.tone, colors);

  const isBusy =
    isLoadingDiscussion ||
    isFetchingDiscussion ||
    isLoadingLive ||
    isFetchingLive ||
    isLoadingMessages ||
    isFetchingMessages ||
    isFetchingParticipants ||
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
    if (!chatListItems.length || activeTab !== "chat") return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    scrollToBottom(true);
  }, [activeTab, chatListItems.length, scrollToBottom]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      if (activeTab === "chat") {
        scrollToBottom(true);
      }
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      if (activeTab === "chat") {
        scrollToBottom(true);
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [activeTab, scrollToBottom]);

  const refreshLivePage = useCallback(async () => {
    await Promise.all([
      refetchDiscussion(),
      refetchLive(),
      liveChat ? refetchMessages() : Promise.resolve(),
      liveChat ? refetchParticipants() : Promise.resolve(),
      canReviewContributorRequests
        ? refetchContributorRequests()
        : Promise.resolve(),
    ]);
  }, [
    canReviewContributorRequests,
    liveChat,
    refetchContributorRequests,
    refetchDiscussion,
    refetchLive,
    refetchMessages,
    refetchParticipants,
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
        "You need contributor access to send messages in this live chat.",
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

      await Promise.all([refetchMessages(), refetchParticipants()]);
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
    refetchParticipants,
  ]);

  const handleRequestContributor = useCallback(async () => {
    if (!communityId || !discussionId) return;

    try {
      const message =
        "I want contributor access so I can send messages in this live discussion.";

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
        "Your contributor request has been sent to the discussion team.",
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

        await Promise.all([
          refetchContributorRequests(),
          refetchLive(),
          refetchParticipants(),
        ]);
      } catch (error) {
        Alert.alert("Could not approve request", getErrorMessage(error));
      }
    },
    [
      communityId,
      approveContributorRequest,
      refetchContributorRequests,
      refetchLive,
      refetchParticipants,
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
          setActionTarget(null);
          return;
        }

        await deleteLiveMessage({
          communityId,
          discussionId,
          messageId,
        }).unwrap();

        setActionTarget(null);
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

        setActionTarget(null);

        await Promise.all([
          refetchLive(),
          refetchMessages(),
          refetchParticipants(),
          canReviewContributorRequests
            ? refetchContributorRequests()
            : Promise.resolve(),
        ]);
      } catch (error) {
        Alert.alert("Could not update member", getErrorMessage(error));
      }
    },
    [
      communityId,
      discussionId,
      updateDiscussionParticipantMode,
      refetchLive,
      refetchMessages,
      refetchParticipants,
      canReviewContributorRequests,
      refetchContributorRequests,
    ],
  );

  const openMessageActions = useCallback(
    (message: CommunityDiscussionLiveMessage) => {
      const author = message.author as BasicAuthor | undefined;

      setActionTarget({
        userId: message.authorId,
        name: getAuthorName(author),
        image: author?.image ?? null,
        messageId: message.id,
        isOwnMessage: message.authorId === viewerId,
      });
    },
    [viewerId],
  );

  const openMemberActions = useCallback((member: LiveMember) => {
    setActionTarget({
      userId: member.id,
      name: member.name,
      image: member.image ?? null,
    });
  }, []);

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
      ? "Be the first to send a message."
      : "You can watch this live chat. Request contributor access to send messages."
    : "Messages will appear here when the live discussion starts.";

  const canDeleteSelectedMessage = Boolean(
    actionTarget?.messageId &&
      (canDeleteMessages || actionTarget.isOwnMessage),
  );

  const canManageSelectedUser = Boolean(
    canManageLive &&
      actionTarget?.userId &&
      actionTarget.userId !== viewerId,
  );

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
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={25} color={colors.foreground} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.liveStatusRow}>
              {isLive ? (
                <Animated.View
                  style={[
                    styles.liveDot,
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
                  styles.liveStatusText,
                  {
                    color: isLive ? colors.danger : statusColor,
                  },
                ]}
              >
                {statusMeta.label}
              </Text>

              <Text
                numberOfLines={1}
                style={[styles.headerMetaText, { color: colors.muted }]}
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

          {isBusy ? (
            <ActivityIndicator size="small" />
          ) : (
            <View style={styles.headerRightGap} />
          )}
        </View>

        <View
          style={[
            styles.topicCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => setShowTopicDetails((previous) => !previous)}
            style={styles.topicPress}
          >
            <View style={styles.topicTopRow}>
              <View
                style={[
                  styles.topicIconBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={17}
                  color={colors.accent}
                />
              </View>

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
                numberOfLines={3}
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
                styles.endButton,
                {
                  borderColor: colors.danger,
                  opacity: isEndingLive ? 0.65 : 1,
                },
              ]}
            >
              <Text style={[styles.endButtonText, { color: colors.danger }]}>
                End live
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab("chat")}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === "chat" ? colors.accent : "transparent",
              },
            ]}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={16}
              color={
                activeTab === "chat" ? colors.accentForeground : colors.muted
              }
            />

            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "chat"
                      ? colors.accentForeground
                      : colors.muted,
                },
              ]}
            >
              Chat
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("members")}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === "members" ? colors.accent : "transparent",
              },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={
                activeTab === "members"
                  ? colors.accentForeground
                  : colors.muted
              }
            />

            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "members"
                      ? colors.accentForeground
                      : colors.muted,
                },
              ]}
            >
              Members
            </Text>
          </Pressable>
        </View>

        {joinToastText ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.joinToast,
              {
                opacity: joinToastOpacity,
                transform: [
                  {
                    translateY: joinToastOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="person-add-outline"
              size={16}
              color={colors.success}
            />

            <Text
              numberOfLines={1}
              style={[styles.joinToastText, { color: colors.foreground }]}
            >
              {joinToastText}
            </Text>
          </Animated.View>
        ) : null}

        {activeTab === "chat" ? (
          <>
            {canReviewContributorRequests && pendingLiveRequests.length > 0 ? (
              <View
                style={[
                  styles.requestPanel,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.requestPanelHeader}>
                  <View>
                    <Text
                      style={[
                        styles.requestPanelTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      Contributor requests
                    </Text>

                    <Text
                      style={[
                        styles.requestPanelSubtitle,
                        { color: colors.muted },
                      ]}
                    >
                      {pendingLiveRequests.length} pending request
                      {pendingLiveRequests.length > 1 ? "s" : ""}
                    </Text>
                  </View>

                  {isFetchingContributorRequests ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : null}
                </View>

                {pendingLiveRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    colors={colors}
                    disabled={isApprovingRequest || isRejectingRequest}
                    onAccept={(requestId) => {
                      void handleApproveContributorRequest(requestId);
                    }}
                    onReject={(requestId) => {
                      void handleRejectContributorRequest(requestId);
                    }}
                  />
                ))}
              </View>
            ) : null}

            {contributorRequestsError && canReviewContributorRequests ? (
              <View
                style={[
                  styles.requestErrorBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.requestErrorText, { color: colors.danger }]}
                >
                  Could not load contributor requests:{" "}
                  {getErrorMessage(contributorRequestsError)}
                </Text>
              </View>
            ) : null}

            {(isScheduled ||
              isEnded ||
              isCancelled ||
              socketError ||
              viewerContext?.message) ? (
              <View
                style={[
                  styles.noticeBar,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
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
                  paddingBottom:
                    (isLive && (canSendFromPermission || canRequestContributor)
                      ? composerHeight
                      : 24) + Math.max(insets.bottom, 12),
                },
              ]}
              data={chatListItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                if (item.type === "notice") {
                  return <JoinLeaveCard notice={item.notice} colors={colors} />;
                }

                return (
                  <MessageCard
                    message={item.message}
                    colors={colors}
                    canOpenActions={
                      canManageLive ||
                      canDeleteMessages ||
                      item.message.authorId === viewerId
                    }
                    onOpenActions={openMessageActions}
                  />
                );
              }}
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

                    <Text
                      style={[styles.emptyTitle, { color: colors.foreground }]}
                    >
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
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              onContentSizeChange={() => {
                scrollToBottom(true);
              }}
            />
          </>
        ) : (
          <FlatList
            style={styles.membersList}
            contentContainerStyle={[
              styles.membersContent,
              {
                paddingBottom: Math.max(insets.bottom, 12) + 20,
              },
            ]}
            data={liveMembers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MemberRow
                member={item}
                colors={colors}
                isSelf={item.id === viewerId}
                canManage={canManageLive}
                onOpenActions={openMemberActions}
              />
            )}
            ListHeaderComponent={
              <View style={styles.memberListHeader}>
                <Text
                  style={[styles.memberListTitle, { color: colors.foreground }]}
                >
                  Joined members
                </Text>

                <Text
                  style={[styles.memberListSubtitle, { color: colors.muted }]}
                >
                  {displayMemberCount} watching now
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Ionicons name="people-outline" size={36} color={colors.muted} />

                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No members yet
                </Text>

                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  Members will appear here when they join live.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {activeTab === "chat" && isLive && canSendFromPermission ? (
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
                placeholder="Type a message..."
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
        ) : activeTab === "chat" && isLive && canRequestContributor ? (
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
                  style={[styles.viewerRequestText, { color: colors.muted }]}
                >
                  Request contributor access to send messages.
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

      <ActionModal
        visible={Boolean(actionTarget)}
        target={actionTarget}
        colors={colors}
        canDeleteMessage={canDeleteSelectedMessage}
        canManageUser={canManageSelectedUser}
        isWorking={isDeletingMessage || isUpdatingUserMode}
        onClose={() => setActionTarget(null)}
        onDeleteMessage={() => {
          if (actionTarget?.messageId) {
            void handleDeleteLiveMessage(actionTarget.messageId);
          }
        }}
        onLimitMessages={() => {
          if (actionTarget?.userId) {
            void handleUpdateUserMode(
              actionTarget.userId,
              "VIEWER_LIMITED",
              "Limited from live discussion.",
            );
          }
        }}
        onAllowAgain={() => {
          if (actionTarget?.userId) {
            void handleUpdateUserMode(
              actionTarget.userId,
              "NORMAL",
              "Allowed again from live discussion.",
            );
          }
        }}
        onRemoveFromLive={() => {
          if (actionTarget?.userId) {
            void handleUpdateUserMode(
              actionTarget.userId,
              "BLOCKED",
              "Removed from live discussion.",
            );
          }
        }}
      />
    </SafeAreaView>
  );
}

