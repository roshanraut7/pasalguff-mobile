import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import DataTable from "@/components/common/data-table";
import {
  createUserColumns,
  createUserFilters,
} from "@/components/column/user.columns";

import {
  AdminUserRole,
  useGetAdminUsersQuery,
} from "@/store/api/admin-user.api";

type UserSortBy =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "email"
  | "role"
  | "businessName";

type SortDirection = "asc" | "desc";

export default function AdminUserScreen() {
  const { colors } = useAppTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const columns = useMemo(() => createUserColumns(colors), [colors]);
  const filters = useMemo(() => createUserFilters(), []);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<UserSortBy>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    role: "ALL",
  });

  const roleFilter: AdminUserRole | undefined =
    activeFilters.role === "USER" ||
    activeFilters.role === "ADMIN" ||
    activeFilters.role === "SUPER_ADMIN"
      ? activeFilters.role
      : undefined;

  const {
    data: usersResponse,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetAdminUsersQuery({
    page: page + 1,
    limit: pageSize,
    search: search.trim() || undefined,
    role: roleFilter,
    sortBy,
    sortDirection,
  });

  const users = usersResponse?.data ?? [];
  const meta = usersResponse?.meta;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(0);
  };

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((previous) => ({
      ...previous,
      [key]: value,
    }));

    setPage(0);
  };

  const handleSortChange = (key: string) => {
    const allowedSortKeys: UserSortBy[] = [
      "createdAt",
      "updatedAt",
      "name",
      "email",
      "role",
      "businessName",
    ];

    if (!allowedSortKeys.includes(key as UserSortBy)) {
      return;
    }

    const nextSortBy = key as UserSortBy;

    if (sortBy === nextSortBy) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(nextSortBy);
      setSortDirection("asc");
    }

    setPage(0);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Users</Text>

          <Text style={styles.subtitle}>Manage all registered users</Text>

          {isError ? (
            <Text style={styles.errorText} onPress={refetch}>
              Failed to load users. Tap to retry.
            </Text>
          ) : null}

          {isFetching && !isLoading ? (
            <Text style={styles.fetchingText}>Updating users...</Text>
          ) : null}
        </View>

        <View style={styles.tableWrap}>
          <DataTable
            rows={users}
            columns={columns}
            rowKey={(row) => row.id}
            searchValue={search}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Search users"
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            emptyTitle="No users found"
            emptySubtitle="Try another search or filter."
            isLoading={isLoading}
            pagination={{
              page,
              pageSize,
              totalItems: meta?.total ?? 0,
              totalPages: meta?.totalPages ?? 1,
              onPageChange: setPage,
              onPageSizeChange: handlePageSizeChange,
              pageSizeOptions: [5, 10, 20],
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingBottom: 140,
    },

    headerWrap: {
      paddingHorizontal: 18,
      paddingTop: 8,
      marginBottom: 12,
    },

    title: {
      fontSize: 28,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    errorText: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_500Medium",
      color: "#dc2626",
    },

    fetchingText: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    tableWrap: {
      width: "100%",
    },
  });
}