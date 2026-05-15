import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "heroui-native";
import { Modal, Portal } from "react-native-paper";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";

import DataTable from "@/components/common/data-table";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  createMemberColumns,
  createMemberFilters,
  getMemberInitials,
  type MemberAction,
} from "@/components/column/user-community/member.columns";
import {
  useBanCommunityMemberMutation,
  useGetCommunityMembersQuery,
  useRemoveCommunityMemberMutation,
  useUnbanCommunityMemberMutation,
} from "@/store/api/communityMemberManagementApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityMemberItem } from "@/types/community";

type MemberStatusFilter = "ACTIVE" | "LEFT" | "BANNED";

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

export default function MemberScreen() {
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

  /**
   * In nested Expo Router tabs, local params can be empty.
   * This fallback reads global params too.
   */
  const communityId =
    getParamValue(localParams.communityId) ||
    getParamValue(globalParams.communityId) ||
    getParamValue(localParams.id) ||
    getParamValue(globalParams.id);

  const [selectedMember, setSelectedMember] =
    useState<CommunityMemberItem | null>(null);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  /**
   * DataTable page is 0-based.
   * Backend page is 1-based.
   */
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: "ACTIVE",
  });

  const statusFilter = activeFilters.status as MemberStatusFilter;

  const [banCommunityMember, { isLoading: isBanning }] =
    useBanCommunityMemberMutation();

  const [unbanCommunityMember, { isLoading: isUnbanning }] =
    useUnbanCommunityMemberMutation();

  const [removeCommunityMember, { isLoading: isRemoving }] =
    useRemoveCommunityMemberMutation();

  const isActionLoading = isBanning || isUnbanning || isRemoving;

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
    data: membersResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityMembersQuery(
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

  const members = membersResponse?.data ?? [];

  const canManageMembers =
    membersResponse?.viewer?.isOwner === true ||
    membersResponse?.viewer?.canManageMembers === true;

  const columns = useMemo(
    () =>
      createMemberColumns({
        colors,
        canManageMembers,
        onActionPress: openActionSheet,
      }),
    [colors, canManageMembers],
  );

  const filters = useMemo(() => createMemberFilters(), []);

  function handleFilterChange(key: string, value: string) {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPage(0);
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(0);
  }

  function openActionSheet(member: CommunityMemberItem) {
    setSelectedMember(member);
    setActionSheetVisible(true);
  }

  function closeActionSheet() {
    setActionSheetVisible(false);
    setSelectedMember(null);
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

      /**
       * RTK invalidates tags, but explicit refetch gives instant table update
       * on the current screen.
       */
      await refetch();
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

    if (action === "message") {
      closeActionSheet();
      Alert.alert("Message", `Message: ${memberName}`);
      return;
    }

    if (action === "ban" || action === "unban" || action === "remove") {
      confirmMemberAction(action, member);
    }
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
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Community Members</Text>

            <Text style={styles.subtitle}>
              {membersResponse?.meta?.total ?? 0}{" "}
              {statusFilter === "ACTIVE"
                ? "active members"
                : statusFilter === "BANNED"
                  ? "banned members"
                  : "left members"}
            </Text>
          </View>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.accent} />

            <Text style={styles.retryText}>Refresh</Text>
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
              <Text style={styles.errorTitle}>Failed to load members</Text>

              <Text style={styles.errorMessage}>
                Please check that the logged-in user is the owner or has joined
                this community.
              </Text>
            </View>
          </View>
        ) : null}

        <DataTable
          rows={members}
          columns={columns}
          rowKey={(row) => row.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search members"
          filters={canManageMembers ? filters : []}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          emptyTitle={error ? "Failed to load members" : "No members found"}
          emptySubtitle={
            error
              ? "Tap refresh and try again."
              : "No members matched this search."
          }
          isLoading={isLoading}
          isFetching={isFetching || isActionLoading}
          pagination={{
            page,
            pageSize,
            totalItems: membersResponse?.meta?.total ?? 0,
            totalPages: Math.max(1, membersResponse?.meta?.totalPages ?? 1),
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
            pageSizeOptions: [10, 20, 50],
          }}
        />
      </ScrollView>

      <Portal>
        <Modal
          visible={actionSheetVisible}
          onDismiss={closeActionSheet}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={styles.memberInfo}>
              {selectedMember ? (
                <Avatar
                  alt={selectedMember.user.name ?? "Member"}
                  size="lg"
                  variant="soft"
                  color="success"
                >
                  {toAbsoluteFileUrl(selectedMember.user.image) ? (
                    <Avatar.Image
                      source={{
                        uri: toAbsoluteFileUrl(selectedMember.user.image)!,
                      }}
                    />
                  ) : null}

                  <Avatar.Fallback>
                    {getMemberInitials(selectedMember.user.name)}
                  </Avatar.Fallback>
                </Avatar>
              ) : null}

              <View style={styles.memberTextWrap}>
                <Text numberOfLines={1} style={styles.sheetTitle}>
                  {selectedMember?.user.name ?? "Member"}
                </Text>

                <Text numberOfLines={1} style={styles.sheetSubtitle}>
                  {selectedMember?.user.email ??
                    selectedMember?.role ??
                    "Community member"}
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

          <View style={styles.actionGrid}>
            <GridAction
              icon="person-outline"
              label="View profile"
              disabled={isActionLoading}
              onPress={() => handleMemberAction("view")}
            />

            <GridAction
              icon="chatbubble-outline"
              label="Message"
              disabled={isActionLoading}
              onPress={() => handleMemberAction("message")}
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
    </>
  );

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

    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor: colors.surfaceSecondary,
    },

    retryText: {
      color: colors.accent,
      fontSize: 13,
      fontFamily: "Poppins_600SemiBold",
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

    modalContainer: {
      marginHorizontal: 0,
      marginBottom: 0,
      marginTop: "auto",
      backgroundColor: colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: 10,
      paddingBottom: 28,
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
  });
}