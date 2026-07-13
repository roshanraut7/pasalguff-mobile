// app/pages/add-group-members.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchField } from "heroui-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  type ChatSuggestionItem,
  type ChatUser,
  useAddGroupMemberMutation,
  useGetChatQuery,
  useLazySearchChatSuggestionsQuery,
} from "@/store/api/chatApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

function getAvatarUrl(name: string, image?: string | null) {
  const absoluteImage = toAbsoluteFileUrl(image);

  if (absoluteImage) return absoluteImage;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}`;
}

function getUserName(user: ChatUser) {
  return user.name || user.businessName || "Unknown User";
}

export default function AddGroupMembersScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Map<string, ChatUser>>(
    new Map(),
  );

  const { data: chat, refetch: refetchChat } = useGetChatQuery(chatId!, {
    skip: !chatId,
  });

  const [searchChatSuggestions, { data: suggestionsResponse, isFetching }] =
    useLazySearchChatSuggestionsQuery();

  const [addGroupMember, { isLoading: isAdding }] =
    useAddGroupMemberMutation();

  const suggestions = suggestionsResponse?.data ?? [];

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchChatSuggestions({ search: search.trim(), limit: 50 });
    }, 250);

    return () => clearTimeout(timer);
  }, [search, searchChatSuggestions]);

  // exclude people already in the group
  const existingMemberIds = useMemo(() => {
    return new Set((chat?.members ?? []).map((m) => m.userId));
  }, [chat]);

  const dedupedSuggestions = useMemo(() => {
    const seen = new Set<string>();

    return suggestions.filter((item: ChatSuggestionItem) => {
      if (existingMemberIds.has(item.user.id)) return false;
      if (seen.has(item.user.id)) return false;

      seen.add(item.user.id);
      return true;
    });
  }, [suggestions, existingMemberIds]);

  const toggleSelectUser = useCallback((user: ChatUser) => {
    setSelectedUsers((prev) => {
      const next = new Map(prev);

      if (next.has(user.id)) {
        next.delete(user.id);
      } else {
        next.set(user.id, user);
      }

      return next;
    });
  }, []);

  const removeSelectedUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const selectedList = useMemo(
    () => Array.from(selectedUsers.values()),
    [selectedUsers],
  );

  const handleAddMembers = useCallback(async () => {
    if (!chatId) return;

    if (selectedList.length === 0) {
      Alert.alert("Select people", "Pick at least one person to add.");
      return;
    }

    try {
      // Backend endpoint adds one member per call, so add sequentially
      for (const user of selectedList) {
        await addGroupMember({ chatId, userId: user.id }).unwrap();
      }

      await refetchChat();
      router.back();
    } catch (error: any) {
      console.log("Add group members failed:", error);
      Alert.alert(
        "Could not add members",
        error?.data?.message ?? "Please try again.",
      );
    }
  }, [addGroupMember, chatId, selectedList, refetchChat]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>

          <Text style={styles.title}>Add Members</Text>

          <View style={styles.headerSpacer} />
        </View>

        {selectedList.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
            contentContainerStyle={styles.chipRowContent}
          >
            {selectedList.map((user) => (
              <View key={user.id} style={styles.chip}>
                <Image
                  source={{ uri: getAvatarUrl(getUserName(user), user.image) }}
                  style={styles.chipAvatar}
                />
                <Text numberOfLines={1} style={styles.chipName}>
                  {getUserName(user)}
                </Text>
                <Pressable
                  onPress={() => removeSelectedUser(user.id)}
                  style={styles.chipRemove}
                >
                  <Ionicons name="close" size={12} color={colors.background} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.searchWrap}>
          <SearchField value={search} onChange={setSearch}>
            <SearchField.Group className="rounded-[18px] bg-surface px-3 py-2">
              <SearchField.SearchIcon className="px-3" />
              <SearchField.Input placeholder="Search people" />
              <SearchField.ClearButton className="mr-2 px-2" />
            </SearchField.Group>
          </SearchField>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {isFetching && dedupedSuggestions.length === 0 ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator />
            </View>
          ) : dedupedSuggestions.length === 0 ? (
            <View style={styles.centerWrap}>
              <Text style={styles.emptyTitle}>No people found</Text>
              <Text style={styles.emptyText}>
                Everyone you follow is already in this group.
              </Text>
            </View>
          ) : (
            dedupedSuggestions.map((item, index) => {
              const isSelected = selectedUsers.has(item.user.id);
              const name = getUserName(item.user);

              return (
                <Pressable
                  key={item.user.id}
                  onPress={() => toggleSelectUser(item.user)}
                  style={[
                    styles.row,
                    index !== dedupedSuggestions.length - 1 &&
                      styles.rowBorder,
                  ]}
                >
                  <Image
                    source={{ uri: getAvatarUrl(name, item.user.image) }}
                    style={styles.avatar}
                  />

                  <View style={styles.rowMiddle}>
                    <Text numberOfLines={1} style={styles.rowName}>
                      {name}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxChecked,
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.accentForeground}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Pressable
          disabled={selectedList.length === 0 || isAdding}
          onPress={handleAddMembers}
          style={[
            styles.primaryButton,
            (selectedList.length === 0 || isAdding) &&
              styles.primaryButtonDisabled,
          ]}
        >
          {isAdding ? (
            <ActivityIndicator color={colors.accentForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>
              Add{selectedList.length > 0 ? ` (${selectedList.length})` : ""}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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
    },
    headerSpacer: { width: 38, height: 38 },
    title: { fontSize: 18, fontWeight: "800", color: colors.foreground },
    chipRow: { marginTop: 12, maxHeight: 76 },
    chipRowContent: { gap: 10, paddingRight: 12 },
    chip: { alignItems: "center", width: 60 },
    chipAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceSecondary,
    },
    chipName: {
      marginTop: 4,
      fontSize: 11,
      color: colors.foreground,
      maxWidth: 58,
      textAlign: "center",
    },
    chipRemove: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.foreground,
      alignItems: "center",
      justifyContent: "center",
    },
    searchWrap: { marginTop: 12, marginBottom: 8 },
    listContent: { paddingBottom: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceSecondary,
    },
    rowMiddle: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    centerWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    emptyText: {
      marginTop: 6,
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
    },
    primaryButton: {
      marginTop: 8,
      marginBottom: 12,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    primaryButtonDisabled: { opacity: 0.5 },
    primaryButtonText: {
      color: colors.accentForeground,
      fontSize: 15,
      fontWeight: "800",
    },
  });
}