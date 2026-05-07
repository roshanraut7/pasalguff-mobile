import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";

import DataTable from "@/components/common/data-table";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetCommunityPostsTableQuery } from "@/store/api/postApi";
import type { CommunityPostTableItem } from "@/types/post";
import {
  createCommunityPostColumns,
  createCommunityPostFilters,
  type CommunityPostAction,
} from "@/components/column/user-community/user.post.columns";

type PostStatusFilter = "PUBLISHED" | "HIDDEN" | "REMOVED";
type PostTypeFilter = "" | "TEXT" | "MEDIA" | "LINK";

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function PostScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const localParams = useLocalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const globalParams = useGlobalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const communityId =
    getParamValue(localParams.communityId) ||
    getParamValue(globalParams.communityId) ||
    getParamValue(localParams.id) ||
    getParamValue(globalParams.id);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: "PUBLISHED",
    type: "",
  });

  const statusFilter = activeFilters.status as PostStatusFilter;
  const typeFilter = activeFilters.type as PostTypeFilter;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
    setSearch("");
    setDebouncedSearch("");
    setActiveFilters({
      status: "PUBLISHED",
      type: "",
    });
  }, [communityId]);

  const {
    data: postsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityPostsTableQuery(
    {
      communityId,
      page: page + 1,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter,
      type: typeFilter || undefined,
      sortBy: "newest",
    },
    {
      skip: !communityId,
      refetchOnMountOrArgChange: true,
    },
  );

  const posts = postsResponse?.data ?? [];

  /**
   * IMPORTANT FIX:
   * If backend meta.total is missing/wrong, use posts.length as fallback.
   * This fixes "0-0 of 0" while rows are showing.
   */
  const totalPosts = postsResponse?.meta?.total ?? posts.length;

  const totalPages = Math.max(
    1,
    postsResponse?.meta?.totalPages ?? Math.ceil(totalPosts / pageSize),
  );

  const canManagePosts =
    postsResponse?.viewer?.isOwner === true ||
    postsResponse?.viewer?.canManagePosts === true;

  const columns = useMemo(
    () =>
      createCommunityPostColumns({
        colors,
        canManagePosts,
        onActionPress: handleOpenAction,
      }),
    [colors, canManagePosts],
  );

  const filters = useMemo(() => createCommunityPostFilters(), []);

  function handleFilterChange(key: string, value: string) {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPage(0);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(0);
  }

  function handleOpenAction(post: CommunityPostTableItem) {
    const actions: CommunityPostAction[] =
      post.status === "PUBLISHED"
        ? ["view", "hide", "remove"]
        : post.status === "HIDDEN"
          ? ["view", "restore", "remove"]
          : ["view", "restore"];

    Alert.alert(
      "Post actions",
      `Post: ${post.content?.slice(0, 60) || "No content"}`,
      actions.map((action) => ({
        text: action,
        onPress: () => handlePostAction(action, post),
      })),
    );
  }

  function handlePostAction(
    action: CommunityPostAction,
    post: CommunityPostTableItem,
  ) {
    Alert.alert("Action", `${action} post: ${post.id}`);
  }

  if (!communityId) {
    return (
      <View style={styles.centerWrap}>
        <Ionicons name="warning-outline" size={30} color={colors.warning} />

        <Text style={styles.centerTitle}>Community ID missing</Text>

        <Text style={styles.centerSubtitle}>
          Open this screen with communityId in the route params.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Posts</Text>

          <Text style={styles.subtitle}>{totalPosts} community posts</Text>
        </View>

        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.accent} />

          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={colors.danger}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Failed to load posts</Text>

            <Text style={styles.errorMessage}>
              Please check your connection or make sure you have access to this
              community.
            </Text>
          </View>
        </View>
      ) : null}

      <DataTable
        rows={posts}
        columns={columns}
        rowKey={(row) => row.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search posts"
        filters={canManagePosts ? filters : []}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        emptyTitle={error ? "Failed to load posts" : "No posts found"}
        emptySubtitle={
          error
            ? "Tap refresh and try again."
            : "No community posts matched this search."
        }
        isLoading={isLoading}
        isFetching={isFetching}
        pagination={{
          page,
          pageSize,
          totalItems: totalPosts,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange: handlePageSizeChange,
          pageSizeOptions: [10, 20, 50],
        }}
      />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface,
    },

    scrollContent: {
      flexGrow: 1,
      paddingBottom: 155,
    },

    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    title: {
      color: colors.foreground,
      fontSize: 22,
      fontFamily: "Poppins_700Bold",
    },

    subtitle: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },

    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor: colors.surfaceSecondary,
    },

    refreshText: {
      color: colors.accent,
      fontSize: 13,
      fontFamily: "Poppins_600SemiBold",
    },

    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      backgroundColor: colors.surface,
    },

    centerTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },

    centerSubtitle: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      fontFamily: "Poppins_400Regular",
    },

    errorBox: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surfaceSecondary,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    errorMessage: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },
  });
}