import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchField } from "heroui-native";
import { io, type Socket } from "socket.io-client";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useSession } from "@/api/better-auth-client";
import {
  chatApi,
  type Chat,
  type ChatMessage,
  type ChatSuggestionItem,
  useCreateDirectChatMutation,
  useGetMyChatsQuery,
  useLazySearchChatSuggestionsQuery,
} from "@/store/api/chatApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

type UnreadMap = Record<string, number>;

type RealtimeChatPayload = {
  chatId: string;
  message?: ChatMessage;
  chat?: Chat;
};

function getSocketOrigin() {
  const rawBase = RAW_API_BASE_URL.trim();

  if (!rawBase) return "";

  const cleanedBase = rawBase
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "");

  return cleanedBase.endsWith("/") ? cleanedBase.slice(0, -1) : cleanedBase;
}

function sortChatsByUpdatedAt(items: Chat[]) {
  return [...items].sort((a, b) => {
    const bTime = new Date(b.updatedAt).getTime();
    const aTime = new Date(a.updatedAt).getTime();

    return bTime - aTime;
  });
}

function getServerUnreadCount(chat: Chat) {
  const rawUnread =
    (chat as any).unreadCount ??
    (chat as any).unreadMessageCount ??
    (chat as any).unreadMessages ??
    0;

  const count = Number(rawUnread);

  return Number.isFinite(count) && count > 0 ? count : 0;
}

