import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { IconButton, Menu } from "react-native-paper";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { AdminUserRow } from "@/mocks/admin-users";
import type { useAppTheme } from "@/hooks/useAppTheme";

type AppColors = ReturnType<typeof useAppTheme>["colors"];

function StatusChip({
  status,
  colors,
}: {
  status: AdminUserRow["status"];
  colors: AppColors;
}) {
  const textColor =
    status === "ACTIVE"
      ? colors.accent
      : status === "SUSPENDED"
      ? colors.danger
      : colors.muted;

  return (
    <View
      style={[
        styles.statusChip,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.statusText, { color: textColor }]}>{status}</Text>
    </View>
  );
}

function UserActionsMenu({
  row,
  colors,
}: {
  row: AdminUserRow;
  colors: AppColors;
}) {
  const [visible, setVisible] = useState(false);

  const handleAction = (action: "view" | "ban" | "delete") => {
    setVisible(false);

    if (action === "view") {
      Alert.alert("View", `View ${row.fullName}`);
      return;
    }

    if (action === "ban") {
      Alert.alert("Ban", `Ban ${row.fullName}`);
      return;
    }

    Alert.alert("Delete", `Delete ${row.fullName}`);
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <IconButton
          icon="dots-vertical"
          size={18}
          mode="contained-tonal"
          onPress={() => setVisible(true)}
          containerColor={colors.surfaceSecondary}
          iconColor={colors.foreground}
          style={styles.menuButton}
        />
      }
      contentStyle={{
        backgroundColor: colors.surface,
        borderRadius: 16,
      }}
    >
      <Menu.Item onPress={() => handleAction("view")} title="View" />
      <Menu.Item onPress={() => handleAction("ban")} title="Ban" />
      <Menu.Item onPress={() => handleAction("delete")} title="Delete" />
    </Menu>
  );
}

export function createUserColumns(
  colors: AppColors
): DataTableColumn<AdminUserRow>[] {
  return [
    {
      key: "user",
      label: "User",
      width: 240,
      searchable: true,
      getSearchValue: (row) => `${row.fullName} ${row.email}`,
      render: (row) => (
        <View style={styles.userCell}>
          <Image
            source={{
              uri: row.avatarUrl ?? "https://i.pravatar.cc/100?img=1",
            }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.mainText, { color: colors.foreground }]}>
              {row.fullName}
            </Text>
            <Text style={[styles.subText, { color: colors.muted }]}>
              {row.email}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: "businessName",
      label: "Business",
      width: 180,
      searchable: true,
      getSearchValue: (row) => row.businessName,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.businessName}
        </Text>
      ),
    },
    {
      key: "businessType",
      label: "Type",
      width: 130,
      searchable: true,
      getSearchValue: (row) => row.businessType,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.businessType}
        </Text>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: 130,
      render: (row) => <StatusChip status={row.status} colors={colors} />,
    },
    {
      key: "joinedAt",
      label: "Joined",
      width: 120,
      sortable: true,
      getSortValue: (row) => row.joinedAtTs,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.joinedAtLabel}
        </Text>
      ),
    },
    {
      key: "actions",
      label: "Action",
      width: 90,
      align: "center",
      render: (row) => <UserActionsMenu row={row} colors={colors} />,
    },
  ];
}

export function createUserFilters(): DataTableFilterConfig<AdminUserRow>[] {
  return [
    {
      key: "status",
      label: "Status",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "Active", value: "ACTIVE" },
        { label: "Suspended", value: "SUSPENDED" },
        { label: "Inactive", value: "INACTIVE" },
      ],
      predicate: (row, value) => row.status === value,
    },
  ];
}

const styles = StyleSheet.create({
  userCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  mainText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
  },
  subText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
  },
  statusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  menuButton: {
    margin: 0,
  },
});