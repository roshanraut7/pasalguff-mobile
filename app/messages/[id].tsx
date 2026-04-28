import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
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

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  getConversationById,
  MESSAGES_BY_CONVERSATION,
  type ChatMessage,
} from "@/mocks/messages.mock";

type DrawerAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const DRAWER_ACTIONS: DrawerAction[] = [
  { id: "document", label: "Document", icon: "document-text-outline" },
  { id: "camera", label: "Camera", icon: "camera-outline" },
  { id: "gallery", label: "Gallery", icon: "images-outline" },
  { id: "location", label: "Location", icon: "location-outline" },
  { id: "recommendation", label: "Recommendation", icon: "sparkles-outline" },
];

const COMPOSER_BAR_HEIGHT = 68;
const ANDROID_KEYBOARD_EXTRA = 40;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [message, setMessage] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = getConversationById(id ?? "");
  const messages = MESSAGES_BY_CONVERSATION[id ?? ""] ?? [];

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

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

  if (!conversation) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

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
      setMessage("Photo selected from camera");
    }
  };

  const pickFromGallery = async () => {
    setDrawerVisible(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setMessage("Media selected from gallery");
    }
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
      setMessage("I want to send a document.");
    } else if (actionId === "location") {
      setMessage("My location is ready to share.");
    } else if (actionId === "recommendation") {
      setMessage("Can you recommend a good supplier for this?");
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
        Platform.OS === "android" ? 180 : 80
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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>

          <Image source={{ uri: conversation.avatar }} style={styles.headerAvatar} />

          <View style={styles.headerMeta}>
            <Text numberOfLines={1} style={styles.headerName}>
              {conversation.name}
            </Text>
            <Text style={styles.headerStatus}>
              {conversation.isOnline ? "Online" : "Offline"}
            </Text>
          </View>

          <Pressable style={styles.headerAction}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView
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
        >
          {renderMessages(messages, styles)}
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
            >
              <Ionicons name="add" size={22} color={colors.accent} />
            </Pressable>

            <View style={styles.inputWrap}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                multiline={false}
                returnKeyType="send"
                underlineColorAndroid="transparent"
              />
            </View>

            <Pressable style={styles.sendButton}>
              <Ionicons
                name="send"
                size={18}
                color={colors.accentForeground}
              />
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
  styles: ReturnType<typeof createStyles>
) {
  let lastDateLabel = "";

  return messages.map((item) => {
    const date = new Date(item.timestamp);
    const currentDateLabel = date.toDateString();
    const showDate = currentDateLabel !== lastDateLabel;
    lastDateLabel = currentDateLabel;

    return (
      <View key={item.id}>
        {showDate ? (
          <View style={styles.dateWrap}>
            <Text style={styles.dateText}>
              {formatDateLabel(item.timestamp)}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.bubbleRow,
            item.sender === "me" ? styles.bubbleRowMe : styles.bubbleRowOther,
          ]}
        >
          <View
            style={[
              styles.bubble,
              item.sender === "me" ? styles.bubbleMe : styles.bubbleOther,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.sender === "me"
                  ? styles.bubbleTextMe
                  : styles.bubbleTextOther,
              ]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    );
  });
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
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      backgroundColor: colors.surfaceSecondary,
    },
    headerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 10,
    },
    headerMeta: {
      flex: 1,
    },
    headerName: {
      fontSize: 16,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },
    headerStatus: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },
    headerAction: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    messagesScroll: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 14,
      paddingVertical: 16,
    },
    dateWrap: {
      alignItems: "center",
      marginVertical: 10,
    },
    dateText: {
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
      color: colors.muted,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    bubbleRow: {
      flexDirection: "row",
      marginBottom: 10,
    },
    bubbleRowMe: {
      justifyContent: "flex-end",
    },
    bubbleRowOther: {
      justifyContent: "flex-start",
    },
    bubble: {
      maxWidth: "78%",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    bubbleMe: {
      backgroundColor: colors.accent,
      borderBottomRightRadius: 6,
    },
    bubbleOther: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 6,
    },
    bubbleText: {
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "Poppins_400Regular",
    },
    bubbleTextMe: {
      color: colors.accentForeground,
    },
    bubbleTextOther: {
      color: colors.foreground,
    },
    composerOuter: {
      position: "absolute",
      left: 0,
      right: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: 12,
      paddingHorizontal: 14,
      zIndex: 20,
      elevation: 20,
    },
    composerWrap: {
      height: COMPOSER_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    attachButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputWrap: {
      flex: 1,
      height: 44,
      borderRadius: 22,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
    },
    input: {
      height: 20,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      color: colors.foreground,
      padding: 0,
      margin: 0,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    drawerBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.backdrop,
    },
    drawerSheet: {
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 10,
      paddingBottom: 24,
      paddingHorizontal: 18,
      backgroundColor: colors.overlay,
    },
    drawerHandle: {
      alignSelf: "center",
      width: 44,
      height: 4,
      borderRadius: 999,
      marginBottom: 18,
      backgroundColor: colors.border,
    },
    drawerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      rowGap: 18,
    },
    drawerGridItem: {
      width: "25%",
      alignItems: "center",
      justifyContent: "center",
    },
    drawerGridIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      marginBottom: 8,
    },
    drawerGridLabel: {
      textAlign: "center",
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_400Regular",
      color: colors.foreground,
    },
  });
}