function mergeChatsWithLocalUnread(chats: Chat[], localUnread: UnreadMap) {
  return sortChatsByUpdatedAt(chats).map((chat) => {
    const serverUnread = getServerUnreadCount(chat);
    const localCount = localUnread[chat.id] ?? 0;

    return {
      chat,
      unreadCount: Math.max(serverUnread, localCount),
    };
  });
}

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [presenceTick, setPresenceTick] = useState(0);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [creatingChatUserId, setCreatingChatUserId] = useState<string | null>(
    null,
  );

  const [localChats, setLocalChats] = useState<Chat[]>([]);
  const [localUnread, setLocalUnread] = useState<UnreadMap>({});
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const {
    data: chats = [],
    isLoading,
    isError,
    refetch,
  } = useGetMyChatsQuery();

  const [
    searchChatSuggestions,
    {
      data: suggestionsResponse,
      isFetching: isFetchingSuggestions,
    },
  ] = useLazySearchChatSuggestionsQuery();

  const [createDirectChat, { isLoading: isCreatingDirectChat }] =
    useCreateDirectChatMutation();

  const searchText = search.trim();
  const isSearching = searchText.length > 0;
  const chatSuggestions = suggestionsResponse?.data ?? [];

  useEffect(() => {
    setLocalChats(sortChatsByUpdatedAt(chats));
  }, [chats]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceTick((value) => value + 1);
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /**
   * Search suggestions now come from the main search box only.
   * No bottom sheet. No header create icon.
   */
  useEffect(() => {
    const query = search.trim();

    setSuggestionError(null);

    if (!query) {
      setCreatingChatUserId(null);
      return;
    }

    const timer = setTimeout(() => {
      void searchChatSuggestions({
        search: query,
        limit: 20,
      });
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [search, searchChatSuggestions]);

  const clearUnreadForChat = useCallback((chatId: string) => {
    setLocalUnread((prev) => {
      if (!prev[chatId]) return prev;

      const next = { ...prev };
      delete next[chatId];

      return next;
    });
  }, []);

  const updateChatInstantly = useCallback(
    (payload: RealtimeChatPayload) => {
      const incomingChatId = payload.chatId;
      const incomingMessage = payload.message;

      if (!incomingChatId) return;

      setLocalChats((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.id === incomingChatId,
        );

        if (payload.chat) {
          const withoutCurrent = prev.filter(
            (item) => item.id !== incomingChatId,
          );

          return sortChatsByUpdatedAt([payload.chat, ...withoutCurrent]);
        }

        if (existingIndex === -1) {
          void refetch();
          return prev;
        }

        const existingChat = prev[existingIndex];

        const updatedChat: Chat = {
          ...existingChat,
          lastMessage: incomingMessage ?? existingChat.lastMessage ?? null,
          updatedAt: incomingMessage?.createdAt ?? new Date().toISOString(),
        };

        const withoutCurrent = prev.filter(
          (item) => item.id !== incomingChatId,
        );

        return sortChatsByUpdatedAt([updatedChat, ...withoutCurrent]);
      });

      if (incomingMessage && incomingMessage.senderId !== currentUserId) {
        setLocalUnread((prev) => ({
          ...prev,
          [incomingChatId]: (prev[incomingChatId] ?? 0) + 1,
        }));
      }
    },
    [currentUserId, refetch],
  );

  useEffect(() => {
    if (!currentUserId) return;

    const socketOrigin = getSocketOrigin();

    if (!socketOrigin) {
      console.log("Socket origin is missing");
      return;
    }

    let mounted = true;

    const socket: Socket = io(`${socketOrigin}/chat`, {
      transports: ["websocket"],
      auth: {
        userId: currentUserId,
      },
    });

    const invalidateChatTags = (chatId: string) => {
      dispatch(
        chatApi.util.invalidateTags([
          { type: "Chat" as const, id: "LIST" },
          { type: "Chat" as const, id: chatId },
          { type: "Message" as const, id: chatId },
        ]),
      );
    };

    const handleNewMessage = async (payload: RealtimeChatPayload) => {
      if (!mounted) return;

      updateChatInstantly(payload);
      invalidateChatTags(payload.chatId);

      try {
        await refetch();
      } catch (error) {
        console.log("Message list refetch failed:", error);
      }

      setPresenceTick((value) => value + 1);
    };

    const handleChatUpdated = async (payload: RealtimeChatPayload) => {
      if (!mounted) return;

      updateChatInstantly(payload);
      invalidateChatTags(payload.chatId);

      try {
        await refetch();
      } catch (error) {
        console.log("Chat update refetch failed:", error);
      }

      setPresenceTick((value) => value + 1);
    };

    const handleSoftRefresh = async () => {
      if (!mounted) return;

      try {
        await refetch();
      } catch (error) {
        console.log("Messages list refresh failed:", error);
      }

      setPresenceTick((value) => value + 1);
    };

    socket.on("connect", () => {
      console.log("Messages list socket connected:", socket.id);
    });

    socket.on("connected", (payload) => {
      console.log("Backend socket connected:", payload);
    });

    socket.on("message:new", handleNewMessage);
    socket.on("message:delivered", handleSoftRefresh);
    socket.on("chat:read", handleSoftRefresh);
    socket.on("chat:updated", handleChatUpdated);
    socket.on("message-request:updated", handleChatUpdated);
    socket.on("presence:update", handleSoftRefresh);

    socket.on("connect_error", (error) => {
      console.log("Messages list socket connect error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Messages list socket disconnected:", reason);
    });

    return () => {
      mounted = false;

      socket.off("connect");
      socket.off("connected");
      socket.off("message:new", handleNewMessage);
      socket.off("message:delivered", handleSoftRefresh);
      socket.off("chat:read", handleSoftRefresh);
      socket.off("chat:updated", handleChatUpdated);
      socket.off("message-request:updated", handleChatUpdated);
      socket.off("presence:update", handleSoftRefresh);
      socket.off("connect_error");
      socket.off("disconnect");

      socket.disconnect();
    };
  }, [currentUserId, refetch, updateChatInstantly, dispatch]);

  const chatRows = useMemo(() => {
    return mergeChatsWithLocalUnread(localChats, localUnread);
  }, [localChats, localUnread]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return chatRows;

    return chatRows.filter(({ chat }) => {
      const name =
        chat.otherUser?.name || chat.otherUser?.businessName || "Unknown User";

      const lastMessage =
        chat.lastMessage?.content || chat.lastMessage?.fileName || "";

      const requestStatus = String((chat as any).requestStatus ?? "");

      return (
        name.toLowerCase().includes(q) ||
        lastMessage.toLowerCase().includes(q) ||
        requestStatus.toLowerCase().includes(q)
      );
    });
  }, [search, chatRows]);

  const filteredChatIdSet = useMemo(() => {
    return new Set(filteredChats.map(({ chat }) => chat.id));
  }, [filteredChats]);

  const inlineSuggestions = useMemo(() => {
    if (!isSearching) return [];

    return chatSuggestions.filter((item) => {
      if (!item.existingChatId) return true;

      return !filteredChatIdSet.has(item.existingChatId);
    });
  }, [chatSuggestions, filteredChatIdSet, isSearching]);

  const hasAnySearchResult =
    filteredChats.length > 0 || inlineSuggestions.length > 0;

  const handlePullRefresh = useCallback(async () => {
    try {
      setIsPullRefreshing(true);
      await refetch();

      if (search.trim()) {
        await searchChatSuggestions({
          search: search.trim(),
          limit: 20,
        });
      }
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch, search, searchChatSuggestions]);

  const handleOpenChat = useCallback(
    (chatId: string) => {
      clearUnreadForChat(chatId);
      router.push(`/messages/${chatId}`);
    },
    [clearUnreadForChat],
  );

  const handlePressSuggestionUser = useCallback(
    async (item: ChatSuggestionItem) => {
      try {
        setSuggestionError(null);
        setCreatingChatUserId(item.user.id);

        if (item.existingChatId) {
          clearUnreadForChat(item.existingChatId);
          router.push(`/messages/${item.existingChatId}`);
          return;
        }

        const relationship = item.relationship as any;

        const canCreateChatOrRequest =
          Boolean(relationship?.canMessage) ||
          Boolean(relationship?.canSendRequest) ||
          Boolean(relationship?.isFollowing) ||
          Boolean(relationship?.followsMe);

        if (!canCreateChatOrRequest) {
          setSuggestionError(
            "You need to follow this user or be followed by this user to send a message request.",
          );
          return;
        }

        const createdChat = await createDirectChat({
          targetUserId: item.user.id,
          body: {},
        }).unwrap();

        await refetch();

        router.push(`/messages/${createdChat.id}`);
      } catch (error: any) {
        console.log("Create direct chat failed:", error);

        setSuggestionError(
          error?.data?.message ?? "Could not start chat. Please try again.",
        );
      } finally {
        setCreatingChatUserId(null);
      }
    },
    [clearUnreadForChat, createDirectChat, refetch],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>

          <Text style={styles.title}>Messages</Text>

          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.subtitle}>
          Search your chats or people to start a message
        </Text>

        <View style={styles.searchWrap}>
          <SearchField value={search} onChange={setSearch}>
            <SearchField.Group className="rounded-[18px] bg-surface px-3 py-2">
              <SearchField.SearchIcon className="px-3" />
              <SearchField.Input placeholder="Search chats or people" />
              <SearchField.ClearButton className="mr-2 px-2" />
            </SearchField.Group>
          </SearchField>
        </View>

        {isLoading && localChats.length === 0 ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator />
            <Text style={styles.emptyText}>Loading messages...</Text>
          </View>
        ) : isError ? (
          <View style={styles.centerWrap}>
            <Text style={styles.emptyTitle}>Could not load messages</Text>

            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handlePullRefresh}
              />
            }
          >
            {suggestionError ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.accent}
                />
                <Text style={styles.errorText}>{suggestionError}</Text>
              </View>
            ) : null}

            {filteredChats.length > 0 ? (
              <>
                {isSearching ? (
                  <Text style={styles.sectionTitle}>Chats</Text>
                ) : null}

                {filteredChats.map(({ chat, unreadCount }, index) => (
                  <ConversationRow
                    key={chat.id}
                    chat={chat}
                    unreadCount={unreadCount}
                    styles={styles}
                    showBorder={index !== filteredChats.length - 1}
                    presenceTick={presenceTick}
                    currentUserId={currentUserId}
                    onPress={() => handleOpenChat(chat.id)}
                  />
                ))}
              </>
            ) : null}

            {isSearching ? (
              <View
                style={[
                  styles.suggestionSection,
                  filteredChats.length === 0 && styles.suggestionSectionTop,
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>People</Text>

                  {isFetchingSuggestions ? (
                    <ActivityIndicator size="small" />
                  ) : null}
                </View>

                {inlineSuggestions.length > 0 ? (
                  inlineSuggestions.map((item, index) => (
                    <SuggestionRow
                      key={item.user.id}
                      item={item}
                      styles={styles}
                      colors={colors}
                      isLoading={
                        isCreatingDirectChat &&
                        creatingChatUserId === item.user.id
                      }
                      showBorder={index !== inlineSuggestions.length - 1}
                      currentUserId={currentUserId}
                      onPress={() => handlePressSuggestionUser(item)}
                    />
                  ))
                ) : !isFetchingSuggestions ? (
                  <Text style={styles.emptyTextSmall}>
                    No people found for “{searchText}”.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {!isSearching && filteredChats.length === 0 ? (
              <View style={styles.centerWrap}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Search a person above to start a message.
                </Text>
              </View>
            ) : null}

            {isSearching && !hasAnySearchResult && !isFetchingSuggestions ? (
              <View style={styles.centerWrap}>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyText}>
                  Try another name or search term.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function ConversationRow({
  chat,
  unreadCount,
  styles,
  showBorder,
  presenceTick,
  currentUserId,
  onPress,
}: {
  chat: Chat;
  unreadCount: number;
  styles: ReturnType<typeof createStyles>;
  showBorder: boolean;
  presenceTick: number;
  currentUserId?: string;
  onPress: () => void;
}) {
  const name =
    chat.otherUser?.name || chat.otherUser?.businessName || "Unknown User";

  const avatar = getAvatarUrl(name, chat.otherUser?.image);
  const requestBadge = getChatRequestBadge(chat, currentUserId);
  const lastMessage = getLastMessagePreview(chat);
  const presenceText = getChatPresenceText(chat, currentUserId, presenceTick);
  const isUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        showBorder && styles.rowBorder,
        isUnread && styles.rowUnread,
      ]}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatar }} style={styles.avatar} />

        {chat.otherUser?.isOnline ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.rowMiddle}>
        <View style={styles.rowNameLine}>
          <Text
            numberOfLines={1}
            style={[styles.rowName, isUnread && styles.rowNameUnread]}
          >
            {name}
          </Text>

          {requestBadge ? (
            <Text style={styles.requestBadge}>{requestBadge}</Text>
          ) : chat.otherUser?.isOnline ? (
            <Text style={styles.onlineText}>Online</Text>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.rowMessage, isUnread && styles.rowMessageUnread]}
        >
          {lastMessage}
        </Text>

        <Text numberOfLines={1} style={styles.rowPresence}>
          {presenceText}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.rowTime, isUnread && styles.rowTimeUnread]}>
          {formatChatTime(chat.updatedAt)}
        </Text>

        {isUnread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? "99+" : String(unreadCount)}
            </Text>
          </View>
        ) : chat.lastMessage?.status === "DELIVERED" ? (
          <Ionicons name="checkmark-done" size={16} color="#16a34a" />
        ) : chat.lastMessage ? (
          <Ionicons name="checkmark" size={16} color="#94a3b8" />
        ) : null}
      </View>
    </Pressable>
  );
}

