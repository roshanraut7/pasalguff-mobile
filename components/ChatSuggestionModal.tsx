import React, { memo, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { ChatSuggestionItem } from "@/store/api/chatApi";

type ChatSuggestionModalProps = {
  visible: boolean;
  searchValue: string;
  suggestions: ChatSuggestionItem[];
  isLoading: boolean;
  isCreatingChat: boolean;
  loadingUserId?: string | null;
  errorText?: string | null;
  onChangeSearch: (value: string) => void;
  onClose: () => void;
  onPressUser: (item: ChatSuggestionItem) => void;
};

function getUserName(item: ChatSuggestionItem) {
  const user = item.user;

  return (
    user.name ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.businessName ||
    "Unknown User"
  );
}

function getAvatarUrl(name: string, image?: string | null) {
  const absoluteImage = toAbsoluteFileUrl(image);

  if (absoluteImage) return absoluteImage;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}`;
}

function getRelationshipLabel(item: ChatSuggestionItem) {
  if (item.existingChatId) return "Existing chat";

  if (item.relationship?.isMutual) return "You follow each other";

  if (item.relationship?.isFollowing) return "Following";

  if (item.relationship?.followsMe) return "Follows you";

  return "Suggestion";
}

function canStartMessage(item: ChatSuggestionItem) {
  return Boolean(item.existingChatId) || Boolean(item.relationship?.canMessage);
}

function ChatSuggestionModal({
  visible,
  searchValue,
  suggestions,
  isLoading,
  isCreatingChat,
  loadingUserId,
  errorText,
  onChangeSearch,
  onClose,
  onPressUser,
}: ChatSuggestionModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>New Message</Text>
              <Text style={styles.subtitle}>
                Search followers and following
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={21} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.muted} />

            <TextInput
              value={searchValue}
              onChangeText={onChangeSearch}
              placeholder="Search people"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />

            {searchValue.length > 0 ? (
              <Pressable onPress={() => onChangeSearch("")} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {errorText ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}

          {isLoading && suggestions.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.centerText}>Loading suggestions...</Text>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.user.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="people-outline"
                      size={26}
                      color={colors.accent}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>No users found</Text>

                  <Text style={styles.centerText}>
                    Try searching a follower or someone you follow.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const name = getUserName(item);
                const avatar = getAvatarUrl(name, item.user.image);
                const relationshipLabel = getRelationshipLabel(item);
                const canMessage = canStartMessage(item);
                const isRowLoading =
                  isCreatingChat && loadingUserId === item.user.id;

                return (
                  <Pressable
                    disabled={!canMessage || isRowLoading}
                    onPress={() => onPressUser(item)}
                    style={[
                      styles.userRow,
                      !canMessage && styles.userRowDisabled,
                    ]}
                  >
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: avatar }} style={styles.avatar} />

                      {item.user.isOnline ? (
                        <View style={styles.onlineDot} />
                      ) : null}
                    </View>

                    <View style={styles.userMiddle}>
                      <Text numberOfLines={1} style={styles.userName}>
                        {name}
                      </Text>

                      <Text numberOfLines={1} style={styles.userSubText}>
                        {item.user.businessName ||
                          item.user.businessType ||
                          relationshipLabel}
                      </Text>

                      <View style={styles.chip}>
                        <Text style={styles.chipText}>
                          {relationshipLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.userAction}>
                      {isRowLoading ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : canMessage ? (
                        <View style={styles.messageButton}>
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={15}
                            color={colors.accentForeground}
                          />
                        </View>
                      ) : (
                        <View style={styles.lockButton}>
                          <Ionicons
                            name="lock-closed-outline"
                            size={15}
                            color={colors.muted}
                          />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default memo(ChatSuggestionModal);

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.backdrop ?? "rgba(0,0,0,0.45)",
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },

    sheet: {
      maxHeight: "88%",
      minHeight: "62%",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 20,
    },

    dragHandle: {
      alignSelf: "center",
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 14,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },

    title: {
      color: colors.foreground,
      fontSize: 22,
      fontWeight: "900",
    },

    subtitle: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 13,
      fontWeight: "500",
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    searchBox: {
      height: 48,
      borderRadius: 18,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    searchInput: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      fontWeight: "500",
      paddingVertical: 0,
    },

    errorText: {
      marginTop: 10,
      color: colors.danger,
      fontSize: 13,
      fontWeight: "600",
    },

    listContent: {
      paddingTop: 12,
      paddingBottom: 28,
    },

    centerBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 54,
      paddingHorizontal: 24,
    },

    centerText: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
    },

    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    emptyTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 16,
      fontWeight: "800",
    },

    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    userRowDisabled: {
      opacity: 0.55,
    },

    avatarWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      position: "relative",
      backgroundColor: colors.surfaceSecondary,
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

    userMiddle: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0,
    },

    userName: {
      color: colors.foreground,
      fontSize: 15,
      fontWeight: "800",
    },

    userSubText: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      fontWeight: "500",
    },

    chip: {
      marginTop: 6,
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
      backgroundColor: colors.surfaceSecondary,
    },

    chipText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
    },

    userAction: {
      width: 40,
      alignItems: "flex-end",
      justifyContent: "center",
    },

    messageButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    lockButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
  });
}