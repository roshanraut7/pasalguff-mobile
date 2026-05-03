import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { IconButton, Menu } from "react-native-paper";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { useAppTheme } from "@/hooks/useAppTheme";
import type { CategoryRow } from "@/store/api/category.api";

type AppColors = ReturnType<typeof useAppTheme>["colors"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusChip({
  label,
  tone,
  colors,
}: {
  label: string;
  tone: "active" | "inactive";
  colors: AppColors;
}) {
  const textColor = tone === "active" ? colors.accent : colors.muted;

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
      <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function CategoryNameCell({
  row,
  colors,
}: {
  row: CategoryRow;
  colors: AppColors;
}) {
  return (
    <View>
      <Text
        numberOfLines={1}
        style={[styles.mainText, { color: colors.foreground }]}
      >
        {row.name}
      </Text>

      <Text
        numberOfLines={1}
        style={[styles.subText, { color: colors.muted }]}
      >
        @{row.slug}
      </Text>
    </View>
  );
}

function CategoryActionsMenu({
  row,
  colors,
}: {
  row: CategoryRow;
  colors: AppColors;
}) {
  const [visible, setVisible] = useState(false);

  const handleAction = (action: "view" | "edit" | "status") => {
    setVisible(false);

    if (action === "view") {
      Alert.alert("View Category", `View ${row.name}`);
      return;
    }

    if (action === "edit") {
      Alert.alert("Edit Category", `Edit ${row.name}`);
      return;
    }

    Alert.alert(
      row.status === "ACTIVE" ? "Deactivate Category" : "Activate Category",
      `${row.status === "ACTIVE" ? "Deactivate" : "Activate"} ${row.name}?`,
    );
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
      <Menu.Item onPress={() => handleAction("edit")} title="Edit" />
      <Menu.Item
        onPress={() => handleAction("status")}
        title={row.status === "ACTIVE" ? "Deactivate" : "Activate"}
      />
    </Menu>
  );
}

export function createCategoryColumns(
  colors: AppColors,
): DataTableColumn<CategoryRow>[] {
  return [
    {
      key: "name",
      label: "Name",
      width: 220,
      searchable: true,
      sortable: true,
      getSearchValue: (row) => `${row.name} ${row.slug}`,
      getSortValue: (row) => row.name,
      render: (row) => <CategoryNameCell row={row} colors={colors} />,
    },
    {
      key: "description",
      label: "Description",
      width: 230,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.description ?? "",
      render: (row) => (
        <Text
          numberOfLines={2}
          style={[styles.mainText, { color: colors.foreground }]}
        >
          {row.description || "No description"}
        </Text>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: 120,
      sortable: true,
      getSortValue: (row) => row.status,
      render: (row) => (
        <StatusChip
          label={row.status === "ACTIVE" ? "Active" : "Inactive"}
          tone={row.status === "ACTIVE" ? "active" : "inactive"}
          colors={colors}
        />
      ),
    },
    {
      key: "communityCount",
      label: "Communities",
      width: 130,
      align: "center",
      sortable: false,
      getSortValue: (row) => row.communityCount,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.communityCount}
        </Text>
      ),
    },
    {
      key: "sortOrder",
      label: "Order",
      width: 90,
      align: "center",
      sortable: true,
      getSortValue: (row) => row.sortOrder,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.sortOrder}
        </Text>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      width: 130,
      sortable: true,
      getSortValue: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {formatDate(row.createdAt)}
        </Text>
      ),
    },
    {
      key: "actions",
      label: "Action",
      width: 90,
      align: "center",
      render: (row) => <CategoryActionsMenu row={row} colors={colors} />,
    },
  ];
}

export function createCategoryFilters(): DataTableFilterConfig<CategoryRow>[] {
  return [
    {
      key: "categoryStatus",
      label: "Filter",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
      ],
      predicate: (row, value) => {
        if (value === "ALL") return true;
        return row.status === value;
      },
    },
  ];
}

const styles = StyleSheet.create({
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
    lineHeight: 14,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "capitalize",
  },

  menuButton: {
    margin: 0,
  },
});