function SuggestionRow({
  item,
  styles,
  colors,
  isLoading,
  showBorder,
  currentUserId,
  onPress,
}: {
  item: ChatSuggestionItem;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isLoading: boolean;
  showBorder: boolean;
  currentUserId?: string;
  onPress: () => void;
}) {
  const name = getSuggestionName(item);
  const avatar = getAvatarUrl(name, item.user.image);
  const subtitle = getSuggestionSubtitle(item, currentUserId);
  const actionLabel = getSuggestionActionLabel(item, currentUserId);

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      style={[styles.suggestionRow, showBorder && styles.rowBorder]}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatar }} style={styles.avatar} />

        {item.user.isOnline ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.rowMiddle}>
        <View style={styles.rowNameLine}>
          <Text numberOfLines={1} style={styles.rowName}>
            {name}
          </Text>

          {item.user.isOnline ? (
            <Text style={styles.onlineText}>Online</Text>
          ) : null}
        </View>

        <Text numberOfLines={1} style={styles.rowMessage}>
          {subtitle}
        </Text>

        <Text numberOfLines={1} style={styles.rowPresence}>
          {formatActiveStatus(item.user)}
        </Text>
      </View>

      <View style={styles.suggestionAction}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={styles.suggestionActionText}>{actionLabel}</Text>
        )}
      </View>
    </Pressable>
  );
}

