// src/components/column/community.columns.tsx

import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { IconButton, Menu } from "react-native-paper";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { useAppTheme } from "@/hooks/useAppTheme";
import type { AdminCommunityRow } from "@/store/api/admin-community.api";

type AppColors = ReturnType<typeof useAppTheme>["colors"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitial(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "U";
  }

  return trimmedValue.charAt(0).toUpperCase();
}

function StatusChip({
  label,
  tone,
  colors,
}: {
  label: string;
  tone: "active" | "inactive" | "private" | "public";
  colors: AppColors;
}) {
  const textColor =
    tone === "active" || tone === "public"
      ? colors.accent
      : tone === "inactive"
        ? colors.muted
        : "#d97706";

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

function CommunityAvatar({
  imageUrl,
  name,
  colors,
}: {
  imageUrl?: string | null;
  name: string;
  colors: AppColors;
}) {
  const hasImage = Boolean(imageUrl?.trim());

  if (hasImage) {
    return <Image source={{ uri: imageUrl! }} style={styles.avatar} />;
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.avatarFallbackText, { color: colors.accent }]}>
        {getInitial(name)}
      </Text>
    </View>
  );
}

function CommunityNameCell({
  row,
  colors,
}: {
  row: AdminCommunityRow;
  colors: AppColors;
}) {
  return (
    <View style={styles.nameCell}>
      <CommunityAvatar
        imageUrl={row.avatarImage}
        name={row.name}
        colors={colors}
      />

      <View style={styles.nameTextWrap}>
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
    </View>
  );
}

function AdminCell({
  row,
  colors,
}: {
  row: AdminCommunityRow;
  colors: AppColors;
}) {
  return (
    <View>
      <Text
        numberOfLines={1}
        style={[styles.mainText, { color: colors.foreground }]}
      >
        {row.adminName}
      </Text>

      <Text
        numberOfLines={1}
        style={[styles.subText, { color: colors.muted }]}
      >
        {row.adminEmail}
      </Text>
    </View>
  );
}

function CommunityActionsMenu({
  row,
  colors,
}: {
  row: AdminCommunityRow;
  colors: AppColors;
}) {
  const [visible, setVisible] = useState(false);

  const handleAction = (action: "view" | "delete") => {
    setVisible(false);

    if (action === "view") {
      Alert.alert("View Community", `View ${row.name}`);
      return;
    }

    Alert.alert("Delete Community", `Delete ${row.name}?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
      },
    ]);
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
      <Menu.Item onPress={() => handleAction("delete")} title="Delete" />
    </Menu>
  );
}

export function createCommunityColumns(
  colors: AppColors,
): DataTableColumn<AdminCommunityRow>[] {
  return [
    {
      key: "name",
      label: "Name",
      width: 250,
      searchable: true,
      sortable: true,
      getSearchValue: (row) => `${row.name} ${row.slug}`,
      getSortValue: (row) => row.name,
      render: (row) => <CommunityNameCell row={row} colors={colors} />,
    },
    {
      key: "categoryName",
      label: "Category",
      width: 150,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.categoryName,
      getSortValue: (row) => row.categoryName,
      render: (row) => (
        <Text
          numberOfLines={1}
          style={[styles.mainText, { color: colors.foreground }]}
        >
          {row.categoryName}
        </Text>
      ),
    },
    {
      key: "adminName",
      label: "Admin",
      width: 190,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => `${row.adminName} ${row.adminEmail}`,
      getSortValue: (row) => row.adminName,
      render: (row) => <AdminCell row={row} colors={colors} />,
    },
    {
      key: "visibility",
      label: "Visibility",
      width: 130,
      sortable: true,
      getSortValue: (row) => row.visibility,
      render: (row) => (
        <StatusChip
          label={row.visibility === "PUBLIC" ? "Public" : "Private"}
          tone={row.visibility === "PUBLIC" ? "public" : "private"}
          colors={colors}
        />
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
      key: "memberCount",
      label: "Members",
      width: 110,
      sortable: false,
      align: "center",
      getSortValue: (row) => row.memberCount,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.memberCount}
        </Text>
      ),
    },
    {
      key: "bannedCount",
      label: "Banned",
      width: 100,
      sortable: false,
      align: "center",
      getSortValue: (row) => row.bannedCount,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.bannedCount}
        </Text>
      ),
    },
    {
      key: "postCount",
      label: "Posts",
      width: 100,
      sortable: false,
      align: "center",
      getSortValue: (row) => row.postCount,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.postCount}
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
      render: (row) => <CommunityActionsMenu row={row} colors={colors} />,
    },
  ];
}

export function createCommunityFilters(): DataTableFilterConfig<AdminCommunityRow>[] {
  return [
    {
      key: "communityFilter",
      label: "Filter",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Public", value: "PUBLIC" },
        { label: "Private", value: "PRIVATE" },
      ],
      predicate: (row, value) => {
        if (value === "ALL") return true;

        if (value === "ACTIVE" || value === "INACTIVE") {
          return row.status === value;
        }

        if (value === "PUBLIC" || value === "PRIVATE") {
          return row.visibility === value;
        }

        return true;
      },
    },
  ];
}

const styles = StyleSheet.create({
  nameCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },

  nameTextWrap: {
    flex: 1,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold",
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
    lineHeight: 14,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "capitalize",
  },

  menuButton: {
    margin: 0,
  },
});