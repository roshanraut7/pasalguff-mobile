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
  StyleSheet,
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

type DrawerAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const DRAWER_ACTIONS: DrawerAction[] = [
  { id: "document", label: "Document", icon: "document-text-outline" },
  { id: "camera", label: "Camera", icon: "camera-outline" },
  { id: "gallery", label: "Gallery", icon: "images-outline" },
];

const COMPOSER_BAR_HEIGHT = 68;
const ANDROID_KEYBOARD_EXTRA = 40;

const SOCKET_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? "";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id ?? "";

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [message, setMessage] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView | null>(null);
  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (!chatId) return;

    markChatRead(chatId).catch(() => {});
  }, [chatId, markChatRead, messages.length]);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    if (!SOCKET_ORIGIN) {
      console.log("Socket origin missing. Check EXPO_PUBLIC_API_URL.");
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

    socket.on("message:new", async (payload: { chatId: string }) => {
      if (!mounted) return;

      if (payload.chatId === chatId) {
        await refetchMessages();
        await refetchChat();

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    socket.on("message:delivered", async (payload: { chatId: string }) => {
      if (!mounted) return;

      if (payload.chatId === chatId) {
        await refetchMessages();
        await refetchChat();
      }
    });

    socket.on("chat:read", async (payload: { chatId: string }) => {
      if (!mounted) return;

      if (payload.chatId === chatId) {
        await refetchChat();
      }
    });

    socket.on("connect_error", (error) => {
      console.log("Chat socket connect error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Chat socket disconnected:", reason);
    });

    return () => {
      mounted = false;

      socket.emit("chat:leave", { chatId });

      socket.off("connect");
      socket.off("connected");
      socket.off("chat:joined");
      socket.off("message:new");
      socket.off("message:delivered");
      socket.off("chat:read");
      socket.off("connect_error");
      socket.off("disconnect");

      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatId, currentUserId, refetchMessages, refetchChat]);

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
  }, [messages.length]);

  const handleSendText = async () => {
    const text = message.trim();

    if (!text || !chatId || isSending || isUploading) return;

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

      await uploadAndSendAsset({
        uri: asset.uri,
        fileName: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize,
      });
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
      for (const asset of result.assets) {
        await uploadAndSendAsset({
          uri: asset.uri,
          fileName: asset.fileName || `media-${Date.now()}`,
          mimeType: asset.mimeType || guessMimeTypeFromName(asset.fileName),
          fileSize: asset.fileSize,
        });
      }
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

          <Image source={{ uri: otherUserAvatar }} style={styles.headerAvatar} />

          <View style={styles.headerMeta}>
            <Text numberOfLines={1} style={styles.headerName}>
              {otherUserName}
            </Text>

            <Text style={styles.headerStatus}>
              {chat.sourceCommunity?.name
                ? `Started from ${chat.sourceCommunity.name}`
                : "Direct message"}
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
                COMPOSER_BAR_HEIGHT + Math.max(insets.bottom, 10) + 48,
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
          ) : messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubText}>Send your first message.</Text>
            </View>
          ) : (
            renderMessages(messages, currentUserId, styles, colors)
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
                onChangeText={setMessage}
                placeholder={isUploading ? "Uploading..." : "Type a message..."}
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSendText}
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
                <ActivityIndicator color={colors.accentForeground} />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={colors.accentForeground}
                />
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
  styles: ReturnType<typeof createStyles>,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  let lastDateLabel = "";

  return messages.map((item) => {
    const date = new Date(item.createdAt);
    const currentDateLabel = date.toDateString();
    const showDate = currentDateLabel !== lastDateLabel;
    lastDateLabel = currentDateLabel;

    const isMe = item.senderId === currentUserId;

    return (
      <View key={item.id}>
        {showDate ? (
          <View style={styles.dateWrap}>
            <Text style={styles.dateText}>{formatDateLabel(item.createdAt)}</Text>
          </View>
        ) : null}

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
            ]}
          >
            {renderMessageContent(item, isMe, styles, colors)}

            {isMe ? (
              <View style={styles.messageStatusRow}>
                <Text style={[styles.messageTime, styles.messageTimeMe]}>
                  {formatMessageTime(item.createdAt)}
                </Text>

                <Ionicons
                  name={
                    item.status === "DELIVERED"
                      ? "checkmark-done"
                      : "checkmark"
                  }
                  size={14}
                  color={
                    item.status === "DELIVERED"
                      ? colors.success
                      : colors.accentForeground
                  }
                />
              </View>
            ) : (
              <Text style={styles.messageTime}>
                {formatMessageTime(item.createdAt)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  });
}

function renderMessageContent(
  item: ChatMessage,
  isMe: boolean,
  styles: ReturnType<typeof createStyles>,
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  if (item.type === "IMAGE" && item.mediaUrl) {
    const imageUrl = toAbsoluteFileUrl(item.mediaUrl);

    if (!imageUrl) return null;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/pages/message-imageviewer",
            params: {
              uri: imageUrl,
              name: item.fileName || "Image",
            },
          })
        }
      >
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
            color={isMe ? colors.accentForeground : colors.foreground}
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
            color={isMe ? colors.accentForeground : colors.foreground}
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