function getLastMessagePreview(chat: Chat) {
  const requestStatus = String((chat as any).requestStatus ?? "");
  const lastMessage = chat.lastMessage;

  if (!lastMessage) {
    if (requestStatus === "PENDING") return "Message request pending";
    if (requestStatus === "DECLINED") return "Message request declined";

    return "No messages yet";
  }

  if (lastMessage.type === "IMAGE") return "📷 Photo";
  if (lastMessage.type === "AUDIO") return "🎤 Voice message";
  if (lastMessage.type === "FILE") {
    return `📄 ${lastMessage.fileName || "File"}`;
  }

  return lastMessage.content || "Message";
}

function getChatRequestBadge(chat: Chat, currentUserId?: string) {
  const requestStatus = String((chat as any).requestStatus ?? "");
  const requestedById = (chat as any).requestedById as string | null | undefined;

  if (requestStatus === "PENDING") {
    return requestedById === currentUserId ? "Sent" : "Request";
  }

  if (requestStatus === "DECLINED") {
    return "Declined";
  }

  return "";
}

function getChatPresenceText(
  chat: Chat,
  currentUserId?: string,
  presenceTick?: number,
) {
  const requestStatus = String((chat as any).requestStatus ?? "");
  const requestedById = (chat as any).requestedById as string | null | undefined;

  if (requestStatus === "PENDING") {
    return requestedById === currentUserId
      ? "Waiting for them to accept"
      : "Tap to accept or decline";
  }

  if (requestStatus === "DECLINED") {
    return "Message request declined";
  }

  return formatActiveStatus(chat.otherUser, presenceTick);
}

