import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import DataTable, { useDataTableState } from "@/components/common/data-table";
import AdminKpiCard from "@/components/common/Kpi-card";

import { adminCommunitiesMock } from "@/mocks/admin-communities";
import {
  createCommunityColumns,
  createCommunityFilters,
} from "@/components/column/community.columns";

export default function AdminCommunityScreen() {
  const { colors } = useAppTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const columns = useMemo(() => createCommunityColumns(colors), [colors]);

  const filters = useMemo(() => createCommunityFilters(), []);

  const communityStats = useMemo(() => {
    const totalCommunities = adminCommunitiesMock.length;

    const bannedMembers = adminCommunitiesMock.reduce(
      (total, community) => total + community.bannedCount,
      0,
    );

    const totalMembers = adminCommunitiesMock.reduce(
      (total, community) => total + community.memberCount,
      0,
    );

    return {
      totalCommunities,
      bannedMembers,
      totalMembers,
    };
  }, []);

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
    data: adminCommunitiesMock,
    columns,
    filters,
    initialSort: {
      key: "createdAt",
      direction: "desc",
    },
    initialPageSize: 10,
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Communities</Text>

        <Text style={styles.subtitle}>
          Manage communities, members, visibility and moderation actions
        </Text>

        <View style={styles.grid}>
          <AdminKpiCard
            title="Total Communities"
            value={communityStats.totalCommunities}
            icon="people-circle-outline"
          />

          <AdminKpiCard
            title="Banned Members"
            value={communityStats.bannedMembers}
            icon="ban-outline"
          />

          <AdminKpiCard
            title="Total Members"
            value={communityStats.totalMembers}
            icon="people-outline"
          />
        </View>

        <View style={styles.tableWrap}>
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search communities"
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            emptyTitle="No communities found"
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
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 120,
    },

    title: {
      fontSize: 30,
      lineHeight: 38,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    subtitle: {
      marginTop: 6,
      marginBottom: 18,
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
      marginBottom: 18,
    },

    tableWrap: {
      marginHorizontal: -18,
    },
  });
}