import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { io, type Socket } from "socket.io-client";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useSession } from "@/api/better-auth-client";
import {
  type ChatMessage,
  type MessageType,
  useGetChatMessagesQuery,
  useGetChatQuery,
  useMarkChatReadMutation,
  useSendMessageMutation,
  useUploadChatFileMutation,
} from "@/store/api/chatApi";

import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  COMPOSER_BAR_HEIGHT,
  createConversationStyles,
} from "@/constants/styles/chatConversation.styles";
import {
  formatActiveStatus,
  formatDateLabel,
  formatFileSize,
  formatMessageTime,
} from "@/lib/chatFormatters";
import {
  guessMimeTypeFromName,
  guessMessageType,
} from "@/lib/chatMediaUtils";

type DrawerAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type PendingUploadItem = {
  id: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type MessageDisplayGroup = {
  key: string;
  type: "single" | "image-grid";
  items: ChatMessage[];
};

const DRAWER_ACTIONS: DrawerAction[] = [
  { id: "document", label: "Document", icon: "document-text-outline" },
  { id: "camera", label: "Camera", icon: "camera-outline" },
  { id: "gallery", label: "Gallery", icon: "images-outline" },
];

const ANDROID_KEYBOARD_EXTRA = 40;

const SOCKET_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_AUTH_URL ??
  "";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id ?? "";

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createConversationStyles(colors), [colors]);

  const [message, setMessage] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [presenceTick, setPresenceTick] = useState(0);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([]);

  const scrollRef = useRef<ScrollView | null>(null);
  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const {
    data: chat,
    isLoading: chatLoading,
    isError: chatError,
    refetch: refetchChat,
  } = useGetChatQuery(chatId, {
    skip: !chatId,
  });

  const {
    data: messagePage,
    isLoading: messagesLoading,
    isFetching: messagesFetching,
    refetch: refetchMessages,
  } = useGetChatMessagesQuery(
    { chatId, page: 1, limit: 50 },
    { skip: !chatId },
  );

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [uploadChatFile, { isLoading: isUploading }] =
    useUploadChatFileMutation();
  const [markChatRead] = useMarkChatReadMutation();

  const messages = messagePage?.items ?? [];

  const otherUserName =
    chat?.otherUser?.name || chat?.otherUser?.businessName || "Chat";

  const otherUserAvatar = getAvatarUrl(otherUserName, chat?.otherUser?.image);

  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceTick((value) => value + 1);
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!chatId) return;

    markChatRead(chatId).catch(() => {});
  }, [chatId, markChatRead, messages.length]);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    if (!SOCKET_ORIGIN) {
      console.log(
        "Socket origin missing. Add EXPO_PUBLIC_AUTH_URL or EXPO_PUBLIC_API_URL in .env",
      );
      return;
    }

    let mounted = true;

    const socket = io(`${SOCKET_ORIGIN}/chat`, {
      transports: ["websocket"],
      auth: {
        userId: currentUserId,
      },
    });

    socketRef.current = socket;

    const handleNewMessage = async (payload: {
      chatId: string;
      message?: ChatMessage;
    }) => {
      if (!mounted) return;

      if (payload.chatId === chatId) {
        await refetchMessages();
        await refetchChat();

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleDelivered = async (payload: { chatId: string }) => {
      if (!mounted) return;

      if (payload.chatId === chatId) {
        await refetchMessages();
        await refetchChat();
      }
    };

    const handleChatRead = async (payload: { chatId: string }) => {
      if (!mounted) return;

      if (payload.chatId === chatId) {
        await refetchChat();
      }
    };

    const handlePresenceUpdate = async (payload: { userId: string }) => {
      if (!mounted) return;

      if (payload.userId === chat?.otherUser?.id) {
        await refetchChat();
        setPresenceTick((value) => value + 1);
      }
    };

    const handleTypingStart = (payload: { chatId: string; userId: string }) => {
      if (!mounted) return;

      if (payload.chatId === chatId && payload.userId !== currentUserId) {
        setIsOtherTyping(true);
      }
    };

    const handleTypingStop = (payload: { chatId: string; userId: string }) => {
      if (!mounted) return;

      if (payload.chatId === chatId && payload.userId !== currentUserId) {
        setIsOtherTyping(false);
      }
    };

    socket.on("connect", () => {
      console.log("Chat socket connected:", socket.id);
      socket.emit("chat:join", { chatId });
    });

    socket.on("connected", (payload) => {
      console.log("Backend socket connected:", payload);
    });

    socket.on("chat:joined", (payload) => {
      console.log("Joined chat room:", payload);
    });

    socket.on("message:new", handleNewMessage);
    socket.on("message:delivered", handleDelivered);
    socket.on("chat:read", handleChatRead);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    socket.on("connect_error", (error) => {
      console.log("Chat socket connect error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Chat socket disconnected:", reason);
    });

    return () => {
      mounted = false;

      socket.emit("typing:stop", { chatId });
      socket.emit("chat:leave", { chatId });

      socket.off("connect");
      socket.off("connected");
      socket.off("chat:joined");
      socket.off("message:new", handleNewMessage);
      socket.off("message:delivered", handleDelivered);
      socket.off("chat:read", handleChatRead);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("connect_error");
      socket.off("disconnect");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    chatId,
    currentUserId,
    chat?.otherUser?.id,
    refetchMessages,
    refetchChat,
  ]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (event) => {
      const rawHeight = event.endCoordinates?.height ?? 0;

      const adjustedHeight =
        Platform.OS === "ios"
          ? Math.max(rawHeight - insets.bottom, 0)
          : rawHeight;

      setKeyboardHeight(adjustedHeight);
    });

    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();

      if (drawerTimerRef.current) {
        clearTimeout(drawerTimerRef.current);
      }
    };
  }, [insets.bottom]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [messages.length, pendingUploads.length]);

  const emitTyping = (text: string) => {
    const socket = socketRef.current;

    if (!socket || !chatId) return;

    if (text.trim().length > 0) {
      socket.emit("typing:start", { chatId });
    } else {
      socket.emit("typing:stop", { chatId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { chatId });
    }, 1200);
  };

  const handleSendText = async () => {
    const text = message.trim();

    if (!text || !chatId || isSending || isUploading) return;

    socketRef.current?.emit("typing:stop", { chatId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setMessage("");

    try {
      await sendMessage({
        chatId,
        body: {
          type: "TEXT",
          content: text,
        },
      }).unwrap();

      await refetchMessages();
      await refetchChat();

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      setMessage(text);
      console.log("Send text message failed:", JSON.stringify(error, null, 2));
    }
  };

  const uploadAndSendAsset = async (asset: {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
  }) => {
    if (!chatId || isUploading) return;

    try {
      const fileName = asset.fileName || `chat-file-${Date.now()}`;
      const mimeType = asset.mimeType || guessMimeTypeFromName(fileName);

      const formData = new FormData();

      formData.append("file", {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any);

      const uploaded = await uploadChatFile(formData).unwrap();

      const finalMimeType = uploaded.mimetype || mimeType;

      await sendMessage({
        chatId,
        body: {
          type: guessMessageType(finalMimeType),
          mediaUrl: uploaded.url,
          fileName: uploaded.originalName || uploaded.filename || fileName,
          fileSize: uploaded.size || asset.fileSize || undefined,
          mimeType: finalMimeType,
        },
      }).unwrap();

      await refetchMessages();
      await refetchChat();

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.log("Upload/send file failed:", JSON.stringify(error, null, 2));
    }
  };

  const pickFromCamera = async () => {
    setDrawerVisible(false);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];

      const pendingItem: PendingUploadItem = {
        id: `${Date.now()}`,
        uri: asset.uri,
        fileName: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
      };

      setPendingUploads([pendingItem]);

      await uploadAndSendAsset({
        uri: asset.uri,
        fileName: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize,
      });

      setPendingUploads([]);
    }
  };

  const pickFromGallery = async () => {
    setDrawerVisible(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      const pendingItems: PendingUploadItem[] = result.assets.map(
        (asset, index) => ({
          id: `${Date.now()}-${index}`,
          uri: asset.uri,
          fileName: asset.fileName || `media-${Date.now()}-${index}`,
          mimeType: asset.mimeType || guessMimeTypeFromName(asset.fileName),
        }),
      );

      setPendingUploads(pendingItems);

      for (const asset of result.assets) {
        await uploadAndSendAsset({
          uri: asset.uri,
          fileName: asset.fileName || `media-${Date.now()}`,
          mimeType: asset.mimeType || guessMimeTypeFromName(asset.fileName),
          fileSize: asset.fileSize,
        });
      }

      setPendingUploads([]);
    }
  };

  const pickDocument = async () => {
    setDrawerVisible(false);

    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    await uploadAndSendAsset({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType || guessMimeTypeFromName(asset.name),
      fileSize: asset.size,
    });
  };

  const handleDrawerAction = async (actionId: string) => {
    if (actionId === "camera") {
      await pickFromCamera();
      return;
    }

    if (actionId === "gallery") {
      await pickFromGallery();
      return;
    }

    if (actionId === "document") {
      await pickDocument();
      return;
    }

    setDrawerVisible(false);
  };

  const openAttachmentDrawer = () => {
    if (keyboardHeight > 0) {
      Keyboard.dismiss();

      if (drawerTimerRef.current) {
        clearTimeout(drawerTimerRef.current);
      }

      drawerTimerRef.current = setTimeout(
        () => setDrawerVisible(true),
        Platform.OS === "android" ? 180 : 80,
      );

      return;
    }

    setDrawerVisible(true);
  };

  const composerBottom =
    keyboardHeight > 0
      ? keyboardHeight +
        (Platform.OS === "android" ? ANDROID_KEYBOARD_EXTRA : 0)
      : Math.max(insets.bottom, 10);

  const headerStatus = isOtherTyping
    ? "Typing..."
    : `${formatActiveStatus(chat?.otherUser, presenceTick)}${
        chat?.sourceCommunity?.name ? ` • ${chat.sourceCommunity.name}` : ""
      }`;

  if (chatLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyWrap}>
          <ActivityIndicator />
          <Text style={styles.emptyTitle}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (chatError || !chat) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Conversation not found</Text>

          <Pressable style={styles.retryButton} onPress={() => refetchChat()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>

          <View style={styles.avatarWrap}>
            <Image source={{ uri: otherUserAvatar }} style={styles.headerAvatar} />
            {chat.otherUser?.isOnline ? <View style={styles.onlineDot} /> : null}
          </View>

          <View style={styles.headerMeta}>
            <Text numberOfLines={1} style={styles.headerName}>
              {otherUserName}
            </Text>

            <Text numberOfLines={1} style={styles.headerStatus}>
              {headerStatus}
            </Text>
          </View>

          <Pressable style={styles.headerAction}>
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={[
            styles.messagesContent,
            {
              paddingBottom:
                COMPOSER_BAR_HEIGHT + Math.max(insets.bottom, 10) + 80,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={messagesFetching}
              onRefresh={refetchMessages}
            />
          }
        >
          {messagesLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator />
              <Text style={styles.emptyTitle}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 && pendingUploads.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubText}>Send your first message.</Text>
            </View>
          ) : (
            <>
              {renderMessages(messages, currentUserId, styles, colors)}

              {pendingUploads.length > 0 ? (
                <PendingUploadGrid
                  items={pendingUploads}
                  styles={styles}
                  colors={colors}
                />
              ) : null}
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.composerOuter,
            {
              bottom: composerBottom,
            },
          ]}
        >
          <View style={styles.composerWrap}>
            <Pressable
              onPress={openAttachmentDrawer}
              style={styles.attachButton}
              disabled={isUploading}
            >
              <Ionicons name="add" size={22} color={colors.accent} />
            </Pressable>

            <View style={styles.inputWrap}>
              <TextInput
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  emitTyping(text);
                }}
                placeholder={isUploading ? "Uploading..." : "Type a message..."}
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                multiline
                scrollEnabled
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (Platform.OS !== "ios") {
                    handleSendText();
                  }
                }}
                underlineColorAndroid="transparent"
                editable={!isUploading}
              />
            </View>

            <Pressable
              style={[
                styles.sendButton,
                (!message.trim() || isSending || isUploading) && {
                  opacity: 0.55,
                },
              ]}
              disabled={!message.trim() || isSending || isUploading}
              onPress={handleSendText}
            >
              {isSending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Ionicons name="send" size={18} color="#ffffff" />
              )}
            </Pressable>
          </View>
        </View>

        <Modal
          visible={drawerVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setDrawerVisible(false)}
        >
          <Pressable
            style={styles.drawerBackdrop}
            onPress={() => setDrawerVisible(false)}
          >
            <Pressable style={styles.drawerSheet} onPress={() => {}}>
              <View style={styles.drawerHandle} />

              <View style={styles.drawerGrid}>
                {DRAWER_ACTIONS.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.drawerGridItem}
                    onPress={() => handleDrawerAction(item.id)}
                  >
                    <View style={styles.drawerGridIconWrap}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={colors.foreground}
                      />
                    </View>

                    <Text style={styles.drawerGridLabel}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function renderMessages(
  messages: ChatMessage[],
  currentUserId: string | undefined,
  styles: ReturnType<typeof createConversationStyles>,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  const groups = groupMessagesForDisplay(messages);

  let lastDateLabel = "";

  return groups.map((group) => {
    const firstMessage = group.items[0];
    const date = new Date(firstMessage.createdAt);
    const currentDateLabel = date.toDateString();
    const showDate = currentDateLabel !== lastDateLabel;
    lastDateLabel = currentDateLabel;

    const isMe = firstMessage.senderId === currentUserId;

    return (
      <View key={group.key}>
        {showDate ? (
          <View style={styles.dateWrap}>
            <Text style={styles.dateText}>
              {formatDateLabel(firstMessage.createdAt)}
            </Text>
          </View>
        ) : null}

        {group.type === "image-grid" ? (
          <ImageMessageGrid
            messages={group.items}
            isMe={isMe}
            styles={styles}
          />
        ) : (
          <View
            style={[
              styles.bubbleRow,
              isMe ? styles.bubbleRowMe : styles.bubbleRowOther,
            ]}
          >
            <View
              style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleOther,
                firstMessage.type === "IMAGE" && styles.imageBubbleClean,
              ]}
            >
              {renderMessageContent(firstMessage, isMe, styles, colors)}

              {isMe ? (
                <View style={styles.messageStatusRow}>
                  <Text style={[styles.messageTime, styles.messageTimeMe]}>
                    {formatMessageTime(firstMessage.createdAt)}
                  </Text>

                  <Ionicons
                    name={
                      firstMessage.status === "DELIVERED"
                        ? "checkmark-done"
                        : "checkmark"
                    }
                    size={14}
                    color={
                      firstMessage.status === "DELIVERED"
                        ? colors.success
                        : "#ffffff"
                    }
                  />
                </View>
              ) : (
                <Text style={styles.messageTime}>
                  {formatMessageTime(firstMessage.createdAt)}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  });
}

function groupMessagesForDisplay(messages: ChatMessage[]) {
  const groups: MessageDisplayGroup[] = [];
  let index = 0;

  while (index < messages.length) {
    const current = messages[index];

    if (current.type === "IMAGE" && current.mediaUrl) {
      const imageGroup: ChatMessage[] = [current];
      let nextIndex = index + 1;

      while (nextIndex < messages.length) {
        const next = messages[nextIndex];

        const sameSender = next.senderId === current.senderId;
        const isImage = next.type === "IMAGE" && !!next.mediaUrl;
        const closeTime =
          Math.abs(
            new Date(next.createdAt).getTime() -
              new Date(current.createdAt).getTime(),
          ) <=
          2 * 60 * 1000;

        if (!sameSender || !isImage || !closeTime || imageGroup.length >= 10) {
          break;
        }

        imageGroup.push(next);
        nextIndex += 1;
      }

      if (imageGroup.length > 1) {
        groups.push({
          key: imageGroup.map((item) => item.id).join("-"),
          type: "image-grid",
          items: imageGroup,
        });

        index = nextIndex;
        continue;
      }
    }

    groups.push({
      key: current.id,
      type: "single",
      items: [current],
    });

    index += 1;
  }

  return groups;
}

function openImageGallery(messages: ChatMessage[], index: number) {
  const images = messages
    .map((item) => {
      const imageUrl = toAbsoluteFileUrl(item.mediaUrl);

      if (!imageUrl) return null;

      return {
        uri: imageUrl,
        name: item.fileName || "Image",
      };
    })
    .filter(Boolean);

  router.push({
    pathname: "/pages/message-imageviewer",
    params: {
      images: encodeURIComponent(JSON.stringify(images)),
      index: String(index),
    },
  });
}

function ImageMessageGrid({
  messages,
  isMe,
  styles,
}: {
  messages: ChatMessage[];
  isMe: boolean;
  styles: ReturnType<typeof createConversationStyles>;
}) {
  const visibleMessages = messages.slice(0, 4);
  const extraCount = messages.length - visibleMessages.length;

  return (
    <View
      style={[
        styles.bubbleRow,
        isMe ? styles.bubbleRowMe : styles.bubbleRowOther,
      ]}
    >
      <View style={styles.imageGridBubble}>
        <View
          style={[
            styles.imageGrid,
            visibleMessages.length === 2 && styles.imageGridTwo,
          ]}
        >
          {visibleMessages.map((item, index) => {
            const imageUrl = toAbsoluteFileUrl(item.mediaUrl);

            if (!imageUrl) return null;

            const isLastVisible = index === visibleMessages.length - 1;

            return (
              <Pressable
                key={item.id}
                style={[
                  styles.imageGridItem,
                  visibleMessages.length === 1 && styles.imageGridItemSingle,
                  visibleMessages.length === 2 && styles.imageGridItemTwo,
                ]}
                onPress={() => openImageGallery(messages, index)}
              >
                <Image source={{ uri: imageUrl }} style={styles.imageGridImage} />

                {extraCount > 0 && isLastVisible ? (
                  <Pressable
                    style={styles.imageGridOverlay}
                    onPress={() => openImageGallery(messages, index)}
                  >
                    <Text style={styles.imageGridOverlayText}>
                      +{extraCount}
                    </Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.imageGridTime}>
          {formatMessageTime(messages[messages.length - 1].createdAt)}
        </Text>
      </View>
    </View>
  );
}

function PendingUploadGrid({
  items,
  styles,
  colors,
}: {
  items: PendingUploadItem[];
  styles: ReturnType<typeof createConversationStyles>;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const visibleItems = items.slice(0, 4);
  const extraCount = items.length - visibleItems.length;

  return (
    <View style={[styles.bubbleRow, styles.bubbleRowMe]}>
      <View style={styles.pendingGridBubble}>
        <View style={styles.pendingHeader}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.pendingText}>Sending {items.length} media...</Text>
        </View>

        <View style={styles.imageGrid}>
          {visibleItems.map((item, index) => {
            const isLastVisible = index === visibleItems.length - 1;

            return (
              <View key={item.id} style={styles.imageGridItem}>
                <Image source={{ uri: item.uri }} style={styles.imageGridImage} />

                {extraCount > 0 && isLastVisible ? (
                  <View style={styles.imageGridOverlay}>
                    <Text style={styles.imageGridOverlayText}>
                      +{extraCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function renderMessageContent(
  item: ChatMessage,
  isMe: boolean,
  styles: ReturnType<typeof createConversationStyles>,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  if (item.type === "IMAGE" && item.mediaUrl) {
    const imageUrl = toAbsoluteFileUrl(item.mediaUrl);

    if (!imageUrl) return null;

    return (
      <Pressable onPress={() => openImageGallery([item], 0)}>
        <Image source={{ uri: imageUrl }} style={styles.messageImage} />
      </Pressable>
    );
  }

  if (item.type === "VIDEO") {
    const videoUrl = toAbsoluteFileUrl(item.mediaUrl);

    return (
      <Pressable
        style={styles.fileBubble}
        onPress={() => {
          if (videoUrl) Linking.openURL(videoUrl);
        }}
      >
        <View style={styles.fileIconWrap}>
          <Ionicons
            name="videocam-outline"
            size={20}
            color={isMe ? "#ffffff" : colors.foreground}
          />
        </View>

        <View style={styles.fileTextWrap}>
          <Text
            numberOfLines={1}
            ellipsizeMode="middle"
            style={[
              styles.fileNameText,
              isMe ? styles.bubbleTextMe : styles.bubbleTextOther,
            ]}
          >
            {item.fileName || "Video"}
          </Text>

          {item.fileSize ? (
            <Text
              numberOfLines={1}
              style={[
                styles.fileMetaText,
                isMe ? styles.fileMetaTextMe : styles.fileMetaTextOther,
              ]}
            >
              {formatFileSize(item.fileSize)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  if (item.type === "FILE") {
    const fileUrl = toAbsoluteFileUrl(item.mediaUrl);

    return (
      <Pressable
        style={styles.fileBubble}
        onPress={() => {
          if (fileUrl) Linking.openURL(fileUrl);
        }}
      >
        <View style={styles.fileIconWrap}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color={isMe ? "#ffffff" : colors.foreground}
          />
        </View>

        <View style={styles.fileTextWrap}>
          <Text
            numberOfLines={1}
            ellipsizeMode="middle"
            style={[
              styles.fileNameText,
              isMe ? styles.bubbleTextMe : styles.bubbleTextOther,
            ]}
          >
            {item.fileName || "File"}
          </Text>

          {item.fileSize ? (
            <Text
              numberOfLines={1}
              style={[
                styles.fileMetaText,
                isMe ? styles.fileMetaTextMe : styles.fileMetaTextOther,
              ]}
            >
              {formatFileSize(item.fileSize)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Text
      style={[
        styles.bubbleText,
        isMe ? styles.bubbleTextMe : styles.bubbleTextOther,
      ]}
    >
      {item.content}
    </Text>
  );
}

function getAvatarUrl(name: string, image?: string | null) {
  const absoluteImage = toAbsoluteFileUrl(image);

  if (absoluteImage) return absoluteImage;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}`;
}