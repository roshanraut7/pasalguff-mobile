import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Menu } from "heroui-native";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityMemberItem } from "@/types/community";
import { useAppTheme } from "@/hooks/useAppTheme";

type AppColors = ReturnType<typeof useAppTheme>["colors"];

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
  onActionPress: (moderator: CommunityMemberItem) => void;
};

type PermissionKey =
  | "canEditCommunity"
  | "canManageMembers"
  | "canManagePosts"
  | "canManageComments"
  | "canManageReports";

const permissionLabels: Record<PermissionKey, string> = {
  canEditCommunity: "Edit Community",
  canManageMembers: "Manage Members",
  canManagePosts: "Manage Posts",
  canManageComments: "Manage Comments",
  canManageReports: "Manage Reports",
};

export function getModeratorInitials(name?: string | null) {
  const safeName = name?.trim() || "Unknown User";
  const parts = safeName.split(" ").filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "U";

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function getModeratorPermissions(row: CommunityMemberItem) {
  const permissions = row.permissions;

  if (!permissions) return [];

  const keys: PermissionKey[] = [
    "canEditCommunity",
    "canManageMembers",
    "canManagePosts",
    "canManageComments",
    "canManageReports",
  ];

  return keys.filter((key) => permissions[key] === true);
}

export function getPermissionLabel(permission: PermissionKey) {
  return permissionLabels[permission];
}

function formatAssignedDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status?: CommunityMemberItem["status"]) {
  if (!status) return "-";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusColors(
  status: CommunityMemberItem["status"] | undefined,
  colors: AppColors,
) {
  if (status === "ACTIVE") {
    return {
      text: colors.success,
      background: "rgba(34, 197, 94, 0.10)",
      border: "rgba(34, 197, 94, 0.22)",
    };
  }

  if (status === "BANNED") {
    return {
      text: colors.danger,
      background: "rgba(220, 38, 38, 0.10)",
      border: "rgba(220, 38, 38, 0.22)",
    };
  }

  return {
    text: colors.muted,
    background: colors.surfaceSecondary,
    border: colors.border,
  };
}

function ModeratorCell({
  row,
  colors,
}: {
  row: CommunityMemberItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);
  const name = row.user.name ?? "Unknown User";
  const avatarUrl = toAbsoluteFileUrl(row.user.image) ?? undefined;

  return (
    <View style={styles.moderatorCell}>
      <Avatar alt={name} size="sm" variant="soft" color="success">
        {avatarUrl ? <Avatar.Image source={{ uri: avatarUrl }} /> : null}
        <Avatar.Fallback>{getModeratorInitials(name)}</Avatar.Fallback>
      </Avatar>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.moderatorName}>
          {name}
        </Text>

        <Text numberOfLines={1} style={styles.moderatorSubText}>
          {row.user.email ?? row.role}
        </Text>
      </View>
    </View>
  );
}

function RoleCell({
  row,
  colors,
}: {
  row: CommunityMemberItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <Text numberOfLines={1} style={styles.roleText}>
      {row.role}
    </Text>
  );
}

function PermissionsCell({
  row,
  colors,
}: {
  row: CommunityMemberItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);
  const permissions = getModeratorPermissions(row);

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
              {permissions.length} Permissions
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
            width={220}
            style={styles.permissionMenuContent}
          >
            {permissions.length === 0 ? (
              <Menu.Item>
                <View style={styles.permissionMenuItem}>
                  <Text numberOfLines={1} style={styles.permissionMenuItemText}>
                    No permissions
                  </Text>
                </View>
              </Menu.Item>
            ) : (
              permissions.map((permission) => (
                <Menu.Item key={permission}>
                  <View style={styles.permissionMenuItem}>
                    <View style={styles.permissionDot} />

                    <Text
                      numberOfLines={1}
                      style={styles.permissionMenuItemText}
                    >
                      {getPermissionLabel(permission)}
                    </Text>
                  </View>
                </Menu.Item>
              ))
            )}
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
  row: CommunityMemberItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <Text numberOfLines={1} style={styles.assignedText}>
      {formatAssignedDate(row.joinedAt)}
    </Text>
  );
}

function StatusCell({
  status,
  colors,
}: {
  status?: CommunityMemberItem["status"];
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
  row: CommunityMemberItem;
  colors: AppColors;
  onActionPress: (moderator: CommunityMemberItem) => void;
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
}: CreateModeratorColumnsParams): DataTableColumn<CommunityMemberItem>[] {
  return [
    {
      key: "moderator",
      label: "Moderator",
      width: 260,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => `${row.user.name ?? ""} ${row.user.email ?? ""}`,
      render: (row) => <ModeratorCell row={row} colors={colors} />,
    },
    {
      key: "role",
      label: "Role",
      width: 130,
      searchable: true,
      sortable: false,
      align: "center",
      getSearchValue: (row) => row.role,
      render: (row) => <RoleCell row={row} colors={colors} />,
    },
    {
      key: "permissions",
      label: "Permissions",
      width: 190,
      searchable: false,
      sortable: false,
      align: "center",
      render: (row) => <PermissionsCell row={row} colors={colors} />,
    },
    {
      key: "status",
      label: "Status",
      width: 130,
      searchable: true,
      sortable: false,
      align: "center",
      getSearchValue: (row) => row.status ?? "",
      render: (row) => <StatusCell status={row.status} colors={colors} />,
    },
    {
      key: "joinedAt",
      label: "Assigned",
      width: 150,
      searchable: false,
      sortable: false,
      render: (row) => <AssignedCell row={row} colors={colors} />,
    },
    {
      key: "actions",
      label: "Action",
      width: 95,
      searchable: false,
      sortable: false,
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

export function createModeratorFilters(): DataTableFilterConfig<CommunityMemberItem>[] {
  return [
    {
      key: "status",
      label: "Status",
      defaultValue: "ACTIVE",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Left", value: "LEFT" },
        { label: "Banned", value: "BANNED" },
      ],
      predicate: () => true,
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
    },

    moderatorName: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
    },

    moderatorSubText: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    roleText: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_600SemiBold",
    },

    permissionCell: {
      alignItems: "center",
    },

    permissionButton: {
      maxWidth: 170,
      minHeight: 36,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    permissionButtonText: {
      flex: 1,
      color: colors.accent,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },

    permissionMenuContent: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },

    permissionMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },

    permissionDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },

    permissionMenuItemText: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
    },

    assignedText: {
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    statusBadge: {
      alignSelf: "center",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
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