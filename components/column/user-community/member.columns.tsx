// components/column/user-community/member.columns.tsx

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "heroui-native";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { AppColors } from "@/constants/theme";
import type {
  CommunityDashboardMember,
  CommunityMemberStatus,
} from "@/mocks/member";

export type MemberAction =
  | "view"
  | "message"
  | "approve"
  | "reject"
  | "ban"
  | "unban"
  | "remove";

type CreateMemberColumnsParams = {
  colors: AppColors;
  onActionPress: (member: CommunityDashboardMember) => void;
};

export function getMemberInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatJoinedDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: CommunityMemberStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusColors(status: CommunityMemberStatus, colors: AppColors) {
  if (status === "ACTIVE") {
    return {
      text: colors.success,
      background: "rgba(34, 197, 94, 0.10)",
      border: "rgba(34, 197, 94, 0.22)",
    };
  }

  if (status === "PENDING") {
    return {
      text: colors.warning,
      background: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.25)",
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

function MemberCell({
  row,
  colors,
}: {
  row: CommunityDashboardMember;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <View style={styles.memberCell}>
      <Avatar alt="" size="sm" variant="soft" color="success">
        <Avatar.Image source={{ uri: row.avatar }} />
        <Avatar.Fallback>{getMemberInitials(row.name)}</Avatar.Fallback>
      </Avatar>

      <Text numberOfLines={1} style={styles.memberName}>
        {row.name}
      </Text>
    </View>
  );
}

function StatusCell({
  status,
  colors,
}: {
  status: CommunityMemberStatus;
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
  row: CommunityDashboardMember;
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
  row: CommunityDashboardMember;
  colors: AppColors;
  onActionPress: (member: CommunityDashboardMember) => void;
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
  onActionPress,
}: CreateMemberColumnsParams): DataTableColumn<CommunityDashboardMember>[] {
  return [
    {
      key: "name",
      label: "Member",
      width: 220,
      searchable: true,
      sortable: true,
      getSearchValue: (row) => row.name,
      getSortValue: (row) => row.name,
      render: (row) => <MemberCell row={row} colors={colors} />,
    },
    {
      key: "status",
      label: "Status",
      width: 125,
      searchable: true,
      sortable: true,
      align: "center",
      getSearchValue: (row) => row.status,
      getSortValue: (row) => row.status,
      render: (row) => <StatusCell status={row.status} colors={colors} />,
    },
    {
      key: "joinedAt",
      label: "Joined",
      width: 145,
      sortable: true,
      getSortValue: (row) => new Date(row.joinedAt).getTime(),
      render: (row) => <JoinedCell row={row} colors={colors} />,
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

export function createMemberFilters(): DataTableFilterConfig<CommunityDashboardMember>[] {
  return [
    {
      key: "status",
      label: "Status",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "Active", value: "ACTIVE" },
        { label: "Pending", value: "PENDING" },
        { label: "Banned", value: "BANNED" },
        { label: "Left", value: "LEFT" },
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
    memberCell: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    memberName: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
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

    joinedText: {
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
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