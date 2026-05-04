import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import DataTable from "@/components/common/data-table";
import AdminKpiCard from "@/components/common/Kpi-card";

import {
  createCommunityColumns,
  createCommunityFilters,
} from "@/components/column/community.columns";

import {
  createCategoryColumns,
  createCategoryFilters,
} from "@/components/column/category.columns";

import {
  AdminCommunityStatus,
  AdminCommunityVisibility,
  useGetAdminCommunitiesQuery,
} from "@/store/api/admin-community.api";

import {
  CategoryStatus,
  useGetCategoriesQuery,
} from "@/store/api/category.api";

import CreateCategoryForm from "@/components/form/CreateCategoryForm";

type AdminTab = "communities" | "createdCommunities" | "categories";

type CommunitySortBy =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "status"
  | "visibility";

type CategorySortBy =
  | "sortOrder"
  | "name"
  | "createdAt"
  | "updatedAt"
  | "status";

type SortDirection = "asc" | "desc";

const CREATE_COMMUNITY_ROUTE = "/pages/admin-create-community";

export default function AdminCommunityScreen() {
  const { colors } = useAppTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const communityColumns = useMemo(
    () => createCommunityColumns(colors),
    [colors],
  );

  const categoryColumns = useMemo(
    () => createCategoryColumns(colors),
    [colors],
  );

  const communityFilters = useMemo(() => createCommunityFilters(), []);
  const categoryFilters = useMemo(() => createCategoryFilters(), []);

  const [activeTab, setActiveTab] = useState<AdminTab>("communities");
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);

  const [communityPage, setCommunityPage] = useState(0);
  const [communityPageSize, setCommunityPageSize] = useState(10);
  const [communitySearch, setCommunitySearch] = useState("");
  const [communitySortBy, setCommunitySortBy] =
    useState<CommunitySortBy>("createdAt");
  const [communitySortDirection, setCommunitySortDirection] =
    useState<SortDirection>("desc");

  const [communityActiveFilters, setCommunityActiveFilters] = useState<
    Record<string, string>
  >({
    communityFilter: "ALL",
  });

  const communityStatusFilter: AdminCommunityStatus | undefined =
    communityActiveFilters.communityFilter === "ACTIVE" ||
    communityActiveFilters.communityFilter === "INACTIVE"
      ? communityActiveFilters.communityFilter
      : undefined;

  const communityVisibilityFilter: AdminCommunityVisibility | undefined =
    communityActiveFilters.communityFilter === "PUBLIC" ||
    communityActiveFilters.communityFilter === "PRIVATE"
      ? communityActiveFilters.communityFilter
      : undefined;

  const {
    data: adminCommunitiesResponse,
    isLoading: isCommunityLoading,
    isFetching: isCommunityFetching,
    isError: isCommunityError,
    refetch: refetchCommunities,
  } = useGetAdminCommunitiesQuery({
    page: communityPage + 1,
    limit: communityPageSize,
    search: communitySearch.trim() || undefined,
    status: communityStatusFilter,
    visibility: communityVisibilityFilter,
    sortBy: communitySortBy,
    sortDirection: communitySortDirection,
  });

  const communities = adminCommunitiesResponse?.data ?? [];
  const communityMeta = adminCommunitiesResponse?.meta;

  const [createdCommunityPage, setCreatedCommunityPage] = useState(0);
  const [createdCommunityPageSize, setCreatedCommunityPageSize] = useState(10);
  const [createdCommunitySearch, setCreatedCommunitySearch] = useState("");
  const [createdCommunitySortBy, setCreatedCommunitySortBy] =
    useState<CommunitySortBy>("createdAt");
  const [createdCommunitySortDirection, setCreatedCommunitySortDirection] =
    useState<SortDirection>("desc");

  const [createdCommunityActiveFilters, setCreatedCommunityActiveFilters] =
    useState<Record<string, string>>({
      communityFilter: "ALL",
    });

  const createdCommunityStatusFilter: AdminCommunityStatus | undefined =
    createdCommunityActiveFilters.communityFilter === "ACTIVE" ||
    createdCommunityActiveFilters.communityFilter === "INACTIVE"
      ? createdCommunityActiveFilters.communityFilter
      : undefined;

  const createdCommunityVisibilityFilter:
    | AdminCommunityVisibility
    | undefined =
    createdCommunityActiveFilters.communityFilter === "PUBLIC" ||
    createdCommunityActiveFilters.communityFilter === "PRIVATE"
      ? createdCommunityActiveFilters.communityFilter
      : undefined;

  const {
    data: createdCommunitiesResponse,
    isLoading: isCreatedCommunityLoading,
    isFetching: isCreatedCommunityFetching,
    isError: isCreatedCommunityError,
    refetch: refetchCreatedCommunities,
  } = useGetAdminCommunitiesQuery({
    page: createdCommunityPage + 1,
    limit: createdCommunityPageSize,
    search: createdCommunitySearch.trim() || undefined,
    status: createdCommunityStatusFilter,
    visibility: createdCommunityVisibilityFilter,
    sortBy: createdCommunitySortBy,
    sortDirection: createdCommunitySortDirection,
  });

  const createdCommunities = createdCommunitiesResponse?.data ?? [];
  const createdCommunityMeta = createdCommunitiesResponse?.meta;

  const [categoryPage, setCategoryPage] = useState(0);
  const [categoryPageSize, setCategoryPageSize] = useState(10);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySortBy, setCategorySortBy] =
    useState<CategorySortBy>("sortOrder");
  const [categorySortDirection, setCategorySortDirection] =
    useState<SortDirection>("asc");

  const [categoryActiveFilters, setCategoryActiveFilters] = useState<
    Record<string, string>
  >({
    categoryStatus: "ALL",
  });

  const categoryStatusFilter: CategoryStatus | undefined =
    categoryActiveFilters.categoryStatus === "ACTIVE" ||
    categoryActiveFilters.categoryStatus === "INACTIVE"
      ? categoryActiveFilters.categoryStatus
      : undefined;

  const {
    data: categoriesResponse,
    isLoading: isCategoryLoading,
    isFetching: isCategoryFetching,
    isError: isCategoryError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery({
    page: categoryPage + 1,
    limit: categoryPageSize,
    search: categorySearch.trim() || undefined,
    status: categoryStatusFilter,
    sortBy: categorySortBy,
    sortDirection: categorySortDirection,
  });

  const categories = categoriesResponse?.data ?? [];
  const categoryMeta = categoriesResponse?.meta;

  const communityStats = {
    totalCommunities: adminCommunitiesResponse?.stats.totalCommunities ?? 0,
    bannedMembers: adminCommunitiesResponse?.stats.bannedMembers ?? 0,
    totalMembers: adminCommunitiesResponse?.stats.totalMembers ?? 0,
    totalPosts: adminCommunitiesResponse?.stats.totalPosts ?? 0,
    pendingJoinRequests:
      adminCommunitiesResponse?.stats.pendingJoinRequests ?? 0,
  };

  const categoryStats = {
    totalCategories: categoryMeta?.total ?? 0,
  };

  // const goToCreateCommunityPage = () => {
  //   router.push(CREATE_COMMUNITY_ROUTE as never);
  // };

  const handleCommunitySearchChange = (value: string) => {
    setCommunitySearch(value);
    setCommunityPage(0);
  };

  const handleCommunityPageSizeChange = (nextPageSize: number) => {
    setCommunityPageSize(nextPageSize);
    setCommunityPage(0);
  };

  const handleCommunityFilterChange = (key: string, value: string) => {
    setCommunityActiveFilters((previous) => ({
      ...previous,
      [key]: value,
    }));

    setCommunityPage(0);
  };

  const handleCommunitySortChange = (key: string) => {
    const allowedSortKeys: CommunitySortBy[] = [
      "createdAt",
      "updatedAt",
      "name",
      "status",
      "visibility",
    ];

    if (!allowedSortKeys.includes(key as CommunitySortBy)) return;

    const nextSortBy = key as CommunitySortBy;

    if (communitySortBy === nextSortBy) {
      setCommunitySortDirection((previous) =>
        previous === "asc" ? "desc" : "asc",
      );
    } else {
      setCommunitySortBy(nextSortBy);
      setCommunitySortDirection("asc");
    }

    setCommunityPage(0);
  };

  const handleCreatedCommunitySearchChange = (value: string) => {
    setCreatedCommunitySearch(value);
    setCreatedCommunityPage(0);
  };

  const handleCreatedCommunityPageSizeChange = (nextPageSize: number) => {
    setCreatedCommunityPageSize(nextPageSize);
    setCreatedCommunityPage(0);
  };

  const handleCreatedCommunityFilterChange = (key: string, value: string) => {
    setCreatedCommunityActiveFilters((previous) => ({
      ...previous,
      [key]: value,
    }));

    setCreatedCommunityPage(0);
  };

  const handleCreatedCommunitySortChange = (key: string) => {
    const allowedSortKeys: CommunitySortBy[] = [
      "createdAt",
      "updatedAt",
      "name",
      "status",
      "visibility",
    ];

    if (!allowedSortKeys.includes(key as CommunitySortBy)) return;

    const nextSortBy = key as CommunitySortBy;

    if (createdCommunitySortBy === nextSortBy) {
      setCreatedCommunitySortDirection((previous) =>
        previous === "asc" ? "desc" : "asc",
      );
    } else {
      setCreatedCommunitySortBy(nextSortBy);
      setCreatedCommunitySortDirection("asc");
    }

    setCreatedCommunityPage(0);
  };

  const handleCategorySearchChange = (value: string) => {
    setCategorySearch(value);
    setCategoryPage(0);
  };

  const handleCategoryPageSizeChange = (nextPageSize: number) => {
    setCategoryPageSize(nextPageSize);
    setCategoryPage(0);
  };

  const handleCategoryFilterChange = (key: string, value: string) => {
    setCategoryActiveFilters((previous) => ({
      ...previous,
      [key]: value,
    }));

    setCategoryPage(0);
  };

  const handleCategorySortChange = (key: string) => {
    const allowedSortKeys: CategorySortBy[] = [
      "sortOrder",
      "name",
      "createdAt",
      "updatedAt",
      "status",
    ];

    if (!allowedSortKeys.includes(key as CategorySortBy)) return;

    const nextSortBy = key as CategorySortBy;

    if (categorySortBy === nextSortBy) {
      setCategorySortDirection((previous) =>
        previous === "asc" ? "desc" : "asc",
      );
    } else {
      setCategorySortBy(nextSortBy);
      setCategorySortDirection("asc");
    }

    setCategoryPage(0);
  };

  const handleCreateCategoryClose = () => {
    setIsCreateCategoryOpen(false);
    setCategoryPage(0);
    refetchCategories();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderTextWrap}>
            <Text style={styles.title}>Communities</Text>

            <Text style={styles.subtitle}>
              Manage communities, categories, visibility and moderation actions
            </Text>
          </View>

          <Pressable
            onPress={() => router.push(`/pages/admin-create-community`)}
            style={styles.headerCreateButton}
          >
            <Ionicons
              name="add"
              size={18}
              color={colors.accentForeground}
            />

            <Text style={styles.createButtonText}>Create</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
          style={styles.kpiScroll}
        >
          <AdminKpiCard
            title="Total Communities"
            value={communityStats.totalCommunities}
            icon="people-circle-outline"
            style={styles.kpiCard}
          />

          <AdminKpiCard
            title="Banned Members"
            value={communityStats.bannedMembers}
            icon="ban-outline"
            style={styles.kpiCard}
          />

          <AdminKpiCard
            title="Total Members"
            value={communityStats.totalMembers}
            icon="people-outline"
            style={styles.kpiCard}
          />

          <AdminKpiCard
            title="Total Posts"
            value={communityStats.totalPosts}
            icon="document-text-outline"
            style={styles.kpiCard}
          />

          <AdminKpiCard
            title="Pending Requests"
            value={communityStats.pendingJoinRequests}
            icon="time-outline"
            style={styles.kpiCard}
          />

          <AdminKpiCard
            title="Total Categories"
            value={categoryStats.totalCategories}
            icon="grid-outline"
            style={styles.kpiCard}
          />
        </ScrollView>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AdminTab)}
          variant="secondary"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
            style={styles.tabsScroll}
          >
            <Tabs.List>
              <Tabs.Indicator />

              <Tabs.Trigger value="communities">
                <Tabs.Label>Communities</Tabs.Label>
              </Tabs.Trigger>

              <Tabs.Trigger value="createdCommunities">
                <Tabs.Label>Community Created</Tabs.Label>
              </Tabs.Trigger>

              <Tabs.Trigger value="categories">
                <Tabs.Label>Categories</Tabs.Label>
              </Tabs.Trigger>
            </Tabs.List>
          </ScrollView>

          <Tabs.Content value="communities">
            <View style={styles.tabContent}>
              {isCommunityError ? (
                <Text style={styles.errorText} onPress={refetchCommunities}>
                  Failed to load communities. Tap to retry.
                </Text>
              ) : null}

              {isCommunityFetching && !isCommunityLoading ? (
                <Text style={styles.fetchingText}>Updating communities...</Text>
              ) : null}

              <View style={styles.tableWrap}>
                <DataTable
                  rows={communities}
                  columns={communityColumns}
                  rowKey={(row) => row.id}
                  searchValue={communitySearch}
                  onSearchChange={handleCommunitySearchChange}
                  searchPlaceholder="Search communities"
                  filters={communityFilters}
                  activeFilters={communityActiveFilters}
                  onFilterChange={handleCommunityFilterChange}
                  sortBy={communitySortBy}
                  sortDirection={communitySortDirection}
                  onSortChange={handleCommunitySortChange}
                  emptyTitle="No communities found"
                  emptySubtitle="Try another search or filter."
                  isLoading={isCommunityLoading}
                  pagination={{
                    page: communityPage,
                    pageSize: communityPageSize,
                    totalItems: communityMeta?.total ?? 0,
                    totalPages: communityMeta?.totalPages ?? 1,
                    onPageChange: setCommunityPage,
                    onPageSizeChange: handleCommunityPageSizeChange,
                    pageSizeOptions: [5, 10, 20],
                  }}
                />
              </View>
            </View>
          </Tabs.Content>

          <Tabs.Content value="createdCommunities">
            <View style={styles.tabContent}>
              <View style={styles.tabHeader}>
                <View style={styles.tabHeaderTextWrap}>
                  <Text style={styles.tabHeaderTitle}>Community Created</Text>

                  <Text style={styles.tabHeaderSubtitle}>
                    Manage communities created by this admin
                  </Text>
                </View>
              </View>

              {isCreatedCommunityError ? (
                <Text
                  style={styles.errorText}
                  onPress={refetchCreatedCommunities}
                >
                  Failed to load created communities. Tap to retry.
                </Text>
              ) : null}

              {isCreatedCommunityFetching && !isCreatedCommunityLoading ? (
                <Text style={styles.fetchingText}>
                  Updating created communities...
                </Text>
              ) : null}

              <View style={styles.tableWrap}>
                <DataTable
                  rows={createdCommunities}
                  columns={communityColumns}
                  rowKey={(row) => row.id}
                  searchValue={createdCommunitySearch}
                  onSearchChange={handleCreatedCommunitySearchChange}
                  searchPlaceholder="Search created communities"
                  filters={communityFilters}
                  activeFilters={createdCommunityActiveFilters}
                  onFilterChange={handleCreatedCommunityFilterChange}
                  sortBy={createdCommunitySortBy}
                  sortDirection={createdCommunitySortDirection}
                  onSortChange={handleCreatedCommunitySortChange}
                  emptyTitle="No created communities found"
                  emptySubtitle="Create a community or try another search."
                  isLoading={isCreatedCommunityLoading}
                  pagination={{
                    page: createdCommunityPage,
                    pageSize: createdCommunityPageSize,
                    totalItems: createdCommunityMeta?.total ?? 0,
                    totalPages: createdCommunityMeta?.totalPages ?? 1,
                    onPageChange: setCreatedCommunityPage,
                    onPageSizeChange: handleCreatedCommunityPageSizeChange,
                    pageSizeOptions: [5, 10, 20],
                  }}
                />
              </View>
            </View>
          </Tabs.Content>

          <Tabs.Content value="categories">
            <View style={styles.tabContent}>
              <View style={styles.tabHeader}>
                <View style={styles.tabHeaderTextWrap}>
                  <Text style={styles.tabHeaderTitle}>Categories</Text>

                  <Text style={styles.tabHeaderSubtitle}>
                    Create and manage community categories
                  </Text>
                </View>

                <Pressable
                  onPress={() => setIsCreateCategoryOpen(true)}
                  style={styles.createButton}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={colors.accentForeground}
                  />

                  <Text style={styles.createButtonText}>Create</Text>
                </Pressable>
              </View>

              {isCategoryError ? (
                <Text style={styles.errorText} onPress={refetchCategories}>
                  Failed to load categories. Tap to retry.
                </Text>
              ) : null}

              {isCategoryFetching && !isCategoryLoading ? (
                <Text style={styles.fetchingText}>Updating categories...</Text>
              ) : null}

              <View style={styles.tableWrap}>
                <DataTable
                  rows={categories}
                  columns={categoryColumns}
                  rowKey={(row) => row.id}
                  searchValue={categorySearch}
                  onSearchChange={handleCategorySearchChange}
                  searchPlaceholder="Search categories"
                  filters={categoryFilters}
                  activeFilters={categoryActiveFilters}
                  onFilterChange={handleCategoryFilterChange}
                  sortBy={categorySortBy}
                  sortDirection={categorySortDirection}
                  onSortChange={handleCategorySortChange}
                  emptyTitle="No categories found"
                  emptySubtitle="Try another search or filter."
                  isLoading={isCategoryLoading}
                  pagination={{
                    page: categoryPage,
                    pageSize: categoryPageSize,
                    totalItems: categoryMeta?.total ?? 0,
                    totalPages: categoryMeta?.totalPages ?? 1,
                    onPageChange: setCategoryPage,
                    onPageSizeChange: handleCategoryPageSizeChange,
                    pageSizeOptions: [5, 10, 20],
                  }}
                />
              </View>
            </View>
          </Tabs.Content>
        </Tabs>
      </ScrollView>

      <CreateCategoryForm
        visible={isCreateCategoryOpen}
        onClose={handleCreateCategoryClose}
      />
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

    pageHeader: {
      marginBottom: 18,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      columnGap: 12,
    },

    pageHeaderTextWrap: {
      flex: 1,
    },

    title: {
      fontSize: 30,
      lineHeight: 38,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    subtitle: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    headerCreateButton: {
      marginTop: 4,
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      columnGap: 6,
      backgroundColor: colors.accent,
    },

    kpiScroll: {
      marginHorizontal: -18,
      marginBottom: 18,
    },

    kpiRow: {
      paddingHorizontal: 18,
      columnGap: 12,
    },

    kpiCard: {
      width: 180,
      minHeight: 128,
    },

    tabsScroll: {
      marginHorizontal: -18,
    },

    tabsScrollContent: {
      paddingHorizontal: 18,
    },

    tabContent: {
      marginTop: 16,
    },

    tabHeader: {
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: 12,
    },

    tabHeaderTextWrap: {
      flex: 1,
    },

    tabHeaderTitle: {
      fontSize: 18,
      lineHeight: 25,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    tabHeaderSubtitle: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    createButton: {
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      columnGap: 6,
      backgroundColor: colors.accent,
    },

    createButtonText: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_600SemiBold",
      color: colors.accentForeground,
    },

    errorText: {
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_500Medium",
      color: "#dc2626",
    },

    fetchingText: {
      marginBottom: 12,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    tableWrap: {
      marginHorizontal: -18,
    },
  });
}