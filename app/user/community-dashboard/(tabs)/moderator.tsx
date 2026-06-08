import React, { useEffect, useMemo, useState } from "react";
import { router, useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Dialog } from "heroui-native";

import DataTable from "@/components/common/data-table";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  createModeratorColumns,
  createModeratorFilters,
  getModeratorInitials,
  getModeratorPermissions,
  getPermissionLabel,
  type ModeratorAction,
} from "@/components/column/user-community/moderator.columns";
import {
  useAssignCommunityModeratorMutation,
  useGetCommunityModeratorsQuery,
  useRemoveModeratorMutation,
  useUpdateModeratorPermissionsMutation,
} from "@/store/api/communityApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityMemberItem } from "@/types/community";
import ModeratorPermissionForm, {
  type ModeratorPermissionValues,
} from "@/components/form/ModeratorForm";

type ModeratorStatusFilter = "ACTIVE" | "LEFT" | "BANNED";
type PermissionFormMode = "assign" | "edit";

type CommunityMemberWithPermissionFlags = CommunityMemberItem &
  Partial<ModeratorPermissionValues>;

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string | string[]; error?: string } }).data;

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (typeof data?.error === "string") {
      return data.error;
    }
  }

  return "Something went wrong. Please try again.";
}

function getModeratorDefaultValues(
  moderator: CommunityMemberItem | null,
): ModeratorPermissionValues {
  const item = moderator as CommunityMemberWithPermissionFlags | null;
  const permissions = moderator?.permissions;

  return {
    targetUserId: moderator?.userId ?? moderator?.user?.id ?? "",

    canEditCommunity: Boolean(
      item?.canEditCommunity ?? permissions?.canEditCommunity,
    ),

    canManageMembers: Boolean(
      item?.canManageMembers ?? permissions?.canManageMembers,
    ),

    canManagePosts: Boolean(
      item?.canManagePosts ?? permissions?.canManagePosts,
    ),

    canManageComments: Boolean(
      item?.canManageComments ?? permissions?.canManageComments,
    ),

    canManageReports: Boolean(
      item?.canManageReports ?? permissions?.canManageReports,
    ),
  };
}

