import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchField } from "heroui-native";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  type ChatSuggestionItem,
  type ChatUser,
  useCreateGroupChatMutation,
  useLazySearchChatSuggestionsQuery,
  useUploadChatFileMutation,
} from "@/store/api/chatApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

type Step = "select" | "details";

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

export default function CreateGroupScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState<Step>("select");
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Map<string, ChatUser>>(
    new Map(),
  );

  const [groupName, setGroupName] = useState("");
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [searchChatSuggestions, { data: suggestionsResponse, isFetching }] =
    useLazySearchChatSuggestionsQuery();

  const [createGroupChat, { isLoading: isCreatingGroup }] =
    useCreateGroupChatMutation();

  const [uploadChatFile] = useUploadChatFileMutation();

  const suggestions = suggestionsResponse?.data ?? [];

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchChatSuggestions({ search: search.trim(), limit: 50 });
    }, 250);

    return () => clearTimeout(timer);
  }, [search, searchChatSuggestions]);

  const dedupedSuggestions = useMemo(() => {
    const seen = new Set<string>();

    return suggestions.filter((item: ChatSuggestionItem) => {
      if (seen.has(item.user.id)) return false;

      seen.add(item.user.id);
      return true;
    });
  }, [suggestions]);

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

  const handlePickAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to set a group photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    setLocalAvatarUri(asset.uri);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();

      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName || "group-avatar.jpg",
        type: asset.mimeType || "image/jpeg",
      } as any);

      const uploaded = await uploadChatFile(formData).unwrap();

      setAvatarUrl(uploaded.url);
    } catch (error) {
      console.log("Group avatar upload failed:", error);
      Alert.alert("Upload failed", "Could not upload group photo. Try again.");
      setLocalAvatarUri(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [uploadChatFile]);

  const handleGoToDetails = useCallback(() => {
    if (selectedList.length === 0) {
      Alert.alert("Select members", "Pick at least one person to add.");
      return;
    }

    setStep("details");
  }, [selectedList.length]);

  const handleCreateGroup = useCallback(async () => {
    if (isUploadingAvatar) {
      Alert.alert("Please wait", "Group photo is still uploading.");
      return;
    }

    try {
      const chat = await createGroupChat({
        name: groupName.trim() || undefined,
        avatarImage: avatarUrl || undefined,
        memberIds: selectedList.map((user) => user.id),
      }).unwrap();

      router.replace(`/messages/${chat.id}`);
    } catch (error: any) {
      console.log("Create group chat failed:", error);
      Alert.alert(
        "Could not create group",
        error?.data?.message ?? "Please try again.",
      );
    }
  }, [avatarUrl, createGroupChat, groupName, isUploadingAvatar, selectedList]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() =>
              step === "details" ? setStep("select") : router.back()
            }
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>

          <Text style={styles.title}>
            {step === "select" ? "New Group" : "Group Details"}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {step === "select" ? (
          <>
            <Text style={styles.subtitle}>
              Add people you follow or who follow you
            </Text>

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
                    Follow people to add them to a group.
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
              disabled={selectedList.length === 0}
              onPress={handleGoToDetails}
              style={[
                styles.primaryButton,
                selectedList.length === 0 && styles.primaryButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                Next{selectedList.length > 0 ? ` (${selectedList.length})` : ""}
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.detailsWrap}>
            <Pressable onPress={handlePickAvatar} style={styles.avatarPicker}>
              {localAvatarUri ? (
                <Image
                  source={{ uri: localAvatarUri }}
                  style={styles.avatarPickerImage}
                />
              ) : (
                <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons
                    name="camera-outline"
                    size={26}
                    color={colors.muted}
                  />
                </View>
              )}

              {isUploadingAvatar ? (
                <View style={styles.avatarPickerOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </Pressable>

            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              placeholderTextColor={colors.muted}
              style={styles.nameInput}
              maxLength={60}
            />

            <Text style={styles.detailsSubtitle}>
              {selectedList.length} member{selectedList.length === 1 ? "" : "s"}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {selectedList.map((user, index) => (
                <View
                  key={user.id}
                  style={[
                    styles.row,
                    index !== selectedList.length - 1 && styles.rowBorder,
                  ]}
                >
                  <Image
                    source={{ uri: getAvatarUrl(getUserName(user), user.image) }}
                    style={styles.avatar}
                  />

                  <View style={styles.rowMiddle}>
                    <Text numberOfLines={1} style={styles.rowName}>
                      {getUserName(user)}
                    </Text>
                  </View>

                  <Pressable onPress={() => removeSelectedUser(user.id)}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <Pressable
              disabled={isCreatingGroup || isUploadingAvatar}
              onPress={handleCreateGroup}
              style={[
                styles.primaryButton,
                (isCreatingGroup || isUploadingAvatar) &&
                  styles.primaryButtonDisabled,
              ]}
            >
              {isCreatingGroup ? (
                <ActivityIndicator color={colors.accentForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>Create Group</Text>
              )}
            </Pressable>
          </View>
        )}
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
    subtitle: { marginTop: 8, fontSize: 14, color: colors.muted },
    searchWrap: { marginTop: 12, marginBottom: 8 },
    chipRow: { marginTop: 12, maxHeight: 76 },
    chipRowContent: { gap: 10, paddingRight: 12 },
    chip: {
      alignItems: "center",
      width: 60,
    },
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
    detailsWrap: { flex: 1, alignItems: "center" },
    avatarPicker: {
      marginTop: 16,
      width: 96,
      height: 96,
      borderRadius: 48,
      alignSelf: "center",
    },
    avatarPickerImage: { width: "100%", height: "100%", borderRadius: 48 },
    avatarPickerPlaceholder: {
      width: "100%",
      height: "100%",
      borderRadius: 48,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    avatarPickerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 48,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    nameInput: {
      marginTop: 16,
      width: "100%",
      height: 48,
      borderRadius: 14,
      paddingHorizontal: 14,
      backgroundColor: colors.surfaceSecondary,
      color: colors.foreground,
      fontSize: 15,
    },
    detailsSubtitle: {
      marginTop: 16,
      marginBottom: 4,
      alignSelf: "flex-start",
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
    },
  });
}