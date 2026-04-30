// app/user/community-dashboard/(tabs)/moderator.tsx

import React, { useMemo, useState } from "react";
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

import DataTable, {
  useDataTableState,
} from "@/components/common/data-table";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  communityModeratorsMock,
  type CommunityDashboardModerator,
} from "@/mocks/moderator";
import {
  createModeratorColumns,
  createModeratorFilters,
  getModeratorInitials,
  getPermissionLabel,
  type ModeratorAction,
} from "@/components/column/user-community/moderator.columns";

export default function ModeratorScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedModerator, setSelectedModerator] =
    useState<CommunityDashboardModerator | null>(null);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const openActionSheet = (moderator: CommunityDashboardModerator) => {
    setSelectedModerator(moderator);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedModerator(null);
  };

  const handleModeratorAction = (action: ModeratorAction) => {
    if (!selectedModerator) return;

    const actionLabel: Record<ModeratorAction, string> = {
      view: "View profile",
      message: "Message",
      editPermissions: "Edit permissions",
      activity: "View activity",
      suspend: "Suspend moderator",
      reactivate: "Reactivate moderator",
      remove: "Remove moderator",
    };

    const moderatorName = selectedModerator.name;

    closeActionSheet();

    Alert.alert(
      actionLabel[action],
      `${actionLabel[action]}: ${moderatorName}`,
    );
  };

  const columns = useMemo(
    () =>
      createModeratorColumns({
        colors,
        onActionPress: openActionSheet,
      }),
    [colors],
  );

  const filters = useMemo(() => createModeratorFilters(), []);

  const table = useDataTableState({
    data: communityModeratorsMock,
    columns,
    filters,
    initialSort: {
      key: "assignedAt",
      direction: "desc",
    },
    initialPageSize: 10,
  });

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DataTable
          rows={table.rows}
          columns={columns}
          rowKey={(row) => row.id}
          searchValue={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search moderators"
          filters={filters}
          activeFilters={table.activeFilters}
          onFilterChange={table.handleFilterChange}
          sortBy={table.sortBy}
          sortDirection={table.sortDirection}
          onSortChange={table.handleSortChange}
          emptyTitle="No moderators found"
          emptySubtitle="Try searching another moderator or changing the status filter."
          pagination={{
            page: table.page,
            pageSize: table.pageSize,
            totalItems: table.filteredCount,
            totalPages: table.totalPages,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
            pageSizeOptions: [5, 10, 20],
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
            <View style={styles.moderatorInfo}>
              {selectedModerator ? (
                <Avatar alt="" size="lg" variant="soft" color="success">
                  <Avatar.Image source={{ uri: selectedModerator.avatar }} />
                  <Avatar.Fallback>
                    {getModeratorInitials(selectedModerator.name)}
                  </Avatar.Fallback>
                </Avatar>
              ) : null}
              <View style={styles.moderatorTextWrap}>
                <Text numberOfLines={1} style={styles.sheetTitle}>
                  {selectedModerator?.name ?? "Moderator"}
                </Text>

                <Text numberOfLines={1} style={styles.sheetSubtitle}>
                  Manage this moderator
                </Text>

                {selectedModerator ? (
                  <View style={styles.permissionPreview}>
                    {selectedModerator.permissions.map((permission) => (
                      <View key={permission} style={styles.permissionChip}>
                        <Text style={styles.permissionChipText}>
                          {getPermissionLabel(permission)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            <Pressable
              onPress={closeActionSheet}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="close" size={21} color={colors.foreground} />
            </Pressable>
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
            ) : null}

            {selectedModerator?.status === "SUSPENDED" ? (
              <GridAction
                icon="refresh-outline"
                label="Reactivate"
                onPress={() => handleModeratorAction("reactivate")}
              />
            ) : null}

            <GridAction
              icon="trash-outline"
              label="Remove"
              danger
              onPress={() => handleModeratorAction("remove")}
            />
          </View>
        </Modal>
      </Portal>
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
      alignItems: "flex-start",
      gap: 12,
    },

    moderatorInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    moderatorTextWrap: {
      flex: 1,
    },

    sheetTitle: {
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    sheetSubtitle: {
      marginTop: 2,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    permissionPreview: {
      marginTop: 10,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

    permissionChip: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    permissionChipText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
      color: colors.accent,
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