import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import { Avatar } from "heroui-native";
import { Modal as PaperModal, Portal } from "react-native-paper";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  getModeratorInitials,
  getModeratorPermissions,
  getPermissionLabel,
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

type ModeratorAction =
  | "view"
  | "editPermissions"
  | "activity"
  | "suspend"
  | "reactivate"
  | "remove";

type StatusFilterOption = {
  label: string;
  value: ModeratorStatusFilter;
  icon: keyof typeof Ionicons.glyphMap;
};

type CommunityMemberWithPermissionFlags = CommunityMemberItem &
  Partial<ModeratorPermissionValues>;

const PAGE_SIZE = 20;

const STATUS_FILTERS: StatusFilterOption[] = [
  {
    label: "Active",
    value: "ACTIVE",
    icon: "people-outline",
  },
  {
    label: "Banned",
    value: "BANNED",
    icon: "ban-outline",
  },
  {
    label: "Left",
    value: "LEFT",
    icon: "exit-outline",
  },
];

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (
      error as {
        data?: {
          message?: string | string[];
          error?: string;
        };
      }
    ).data;

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

function formatLabel(value?: string | null, fallback = "Not set") {
  if (!value) return fallback;

  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const searchInputRef = useRef<TextInput | null>(null);
  const searchFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endReachedLockedRef = useRef(false);

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

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionFormMode, setPermissionFormMode] =
    useState<PermissionFormMode>("assign");
  const [permissionFormModerator, setPermissionFormModerator] =
    useState<CommunityMemberItem | null>(null);

  const [page, setPage] = useState(1);
  const [accumulatedModerators, setAccumulatedModerators] = useState<
    CommunityMemberItem[]
  >([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<ModeratorStatusFilter>("ACTIVE");

  const [assignModerator, { isLoading: isAssigningModerator }] =
    useAssignCommunityModeratorMutation();

  const [updateModeratorPermissions, { isLoading: isUpdatingPermissions }] =
    useUpdateModeratorPermissionsMutation();

  const [removeModerator, { isLoading: isRemovingModerator }] =
    useRemoveModeratorMutation();

  const isSubmittingPermissionForm =
    isAssigningModerator || isUpdatingPermissions;

  const isActionLoading = isSubmittingPermissionForm || isRemovingModerator;

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = search.trim();
      const nextSearch = trimmedSearch.length >= 2 ? trimmedSearch : "";

      setDebouncedSearch((previousSearch) =>
        previousSearch === nextSearch ? previousSearch : nextSearch,
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    setAccumulatedModerators([]);
    setStatusFilter("ACTIVE");
    setIsSearchOpen(false);
    setFilterSheetVisible(false);
    setActionSheetVisible(false);
    endReachedLockedRef.current = false;
  }, [communityId]);

  useEffect(() => {
    setPage(1);
    setAccumulatedModerators([]);
    endReachedLockedRef.current = false;
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (!isSearchOpen) {
      if (searchFocusTimerRef.current) {
        clearTimeout(searchFocusTimerRef.current);
        searchFocusTimerRef.current = null;
      }

      return;
    }

    searchFocusTimerRef.current = setTimeout(() => {
      searchInputRef.current?.focus();
      searchFocusTimerRef.current = null;
    }, 80);

    return () => {
      if (searchFocusTimerRef.current) {
        clearTimeout(searchFocusTimerRef.current);
        searchFocusTimerRef.current = null;
      }
    };
  }, [isSearchOpen]);

  const {
    data: moderatorsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityModeratorsQuery(
    {
      communityId,
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter,
    },
    {
      skip: !communityId,
      refetchOnMountOrArgChange: true,
    },
  );

  const moderators = accumulatedModerators;
  const totalItems = moderatorsResponse?.meta?.total ?? 0;
  const totalPages = Math.max(1, moderatorsResponse?.meta?.totalPages ?? 1);
  const hasNextPage = page < totalPages;

  const selectedStatusFilter =
    STATUS_FILTERS.find((filter) => filter.value === statusFilter) ??
    STATUS_FILTERS[0];

  const moderatorCountLabel =
    statusFilter === "ACTIVE"
      ? "moderators and admins"
      : statusFilter === "BANNED"
        ? "banned moderators"
        : "left moderators";

  const showInitialLoading =
    (isLoading || (isFetching && page === 1)) && moderators.length === 0;

  const showEmptyState =
    !showInitialLoading &&
    !isFetching &&
    !error &&
    moderators.length === 0;

  useEffect(() => {
    const incomingModerators = moderatorsResponse?.data;

    if (!incomingModerators) return;

    endReachedLockedRef.current = false;

    setAccumulatedModerators((previousModerators) => {
      if (page === 1) {
        return incomingModerators;
      }

      const existingIds = new Set(
        previousModerators.map((moderator) => moderator.id),
      );

      const uniqueNewModerators = incomingModerators.filter(
        (moderator) => !existingIds.has(moderator.id),
      );

      return [...previousModerators, ...uniqueNewModerators];
    });
  }, [moderatorsResponse?.data, page]);

  function focusSearchInput() {
    searchInputRef.current?.focus();
  }

  function handleSearchButtonPress() {
    if (isSearchOpen) {
      handleCloseSearch();
      return;
    }

    setIsSearchOpen(true);
  }

  function handleCloseSearch() {
    setSearch("");
    setDebouncedSearch("");
    setIsSearchOpen(false);
    Keyboard.dismiss();
  }

  function handleClearSearch() {
    if (search.length === 0) return;

    setSearch("");
    focusSearchInput();
  }

  function handleStatusFilterChange(nextStatus: ModeratorStatusFilter) {
    setFilterSheetVisible(false);

    if (nextStatus === statusFilter) return;

    setStatusFilter(nextStatus);
  }

  function handleLoadMoreModerators() {
    if (endReachedLockedRef.current) return;
    if (isLoading || isFetching || isActionLoading) return;
    if (!hasNextPage) return;

    endReachedLockedRef.current = true;
    setPage((previousPage) => Math.min(previousPage + 1, totalPages));
  }

  async function handlePullRefresh() {
    setIsPullRefreshing(true);
    endReachedLockedRef.current = false;

    try {
      if (page !== 1) {
        setPage(1);
        return;
      }

      const refreshed = await refetch();

      if ("data" in refreshed && refreshed.data?.data) {
        setAccumulatedModerators(refreshed.data.data);
      }
    } finally {
      setIsPullRefreshing(false);
    }
  }

  async function refreshFirstPageAfterAction() {
    endReachedLockedRef.current = false;

    if (page === 1) {
      const refreshed = await refetch();

      if ("data" in refreshed && refreshed.data?.data) {
        setAccumulatedModerators(refreshed.data.data);
      }

      return;
    }

    setPage(1);
  }

  function openActionSheet(moderator: CommunityMemberItem) {
    setSelectedModerator(moderator);
    setActionSheetVisible(true);
  }

  function closeActionSheet() {
    setActionSheetVisible(false);
    setSelectedModerator(null);
  }

  function openAssignModeratorModal() {
    setActionSheetVisible(false);
    setSelectedModerator(null);
    setPermissionFormMode("assign");
    setPermissionFormModerator(null);
    setPermissionModalVisible(true);
  }

  function openEditPermissionModal(moderator: CommunityMemberItem) {
    setActionSheetVisible(false);
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
        await refreshFirstPageAfterAction();
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
      await refreshFirstPageAfterAction();
    } catch (submitError) {
      Alert.alert("Action failed", getApiErrorMessage(submitError));
    }
  }

  function handleModeratorAction(action: ModeratorAction) {
    if (!selectedModerator || isActionLoading) return;

    const moderator = selectedModerator;
    const moderatorName = moderator.user.name ?? "Unknown User";

    if (action === "view") {
      closeActionSheet();
      Alert.alert("View profile", `View profile: ${moderatorName}`);
      return;
    }

    if (action === "editPermissions") {
      openEditPermissionModal(moderator);
      return;
    }

    if (action === "activity") {
      closeActionSheet();

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

    if (action === "suspend") {
      closeActionSheet();
      Alert.alert("Suspend moderator", `Suspend moderator: ${moderatorName}`);
      return;
    }

    if (action === "reactivate") {
      closeActionSheet();
      Alert.alert("Reactivate moderator", `Reactivate moderator: ${moderatorName}`);
      return;
    }

    if (action === "remove") {
      const targetUserId = moderator.userId ?? moderator.user?.id;

      closeActionSheet();

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

                await refreshFirstPageAfterAction();
              } catch (removeError) {
                Alert.alert("Action failed", getApiErrorMessage(removeError));
              }
            },
          },
        ],
      );
    }
  }

  function renderListHeader() {
    return (
      <>
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Moderators</Text>

            <Text style={styles.subtitle}>
              {totalItems} {moderatorCountLabel}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={handleSearchButtonPress}
              style={({ pressed }) => [
                styles.headerIconButton,
                isSearchOpen && styles.headerIconButtonActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <EvilIcons
                name={isSearchOpen ? "close" : "search"}
                size={isSearchOpen ? 28 : 30}
                color={isSearchOpen ? colors.accent : colors.foreground}
              />
            </Pressable>

            <Pressable
              onPress={() => setFilterSheetVisible(true)}
              style={({ pressed }) => [
                styles.headerIconButton,
                styles.headerIconButtonActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="funnel-outline"
                size={20}
                color={colors.accent}
              />
            </Pressable>

            <Pressable
              onPress={openAssignModeratorModal}
              style={({ pressed }) => [
                styles.headerAddButton,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="person-add-outline"
                size={18}
                color={colors.accentForeground}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons
              name={selectedStatusFilter.icon}
              size={15}
              color={colors.accent}
            />

            <Text style={styles.metaChipText}>{selectedStatusFilter.label}</Text>
          </View>

          {(isFetching || isActionLoading) && moderators.length > 0 ? (
            <View style={styles.smallLoaderChip}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null}
        </View>

        {isSearchOpen ? (
          <>
            <View style={styles.searchBox}>
              <EvilIcons name="search" size={28} color={colors.accent} />

              <TextInput
                ref={searchInputRef}
                value={search}
                onChangeText={setSearch}
                placeholder="Search moderators"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="search"
                style={styles.searchInput}
              />

              {search.length > 0 ? (
                <Pressable
                  onPress={handleClearSearch}
                  focusable={false}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.clearSearchButton,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <EvilIcons name="close" size={24} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            {search.trim().length === 1 ? (
              <Text style={styles.searchHint}>
                Type at least 2 letters to search.
              </Text>
            ) : null}
          </>
        ) : null}

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
      </>
    );
  }

  const listHeaderComponent = renderListHeader();

  function renderListEmpty() {
    if (showInitialLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.accent} />

          <Text style={styles.stateTitle}>Loading moderators...</Text>

          <Text style={styles.stateSubtitle}>
            Please wait while we prepare the moderator list.
          </Text>
        </View>
      );
    }

    if (showEmptyState) {
      return (
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="shield-outline" size={25} color={colors.muted} />
          </View>

          <Text style={styles.stateTitle}>No moderators found</Text>

          <Text style={styles.stateSubtitle}>
            {search.trim().length >= 2
              ? "No moderators matched this search."
              : `There are no ${moderatorCountLabel} right now.`}
          </Text>
        </View>
      );
    }

    return null;
  }

  function renderListFooter() {
    if (isFetching && page > 1) {
      return (
        <View style={styles.infiniteFooter}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }

    return <View style={styles.footerSpacer} />;
  }

  if (!communityId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.centerWrap}>
          <Ionicons name="warning-outline" size={30} color={colors.warning} />

          <Text style={styles.centerTitle}>Community ID missing</Text>

          <Text style={styles.centerSubtitle}>
            Open this screen with communityId in the route params.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <FlatList
          data={moderators}
          keyExtractor={(moderator) => moderator.id}
          renderItem={({ item }) => <ModeratorCard moderator={item} />}
          ItemSeparatorComponent={() => (
            <View style={styles.moderatorSeparator} />
          )}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={renderListEmpty}
          ListFooterComponent={renderListFooter}
          style={styles.root}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: Math.max(130, insets.bottom + 120),
            },
            moderators.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          onEndReached={handleLoadMoreModerators}
          onEndReachedThreshold={0.35}
          onMomentumScrollBegin={() => {
            endReachedLockedRef.current = false;
          }}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={handlePullRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      </SafeAreaView>

      <Portal>
        <PaperModal
          visible={actionSheetVisible}
          onDismiss={closeActionSheet}
          contentContainerStyle={[
            styles.actionSheetContainer,
            {
              paddingBottom: Math.max(28, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={styles.moderatorInfo}>
              {selectedModerator ? (
                <ModeratorAvatar moderator={selectedModerator} />
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
              </View>
            </View>

            <Pressable
              onPress={closeActionSheet}
              disabled={isActionLoading}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.7 },
                isActionLoading && { opacity: 0.45 },
              ]}
            >
              <Ionicons name="close" size={21} color={colors.foreground} />
            </Pressable>
          </View>

          {selectedModerator ? (
            <View style={styles.permissionPreviewBox}>
              {getModeratorPermissions(selectedModerator).length > 0 ? (
                getModeratorPermissions(selectedModerator).map((permission) => (
                  <View key={permission} style={styles.permissionChip}>
                    <Text style={styles.permissionChipText}>
                      {getPermissionLabel(permission)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.permissionEmptyText}>
                  No extra permissions assigned.
                </Text>
              )}
            </View>
          ) : null}

          <View style={styles.actionList}>
            <ActionSheetButton
              icon="person-outline"
              label="View profile"
              onPress={() => handleModeratorAction("view")}
            />

            <ActionSheetButton
              icon="options-outline"
              label="Edit permissions"
              onPress={() => handleModeratorAction("editPermissions")}
            />

            <ActionSheetButton
              icon="analytics-outline"
              label="View activity"
              onPress={() => handleModeratorAction("activity")}
            />

            {selectedModerator?.status === "ACTIVE" ? (
              <ActionSheetButton
                icon="pause-circle-outline"
                label="Suspend moderator"
                danger
                onPress={() => handleModeratorAction("suspend")}
              />
            ) : (
              <ActionSheetButton
                icon="refresh-outline"
                label="Reactivate moderator"
                onPress={() => handleModeratorAction("reactivate")}
              />
            )}

            <ActionSheetButton
              icon="trash-outline"
              label={isRemovingModerator ? "Removing..." : "Remove moderator"}
              danger
              disabled={isActionLoading}
              onPress={() => handleModeratorAction("remove")}
            />
          </View>
        </PaperModal>
      </Portal>

      <Portal>
        <PaperModal
          visible={filterSheetVisible}
          onDismiss={() => setFilterSheetVisible(false)}
          contentContainerStyle={[
            styles.filterModalContainer,
            {
              paddingBottom: Math.max(28, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.filterModalHeader}>
            <View style={styles.filterTitleWrap}>
              <Text style={styles.filterModalTitle}>Filter moderators</Text>
              <Text style={styles.filterModalSubtitle}>
                Choose which moderator status you want to view.
              </Text>
            </View>

            <Pressable
              onPress={() => setFilterSheetVisible(false)}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="close" size={21} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.filterOptionList}>
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;

              return (
                <Pressable
                  key={filter.value}
                  onPress={() => handleStatusFilterChange(filter.value)}
                  style={({ pressed }) => [
                    styles.filterOption,
                    isActive && styles.filterOptionActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={styles.filterOptionLeft}>
                    <View
                      style={[
                        styles.filterOptionIcon,
                        isActive && styles.filterOptionIconActive,
                      ]}
                    >
                      <Ionicons
                        name={filter.icon}
                        size={19}
                        color={isActive ? colors.accent : colors.muted}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.filterOptionText,
                          isActive && { color: colors.accent },
                        ]}
                      >
                        {filter.label}
                      </Text>

                      <Text style={styles.filterOptionSubtext}>
                        Show {filter.label.toLowerCase()} moderators
                      </Text>
                    </View>
                  </View>

                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={23}
                      color={colors.accent}
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={22}
                      color={colors.border}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </PaperModal>
      </Portal>

      <RNModal
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
                  pressed && !isSubmittingPermissionForm
                    ? { opacity: 0.7 }
                    : null,
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
      </RNModal>
    </>
  );

  function ModeratorCard({ moderator }: { moderator: CommunityMemberItem }) {
    const name = moderator.user.name ?? "Unknown User";
    const email = moderator.user.email ?? "No email available";
    const role = formatLabel(moderator.role, "Moderator");
    const status = formatLabel(moderator.status, "Active");
    const statusColor =
      moderator.status === "BANNED"
        ? colors.danger
        : moderator.status === "LEFT"
          ? colors.muted
          : colors.accent;

    const permissions = getModeratorPermissions(moderator);

    return (
      <View style={styles.moderatorCard}>
        <View style={styles.cardTopRow}>
          <ModeratorAvatar moderator={moderator} />

          <View style={styles.cardMainText}>
            <Text numberOfLines={1} style={styles.moderatorName}>
              {name}
            </Text>

            <Text numberOfLines={1} style={styles.moderatorEmail}>
              {email}
            </Text>
          </View>

          <Pressable
            onPress={() => openActionSheet(moderator)}
            disabled={isActionLoading}
            hitSlop={8}
            style={({ pressed }) => [
              styles.moreButton,
              pressed && { opacity: 0.7 },
              isActionLoading && { opacity: 0.45 },
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.foreground}
            />
          </Pressable>
        </View>

        <View style={styles.cardDetailRow}>
          <View style={styles.detailPill}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={colors.muted}
            />

            <Text numberOfLines={1} style={styles.detailPillText}>
              {role}
            </Text>
          </View>

          <View style={styles.detailPill}>
            <Ionicons
              name="radio-button-on-outline"
              size={15}
              color={statusColor}
            />

            <Text
              numberOfLines={1}
              style={[styles.detailPillText, { color: statusColor }]}
            >
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.permissionRow}>
          {permissions.length > 0 ? (
            permissions.slice(0, 3).map((permission) => (
              <View key={permission} style={styles.cardPermissionChip}>
                <Text numberOfLines={1} style={styles.cardPermissionChipText}>
                  {getPermissionLabel(permission)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noPermissionText}>No extra permissions</Text>
          )}

          {permissions.length > 3 ? (
            <View style={styles.cardPermissionChip}>
              <Text style={styles.cardPermissionChipText}>
                +{permissions.length - 3}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  function ModeratorAvatar({ moderator }: { moderator: CommunityMemberItem }) {
    const imageUri = toAbsoluteFileUrl(moderator.user.image);

    return (
      <Avatar
        alt={moderator.user.name ?? "Moderator"}
        size="lg"
        variant="soft"
        color="success"
      >
        {imageUri ? (
          <Avatar.Image
            source={{
              uri: imageUri,
            }}
          />
        ) : null}

        <Avatar.Fallback>
          {getModeratorInitials(moderator.user.name)}
        </Avatar.Fallback>
      </Avatar>
    );
  }

  function ActionSheetButton({
    icon,
    label,
    danger,
    disabled,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    danger?: boolean;
    disabled?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.actionListItem,
          pressed && { opacity: 0.7 },
          disabled && { opacity: 0.45 },
        ]}
      >
        <View
          style={[
            styles.actionListIcon,
            danger && {
              borderColor: colors.danger,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={danger ? colors.danger : colors.accent}
          />
        </View>

        <Text
          style={[
            styles.actionListLabel,
            {
              color: danger ? colors.danger : colors.foreground,
            },
          ]}
        >
          {label}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={danger ? colors.danger : colors.muted}
        />
      </Pressable>
    );
  }
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      width: "100%",
      backgroundColor: colors.surface,
    },

    root: {
      flex: 1,
      width: "100%",
      backgroundColor: colors.surface,
    },

    listContent: {
      width: "100%",
    },

    emptyListContent: {
      flexGrow: 1,
    },

    header: {
      width: "100%",
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      color: colors.foreground,
      fontSize: 22,
      lineHeight: 29,
      fontFamily: "Poppins_700Bold",
    },

    subtitle: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    headerIconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },

    headerIconButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },

    headerAddButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    metaRow: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },

    metaChip: {
      minHeight: 34,
      maxWidth: "75%",
      paddingHorizontal: 11,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    metaChipText: {
      color: colors.foreground,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },

    smallLoaderChip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },

    searchBox: {
      marginHorizontal: 16,
      marginBottom: 12,
      height: 50,
      borderRadius: 25,
      paddingLeft: 12,
      paddingRight: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },

    searchInput: {
      flex: 1,
      minWidth: 0,
      height: "100%",
      paddingVertical: 0,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_400Regular",
    },

    searchHint: {
      marginTop: -5,
      marginHorizontal: 20,
      marginBottom: 12,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    clearSearchButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    moderatorSeparator: {
      height: 12,
    },

    moderatorCard: {
      marginHorizontal: 16,
      borderRadius: 24,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },

    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    cardMainText: {
      flex: 1,
      minWidth: 0,
    },

    moderatorName: {
      color: colors.foreground,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: "Poppins_700Bold",
    },

    moderatorEmail: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    moreButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    cardDetailRow: {
      marginTop: 14,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    detailPill: {
      minHeight: 34,
      maxWidth: "48%",
      paddingHorizontal: 10,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    detailPillText: {
      flexShrink: 1,
      color: colors.foreground,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },

    permissionRow: {
      marginTop: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },

    cardPermissionChip: {
      maxWidth: "48%",
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    cardPermissionChipText: {
      color: colors.foreground,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    noPermissionText: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    infiniteFooter: {
      height: 56,
      alignItems: "center",
      justifyContent: "center",
    },

    footerSpacer: {
      height: 28,
    },

    centerWrap: {
      flex: 1,
      width: "100%",
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

    stateCard: {
      marginHorizontal: 16,
      paddingVertical: 34,
      paddingHorizontal: 18,
      borderRadius: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },

    stateIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 10,
    },

    stateTitle: {
      marginTop: 10,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Poppins_700Bold",
    },

    stateSubtitle: {
      marginTop: 4,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      fontFamily: "Poppins_400Regular",
    },

    actionSheetContainer: {
      marginHorizontal: 0,
      marginBottom: 0,
      marginTop: "auto",
      width: "100%",
      backgroundColor: colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: colors.border,
    },

    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },

    sheetHeader: {
      paddingHorizontal: 18,
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
      minWidth: 0,
    },

    sheetTitle: {
      color: colors.foreground,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },

    sheetSubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    permissionPreviewBox: {
      marginHorizontal: 18,
      marginTop: 16,
      padding: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },

    permissionChip: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    permissionChipText: {
      color: colors.foreground,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    permissionEmptyText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    actionList: {
      paddingHorizontal: 18,
      paddingTop: 14,
      gap: 10,
    },

    actionListItem: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    actionListIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    actionListLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    filterModalContainer: {
      marginHorizontal: 0,
      marginBottom: 0,
      marginTop: "auto",
      width: "100%",
      backgroundColor: colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: colors.border,
    },

    filterModalHeader: {
      paddingHorizontal: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    filterTitleWrap: {
      flex: 1,
    },

    filterModalTitle: {
      color: colors.foreground,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },

    filterModalSubtitle: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    filterOptionList: {
      paddingHorizontal: 18,
      paddingTop: 14,
      gap: 10,
    },

    filterOption: {
      minHeight: 60,
      borderRadius: 20,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    filterOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },

    filterOptionLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    filterOptionIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    filterOptionIconActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSecondary,
    },

    filterOptionText: {
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    filterOptionSubtext: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
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