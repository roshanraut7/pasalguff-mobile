import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "heroui-native";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityMemberItem } from "@/types/community";
import { useAppTheme } from "@/hooks/useAppTheme";

type AppColors = ReturnType<typeof useAppTheme>["colors"];

export type MemberAction = "view" | "message" | "ban" | "unban" | "remove";

type CreateMemberColumnsParams = {
  colors: AppColors;
  canManageMembers: boolean;
  onActionPress: (member: CommunityMemberItem) => void;
};

export function getMemberInitials(name?: string | null) {
  const safeName = name?.trim() || "Unknown User";
  const parts = safeName.split(" ").filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "U";

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function formatJoinedDate(value: string) {
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

  if (status === "LEFT") {
    return {
      text: colors.muted,
      background: colors.surfaceSecondary,
      border: colors.border,
    };
  }

  return {
    text: colors.muted,
    background: colors.surfaceSecondary,
    border: colors.border,
  };
}

function MemberCell({
  row,
  colors,
}: {
  row: CommunityMemberItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);
  const avatarUrl = toAbsoluteFileUrl(row.user.image) ?? undefined;
  const name = row.user.name ?? "Unknown User";

  return (
    <View style={styles.memberCell}>
      <Avatar alt={name} size="sm" variant="soft" color="success">
        {avatarUrl ? <Avatar.Image source={{ uri: avatarUrl }} /> : null}
        <Avatar.Fallback>{getMemberInitials(name)}</Avatar.Fallback>
      </Avatar>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.memberName}>
          {name}
        </Text>

        <Text numberOfLines={1} style={styles.memberSubText}>
          {row.role}
        </Text>
      </View>
    </View>
  );
}

function EmailCell({
  row,
  colors,
}: {
  row: CommunityMemberItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <Text numberOfLines={1} style={styles.mutedText}>
      {row.user.email ?? "-"}
    </Text>
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

function JoinedCell({
  row,
  colors,
}: {
  row: CommunityMemberItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return <Text style={styles.joinedText}>{formatJoinedDate(row.joinedAt)}</Text>;
}

function ActionCell({
  row,
  colors,
  onActionPress,
}: {
  row: CommunityMemberItem;
  colors: AppColors;
  onActionPress: (member: CommunityMemberItem) => void;
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

export function createMemberColumns({
  colors,
  canManageMembers,
  onActionPress,
}: CreateMemberColumnsParams): DataTableColumn<CommunityMemberItem>[] {
  const columns: DataTableColumn<CommunityMemberItem>[] = [
    {
      key: "member",
      label: "Member",
      width: 230,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.user.name ?? "",
      render: (row) => <MemberCell row={row} colors={colors} />,
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
      key: "joinedAt",
      label: "Joined",
      width: 150,
      searchable: false,
      sortable: false,
      render: (row) => <JoinedCell row={row} colors={colors} />,
    },
  ];

  if (canManageMembers) {
    columns.splice(1, 0, {
      key: "email",
      label: "Email",
      width: 240,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.user.email ?? "",
      render: (row) => <EmailCell row={row} colors={colors} />,
    });

    columns.splice(3, 0, {
      key: "status",
      label: "Status",
      width: 130,
      searchable: true,
      sortable: false,
      align: "center",
      getSearchValue: (row) => row.status ?? "",
      render: (row) => <StatusCell status={row.status} colors={colors} />,
    });

    columns.push({
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
    });
  }

  return columns;
}

export function createMemberFilters(): DataTableFilterConfig<CommunityMemberItem>[] {
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
    memberCell: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    memberName: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
    },

    memberSubText: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    mutedText: {
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    roleText: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_600SemiBold",
    },

    statusBadge: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },

    statusText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    joinedText: {
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
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