import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "react-native-paper";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import DataTable, { type SortDirection } from "@/components/common/data-table";
import {
  createAdminPostColumns,
  createAdminPostFilters,
} from "@/components/column/admin-post.columns";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetAdminPostsQuery } from "@/store/api/postApi";
import type {
  AdminPost,
  AdminPostSortBy,
  CommunityVisibility,
} from "@/types/post";

function useDebouncedValue<T>(value: T, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

function mapTableSortToBackend(
  sortBy: string,
  sortDirection: SortDirection,
): AdminPostSortBy {
  if (sortBy === "publishedAt") {
    return sortDirection === "asc" ? "oldest" : "newest";
  }

  if (sortBy === "likes") {
    return "mostLiked";
  }

  if (sortBy === "comments") {
    return "mostCommented";
  }

  if (sortBy === "shares") {
    return "mostShared";
  }

  return "newest";
}

function normalizeFilterValue<T extends string>(
  value: string | undefined,
): T | undefined {
  if (!value || value === "ALL") return undefined;
  return value as T;
}

export default function AdminPostScreen() {
  const { colors } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortBy, setSortBy] = useState("publishedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    visibility: "ALL",
  });

  /**
   * Important:
   * This state is only for real pull-to-refresh.
   * Do not use isFetching here, because search also makes isFetching true.
   */
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const backendSortBy = useMemo(
    () => mapTableSortToBackend(sortBy, sortDirection),
    [sortBy, sortDirection],
  );

  const visibility = normalizeFilterValue<CommunityVisibility>(
    activeFilters.visibility,
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useGetAdminPostsQuery({
      page: page + 1,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      visibility,
      sortBy: backendSortBy,
    });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const filters = useMemo(() => createAdminPostFilters(), []);

  const columns = useMemo(
    () =>
      createAdminPostColumns({
        colors,
        onViewPost: (row: AdminPost) => {
          console.log("View post:", row.id);
        },
        onViewCommunity: (row: AdminPost) => {
          console.log("View community:", row.community.id);
        },
        onViewAuthor: (row: AdminPost) => {
          console.log("View author:", row.author.id);
        },
      }),
    [colors],
  );

  const handlePullRefresh = async () => {
    try {
      setIsPullRefreshing(true);
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setPage(0);
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearchChange = (value: string) => {
    setPage(0);
    setSearch(value);
  };

  const handleSortChange = (key: string) => {
    setPage(0);

    setSortBy((currentSortBy) => {
      if (currentSortBy === key) {
        setSortDirection((currentDirection) =>
          currentDirection === "asc" ? "desc" : "asc",
        );

        return currentSortBy;
      }

      setSortDirection("desc");
      return key;
    });
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPage(0);
    setPageSize(nextPageSize);
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: tabBarHeight + 32,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Published Posts
          </Text>
        </View>

        {isError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>
              Could not load posts
            </Text>

            <Button mode="contained" onPress={() => refetch()}>
              Try again
            </Button>
          </View>
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            searchValue={search}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Search posts"
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            emptyTitle="No posts found"
            emptySubtitle="Try changing search or visibility filter."
            isLoading={isLoading}
            isFetching={isFetching}
            pagination={{
              page,
              pageSize,
              totalItems: meta?.total ?? 0,
              totalPages: meta?.totalPages ?? 1,
              onPageChange: setPage,
              onPageSizeChange: handlePageSizeChange,
              pageSizeOptions: [10, 20, 50],
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },

  header: {
    marginBottom: 14,
  },

  title: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: "Poppins_700Bold",
  },

  errorCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },

  errorTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold",
  },
});