export default function ModeratorScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const localParams = useLocalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const globalParams = useGlobalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const communityId =
    getParamValue(localParams.communityId) ||
    getParamValue(globalParams.communityId) ||
    getParamValue(localParams.id) ||
    getParamValue(globalParams.id);

  const [selectedModerator, setSelectedModerator] =
    useState<CommunityMemberItem | null>(null);

  const [actionDialogVisible, setActionDialogVisible] = useState(false);

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionFormMode, setPermissionFormMode] =
    useState<PermissionFormMode>("assign");
  const [permissionFormModerator, setPermissionFormModerator] =
    useState<CommunityMemberItem | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: "ACTIVE",
  });

  const statusFilter = activeFilters.status as ModeratorStatusFilter;

  const [assignModerator, { isLoading: isAssigningModerator }] =
    useAssignCommunityModeratorMutation();

  const [updateModeratorPermissions, { isLoading: isUpdatingPermissions }] =
    useUpdateModeratorPermissionsMutation();

  const [removeModerator] = useRemoveModeratorMutation();

  const isSubmittingPermissionForm =
    isAssigningModerator || isUpdatingPermissions;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
    setSearch("");
    setDebouncedSearch("");
    setActiveFilters({
      status: "ACTIVE",
    });
  }, [communityId]);

  const {
    data: moderatorsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityModeratorsQuery(
    {
      communityId,
      page: page + 1,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter,
    },
    {
      skip: !communityId,
      refetchOnMountOrArgChange: true,
    },
  );

  const moderators = moderatorsResponse?.data ?? [];

  const columns = useMemo(
    () =>
      createModeratorColumns({
        colors,
        onActionPress: openActionDialog,
      }),
    [colors],
  );

  const filters = useMemo(() => createModeratorFilters(), []);

  function handleFilterChange(key: string, value: string) {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPage(0);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(0);
  }

  async function handlePullRefresh() {
    setIsPullRefreshing(true);

    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }

  function openActionDialog(moderator: CommunityMemberItem) {
    setSelectedModerator(moderator);
    setActionDialogVisible(true);
  }

  function closeActionDialog() {
    setActionDialogVisible(false);
    setSelectedModerator(null);
  }

  function openAssignModeratorModal() {
    setActionDialogVisible(false);
    setSelectedModerator(null);
    setPermissionFormMode("assign");
    setPermissionFormModerator(null);
    setPermissionModalVisible(true);
  }

  function openEditPermissionModal(moderator: CommunityMemberItem) {
    setActionDialogVisible(false);
    setSelectedModerator(null);
    setPermissionFormMode("edit");
    setPermissionFormModerator(moderator);
    setPermissionModalVisible(true);
  }

  function closePermissionModal() {
    if (isSubmittingPermissionForm) return;

    setPermissionModalVisible(false);
    setPermissionFormMode("assign");
    setPermissionFormModerator(null);
  }

  async function handlePermissionFormSubmit(values: ModeratorPermissionValues) {
    if (!communityId) return;

    try {
      if (permissionFormMode === "assign") {
        const targetUserId = values.targetUserId?.trim();

        if (!targetUserId) {
          Alert.alert("Missing member", "Please select a member first.");
          return;
        }

        await assignModerator({
          communityId,
          targetUserId,
          canEditCommunity: values.canEditCommunity,
          canManageMembers: values.canManageMembers,
          canManagePosts: values.canManagePosts,
          canManageComments: values.canManageComments,
          canManageReports: values.canManageReports,
        }).unwrap();

        setPermissionModalVisible(false);
        setPermissionFormModerator(null);

        Alert.alert("Moderator assigned", "The selected member is now a moderator.");
        refetch();
        return;
      }

      const targetUserId =
        permissionFormModerator?.userId ?? permissionFormModerator?.user?.id;

      if (!targetUserId) {
        Alert.alert("Missing moderator", "Moderator user ID was not found.");
        return;
      }

      await updateModeratorPermissions({
        communityId,
        targetUserId,
        canEditCommunity: values.canEditCommunity,
        canManageMembers: values.canManageMembers,
        canManagePosts: values.canManagePosts,
        canManageComments: values.canManageComments,
        canManageReports: values.canManageReports,
      }).unwrap();

      setPermissionModalVisible(false);
      setPermissionFormModerator(null);

      Alert.alert("Permissions updated", "Moderator permissions were updated.");
      refetch();
    } catch (submitError) {
      Alert.alert("Action failed", getApiErrorMessage(submitError));
    }
  }

  function handleModeratorAction(action: ModeratorAction) {
    if (!selectedModerator) return;

    const moderator = selectedModerator;
    const moderatorName = moderator.user.name ?? "Unknown User";

    const actionLabel: Record<ModeratorAction, string> = {
      view: "View profile",
      message: "Message",
      editPermissions: "Edit permissions",
      activity: "View activity",
      suspend: "Suspend moderator",
      reactivate: "Reactivate moderator",
      remove: "Remove moderator",
    };

    if (action === "editPermissions") {
      openEditPermissionModal(moderator);
      return;
    }

    closeActionDialog();

    if (action === "activity") {
      router.push({
        pathname: "/pages/moderator-activity",
        params: {
          moderatorId: moderator.id,
          userId: moderator.userId,
          communityId: moderator.communityId,
        },
      });
      return;
    }

    if (action === "remove") {
      const targetUserId = moderator.userId ?? moderator.user?.id;

      if (!communityId) {
        Alert.alert("Missing community", "Community ID was not found.");
        return;
      }

      if (!targetUserId) {
        Alert.alert("Missing moderator", "Moderator user ID was not found.");
        return;
      }

      Alert.alert(
        "Remove moderator",
        `Are you sure you want to remove ${moderatorName} as a moderator? They will stay in the community as a normal member.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeModerator({
                  communityId,
                  targetUserId,
                }).unwrap();

                Alert.alert(
                  "Moderator removed",
                  `${moderatorName} is now a normal community member.`,
                );

                refetch();
              } catch (removeError) {
                Alert.alert("Action failed", getApiErrorMessage(removeError));
              }
            },
          },
        ],
      );

      return;
    }

    Alert.alert(actionLabel[action], `${actionLabel[action]}: ${moderatorName}`);
  }

  if (!communityId) {
    return (
      <View style={styles.centerWrap}>
        <Ionicons name="warning-outline" size={30} color={colors.warning} />

        <Text style={styles.centerTitle}>Community ID missing</Text>

        <Text style={styles.centerSubtitle}>
          Open this screen with communityId in the route params.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Moderators</Text>

            <Text style={styles.subtitle}>
              {moderatorsResponse?.meta?.total ?? 0} moderators and admins
            </Text>
          </View>

          <Pressable
            onPress={openAssignModeratorModal}
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons
              name="person-add-outline"
              size={17}
              color={colors.accentForeground}
            />

            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={colors.danger}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Failed to load moderators</Text>

              <Text style={styles.errorMessage}>
                Pull down to refresh and try again. Only the community owner or
                member manager can view this list.
              </Text>
            </View>
          </View>
        ) : null}

        <DataTable
          rows={moderators}
          columns={columns}
          rowKey={(row) => row.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search moderators"
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          emptyTitle={error ? "Failed to load moderators" : "No moderators found"}
          emptySubtitle={
            error
              ? "Pull down to refresh and try again."
              : "No moderator matched this search."
          }
          isLoading={isLoading}
          isFetching={isFetching}
          pagination={{
            page,
            pageSize,
            totalItems: moderatorsResponse?.meta?.total ?? 0,
            totalPages: Math.max(1, moderatorsResponse?.meta?.totalPages ?? 1),
            onPageChange: setPage,
            onPageSizeChange: handlePageSizeChange,
            pageSizeOptions: [10, 20, 50],
          }}
        />
      </ScrollView>

      <Dialog
        isOpen={actionDialogVisible}
        onOpenChange={(open) => {
          if (!open) closeActionDialog();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />

          <Dialog.Content style={styles.actionDialogContent}>
            <View style={styles.dialogTopRow}>
              <View style={{ flex: 1 }}>
                <Dialog.Title style={styles.dialogTitle}>
                  Moderator actions
                </Dialog.Title>

                <Dialog.Description style={styles.dialogDescription}>
                  Manage this moderator account.
                </Dialog.Description>
              </View>

              <Dialog.Close variant="ghost" />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.moderatorInfo}>
                {selectedModerator ? (
                  <Avatar
                    alt={selectedModerator.user.name ?? "Moderator"}
                    size="lg"
                    variant="soft"
                    color="success"
                  >
                    {toAbsoluteFileUrl(selectedModerator.user.image) ? (
                      <Avatar.Image
                        source={{
                          uri: toAbsoluteFileUrl(selectedModerator.user.image)!,
                        }}
                      />
                    ) : null}

                    <Avatar.Fallback>
                      {getModeratorInitials(selectedModerator.user.name)}
                    </Avatar.Fallback>
                  </Avatar>
                ) : null}

                <View style={styles.moderatorTextWrap}>
                  <Text numberOfLines={1} style={styles.sheetTitle}>
                    {selectedModerator?.user.name ?? "Moderator"}
                  </Text>

                  <Text numberOfLines={1} style={styles.sheetSubtitle}>
                    {selectedModerator?.user.email ??
                      selectedModerator?.role ??
                      "Community moderator"}
                  </Text>

                  {selectedModerator ? (
                    <View style={styles.permissionPreview}>
                      {getModeratorPermissions(selectedModerator).map(
                        (permission) => (
                          <View key={permission} style={styles.permissionChip}>
                            <Text style={styles.permissionChipText}>
                              {getPermissionLabel(permission)}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.actionGrid}>
              <GridAction
                icon="person-outline"
                label="View profile"
                onPress={() => handleModeratorAction("view")}
              />

              <GridAction
                icon="chatbubble-outline"
                label="Message"
                onPress={() => handleModeratorAction("message")}
              />

              <GridAction
                icon="options-outline"
                label="Permissions"
                onPress={() => handleModeratorAction("editPermissions")}
              />

              <GridAction
                icon="analytics-outline"
                label="Activity"
                onPress={() => handleModeratorAction("activity")}
              />

              {selectedModerator?.status === "ACTIVE" ? (
                <GridAction
                  icon="pause-circle-outline"
                  label="Suspend"
                  danger
                  onPress={() => handleModeratorAction("suspend")}
                />
              ) : (
                <GridAction
                  icon="refresh-outline"
                  label="Reactivate"
                  onPress={() => handleModeratorAction("reactivate")}
                />
              )}

              <GridAction
                icon="trash-outline"
                label="Remove"
                danger
                onPress={() => handleModeratorAction("remove")}
              />
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <Modal
        visible={permissionModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closePermissionModal}
      >
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[styles.permissionModalScreen, { backgroundColor: colors.surface }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.permissionKeyboardWrap}
          >
            <View style={styles.permissionModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionModalTitle}>
                  {permissionFormMode === "assign"
                    ? "Assign moderator"
                    : "Edit permissions"}
                </Text>

                <Text style={styles.permissionModalSubtitle}>
                  {permissionFormMode === "edit" &&
                  permissionFormModerator?.user.name
                    ? permissionFormModerator.user.name
                    : "Select member and moderator permissions."}
                </Text>
              </View>

              <Pressable
                onPress={closePermissionModal}
                disabled={isSubmittingPermissionForm}
                style={({ pressed }) => [
                  styles.permissionCloseButton,
                  pressed && !isSubmittingPermissionForm ? { opacity: 0.7 } : null,
                ]}
              >
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.permissionFormWrap}>
              <ModeratorPermissionForm
                communityId={communityId}
                mode={permissionFormMode}
                isVisible={permissionModalVisible}
                defaultValues={
                  permissionFormMode === "edit"
                    ? getModeratorDefaultValues(permissionFormModerator)
                    : undefined
                }
                isSubmitting={isSubmittingPermissionForm}
                onCancel={closePermissionModal}
                onSubmit={handlePermissionFormSubmit}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );

  function GridAction({
    icon,
    label,
    danger,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    danger?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.gridAction,
          pressed && { opacity: 0.65 },
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={danger ? colors.danger : colors.accent}
        />

        <Text
          numberOfLines={1}
          style={[
            styles.gridLabel,
            {
              color: danger ? colors.danger : colors.foreground,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface,
    },

    scrollContent: {
      flexGrow: 1,
      paddingBottom: 155,
    },

    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    title: {
      color: colors.foreground,
      fontSize: 22,
      fontFamily: "Poppins_700Bold",
    },

    subtitle: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      backgroundColor: colors.surface,
    },

    centerTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },

    centerSubtitle: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      fontFamily: "Poppins_400Regular",
    },

    addButton: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 13,
      backgroundColor: colors.accent,
    },

    addText: {
      color: colors.accentForeground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    errorBox: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surfaceSecondary,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    errorMessage: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    actionDialogContent: {
      width: "94%",
      maxHeight: "88%",
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },

    dialogTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 14,
    },

    dialogTitle: {
      color: colors.foreground,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },

    dialogDescription: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    sheetHeader: {
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    moderatorInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    moderatorTextWrap: {
      flex: 1,
    },

    sheetTitle: {
      color: colors.foreground,
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
    },

    sheetSubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    permissionPreview: {
      marginTop: 10,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

    permissionChip: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    permissionChipText: {
      color: colors.foreground,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    actionGrid: {
      paddingTop: 22,
      paddingBottom: 8,
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 24,
      columnGap: 12,
    },

    gridAction: {
      width: "30%",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingVertical: 4,
    },

    gridLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_600SemiBold",
      textAlign: "center",
    },

    permissionModalScreen: {
      flex: 1,
    },

    permissionKeyboardWrap: {
      flex: 1,
    },

    permissionModalHeader: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    permissionModalTitle: {
      color: colors.foreground,
      fontSize: 24,
      lineHeight: 30,
      fontFamily: "Poppins_700Bold",
    },

    permissionModalSubtitle: {
      marginTop: 4,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "Poppins_400Regular",
    },

    permissionCloseButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    permissionFormWrap: {
      flex: 1,
      paddingHorizontal: 18,
      paddingTop: 16,
    },
  });
}