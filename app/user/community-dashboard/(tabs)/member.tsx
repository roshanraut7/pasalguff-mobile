import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import { Avatar } from "heroui-native";
import { Modal, Portal } from "react-native-paper";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useBanCommunityMemberMutation,
  useGetCommunityMembersQuery,
  useRemoveCommunityMemberMutation,
  useUnbanCommunityMemberMutation,
} from "@/store/api/communityMemberManagementApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityMemberItem } from "@/types/community";

type MemberStatusFilter = "ACTIVE" | "LEFT" | "BANNED";
type MemberAction = "view" | "ban" | "unban" | "remove";

type StatusFilterOption = {
  label: string;
  value: MemberStatusFilter;
  icon: keyof typeof Ionicons.glyphMap;
};

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

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Something went wrong. Please try again.";
  }

  const apiError = error as {
    data?: {
      message?: string | string[];
      error?: string;
    };
    error?: string;
    status?: number | string;
  };

  const message = apiError.data?.message;

  if (Array.isArray(message)) {
    return message.join("\n");
  }

  if (typeof message === "string") {
    return message;
  }

  if (typeof apiError.data?.error === "string") {
    return apiError.data.error;
  }

  if (typeof apiError.error === "string") {
    return apiError.error;
  }

  return "Something went wrong. Please try again.";
}

function getMemberInitials(name?: string | null) {
  if (!name) return "M";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() || "M";
  }

  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
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

