import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import DataTable, {
  useDataTableState,
} from "@/components/common/data-table";
import { adminUsersMock } from "@/mocks/admin-users";
import { createUserColumns, createUserFilters } from "@/components/column/user.columns";

export default function AdminUserScreen() {
  const { colors } = useAppTheme();

  const columns = useMemo(() => createUserColumns(colors), [colors]);
  const filters = useMemo(() => createUserFilters(), []);

  const {
    rows,
    search,
    setSearch,
    sortBy,
    sortDirection,
    handleSortChange,
    activeFilters,
    handleFilterChange,
    page,
    setPage,
    pageSize,
    setPageSize,
    filteredCount,
    totalPages,
  } = useDataTableState({
    data: adminUsersMock,
    columns,
    filters,
    initialSort: {
      key: "joinedAt",
      direction: "desc",
    },
    initialPageSize: 10,
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <View style={styles.screen}>
        <View style={styles.headerWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>Users</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Manage all registered users
          </Text>
        </View>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search users"
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No users found"
          emptySubtitle="Try another search or filter."
          pagination={{
            page,
            pageSize,
            totalItems: filteredCount,
            totalPages,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: [5, 10, 20],
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingBottom: 110,
  },
  headerWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
});