function getSuggestionName(item: ChatSuggestionItem) {
  return item.user.name || item.user.businessName || "Unknown User";
}

function getSuggestionSubtitle(item: ChatSuggestionItem, currentUserId?: string) {
  const relationship = item.relationship as any;
  const requestStatus = String((item as any).chatRequestStatus ?? "");
  const requestedById = (item as any).requestedById as string | null | undefined;

  if (item.existingChatId && requestStatus === "PENDING") {
    return requestedById === currentUserId
      ? "Message request already sent"
      : "Message request waiting for you";
  }

  if (item.existingChatId && requestStatus === "DECLINED") {
    return "Message request declined";
  }

  if (item.existingChatId) return "Open existing conversation";
  if (relationship?.isMutual) return "Friends • message directly";
  if (relationship?.isFollowing) return "Send a message request";
  if (relationship?.followsMe) return "Follows you • send a message request";

  return "No follow connection";
}

function getSuggestionActionLabel(
  item: ChatSuggestionItem,
  currentUserId?: string,
) {
  const relationship = item.relationship as any;
  const requestStatus = String((item as any).chatRequestStatus ?? "");
  const requestedById = (item as any).requestedById as string | null | undefined;

  if (item.existingChatId && requestStatus === "PENDING") {
    return requestedById === currentUserId ? "Sent" : "View";
  }

  if (item.existingChatId) return "Open";
  if (relationship?.isMutual || relationship?.canMessage) return "Message";
  if (
    relationship?.canSendRequest ||
    relationship?.isFollowing ||
    relationship?.followsMe
  ) {
    return "Request";
  }

  return "Unavailable";
}