export default function MemberScreen() {
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

  const [selectedMember, setSelectedMember] =
    useState<CommunityMemberItem | null>(null);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [accumulatedMembers, setAccumulatedMembers] = useState<
    CommunityMemberItem[]
  >([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<MemberStatusFilter>("ACTIVE");

  const [banCommunityMember, { isLoading: isBanning }] =
    useBanCommunityMemberMutation();

  const [unbanCommunityMember, { isLoading: isUnbanning }] =
    useUnbanCommunityMemberMutation();

  const [removeCommunityMember, { isLoading: isRemoving }] =
    useRemoveCommunityMemberMutation();

  const isActionLoading = isBanning || isUnbanning || isRemoving;

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
    setAccumulatedMembers([]);
    setStatusFilter("ACTIVE");
    setIsSearchOpen(false);
    setFilterSheetVisible(false);
    setActionSheetVisible(false);
    endReachedLockedRef.current = false;
  }, [communityId]);

  useEffect(() => {
    setPage(1);
    setAccumulatedMembers([]);
    endReachedLockedRef.current = false;
  }, [debouncedSearch, statusFilter]);

  const {
    data: membersResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityMembersQuery(
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

  const members = accumulatedMembers;
  const totalItems = membersResponse?.meta?.total ?? 0;
  const totalPages = Math.max(1, membersResponse?.meta?.totalPages ?? 1);
  const hasNextPage = page < totalPages;

  const canManageMembers =
    membersResponse?.viewer?.isOwner === true ||
    membersResponse?.viewer?.canManageMembers === true;

  const selectedStatusFilter =
    STATUS_FILTERS.find((filter) => filter.value === statusFilter) ??
    STATUS_FILTERS[0];

  const memberCountLabel =
    statusFilter === "ACTIVE"
      ? "active members"
      : statusFilter === "BANNED"
        ? "banned members"
        : "left members";

  const showInitialLoading =
    (isLoading || (isFetching && page === 1)) && members.length === 0;

  const showEmptyState =
    !showInitialLoading &&
    !isFetching &&
    !error &&
    members.length === 0;

  useEffect(() => {
    const incomingMembers = membersResponse?.data;

    if (!incomingMembers) return;

    endReachedLockedRef.current = false;

    setAccumulatedMembers((previousMembers) => {
      if (page === 1) {
        return incomingMembers;
      }

      const existingIds = new Set(previousMembers.map((member) => member.id));

      const uniqueNewMembers = incomingMembers.filter(
        (member) => !existingIds.has(member.id),
      );

      return [...previousMembers, ...uniqueNewMembers];
    });
  }, [membersResponse?.data, page]);

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

  function handleStatusFilterChange(nextStatus: MemberStatusFilter) {
    setFilterSheetVisible(false);

    if (nextStatus === statusFilter) return;

    setStatusFilter(nextStatus);
  }

  function handleLoadMoreMembers() {
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
        setAccumulatedMembers(refreshed.data.data);
      }
    } finally {
      setIsPullRefreshing(false);
    }
  }

  function openActionSheet(member: CommunityMemberItem) {
    setSelectedMember(member);
    setActionSheetVisible(true);
  }

  function closeActionSheet() {
    setActionSheetVisible(false);
    setSelectedMember(null);
  }

  async function refreshFirstPageAfterAction(member: CommunityMemberItem) {
    setAccumulatedMembers((previousMembers) =>
      previousMembers.filter(
        (previousMember) => previousMember.userId !== member.userId,
      ),
    );

    endReachedLockedRef.current = false;

    if (page === 1) {
      const refreshed = await refetch();

      if ("data" in refreshed && refreshed.data?.data) {
        setAccumulatedMembers(refreshed.data.data);
      }

      return;
    }

    setPage(1);
  }

  async function runMemberMutation(
    action: Extract<MemberAction, "ban" | "unban" | "remove">,
    member: CommunityMemberItem,
  ) {
    if (!communityId) return;

    const memberName = member.user.name ?? "Unknown User";

    try {
      if (action === "ban") {
        await banCommunityMember({
          communityId,
          targetUserId: member.userId,
          reason: "Banned by community admin",
        }).unwrap();

        Alert.alert("Member banned", `${memberName} has been banned.`);
      }

      if (action === "unban") {
        await unbanCommunityMember({
          communityId,
          targetUserId: member.userId,
          reason: "Unbanned by community admin",
        }).unwrap();

        Alert.alert("Member unbanned", `${memberName} can join again.`);
      }

      if (action === "remove") {
        await removeCommunityMember({
          communityId,
          targetUserId: member.userId,
          reason: "Removed by community admin",
        }).unwrap();

        Alert.alert("Member removed", `${memberName} has been removed.`);
      }

      await refreshFirstPageAfterAction(member);
    } catch (mutationError) {
      Alert.alert("Action failed", getErrorMessage(mutationError));
    }
  }

  function confirmMemberAction(
    action: Extract<MemberAction, "ban" | "unban" | "remove">,
    member: CommunityMemberItem,
  ) {
    const memberName = member.user.name ?? "Unknown User";

    const actionConfig: Record<
      Extract<MemberAction, "ban" | "unban" | "remove">,
      {
        title: string;
        message: string;
        confirmText: string;
        confirmStyle: "default" | "destructive";
      }
    > = {
      ban: {
        title: "Ban member?",
        message: `Are you sure you want to ban ${memberName}? This user will not be able to join this community again until you unban them.`,
        confirmText: "Ban",
        confirmStyle: "destructive",
      },
      unban: {
        title: "Unban member?",
        message: `Are you sure you want to unban ${memberName}? This user will be allowed to join/request again.`,
        confirmText: "Unban",
        confirmStyle: "default",
      },
      remove: {
        title: "Remove member?",
        message: `Are you sure you want to remove ${memberName}? This will remove them from the community, but they can join again later.`,
        confirmText: "Remove",
        confirmStyle: "destructive",
      },
    };

    const config = actionConfig[action];

    closeActionSheet();

    Alert.alert(config.title, config.message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: config.confirmText,
        style: config.confirmStyle,
        onPress: () => {
          void runMemberMutation(action, member);
        },
      },
    ]);
  }

  function handleMemberAction(action: MemberAction) {
    if (!selectedMember || isActionLoading) return;

    const member = selectedMember;
    const memberName = member.user.name ?? "Unknown User";

    if (action === "view") {
      closeActionSheet();
      Alert.alert("View profile", `View profile: ${memberName}`);
      return;
    }

    if (action === "ban" || action === "unban" || action === "remove") {
      confirmMemberAction(action, member);
    }
  }

  function renderListHeader() {
    return (
      <>
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Community Members</Text>

            <Text style={styles.subtitle}>
              {totalItems} {memberCountLabel}
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

            {canManageMembers ? (
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
            ) : null}
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

          {(isFetching || isActionLoading) && members.length > 0 ? (
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
                placeholder="Search members"
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
              <Text style={styles.errorTitle}>Failed to load members</Text>

              <Text style={styles.errorMessage}>
                Please check that the logged-in user is the owner or has joined
                this community.
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
          <Text style={styles.stateTitle}>Loading members...</Text>
          <Text style={styles.stateSubtitle}>
            Please wait while we prepare the member list.
          </Text>
        </View>
      );
    }

    if (showEmptyState) {
      return (
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="people-outline" size={25} color={colors.muted} />
          </View>

          <Text style={styles.stateTitle}>No members found</Text>

          <Text style={styles.stateSubtitle}>
            {search.trim().length >= 2
              ? "No members matched this search."
              : `There are no ${memberCountLabel} right now.`}
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
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <FlatList
        data={members}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => <MemberCard member={item} />}
        ItemSeparatorComponent={() => <View style={styles.memberSeparator} />}
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={renderListFooter}
        style={styles.root}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: Math.max(130, insets.bottom + 120),
          },
          members.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        onEndReached={handleLoadMoreMembers}
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

      <Portal>
        <Modal
          visible={actionSheetVisible}
          onDismiss={closeActionSheet}
          contentContainerStyle={[
            styles.modalContainer,
            {
              paddingBottom: Math.max(28, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={styles.memberInfo}>
              {selectedMember ? <MemberAvatar member={selectedMember} /> : null}

              <View style={styles.memberTextWrap}>
                <Text numberOfLines={1} style={styles.sheetTitle}>
                  {selectedMember?.user.name ?? "Member"}
                </Text>

                <Text numberOfLines={1} style={styles.sheetSubtitle}>
                  {selectedMember?.user.email ??
                    formatLabel(selectedMember?.role, "Community member")}
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

          <View style={styles.sheetDetailBox}>
            <DetailItem
              icon="shield-checkmark-outline"
              label="Role"
              value={formatLabel(selectedMember?.role, "Member")}
            />

            <DetailItem
              icon="radio-button-on-outline"
              label="Status"
              value={formatLabel(selectedMember?.status, "Active")}
            />
          </View>

          <View style={styles.actionGrid}>
            <GridAction
              icon="person-outline"
              label="View profile"
              disabled={isActionLoading}
              onPress={() => handleMemberAction("view")}
            />

            {canManageMembers && selectedMember?.status === "ACTIVE" ? (
              <GridAction
                icon="ban-outline"
                label={isBanning ? "Banning..." : "Ban"}
                danger
                disabled={isActionLoading}
                onPress={() => handleMemberAction("ban")}
              />
            ) : null}

            {canManageMembers && selectedMember?.status === "BANNED" ? (
              <GridAction
                icon="refresh-outline"
                label={isUnbanning ? "Unbanning..." : "Unban"}
                disabled={isActionLoading}
                onPress={() => handleMemberAction("unban")}
              />
            ) : null}

            {canManageMembers && selectedMember?.status === "ACTIVE" ? (
              <GridAction
                icon="trash-outline"
                label={isRemoving ? "Removing..." : "Remove"}
                danger
                disabled={isActionLoading}
                onPress={() => handleMemberAction("remove")}
              />
            ) : null}

            {canManageMembers && selectedMember?.status === "LEFT" ? (
              <GridAction
                icon="ban-outline"
                label={isBanning ? "Banning..." : "Ban"}
                danger
                disabled={isActionLoading}
                onPress={() => handleMemberAction("ban")}
              />
            ) : null}
          </View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
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
              <Text style={styles.filterModalTitle}>Filter members</Text>
              <Text style={styles.filterModalSubtitle}>
                Choose which member status you want to view.
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
                        Show {filter.label.toLowerCase()} members
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
        </Modal>
      </Portal>
    </SafeAreaView>
  );

  function MemberCard({ member }: { member: CommunityMemberItem }) {
    const name = member.user.name ?? "Unknown User";
    const email = member.user.email ?? "No email available";
    const role = formatLabel(member.role, "Member");
    const status = formatLabel(member.status, "Active");
    const statusColor =
      member.status === "BANNED"
        ? colors.danger
        : member.status === "LEFT"
          ? colors.muted
          : colors.accent;

    return (
      <View style={styles.memberCard}>
        <View style={styles.cardTopRow}>
          <MemberAvatar member={member} />

          <View style={styles.cardMainText}>
            <Text numberOfLines={1} style={styles.memberName}>
              {name}
            </Text>

            <Text numberOfLines={1} style={styles.memberEmail}>
              {email}
            </Text>
          </View>

          {canManageMembers ? (
            <Pressable
              onPress={() => openActionSheet(member)}
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
          ) : null}
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
      </View>
    );
  }

  function MemberAvatar({ member }: { member: CommunityMemberItem }) {
    const imageUri = toAbsoluteFileUrl(member.user.image);

    return (
      <Avatar
        alt={member.user.name ?? "Member"}
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

        <Avatar.Fallback>{getMemberInitials(member.user.name)}</Avatar.Fallback>
      </Avatar>
    );
  }

  function DetailItem({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.detailItem}>
        <View style={styles.detailIconWrap}>
          <Ionicons name={icon} size={17} color={colors.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text numberOfLines={1} style={styles.detailValue}>
            {value}
          </Text>
        </View>
      </View>
    );
  }

  function GridAction({
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
          styles.gridAction,
          pressed && { opacity: 0.65 },
          disabled && { opacity: 0.45 },
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
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    headerIconButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
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
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },

    memberSeparator: {
      height: 12,
    },

    memberCard: {
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

    memberName: {
      color: colors.foreground,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: "Poppins_700Bold",
    },

    memberEmail: {
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

    modalContainer: {
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

    memberInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    memberTextWrap: {
      flex: 1,
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

    sheetDetailBox: {
      marginHorizontal: 18,
      marginTop: 16,
      padding: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      gap: 10,
    },

    detailItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    detailIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    detailLabel: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },

    detailValue: {
      marginTop: 1,
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    actionGrid: {
      paddingHorizontal: 22,
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
  });
}