function guessMimeTypeFromName(fileName?: string | null) {
  const name = fileName?.toLowerCase() || "";

  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (name.endsWith(".xls")) return "application/vnd.ms-excel";
  if (name.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".mov")) return "video/quicktime";

  return "application/octet-stream";
}

function guessMessageType(mimeType?: string): MessageType {
  if (mimeType?.startsWith("image/")) return "IMAGE";
  if (mimeType?.startsWith("video/")) return "VIDEO";
  return "FILE";
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;

  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatDateLabel(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) return "Today";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      marginTop: 10,
      textAlign: "center",
    },
    emptySubText: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 6,
      textAlign: "center",
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

    header: {
      height: 62,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
    },
    headerMeta: {
      flex: 1,
      marginLeft: 10,
    },
    headerName: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.foreground,
    },
    headerStatus: {
      marginTop: 2,
      fontSize: 12,
      color: colors.muted,
    },
    headerAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    messagesScroll: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 14,
      paddingTop: 16,
    },
    dateWrap: {
      alignItems: "center",
      marginVertical: 12,
    },
    dateText: {
      fontSize: 12,
      color: colors.muted,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },

    bubbleRow: {
      marginVertical: 4,
      flexDirection: "row",
    },
    bubbleRowMe: {
      justifyContent: "flex-end",
    },
    bubbleRowOther: {
      justifyContent: "flex-start",
    },
    bubble: {
      maxWidth: "78%",
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    bubbleMe: {
      backgroundColor: colors.accent,
      borderBottomRightRadius: 6,
    },
    bubbleOther: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleText: {
      fontSize: 14,
      lineHeight: 20,
    },
    bubbleTextMe: {
      color: colors.accentForeground,
    },
    bubbleTextOther: {
      color: colors.foreground,
    },

    messageImage: {
      width: 220,
      height: 220,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
    },

    fileBubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      maxWidth: 230,
      minWidth: 180,
    },
    fileIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    fileTextWrap: {
      flex: 1,
      minWidth: 0,
      flexShrink: 1,
    },
    fileNameText: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "600",
      flexShrink: 1,
    },
    fileMetaText: {
      marginTop: 2,
      fontSize: 11,
    },
    fileMetaTextMe: {
      color: colors.accentForeground,
      opacity: 0.75,
    },
    fileMetaTextOther: {
      color: colors.muted,
    },

    messageTime: {
      marginTop: 5,
      fontSize: 10,
      color: colors.muted,
      alignSelf: "flex-end",
    },
    messageTimeMe: {
      color: colors.accentForeground,
      opacity: 0.8,
    },
    messageStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
      marginTop: 5,
    },

    composerOuter: {
      position: "absolute",
      left: 0,
      right: 0,
      paddingHorizontal: 12,
    },
    composerWrap: {
      minHeight: COMPOSER_BAR_HEIGHT,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    attachButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    inputWrap: {
      flex: 1,
      marginHorizontal: 8,
      minHeight: 42,
      borderRadius: 21,
      backgroundColor: colors.surfaceSecondary,
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    input: {
      color: colors.foreground,
      fontSize: 14,
      paddingVertical: Platform.OS === "ios" ? 10 : 6,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    drawerBackdrop: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: "flex-end",
    },
    drawerSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 10,
      paddingBottom: 26,
      paddingHorizontal: 18,
    },
    drawerHandle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 18,
    },
    drawerGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    drawerGridItem: {
      alignItems: "center",
      width: 90,
    },
    drawerGridIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    drawerGridLabel: {
      fontSize: 12,
      color: colors.foreground,
      textAlign: "center",
    },
  });
}