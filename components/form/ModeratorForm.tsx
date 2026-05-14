import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
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
import { Avatar, Checkbox } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { z } from "zod/v4";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetCommunityMembersQuery } from "@/store/api/communityApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityMemberItem } from "@/types/community";

const permissionOptions = [
  {
    key: "canEditCommunity",
    title: "Edit community",
    icon: "create-outline",
  },
  {
    key: "canManageMembers",
    title: "Manage members",
    icon: "people-outline",
  },
  {
    key: "canManagePosts",
    title: "Manage posts",
    icon: "newspaper-outline",
  },
  {
    key: "canManageComments",
    title: "Manage comments",
    icon: "chatbubbles-outline",
  },
  {
    key: "canManageReports",
    title: "Manage reports",
    icon: "flag-outline",
  },
] as const;

type PermissionKey = (typeof permissionOptions)[number]["key"];

export type ModeratorPermissionValues = {
  targetUserId?: string;
  canEditCommunity: boolean;
  canManageMembers: boolean;
  canManagePosts: boolean;
  canManageComments: boolean;
  canManageReports: boolean;
};

type ModeratorPermissionFormMode = "assign" | "edit";

type ModeratorPermissionFormProps = {
  communityId: string;
  mode: ModeratorPermissionFormMode;
  isVisible?: boolean;
  defaultValues?: Partial<ModeratorPermissionValues>;
  title?: string;
  subtitle?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: ModeratorPermissionValues) => Promise<void> | void;
};

const MEMBER_PAGE_SIZE = 20;

const updateModeratorPermissionSchema = z.object({
  targetUserId: z.string().trim().optional(),
  canEditCommunity: z.boolean(),
  canManageMembers: z.boolean(),
  canManagePosts: z.boolean(),
  canManageComments: z.boolean(),
  canManageReports: z.boolean(),
});

const assignModeratorPermissionSchema = updateModeratorPermissionSchema.extend({
  targetUserId: z.string().trim().min(1, "Please select a member first."),
});

const emptyValues: ModeratorPermissionValues = {
  targetUserId: "",
  canEditCommunity: false,
  canManageMembers: false,
  canManagePosts: false,
  canManageComments: false,
  canManageReports: false,
};

function getUserDisplayName(member: CommunityMemberItem) {
  const fullName = [member.user?.firstName, member.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    member.user?.name ||
    fullName ||
    member.user?.businessName ||
    member.user?.email ||
    "Unknown member"
  );
}

function getUserSubtitle(member: CommunityMemberItem) {
  return member.user?.email || member.role || "Community member";
}

