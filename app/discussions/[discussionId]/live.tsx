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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { AppColors } from "@/constants/theme";
import {
  useGetCommunityDiscussionQuery,
} from "@/store/api/communityDiscussionApi";
import {
  useEndLiveDiscussionMutation,
  useGetLiveDiscussionMessagesQuery,
  useGetLiveDiscussionQuery,
  useSendLiveDiscussionMessageMutation,
  type CommunityDiscussionLiveMessage,
  type DiscussionLiveStatus,
} from "@/store/api/communityDiscussionLiveApi";

function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getAuthorName(author?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
}) {
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMessageTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

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

    if (Array.isArray(message)) {
      return message.join("\n");
    }

    if (typeof message === "string") {
      return message;
    }
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

function MessageBubble({
  message,
  isMine,
  colors,
}: {
  message: CommunityDiscussionLiveMessage;
  isMine: boolean;
  colors: AppColors;
}) {
  const authorName = getAuthorName(message.author);
  const initials = getInitials(authorName);

  return (
    <View
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
            },
          ]}
        >
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
        </View>
      ) : null}

      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isMine ? colors.accent : colors.surface,
            borderColor: isMine ? colors.accent : colors.border,
            maxWidth: "78%",
          },
        ]}
      >
        {!isMine ? (
          <Text
            style={[
              styles.messageAuthor,
              {
                color: colors.foreground,
              },
            ]}
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

        <Text
          style={[
            styles.messageTime,
            {
              color: isMine ? colors.accentForeground : colors.muted,
              opacity: isMine ? 0.8 : 1,
            },
          ]}
        >
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function LiveDiscussionPage() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();

  const scrollRef = useRef<ScrollView | null>(null);

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
      pollingInterval: 5000,
    },
  );

  const liveChat = liveResponse?.data ?? null;
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
      pollingInterval: isLive ? 3000 : 0,
    },
  );

  const [sendLiveMessage, { isLoading: isSendingMessage }] =
    useSendLiveDiscussionMessageMutation();

  const [endLiveDiscussion, { isLoading: isEndingLive }] =
    useEndLiveDiscussionMutation();

  const discussion = discussionResponse?.data;

  const communityName =
    discussion?.community?.name ?? paramCommunityName ?? "Selected community";

  const messages = useMemo(
    () => messagesResponse?.data ?? [],
    [messagesResponse?.data],
  );

  const statusMeta = getLiveStatusMeta(liveStatus);
  const statusColor = getToneColor(statusMeta.tone, colors);

  const canManageLive =
    Boolean(viewerId) &&
    Boolean(
      discussion?.authorId === viewerId ||
        liveChat?.createdById === viewerId ||
        liveChat?.startedById === viewerId,
    );

  const isBusy =
    isLoadingDiscussion ||
    isFetchingDiscussion ||
    isLoadingLive ||
    isFetchingLive ||
    isLoadingMessages ||
    isFetchingMessages ||
    isSendingMessage ||
    isEndingLive;

  const canSendMessage =
    isLive && messageDraft.trim().length > 0 && !isSendingMessage;

  useEffect(() => {
    if (!messages.length) return;

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const refreshLivePage = useCallback(async () => {
    await Promise.all([
      refetchDiscussion(),
      refetchLive(),
      refetchMessages(),
    ]);
  }, [refetchDiscussion, refetchLive, refetchMessages]);

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

    try {
      setMessageDraft("");

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
    messageDraft,
    sendLiveMessage,
    refetchMessages,
  ]);

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
  }, [
    communityId,
    discussionId,
    endLiveDiscussion,
    refreshLivePage,
  ]);

  if (shouldSkipQuery) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View style={styles.centerBlock}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
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
        edges={["top", "bottom"]}
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
        edges={["top", "bottom"]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.topTitleWrap}>
            <Text style={[styles.topTitle, { color: colors.foreground }]}>
              Live Discussion
            </Text>

            <Text style={[styles.topSubtitle, { color: colors.muted }]}>
              Could not load
            </Text>
          </View>
        </View>

        <View style={styles.centerBlock}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
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
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.topTitleWrap}>
            <Text style={[styles.topTitle, { color: colors.foreground }]}>
              Live Discussion
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.topSubtitle, { color: colors.muted }]}
            >
              {communityName}
            </Text>
          </View>

          {isBusy ? <ActivityIndicator /> : null}

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
            styles.liveHero,
            {
              backgroundColor: colors.surface,
              borderColor: isLive ? colors.danger : colors.border,
            },
          ]}
        >
          <View style={styles.liveHeroTop}>
            <View
              style={[
                styles.liveIcon,
                {
                  backgroundColor: colors.surfaceTertiary,
                },
              ]}
            >
              <Ionicons name={statusMeta.icon} size={24} color={statusColor} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={2}
                style={[styles.liveTitle, { color: colors.foreground }]}
              >
                {discussion.title}
              </Text>

              <Text
                numberOfLines={1}
                style={[styles.liveSubtitle, { color: colors.muted }]}
              >
                {statusMeta.label} · {communityName}
              </Text>
            </View>

            <View
              style={[
                styles.statusPill,
                {
                  borderColor: statusColor,
                  backgroundColor: colors.surfaceTertiary,
                },
              ]}
            >
              <Ionicons name={statusMeta.icon} size={13} color={statusColor} />

              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <View style={styles.liveMetaGrid}>
            <View
              style={[
                styles.liveMetaBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.liveMetaValue, { color: colors.foreground }]}>
                {liveChat?._count?.participants ?? 0}
              </Text>

              <Text style={[styles.liveMetaLabel, { color: colors.muted }]}>
                participants
              </Text>
            </View>

            <View
              style={[
                styles.liveMetaBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.liveMetaValue, { color: colors.foreground }]}>
                {liveChat?._count?.messages ?? messages.length}
              </Text>

              <Text style={[styles.liveMetaLabel, { color: colors.muted }]}>
                messages
              </Text>
            </View>
          </View>

          <View style={styles.liveTimeBlock}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={colors.muted}
            />

            <Text
              style={[
                styles.liveTimeText,
                {
                  color: colors.muted,
                },
              ]}
            >
              Scheduled: {formatDateTime(liveChat?.scheduledAt)}
            </Text>
          </View>

          {liveChat?.startedAt ? (
            <View style={styles.liveTimeBlock}>
              <Ionicons name="radio" size={15} color={colors.danger} />

              <Text
                style={[
                  styles.liveTimeText,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                Started: {formatDateTime(liveChat.startedAt)}
              </Text>
            </View>
          ) : null}

          {liveChat?.endedAt ? (
            <View style={styles.liveTimeBlock}>
              <Ionicons
                name="checkmark-circle-outline"
                size={15}
                color={colors.success}
              />

              <Text
                style={[
                  styles.liveTimeText,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                Ended: {formatDateTime(liveChat.endedAt)}
              </Text>
            </View>
          ) : null}

          {isScheduled ? (
            <Text style={[styles.liveNotice, { color: colors.warning }]}>
              This live discussion is scheduled. Messages will be available once it starts.
            </Text>
          ) : null}

          {isEnded ? (
            <Text style={[styles.liveNotice, { color: colors.success }]}>
              This live discussion has ended. You can view the chat history.
            </Text>
          ) : null}

          {isCancelled ? (
            <Text style={[styles.liveNotice, { color: colors.danger }]}>
              This live discussion was cancelled.
            </Text>
          ) : null}

          {isLive && canManageLive ? (
            <Pressable
              onPress={handleEndLive}
              disabled={isEndingLive}
              style={[
                styles.endLiveButton,
                {
                  borderColor: colors.danger,
                  backgroundColor: colors.surfaceSecondary,
                  opacity: isEndingLive ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name="stop-circle-outline"
                size={18}
                color={colors.danger}
              />

              <Text style={[styles.endLiveButtonText, { color: colors.danger }]}>
                End Live
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.messagesHeader}>
          <Text style={[styles.messagesTitle, { color: colors.foreground }]}>
            Live Chat
          </Text>

          <Text style={[styles.messagesSub, { color: colors.muted }]}>
            {isLive ? "Messages update automatically" : "History"}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            {
              paddingBottom: isLive ? 120 : insets.bottom + 28,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoadingMessages ? (
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

              <Pressable
                onPress={() => refetchMessages()}
                style={[
                  styles.retryButton,
                  {
                    backgroundColor: colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.retryButtonText,
                    {
                      color: colors.accentForeground,
                    },
                  ]}
                >
                  Reload messages
                </Text>
              </Pressable>
            </View>
          ) : messages.length === 0 ? (
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
                {isLive
                  ? "Be the first to send a live message."
                  : "Messages will appear here when the live discussion starts."}
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.authorId === viewerId}
                colors={colors}
              />
            ))
          )}
        </ScrollView>

        {isLive ? (
          <View
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
                placeholder="Write a live message..."
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
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  topBar: {
    minHeight: 62,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  topTitleWrap: {
    flex: 1,
  },

  topTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
  },

  topSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  liveHero: {
    marginHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },

  liveHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  liveIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  liveTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold",
  },

  liveSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusPillText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  liveMetaGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  liveMetaBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  liveMetaValue: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  liveMetaLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  liveTimeBlock: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  liveTimeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  liveNotice: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
  },

  endLiveButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  endLiveButtonText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  messagesHeader: {
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  messagesTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
  },

  messagesSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  messagesList: {
    flex: 1,
    marginTop: 8,
  },

  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  messageRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  messageAvatarText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  messageBubble: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  messageAuthor: {
    marginBottom: 4,
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
  },

  messageTime: {
    marginTop: 5,
    alignSelf: "flex-end",
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
  },

  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  composerBox: {
    minHeight: 50,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  messageInput: {
    flex: 1,
    maxHeight: 92,
    paddingVertical: 6,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlignVertical: "top",
  },

  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  centerBlock: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  centerTitle: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  centerText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  emptyBlock: {
    minHeight: 220,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },

  retryButtonText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
});