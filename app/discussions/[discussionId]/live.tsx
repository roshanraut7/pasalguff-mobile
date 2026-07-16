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
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  TextInput,
  Modal,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useCommunityLiveSocket } from "@/lib/useCommunityLiveSocket";
import {
  useApproveContributorRequestMutation,
  useGetCommunityDiscussionQuery,
  useGetContributorRequestsQuery,
  useRejectContributorRequestMutation,
  useUpdateDiscussionParticipantModeMutation,
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
} from "@/store/api/communityDiscussionLiveApi";

import { styles } from "@/constants/styles/livechat.styles";
import getRequestDiscussionId, {
  ActionModal,
  JoinLeaveCard,
  MemberRow,
  MessageCard,
  RequestCard,
  formatDateTime,
  getAuthorName,
  getErrorMessage,
  getLiveStatusMeta,
  getParamValue,
  getToneColor,
  makeClientMessageId,
  type ActionTarget,
  type BasicAuthor,
  type ChatListItem,
  type JoinLeaveNotice,
  type LiveMember,
  type LiveTab,
} from "./live-helper";

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
const [showEndLiveModal, setShowEndLiveModal] = useState(false);   // NEW
const [highlightDraft, setHighlightDraft] = useState("");           // NEW
const [showResultModal, setShowResultModal] = useState(false);      // NEW

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
      if (!isLive) return;

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
    [isLive, showJoinToast],
  );

  useEffect(() => {
    if (isLive) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    joinToastOpacity.stopAnimation();
    joinToastOpacity.setValue(0);
    setJoinToastText(null);
    setJoinLeaveNotices([]);
    previousMemberIdsRef.current = new Set();
    previousMembersRef.current = new Map();
    hasLoadedInitialMembersRef.current = false;
  }, [isLive, joinToastOpacity]);

  useEffect(() => {
    const currentIds = new Set(liveMembers.map((member) => member.id));
    const currentMap = new Map(liveMembers.map((member) => [member.id, member]));

    if (!isLive) {
      previousMemberIdsRef.current = currentIds;
      previousMembersRef.current = currentMap;
      hasLoadedInitialMembersRef.current = false;
      return;
    }

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
  }, [addJoinLeaveNotice, isLive, liveMembers, viewerId]);

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

    const noticeItems: ChatListItem[] = isLive
      ? joinLeaveNotices.map((notice) => ({
          type: "notice",
          id: `notice-${notice.id}`,
          createdAt: notice.createdAt,
          notice,
        }))
      : [];

    return [...messageItems, ...noticeItems].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [displayMessages, isLive, joinLeaveNotices]);

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
        setTimeout(
          () => scrollToBottom(false),
          Platform.OS === "android" ? 180 : 0,
        );
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
  setHighlightDraft("");
  setShowEndLiveModal(true);
}, [communityId, discussionId]);

const handleConfirmEndLive = useCallback(async () => {
  if (!communityId || !discussionId) return;

  try {
    setShowEndLiveModal(false);

    await endLiveDiscussion({
      communityId,
      discussionId,
      highlightBody: highlightDraft.trim() || undefined,
    }).unwrap();

    await refreshLivePage();
    setShowResultModal(true);
  } catch (error) {
    Alert.alert("Could not end live", getErrorMessage(error));
  }
}, [
  communityId,
  discussionId,
  highlightDraft,
  endLiveDiscussion,
  refreshLivePage,
]);

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
  behavior="padding"
  keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
  enabled={activeTab === "chat"}
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
  <Modal
  visible={showEndLiveModal}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => setShowEndLiveModal(false)}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={{ flex: 1 }}
  >
    <Pressable
      style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}
      onPress={() => setShowEndLiveModal(false)}
    >
      <Pressable
        onPress={() => {}}
        style={{
          borderRadius: 20,
          padding: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 17, fontFamily: "Poppins_700Bold", color: colors.foreground, marginBottom: 4 }}>
          End live discussion
        </Text>

        <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.muted, marginBottom: 14 }}>
          Write a short recap to post in the community. Leave blank to use a default summary.
        </Text>

        <TextInput
          value={highlightDraft}
          onChangeText={setHighlightDraft}
          multiline
          placeholder="e.g. Great turnout today! We covered..."
          placeholderTextColor={colors.placeholder}
          style={{
            minHeight: 100,
            maxHeight: 160,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            fontSize: 14,
            color: colors.foreground,
            textAlignVertical: "top",
            marginBottom: 16,
          }}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setShowEndLiveModal(false)}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={handleConfirmEndLive}
            disabled={isEndingLive}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: colors.danger, opacity: isEndingLive ? 0.6 : 1 }}
          >
            {isEndingLive ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
                End & Post
              </Text>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </KeyboardAvoidingView>
</Modal>

<Modal
  visible={showResultModal}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => setShowResultModal(false)}
>
  <Pressable
    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
    onPress={() => setShowResultModal(false)}
  >
    <Pressable
      onPress={() => {}}
      style={{ width: "100%", maxWidth: 400, borderRadius: 20, padding: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <Text style={{ fontSize: 17, fontFamily: "Poppins_700Bold", color: colors.foreground, marginBottom: 6 }}>
        Live discussion ended
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: colors.muted, marginBottom: 18 }}>
        Your highlight has been posted to {communityName}.
      </Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => setShowResultModal(false)}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
            Stay here
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setShowResultModal(false);
            router.push({
              pathname: "/user/community/[slug]",
              params: { slug: communityId },
            });
          }}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: colors.accent }}
        >
          <Text style={{ color: colors.accentForeground, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
            View in Community
          </Text>
        </Pressable>
      </View>
    </Pressable>
  </Pressable>
</Modal>
    </SafeAreaView>
  );
}