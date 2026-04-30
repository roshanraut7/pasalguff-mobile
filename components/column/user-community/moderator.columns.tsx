// components/column/user-community/moderator.columns.tsx

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Menu } from "heroui-native";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { AppColors } from "@/constants/theme";
import type {
  CommunityDashboardModerator,
  CommunityModeratorPermission,
  CommunityModeratorStatus,
} from "@/mocks/moderator";

export type ModeratorAction =
  | "view"
  | "message"
  | "editPermissions"
  | "activity"
  | "suspend"
  | "reactivate"
  | "remove";

type CreateModeratorColumnsParams = {
  colors: AppColors;
  onActionPress: (moderator: CommunityDashboardModerator) => void;
};

export function getModeratorInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "U";

  if (parts.length === 1) {
    return parts[0][0]?.toUpperCase() ?? "U";
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function getPermissionLabel(permission: CommunityModeratorPermission) {
  const labels: Record<CommunityModeratorPermission, string> = {
    POSTS: "Posts",
    REPORTS: "Reports",
    REQUESTS: "Requests",
    BAN: "Ban",
    PIN: "Pin",
    COMMENTS: "Comments",
  };

  return labels[permission];
}

function formatAssignedDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: CommunityModeratorStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusColors(status: CommunityModeratorStatus, colors: AppColors) {
  if (status === "ACTIVE") {
    return {
      text: colors.success,
      background: "rgba(34, 197, 94, 0.10)",
      border: "rgba(34, 197, 94, 0.22)",
    };
  }

  return {
    text: colors.danger,
    background: "rgba(220, 38, 38, 0.10)",
    border: "rgba(220, 38, 38, 0.22)",
  };
}

function ModeratorCell({
  row,
  colors,
}: {
  row: CommunityDashboardModerator;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <View style={styles.moderatorCell}>
      <Avatar alt="" size="sm" variant="soft" color="success">
        <Avatar.Image source={{ uri: row.avatar }} />
        <Avatar.Fallback>{getModeratorInitials(row.name)}</Avatar.Fallback>
      </Avatar>

      <Text numberOfLines={1} style={styles.moderatorName}>
        {row.name}
      </Text>
    </View>
  );
}

function PermissionsCell({
  row,
  colors,
}: {
  row: CommunityDashboardModerator;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <View style={styles.permissionCell}>
      <Menu>
        <Menu.Trigger asChild>
          <Pressable
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons name="key-outline" size={14} color={colors.accent} />

            <Text numberOfLines={1} style={styles.permissionButtonText}>
              {row.permissions.length} Permissions
            </Text>

            <Ionicons name="chevron-down" size={14} color={colors.accent} />
          </Pressable>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Overlay />

          <Menu.Content
            presentation="popover"
            placement="bottom"
            align="center"
            width={180}
            style={styles.permissionMenuContent}
          >
            {row.permissions.map((permission) => (
              <Menu.Item key={permission}>
                <View style={styles.permissionMenuItem}>
                  <View style={styles.permissionDot} />

                  <Text numberOfLines={1} style={styles.permissionMenuItemText}>
                    {getPermissionLabel(permission)}
                  </Text>
                </View>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </View>
  );
}

function AssignedCell({
  row,
  colors,
}: {
  row: CommunityDashboardModerator;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <Text numberOfLines={1} style={styles.assignedText}>
      {formatAssignedDate(row.assignedAt)}
    </Text>
  );
}

function StatusCell({
  status,
  colors,
}: {
  status: CommunityModeratorStatus;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);
  const statusColors = getStatusColors(status, colors);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: statusColors.background,
          borderColor: statusColors.border,
        },
      ]}
    >
      <Text style={[styles.statusText, { color: statusColors.text }]}>
        {getStatusLabel(status)}
      </Text>
    </View>
  );
}

function ActionCell({
  row,
  colors,
  onActionPress,
}: {
  row: CommunityDashboardModerator;
  colors: AppColors;
  onActionPress: (moderator: CommunityDashboardModerator) => void;
}) {
  const styles = createColumnStyles(colors);

  return (
    <Pressable
      onPress={() => onActionPress(row)}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Ionicons name="ellipsis-vertical" size={20} color={colors.foreground} />
    </Pressable>
  );
}

export function createModeratorColumns({
  colors,
  onActionPress,
}: CreateModeratorColumnsParams): DataTableColumn<CommunityDashboardModerator>[] {
  return [
    {
      key: "name",
      label: "Moderator",
      width: 220,
      searchable: true,
      sortable: true,
      getSearchValue: (row) => row.name,
      getSortValue: (row) => row.name,
      render: (row) => <ModeratorCell row={row} colors={colors} />,
    },
    {
      key: "permissions",
      label: "Permissions",
      width: 180,
      searchable: true,
      getSearchValue: (row) => row.permissions.join(" "),
      render: (row) => <PermissionsCell row={row} colors={colors} />,
    },
    {
      key: "assignedAt",
      label: "Assigned",
      width: 145,
      sortable: true,
      getSortValue: (row) => new Date(row.assignedAt).getTime(),
      render: (row) => <AssignedCell row={row} colors={colors} />,
    },
    {
      key: "status",
      label: "Status",
      width: 130,
      searchable: true,
      sortable: true,
      align: "center",
      getSearchValue: (row) => row.status,
      getSortValue: (row) => row.status,
      render: (row) => <StatusCell status={row.status} colors={colors} />,
    },
    {
      key: "actions",
      label: "Action",
      width: 95,
      align: "right",
      render: (row) => (
        <ActionCell
          row={row}
          colors={colors}
          onActionPress={onActionPress}
        />
      ),
    },
  ];
}

export function createModeratorFilters(): DataTableFilterConfig<CommunityDashboardModerator>[] {
  return [
    {
      key: "status",
      label: "Status",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "Active", value: "ACTIVE" },
        { label: "Suspended", value: "SUSPENDED" },
      ],
      predicate: (row, value) => {
        if (value === "ALL") return true;

        return row.status === value;
      },
    },
  ];
}

function createColumnStyles(colors: AppColors) {
  return StyleSheet.create({
    moderatorCell: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      overflow: "hidden",
    },

    moderatorName: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },

    permissionCell: {
      width: "100%",
      alignItems: "flex-start",
      justifyContent: "center",
    },

    permissionButton: {
      width: 155,
      minHeight: 36,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },

    permissionButtonText: {
      flex: 1,
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
      color: colors.accent,
    },

    permissionMenuContent: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 10,
    },

    permissionMenuItem: {
      minHeight: 38,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    permissionDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },

    permissionMenuItemText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
      color: colors.foreground,
    },

    assignedText: {
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    statusBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },

    statusText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    actionButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}