// src/components/column/user.columns.tsx

import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { IconButton, Menu } from "react-native-paper";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { useAppTheme } from "@/hooks/useAppTheme";
import type { AdminUserRow } from "@/store/api/admin-user.api";

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

function RoleChip({
  role,
  colors,
}: {
  role: AdminUserRow["role"];
  colors: AppColors;
}) {
  const label =
    role === "SUPER_ADMIN" ? "Super Admin" : role === "ADMIN" ? "Admin" : "User";

  const textColor =
    role === "SUPER_ADMIN"
      ? "#7c3aed"
      : role === "ADMIN"
        ? colors.accent
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
      <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function VerificationChip({
  verified,
  colors,
}: {
  verified: boolean;
  colors: AppColors;
}) {
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
      <Text
        style={[
          styles.statusText,
          {
            color: verified ? colors.accent : "#d97706",
          },
        ]}
      >
        {verified ? "Verified" : "Unverified"}
      </Text>
    </View>
  );
}

function UserAvatar({
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

function UserCell({
  row,
  colors,
}: {
  row: AdminUserRow;
  colors: AppColors;
}) {
  return (
    <View style={styles.userCell}>
      <UserAvatar imageUrl={row.image} name={row.name} colors={colors} />

      <View style={styles.userTextWrap}>
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
          {row.email}
        </Text>
      </View>
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

  const handleAction = (action: "view" | "role") => {
    setVisible(false);

    if (action === "view") {
      Alert.alert("View User", `View ${row.name}`);
      return;
    }

    Alert.alert("Update Role", `Update role for ${row.name}`);
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
      <Menu.Item onPress={() => handleAction("role")} title="Update Role" />
    </Menu>
  );
}

export function createUserColumns(
  colors: AppColors,
): DataTableColumn<AdminUserRow>[] {
  return [
    {
      key: "name",
      label: "User",
      width: 250,
      searchable: true,
      sortable: true,
      getSearchValue: (row) =>
        `${row.name} ${row.email} ${row.firstName} ${row.lastName}`,
      getSortValue: (row) => row.name,
      render: (row) => <UserCell row={row} colors={colors} />,
    },
    {
      key: "businessName",
      label: "Business",
      width: 190,
      searchable: true,
      sortable: true,
      getSearchValue: (row) => row.businessName,
      getSortValue: (row) => row.businessName,
      render: (row) => (
        <Text
          numberOfLines={1}
          style={[styles.mainText, { color: colors.foreground }]}
        >
          {row.businessName}
        </Text>
      ),
    },
    {
      key: "businessType",
      label: "Type",
      width: 140,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.businessType,
      render: (row) => (
        <Text
          numberOfLines={1}
          style={[styles.mainText, { color: colors.foreground }]}
        >
          {row.businessType}
        </Text>
      ),
    },
    {
      key: "role",
      label: "Role",
      width: 140,
      sortable: true,
      getSortValue: (row) => row.role,
      render: (row) => <RoleChip role={row.role} colors={colors} />,
    },
    {
      key: "emailVerified",
      label: "Email",
      width: 130,
      sortable: false,
      render: (row) => (
        <VerificationChip verified={row.emailVerified} colors={colors} />
      ),
    },
    {
      key: "communityPosts",
      label: "Posts",
      width: 90,
      align: "center",
      sortable: false,
      getSortValue: (row) => row.counts.communityPosts,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.counts.communityPosts}
        </Text>
      ),
    },
    {
      key: "communitiesCreated",
      label: "Community",
      width: 110,
      align: "center",
      sortable: false,
      getSortValue: (row) => row.counts.communitiesCreated,
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {row.counts.communitiesCreated}
        </Text>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
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
      render: (row) => <UserActionsMenu row={row} colors={colors} />,
    },
  ];
}

export function createUserFilters(): DataTableFilterConfig<AdminUserRow>[] {
  return [
    {
      key: "role",
      label: "Role",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "User", value: "USER" },
        { label: "Admin", value: "ADMIN" },
        { label: "Super Admin", value: "SUPER_ADMIN" },
      ],
      predicate: (row, value) => {
        if (value === "ALL") return true;
        return row.role === value;
      },
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

  userTextWrap: {
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
  },

  menuButton: {
    margin: 0,
  },
});