function getAvatarUrl(name: string, image?: string | null) {
  const absoluteImage = toAbsoluteFileUrl(image);

  if (absoluteImage) return absoluteImage;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}`;
}

function formatChatTime(value: string) {
  const date = dayjs(value);
  const now = dayjs();

  if (date.isSame(now, "day")) {
    return date.format("hh:mm A");
  }

  if (date.isSame(now.subtract(1, "day"), "day")) {
    return "Yesterday";
  }

  return date.format("D MMM");
}

function formatActiveStatus(
  user?: {
    isOnline?: boolean;
    lastSeenAt?: string | null;
  } | null,
  _tick?: number,
) {
  if (!user) return "Direct message";

  if (user.isOnline) return "Online now";

  if (!user.lastSeenAt) return "Offline";

  const lastSeen = dayjs(user.lastSeenAt);

  if (!lastSeen.isValid()) return "Offline";

  const now = dayjs();

  const diffMinutes = now.diff(lastSeen, "minute");
  const diffHours = now.diff(lastSeen, "hour");
  const diffDays = now.diff(lastSeen, "day");

  if (diffMinutes < 1) return "Active just now";
  if (diffMinutes === 1) return "Active 1m ago";
  if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;

  if (diffHours === 1) return "Active 1h ago";
  if (diffHours < 24) return `Active ${diffHours}h ago`;

  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 7) return `Active ${diffDays}d ago`;

  return "Offline";
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 8,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    backButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderColor: colors.border,
    },

    headerSpacer: {
      width: 38,
      height: 38,
    },

    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.foreground,
    },

    subtitle: {
      marginTop: 8,
      fontSize: 14,
      color: colors.muted,
    },

    searchWrap: {
      marginTop: 16,
      marginBottom: 12,
    },

    listContent: {
      paddingBottom: 28,
    },

    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },

    sectionTitle: {
      marginTop: 8,
      marginBottom: 6,
      fontSize: 13,
      fontWeight: "800",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },

    suggestionSection: {
      marginTop: 8,
    },

    suggestionSectionTop: {
      marginTop: 0,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 2,
      borderRadius: 16,
    },

    suggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 2,
      borderRadius: 16,
    },

    rowUnread: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 8,
      marginHorizontal: -6,
    },

    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    avatarWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceSecondary,
      position: "relative",
    },

    avatar: {
      width: "100%",
      height: "100%",
      borderRadius: 26,
    },

    onlineDot: {
      position: "absolute",
      right: 1,
      bottom: 1,
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.background,
    },

    rowMiddle: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0,
    },

    rowNameLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    rowName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
    },

    rowNameUnread: {
      fontWeight: "900",
    },

    onlineText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.success,
    },

    requestBadge: {
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      fontSize: 10,
      fontWeight: "900",
      color: colors.accent,
      backgroundColor: colors.surfaceSecondary,
    },

    rowMessage: {
      marginTop: 4,
      fontSize: 13,
      color: colors.muted,
    },

    rowMessageUnread: {
      color: colors.foreground,
      fontWeight: "800",
    },

    rowPresence: {
      marginTop: 3,
      fontSize: 11,
      color: colors.muted,
    },

    rowRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 8,
      marginLeft: 8,
      minWidth: 46,
    },

    rowTime: {
      fontSize: 12,
      color: colors.muted,
    },

    rowTimeUnread: {
      color: colors.accent,
      fontWeight: "800",
    },

    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    unreadBadgeText: {
      color: colors.accentForeground,
      fontSize: 11,
      fontWeight: "900",
    },

    suggestionAction: {
      minWidth: 72,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      marginLeft: 8,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    suggestionActionText: {
      fontSize: 12,
      fontWeight: "900",
      color: colors.accent,
    },

    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: 10,
    },

    errorText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: colors.foreground,
    },

    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 20,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
      textAlign: "center",
    },

    emptyText: {
      marginTop: 8,
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
    },

    emptyTextSmall: {
      marginTop: 4,
      fontSize: 13,
      color: colors.muted,
    },

    retryButton: {
      marginTop: 14,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: colors.accent,
    },

    retryText: {
      color: colors.accentForeground,
      fontWeight: "700",
    },
  });
}