function getInitials(name?: string | null) {
  if (!name) return "U";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getMemberKey(member: CommunityMemberItem) {
  return member.userId || member.user?.id || member.id;
}

function mergeUniqueMembers(
  previous: CommunityMemberItem[],
  incoming: CommunityMemberItem[],
) {
  const map = new Map<string, CommunityMemberItem>();

  for (const member of previous) {
    map.set(getMemberKey(member), member);
  }

  for (const member of incoming) {
    map.set(getMemberKey(member), member);
  }

  return Array.from(map.values());
}

function isNormalActiveMember(member: CommunityMemberItem) {
  return (
    member.role === "MEMBER" &&
    member.status !== "LEFT" &&
    member.status !== "BANNED"
  );
}

type MemberPickerModalProps = {
  visible: boolean;
  members: CommunityMemberItem[];
  selectedUserId?: string;
  searchValue: string;
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  error?: unknown;
  onSearchChange: (value: string) => void;
  onSelect: (member: CommunityMemberItem) => void;
  onClose: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
};

function MemberPickerModal({
  visible,
  members,
  selectedUserId,
  searchValue,
  isLoading,
  isFetching,
  hasNextPage,
  error,
  onSearchChange,
  onSelect,
  onClose,
  onRefresh,
  onLoadMore,
}: MemberPickerModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderMemberItem = useCallback(
    ({ item }: { item: CommunityMemberItem }) => {
      const name = getUserDisplayName(item);
      const imageUrl = toAbsoluteFileUrl(item.user?.image);
      const memberUserId = getMemberKey(item);
      const selected = memberUserId === selectedUserId;
      const canAssign = isNormalActiveMember(item);

      return (
        <Pressable
          disabled={!canAssign}
          onPress={() => onSelect(item)}
          style={({ pressed }) => [
            styles.pickerMemberRow,
            selected && styles.pickerMemberRowSelected,
            !canAssign && styles.memberRowDisabled,
            pressed && canAssign ? { opacity: 0.75 } : null,
          ]}
        >
          <Avatar alt={name} size="md" variant="soft" color="success">
            {imageUrl ? <Avatar.Image source={{ uri: imageUrl }} /> : null}

            <Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
          </Avatar>

          <View style={styles.memberTextWrap}>
            <Text numberOfLines={1} style={styles.memberName}>
              {name}
            </Text>

            <Text numberOfLines={1} style={styles.memberSubtitle}>
              {getUserSubtitle(item)}
            </Text>
          </View>

          {canAssign ? (
            <Ionicons
              name={selected ? "checkmark-circle" : "ellipse-outline"}
              size={23}
              color={selected ? colors.accent : colors.muted}
            />
          ) : (
            <Text style={styles.memberBadge}>{item.role}</Text>
          )}
        </Pressable>
      );
    },
    [
      colors.accent,
      colors.muted,
      onSelect,
      selectedUserId,
      styles.memberBadge,
      styles.memberName,
      styles.memberRowDisabled,
      styles.memberSubtitle,
      styles.memberTextWrap,
      styles.pickerMemberRow,
      styles.pickerMemberRowSelected,
    ],
  );

  const listEmptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.pickerEmptyBox}>
          <ActivityIndicator size="small" color={colors.accent} />

          <Text style={styles.emptySubtitle}>Loading members...</Text>
        </View>
      );
    }

    return (
      <View style={styles.pickerEmptyBox}>
        <Ionicons name="people-outline" size={24} color={colors.muted} />

        <Text style={styles.emptyTitle}>No active members found</Text>

        <Text style={styles.emptySubtitle}>
          Try another search or pull down to refresh.
        </Text>
      </View>
    );
  }, [
    colors.accent,
    colors.muted,
    isLoading,
    styles.emptySubtitle,
    styles.emptyTitle,
    styles.pickerEmptyBox,
  ]);

  const listFooterComponent = useMemo(() => {
    if (isFetching && members.length > 0) {
      return (
        <View style={styles.pickerFooter}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    if (hasNextPage) {
      return (
        <View style={styles.pickerFooter}>
          <Text style={styles.loadMoreText}>Scroll for more members</Text>
        </View>
      );
    }

    return <View style={styles.pickerFooter} />;
  }, [
    colors.accent,
    hasNextPage,
    isFetching,
    members.length,
    styles.loadMoreText,
    styles.pickerFooter,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalKeyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable onPress={onClose} style={styles.pickerBackdropPressable} />

          <View style={styles.pickerOverlay}>
            <View style={styles.pickerHeader}>
  <View style={styles.pickerHeaderText}>
    <Text numberOfLines={1} style={styles.pickerTitle}>
      Choose active member
    </Text>

    <Text numberOfLines={2} style={styles.pickerSubtitle}>
      Search and select a member to assign as moderator.
    </Text>
  </View>

  <Pressable onPress={onClose} style={styles.closeButton}>
    <Ionicons name="close" size={20} color={colors.foreground} />
  </Pressable>
</View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={colors.muted} />

              <TextInput
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder="Search member by name, email or business"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="search"
                style={styles.searchInput}
              />

              {searchValue ? (
                <Pressable onPress={() => onSearchChange("")} hitSlop={10}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              ) : null}
            </View>

            {error ? (
              <View style={styles.inlineErrorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={colors.danger}
                />

                <Text style={styles.inlineErrorText}>
                  Failed to load members. Pull down to refresh.
                </Text>
              </View>
            ) : null}

            <FlatList
              data={members}
              keyExtractor={(item) => getMemberKey(item)}
              renderItem={renderMemberItem}
              ListEmptyComponent={listEmptyComponent}
              ListFooterComponent={listFooterComponent}
              refreshControl={
                <RefreshControl
                  refreshing={isFetching && members.length === 0}
                  onRefresh={onRefresh}
                  tintColor={colors.accent}
                />
              }
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.35}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerListContent}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ModeratorPermissionForm({
  communityId,
  mode,
  isVisible = true,
  defaultValues,
  title,
  subtitle,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: ModeratorPermissionFormProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [values, setValues] = useState<ModeratorPermissionValues>({
    ...emptyValues,
    ...defaultValues,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof ModeratorPermissionValues, string>>
  >({});

  const [generalError, setGeneralError] = useState("");

  const [memberPickerVisible, setMemberPickerVisible] = useState(false);
  const [selectedMemberSnapshot, setSelectedMemberSnapshot] =
    useState<CommunityMemberItem | null>(null);

  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [memberItems, setMemberItems] = useState<CommunityMemberItem[]>([]);

  const shouldFetchMembers =
    mode === "assign" &&
    isVisible &&
    memberPickerVisible &&
    Boolean(communityId);

  const {
    data: membersResponse,
    isLoading: isLoadingMembers,
    isFetching: isFetchingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useGetCommunityMembersQuery(
    {
      communityId,
      page: memberPage,
      limit: MEMBER_PAGE_SIZE,
      search: debouncedMemberSearch || undefined,
      status: "ACTIVE",
    },
    {
      skip: !shouldFetchMembers,
      refetchOnMountOrArgChange: true,
    },
  );

  const totalPages = Math.max(1, membersResponse?.meta?.totalPages ?? 1);
  const hasNextMemberPage = memberPage < totalPages;

  const selectedMemberName = useMemo(() => {
    if (selectedMemberSnapshot) {
      return getUserDisplayName(selectedMemberSnapshot);
    }

    if (values.targetUserId) {
      return "Selected member";
    }

    return "";
  }, [selectedMemberSnapshot, values.targetUserId]);

  useEffect(() => {
    setValues({
      ...emptyValues,
      ...defaultValues,
    });

    setErrors({});
    setGeneralError("");
    setSelectedMemberSnapshot(null);
  }, [mode, defaultValues, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setMemberPickerVisible(false);
      setMemberSearch("");
      setDebouncedMemberSearch("");
      setMemberPage(1);
      setMemberItems([]);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!memberPickerVisible) return;

    setMemberPage(1);
    setMemberItems([]);
  }, [memberPickerVisible, communityId]);

  useEffect(() => {
    if (!memberPickerVisible) return;

    const timer = setTimeout(() => {
      const nextSearch = memberSearch.trim();

      setDebouncedMemberSearch((previous) => {
        if (previous === nextSearch) return previous;
        return nextSearch;
      });

      setMemberPage((previous) => {
        if (previous === 1) return previous;
        return 1;
      });

      setMemberItems([]);
    }, 450);

    return () => clearTimeout(timer);
  }, [memberSearch, memberPickerVisible]);

  useEffect(() => {
    const incoming = membersResponse?.data ?? [];

    if (!shouldFetchMembers) return;

    setMemberItems((previous) => {
      if (memberPage === 1) {
        return incoming;
      }

      return mergeUniqueMembers(previous, incoming);
    });
  }, [membersResponse?.data, memberPage, shouldFetchMembers]);

  const openMemberPicker = useCallback(() => {
    if (isSubmitting) return;

    setMemberPickerVisible(true);
  }, [isSubmitting]);

  const closeMemberPicker = useCallback(() => {
    setMemberPickerVisible(false);
    setMemberSearch("");
    setDebouncedMemberSearch("");
    setMemberPage(1);
    setMemberItems([]);
  }, []);

  const handleMemberSearchChange = useCallback((text: string) => {
    setMemberSearch(text);
  }, []);

  const handleSelectMember = useCallback(
    (member: CommunityMemberItem) => {
      if (!isNormalActiveMember(member) || isSubmitting) return;

      const targetUserId = getMemberKey(member);

      setValues((previous) => ({
        ...previous,
        targetUserId,
      }));

      setSelectedMemberSnapshot(member);

      setErrors((previous) => ({
        ...previous,
        targetUserId: undefined,
      }));

      closeMemberPicker();
    },
    [closeMemberPicker, isSubmitting],
  );

  const setPermission = useCallback((key: PermissionKey, nextValue: boolean) => {
    setValues((previous) => ({
      ...previous,
      [key]: nextValue,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: undefined,
    }));
  }, []);

  const handleRefreshMembers = useCallback(() => {
    if (!shouldFetchMembers) return;

    if (memberPage === 1) {
      refetchMembers();
      return;
    }

    setMemberPage(1);
    setMemberItems([]);
  }, [memberPage, refetchMembers, shouldFetchMembers]);

  const handleLoadMoreMembers = useCallback(() => {
    if (!hasNextMemberPage || isFetchingMembers || isLoadingMembers) return;

    setMemberPage((previous) => previous + 1);
  }, [hasNextMemberPage, isFetchingMembers, isLoadingMembers]);

  const handleSubmit = useCallback(async () => {
    setErrors({});
    setGeneralError("");

    const schema =
      mode === "assign"
        ? assignModeratorPermissionSchema
        : updateModeratorPermissionSchema;

    const result = schema.safeParse(values);

    if (!result.success) {
      const nextErrors: Partial<Record<keyof ModeratorPermissionValues, string>> =
        {};

      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ModeratorPermissionValues | undefined;

        if (key) {
          nextErrors[key] = issue.message;
        } else {
          setGeneralError(issue.message);
        }
      }

      setErrors(nextErrors);
      return;
    }

    await onSubmit(result.data);
  }, [mode, onSubmit, values]);

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name={
                mode === "assign"
                  ? "shield-checkmark-outline"
                  : "options-outline"
              }
              size={21}
              color={colors.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {title ??
                (mode === "assign"
                  ? "Assign moderator"
                  : "Edit permissions")}
            </Text>

            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        {mode === "assign" ? (
          <View style={styles.memberSection}>
            <Text style={styles.sectionTitle}>Choose active member</Text>

            <Pressable
              disabled={isSubmitting}
              onPress={openMemberPicker}
              style={({ pressed }) => [
                styles.dropdownButton,
                values.targetUserId && styles.dropdownButtonSelected,
                pressed && !isSubmitting ? { opacity: 0.75 } : null,
              ]}
            >
              <View style={styles.dropdownIcon}>
                <Ionicons
                  name={values.targetUserId ? "person" : "person-outline"}
                  size={18}
                  color={values.targetUserId ? colors.accent : colors.muted}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dropdownTitle,
                    !values.targetUserId && { color: colors.placeholder },
                  ]}
                >
                  {selectedMemberName || "Search and select member"}
                </Text>

                <Text numberOfLines={1} style={styles.dropdownSubtitle}>
                  Tap to open searchable member dropdown
                </Text>
              </View>

              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </Pressable>

            {errors.targetUserId ? (
              <Text style={styles.errorText}>{errors.targetUserId}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.permissionsSection}>
          <Text style={styles.sectionTitle}>Moderator permissions</Text>

          <View style={styles.permissionsWrap}>
            {permissionOptions.map((option) => {
              const selected = Boolean(values[option.key]);

              return (
                <Pressable
                  key={option.key}
                  disabled={isSubmitting}
                  onPress={() => setPermission(option.key, !selected)}
                  style={({ pressed }) => [
                    styles.permissionRow,
                    selected && styles.permissionRowSelected,
                    pressed && !isSubmitting ? { opacity: 0.75 } : null,
                  ]}
                >
                  <View style={styles.permissionIcon}>
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={selected ? colors.accent : colors.muted}
                    />
                  </View>

                  <Text numberOfLines={1} style={styles.permissionTitle}>
                    {option.title}
                  </Text>

                  <View pointerEvents="none">
                    <Checkbox
                      isSelected={selected}
                      isInvalid={Boolean(errors[option.key])}
                      isDisabled={isSubmitting}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {generalError ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.danger}
            />

            <Text style={styles.errorBoxText}>{generalError}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Pressable
            disabled={isSubmitting}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && !isSubmitting ? { opacity: 0.75 } : null,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !isSubmitting ? { opacity: 0.8 } : null,
              isSubmitting ? { opacity: 0.65 } : null,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.accentForeground} />
            ) : (
              <Ionicons
                name={mode === "assign" ? "person-add-outline" : "save-outline"}
                size={18}
                color={colors.accentForeground}
              />
            )}

            <Text style={styles.submitText}>
              {mode === "assign" ? "Assign" : "Save"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <MemberPickerModal
        visible={memberPickerVisible}
        members={memberItems}
        selectedUserId={values.targetUserId}
        searchValue={memberSearch}
        isLoading={isLoadingMembers}
        isFetching={isFetchingMembers}
        hasNextPage={hasNextMemberPage}
        error={membersError}
        onSearchChange={handleMemberSearchChange}
        onSelect={handleSelectMember}
        onClose={closeMemberPicker}
        onRefresh={handleRefreshMembers}
        onLoadMore={handleLoadMoreMembers}
      />
    </>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    formContent: {
      paddingHorizontal: 18,
      paddingTop: 4,
      paddingBottom: 24,
    },

    header: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      marginBottom: 16,
    },

    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    title: {
      color: colors.foreground,
      fontSize: 18,
      lineHeight: 24,
      fontFamily: "Poppins_700Bold",
    },

    subtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: "Poppins_400Regular",
    },

    memberSection: {
      marginBottom: 16,
    },

    sectionTitle: {
      color: colors.foreground,
      fontSize: 13,
      marginBottom: 8,
      fontFamily: "Poppins_700Bold",
    },

    dropdownButton: {
      minHeight: 58,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    dropdownButtonSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceTertiary,
    },

    dropdownIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    dropdownTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    dropdownSubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    searchBox: {
      minHeight: 46,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginHorizontal: 16,
      marginBottom: 10,
    },

    searchInput: {
      flex: 1,
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      paddingVertical: 0,
    },

    permissionsSection: {
      marginTop: 4,
    },

    permissionsWrap: {
      gap: 9,
    },

    permissionRow: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surfaceSecondary,
    },

    permissionRowSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceTertiary,
    },

    permissionIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    permissionTitle: {
      flex: 1,
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    errorText: {
      marginTop: 7,
      color: colors.danger,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    inlineErrorBox: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceSecondary,
    },

    inlineErrorText: {
      flex: 1,
      color: colors.danger,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_500Medium",
    },

    errorBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceSecondary,
    },

    errorBoxText: {
      flex: 1,
      color: colors.danger,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: "Poppins_500Medium",
    },

    footer: {
      flexDirection: "row",
      gap: 10,
      marginTop: 18,
    },

    cancelButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },

    cancelText: {
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    submitButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },

    submitText: {
      color: colors.accentForeground,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    modalKeyboardWrap: {
      flex: 1,
    },

    pickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-start",
      paddingTop: Platform.OS === "ios" ? 70 : 46,
      paddingHorizontal: 16,
    },

    pickerBackdropPressable: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },

    pickerOverlay: {
      width: "100%",
      maxHeight: "78%",
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },

    pickerHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    },

    pickerTitle: {
      color: colors.foreground,
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
    },

    pickerSubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      flexShrink: 0,
    },

    pickerListContent: {
      paddingHorizontal: 16,
      paddingBottom: 18,
    },

    pickerMemberRow: {
      minHeight: 62,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      marginBottom: 9,
    },

    pickerMemberRowSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceTertiary,
    },

    memberRowDisabled: {
      opacity: 0.5,
    },

    memberTextWrap: {
      flex: 1,
    },

    memberName: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    memberSubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    memberBadge: {
      color: colors.muted,
      fontSize: 10,
      fontFamily: "Poppins_700Bold",
    },
    pickerHeaderText: {
  flex: 1,
  minWidth: 0,
  paddingRight: 4,
},

    pickerEmptyBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surfaceSecondary,
      padding: 18,
      alignItems: "center",
      marginBottom: 12,
    },

    emptyTitle: {
      marginTop: 8,
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    emptySubtitle: {
      marginTop: 4,
      color: colors.muted,
      fontSize: 11,
      textAlign: "center",
      fontFamily: "Poppins_400Regular",
    },

    pickerFooter: {
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 6,
    },

    loadMoreText: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },
  });
}