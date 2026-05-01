// components/column/user-community/moderator-activity.columns.tsx

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { AppColors } from "@/constants/theme";
import type {
  ModeratorActivity,
  ModeratorActivityStatus,
  ModeratorActivityType,
} from "@/mocks/moderator-activity";

export type ModeratorActivityAction = "view" | "openTarget" | "undo";

type CreateModeratorActivityColumnsParams = {
  colors: AppColors;
  onActionPress: (activity: ModeratorActivity) => void;
};

function formatActivityDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTypeLabel(type: ModeratorActivityType) {
  const labels: Record<ModeratorActivityType, string> = {
    POST: "Post",
    REPORT: "Report",
    MEMBER: "Member",
    REQUEST: "Request",
    COMMENT: "Comment",
  };

  return labels[type];
}

function getTypeIcon(type: ModeratorActivityType): keyof typeof Ionicons.glyphMap {
  const icons: Record<ModeratorActivityType, keyof typeof Ionicons.glyphMap> = {
    POST: "newspaper-outline",
    REPORT: "flag-outline",
    MEMBER: "person-outline",
    REQUEST: "person-add-outline",
    COMMENT: "chatbubble-outline",
  };

  return icons[type];
}

function getStatusLabel(status: ModeratorActivityStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusColors(status: ModeratorActivityStatus, colors: AppColors) {
  if (status === "COMPLETED") {
    return {
      text: colors.success,
      background: "rgba(34, 197, 94, 0.10)",
      border: "rgba(34, 197, 94, 0.22)",
    };
  }

  return {
    text: colors.warning,
    background: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.25)",
  };
}

function ActivityCell({
  row,
  colors,
}: {
  row: ModeratorActivity;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <View style={styles.activityCell}>
      <Text numberOfLines={1} style={styles.activityTitle}>
        {row.title}
      </Text>

      <Text numberOfLines={1} style={styles.activityDescription}>
        {row.targetName}
      </Text>
    </View>
  );
}

function TypeCell({
  row,
  colors,
}: {
  row: ModeratorActivity;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <View style={styles.typeBadge}>
      <Ionicons name={getTypeIcon(row.type)} size={13} color={colors.accent} />

      <Text numberOfLines={1} style={styles.typeText}>
        {getTypeLabel(row.type)}
      </Text>
    </View>
  );
}

function DateCell({
  row,
  colors,
}: {
  row: ModeratorActivity;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);

  return (
    <Text numberOfLines={1} style={styles.dateText}>
      {formatActivityDate(row.createdAt)}
    </Text>
  );
}

function StatusCell({
  row,
  colors,
}: {
  row: ModeratorActivity;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);
  const statusColors = getStatusColors(row.status, colors);

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
        {getStatusLabel(row.status)}
      </Text>
    </View>
  );
}

function ActionCell({
  row,
  colors,
  onActionPress,
}: {
  row: ModeratorActivity;
  colors: AppColors;
  onActionPress: (activity: ModeratorActivity) => void;
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

export function createModeratorActivityColumns({
  colors,
  onActionPress,
}: CreateModeratorActivityColumnsParams): DataTableColumn<ModeratorActivity>[] {
  return [
    {
      key: "activity",
      label: "Activity",
      width: 260,
      searchable: true,
      sortable: true,
      getSearchValue: (row) =>
        `${row.title} ${row.description} ${row.targetName} ${row.reason}`,
      getSortValue: (row) => row.title,
      render: (row) => <ActivityCell row={row} colors={colors} />,
    },
    {
      key: "type",
      label: "Type",
      width: 120,
      searchable: true,
      sortable: true,
      align: "center",
      getSearchValue: (row) => row.type,
      getSortValue: (row) => row.type,
      render: (row) => <TypeCell row={row} colors={colors} />,
    },
    {
      key: "createdAt",
      label: "Date",
      width: 135,
      sortable: true,
      getSortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => <DateCell row={row} colors={colors} />,
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
      render: (row) => <StatusCell row={row} colors={colors} />,
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

export function createModeratorActivityFilters(): DataTableFilterConfig<ModeratorActivity>[] {
  return [
    {
      key: "type",
      label: "Type",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "Post", value: "POST" },
        { label: "Report", value: "REPORT" },
        { label: "Member", value: "MEMBER" },
        { label: "Request", value: "REQUEST" },
        { label: "Comment", value: "COMMENT" },
      ],
      predicate: (row, value) => {
        if (value === "ALL") return true;

        return row.type === value;
      },
    },
  ];
}

function createColumnStyles(colors: AppColors) {
  return StyleSheet.create({
    activityCell: {
      width: "100%",
      gap: 3,
      overflow: "hidden",
    },

    activityTitle: {
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },

    activityDescription: {
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    typeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    typeText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
      color: colors.accent,
    },

    dateText: {
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