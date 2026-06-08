import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
import { useGetCommunityMembersQuery } from "@/store/api/communityMemberManagementApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityMemberItem } from "@/types/community";

const permissionOptions = [
  {
    key: "canEditCommunity",
    title: "Edit community",
    description: "Can update community information.",
    icon: "create-outline",
  },
  {
    key: "canManageMembers",
    title: "Manage members",
    description: "Can remove, ban, and manage members.",
    icon: "people-outline",
  },
  {
    key: "canManagePosts",
    title: "Manage posts",
    description: "Can manage community posts.",
    icon: "newspaper-outline",
  },
  {
    key: "canManageComments",
    title: "Manage comments",
    description: "Can moderate comments.",
    icon: "chatbubbles-outline",
  },
  {
    key: "canManageReports",
    title: "Manage reports",
    description: "Can review reports.",
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
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: ModeratorPermissionValues) => Promise<void> | void;
};

const MEMBER_PAGE_SIZE = 50;

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

export default function ModeratorPermissionForm({
  communityId,
  mode,
  isVisible = true,
  defaultValues,
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
  const [selectedMemberSnapshot, setSelectedMemberSnapshot] =
    useState<CommunityMemberItem | null>(null);

  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");

  const shouldFetchMembers =
    mode === "assign" && isVisible && Boolean(communityId);

  const {
    data: membersResponse,
    isLoading: isLoadingMembers,
    isFetching: isFetchingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useGetCommunityMembersQuery(
    {
      communityId,
      page: 1,
      limit: MEMBER_PAGE_SIZE,
      search: debouncedMemberSearch || undefined,
      status: "ACTIVE",
    },
    {
      skip: !shouldFetchMembers,
      refetchOnMountOrArgChange: true,
    },
  );

  const activeMembers = useMemo(() => {
    return membersResponse?.data ?? [];
  }, [membersResponse?.data]);

  const selectedMember = useMemo(() => {
    if (selectedMemberSnapshot) {
      return selectedMemberSnapshot;
    }

    if (!values.targetUserId) {
      return null;
    }

    return (
      activeMembers.find(
        (member) => getMemberKey(member) === values.targetUserId,
      ) ?? null
    );
  }, [activeMembers, selectedMemberSnapshot, values.targetUserId]);

  const selectedPermissionCount = useMemo(() => {
    return permissionOptions.filter((option) => values[option.key]).length;
  }, [values]);

  useEffect(() => {
    setValues({
      ...emptyValues,
      ...defaultValues,
    });

    setErrors({});
    setGeneralError("");
    setSelectedMemberSnapshot(null);
    setMemberSearch("");
    setDebouncedMemberSearch("");
  }, [mode, defaultValues, isVisible]);

  useEffect(() => {
    if (!shouldFetchMembers) return;

    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [memberSearch, shouldFetchMembers]);

  const handleSelectMember = useCallback(
    (member: CommunityMemberItem) => {
      if (isSubmitting) return;

      const targetUserId = getMemberKey(member);
      const isAlreadySelected = values.targetUserId === targetUserId;

      if (isAlreadySelected) {
        setValues((previous) => ({
          ...previous,
          targetUserId: "",
        }));

        setSelectedMemberSnapshot(null);

        setErrors((previous) => ({
          ...previous,
          targetUserId: undefined,
        }));

        return;
      }

      setValues((previous) => ({
        ...previous,
        targetUserId,
      }));

      setSelectedMemberSnapshot(member);

      setErrors((previous) => ({
        ...previous,
        targetUserId: undefined,
      }));
    },
    [isSubmitting, values.targetUserId],
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
    <View style={styles.formRoot}>
      <ScrollView
        style={styles.formScroll}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
      >
        {mode === "assign" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Select member</Text>

                <Text style={styles.sectionSubtitle}>
                  {selectedMember
                    ? `${getUserDisplayName(selectedMember)} selected`
                    : "Choose one active member"}
                </Text>
              </View>

              {selectedMember ? (
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => {
                    setValues((previous) => ({
                      ...previous,
                      targetUserId: "",
                    }));
                    setSelectedMemberSnapshot(null);
                  }}
                  style={({ pressed }) => [
                    styles.clearSelectionButton,
                    pressed && !isSubmitting ? { opacity: 0.7 } : null,
                  ]}
                >
                  <Text style={styles.clearSelectionText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.memberPickerBox}>
              <View style={styles.memberSearchRow}>
                <Ionicons name="search-outline" size={18} color={colors.muted} />

                <TextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Search active members"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.memberSearchInput}
                />

                {memberSearch ? (
                  <Pressable
                    onPress={() => {
                      setMemberSearch("");
                      setDebouncedMemberSearch("");
                    }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.memberListDivider} />

              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                style={styles.memberListScroll}
                contentContainerStyle={styles.memberListContent}
              >
                {isLoadingMembers ? (
                  <View style={styles.stateBox}>
                    <ActivityIndicator size="small" color={colors.accent} />

                    <Text style={styles.stateText}>
                      Loading active members...
                    </Text>
                  </View>
                ) : null}

                {membersError ? (
                  <Pressable
                    onPress={() => refetchMembers()}
                    style={styles.stateBox}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={colors.danger}
                    />

                    <Text style={[styles.stateText, { color: colors.danger }]}>
                      Failed to load members. Tap to retry.
                    </Text>
                  </Pressable>
                ) : null}

                {!isLoadingMembers &&
                !membersError &&
                activeMembers.length === 0 ? (
                  <View style={styles.stateBox}>
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={colors.muted}
                    />

                    <Text style={styles.stateText}>
                      {debouncedMemberSearch
                        ? "No member matched your search."
                        : "No active members found."}
                    </Text>
                  </View>
                ) : null}

                {activeMembers.map((member, index) => {
                  const memberUserId = getMemberKey(member);
                  const name = getUserDisplayName(member);
                  const imageUrl = toAbsoluteFileUrl(member.user?.image);
                  const isSelected = values.targetUserId === memberUserId;
                  const isLast = index === activeMembers.length - 1;

                  return (
                    <Pressable
                      key={memberUserId}
                      disabled={isSubmitting}
                      onPress={() => handleSelectMember(member)}
                      style={({ pressed }) => [
                        styles.memberRow,
                        isSelected && styles.memberRowSelected,
                        isLast && styles.memberRowLast,
                        pressed && !isSubmitting ? { opacity: 0.75 } : null,
                      ]}
                    >
                      <Avatar alt={name} size="sm" variant="soft" color="success">
                        {imageUrl ? (
                          <Avatar.Image source={{ uri: imageUrl }} />
                        ) : null}

                        <Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
                      </Avatar>

                      <View style={styles.memberTextWrap}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.memberName,
                            isSelected && { color: colors.accent },
                          ]}
                        >
                          {name}
                        </Text>

                        <Text numberOfLines={1} style={styles.memberSubtitle}>
                          {getUserSubtitle(member)}
                        </Text>
                      </View>

                      {isSelected ? (
                        <View style={styles.selectedIconWrap}>
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color={colors.accentForeground}
                          />
                        </View>
                      ) : (
                        <Ionicons
                          name="ellipse-outline"
                          size={20}
                          color={colors.muted}
                        />
                      )}
                    </Pressable>
                  );
                })}

                {isFetchingMembers && !isLoadingMembers ? (
                  <View style={styles.stateBox}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.stateText}>Updating list...</Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>

            {errors.targetUserId ? (
              <Text style={styles.errorText}>{errors.targetUserId}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.permissionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Moderator permissions</Text>

              <Text style={styles.sectionSubtitle}>
                {selectedPermissionCount} selected
              </Text>
            </View>
          </View>

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

                  <View style={styles.permissionTextWrap}>
                    <Text numberOfLines={1} style={styles.permissionTitle}>
                      {option.title}
                    </Text>

                    <Text numberOfLines={2} style={styles.permissionDescription}>
                      {option.description}
                    </Text>
                  </View>

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
      </ScrollView>

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
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    formRoot: {
      flex: 1,
    },

    formScroll: {
      flex: 1,
    },

    formContent: {
      paddingBottom: 20,
    },

    section: {
      marginBottom: 16,
    },

    sectionHeaderRow: {
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    sectionTitle: {
      color: colors.foreground,
      fontSize: 14,
      marginBottom: 3,
      fontFamily: "Poppins_700Bold",
    },

    sectionSubtitle: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    clearSelectionButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },

    clearSelectionText: {
      color: colors.foreground,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    memberPickerBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
      overflow: "hidden",
    },

    memberSearchRow: {
      minHeight: 50,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceSecondary,
    },

    memberSearchInput: {
      flex: 1,
      minHeight: 48,
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      paddingVertical: 0,
    },

    memberListDivider: {
      height: 1,
      backgroundColor: colors.border,
    },

    memberListScroll: {
      maxHeight: 250,
    },

    memberListContent: {
      flexGrow: 1,
    },

    memberRow: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },

    memberRowSelected: {
      backgroundColor: colors.surfaceTertiary,
    },

    memberRowLast: {
      borderBottomWidth: 0,
    },

    memberTextWrap: {
      flex: 1,
      minWidth: 0,
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

    selectedIconWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    stateBox: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },

    stateText: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    permissionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },

    permissionsWrap: {
      gap: 10,
    },

    permissionRow: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 13,
      paddingVertical: 12,
      backgroundColor: colors.surfaceSecondary,
    },

    permissionRowSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceTertiary,
    },

    permissionIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    permissionTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    permissionTitle: {
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    permissionDescription: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: "Poppins_400Regular",
    },

    errorText: {
      marginTop: 7,
      color: colors.danger,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    errorBox: {
      marginTop: 4,
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
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },

    cancelButton: {
      flex: 1,
      minHeight: 50,
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
      minHeight: 50,
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
  });
}