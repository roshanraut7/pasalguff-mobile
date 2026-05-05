import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetCategoriesQuery } from "@/store/api/category.api";
import {
  useGetExploreCommunitiesQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} from "@/store/api/communityApi";

import type { CategoryRow } from "@/store/api/category.api";
import type { CommunityItem } from "@/types/community";
import CommunityCard from "@/components/common/communityCard";

const COMMUNITY_PAGE_LIMIT = 20;
const CATEGORY_PAGE_LIMIT = 50;

type CategoryPillItem = Pick<CategoryRow, "id" | "name" | "slug">;

const ALL_CATEGORY: CategoryPillItem = {
  id: "all",
  name: "All",
  slug: "all",
};

export default function ExploreScreen() {
  const categoryScrollRef = useRef<ScrollView>(null);
  const currentScrollX = useRef(0);

  const { colors } = useAppTheme();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [actionCommunityId, setActionCommunityId] = useState<string | null>(
    null,
  );

  const [categoryContainerWidth, setCategoryContainerWidth] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);

  /**
   * Community pagination state.
   */
  const [page, setPage] = useState(1);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Category pagination state.
   *
   * Backend max limit is 50, so we load categories page by page.
   */
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryItems, setCategoryItems] = useState<CategoryRow[]>([]);
  const [hasMoreCategories, setHasMoreCategories] = useState(true);

  /**
   * Pull refresh state.
   *
   * Do not use isFetching directly for RefreshControl, because normal API fetching
   * can show the white pull-refresh spinner unexpectedly.
   */
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    error: categoriesError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery(
    {
      page: categoryPage,
      limit: CATEGORY_PAGE_LIMIT,
      status: "ACTIVE",
      sortBy: "sortOrder",
      sortDirection: "asc",
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: communitiesResponse,
    isLoading: communitiesLoading,
    isFetching: communitiesFetching,
    error: communitiesError,
    refetch: refetchCommunities,
  } = useGetExploreCommunitiesQuery(
    {
      page,
      limit: COMMUNITY_PAGE_LIMIT,
      ...(selectedCategoryId !== "all"
        ? { categoryId: selectedCategoryId }
        : {}),
      sortBy: "newest",
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const [joinCommunity] = useJoinCommunityMutation();
  const [leaveCommunity] = useLeaveCommunityMutation();

  /**
   * Append paginated categories.
   */
  useEffect(() => {
    if (!categoriesResponse) return;

    const nextItems = categoriesResponse.data ?? [];
    const meta = categoriesResponse.meta;

    setCategoryItems((prev) => {
      if (categoryPage === 1) {
        return nextItems;
      }

      const existingIds = new Set(prev.map((item) => item.id));

      const uniqueNextItems = nextItems.filter(
        (item) => !existingIds.has(item.id),
      );

      return [...prev, ...uniqueNextItems];
    });

    setHasMoreCategories(meta.page < meta.totalPages);
  }, [categoriesResponse, categoryPage]);

  const categoryPills = useMemo<CategoryPillItem[]>(() => {
    return [ALL_CATEGORY, ...categoryItems];
  }, [categoryItems]);

  /**
   * Reset community pagination when selected category changes.
   */
  useEffect(() => {
    setPage(1);
    setCommunities([]);
    setHasMore(true);
  }, [selectedCategoryId]);

  /**
   * Append paginated communities.
   */
  useEffect(() => {
    if (!communitiesResponse) return;

    const nextItems = communitiesResponse.data ?? [];
    const meta = communitiesResponse.meta;

    setCommunities((prev) => {
      if (page === 1) {
        return nextItems;
      }

      const existingIds = new Set(prev.map((item) => item.id));

      const uniqueNextItems = nextItems.filter(
        (item) => !existingIds.has(item.id),
      );

      return [...prev, ...uniqueNextItems];
    });

    setHasMore(meta.page < meta.totalPages);
  }, [communitiesResponse, page]);

  const isInitialLoading = communitiesLoading && page === 1;
  const isLoadingMore = communitiesFetching && page > 1;

  const showCategoryNextButton =
    categoryContentWidth > categoryContainerWidth + 8;

  const handleCategoryScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    currentScrollX.current = event.nativeEvent.contentOffset.x;
  };

  const handleCategoryContainerLayout = (event: LayoutChangeEvent) => {
    setCategoryContainerWidth(event.nativeEvent.layout.width);
  };

  const handleSlideRight = () => {
    categoryScrollRef.current?.scrollTo({
      x: currentScrollX.current + 180,
      animated: true,
    });
  };

  const handleLoadMoreCategories = () => {
    if (categoriesFetching || !hasMoreCategories) return;

    setCategoryPage((prev) => prev + 1);
  };

  const handleRefresh = useCallback(async () => {
    try {
      setIsPullRefreshing(true);

      /**
       * Reset categories.
       */
      setCategoryPage(1);
      setCategoryItems([]);
      setHasMoreCategories(true);

      /**
       * Reset communities.
       */
      setPage(1);
      setCommunities([]);
      setHasMore(true);

      await Promise.all([refetchCategories(), refetchCommunities()]);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetchCategories, refetchCommunities]);

  const handleLoadMore = useCallback(() => {
    if (communitiesFetching || !hasMore || communities.length === 0) return;

    setPage((prev) => prev + 1);
  }, [communitiesFetching, hasMore, communities.length]);

  const isCommunityOwner = useCallback((community: CommunityItem) => {
    return community.myRole === "ADMIN" && community.myMemberStatus === "ACTIVE";
  }, []);

  const isCommunityJoined = useCallback((community: CommunityItem) => {
    return community.isJoined === true || community.myMemberStatus === "ACTIVE";
  }, []);

  const updateCommunityInLocalState = useCallback(
    (communityId: string, patch: Partial<CommunityItem>) => {
      setCommunities((prev) =>
        prev.map((community) =>
          community.id === communityId
            ? {
                ...community,
                ...patch,
              }
            : community,
        ),
      );
    },
    [],
  );

  const handleToggleJoin = useCallback(
    async (community: CommunityItem) => {
      const isOwner = isCommunityOwner(community);
      const isJoined = isCommunityJoined(community);

      if (isOwner || actionCommunityId) return;

      try {
        setActionCommunityId(community.id);

        if (isJoined) {
          updateCommunityInLocalState(community.id, {
            isJoined: false,
            myMemberStatus: "LEFT",
          });

          await leaveCommunity(community.id).unwrap();
        } else {
          updateCommunityInLocalState(community.id, {
            isJoined: true,
            myRole: community.myRole ?? "MEMBER",
            myMemberStatus: "ACTIVE",
          });

          await joinCommunity({ communityId: community.id }).unwrap();
        }

        await refetchCommunities();
      } catch (error) {
        console.log("Community join/leave failed:", error);

        updateCommunityInLocalState(community.id, {
          isJoined: community.isJoined,
          myRole: community.myRole,
          myMemberStatus: community.myMemberStatus,
        });
      } finally {
        setActionCommunityId(null);
      }
    },
    [
      actionCommunityId,
      isCommunityJoined,
      isCommunityOwner,
      joinCommunity,
      leaveCommunity,
      refetchCommunities,
      updateCommunityInLocalState,
    ],
  );

  const renderCommunity: ListRenderItem<CommunityItem> = ({ item }) => {
    return (
      <CommunityCard
        community={item}
        showJoinButton
        isActionLoading={actionCommunityId === item.id}
        onPress={(community) => router.push(`/user/community/${community.slug}`)}
        onPressJoinToggle={handleToggleJoin}
      />
    );
  };

  const renderHeader = () => {
    return (
      <View style={{ paddingTop: 16, paddingBottom: 12 }}>
        <View>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 26,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Explore
          </Text>

          <Text
            style={{
              marginTop: 4,
              color: colors.muted,
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_400Regular",
            }}
          >
            Discover categories and communities.
          </Text>
        </View>

        <View
          style={{
            marginTop: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <View style={{ flex: 1 }} onLayout={handleCategoryContainerLayout}>
            {categoriesLoading && categoryPage === 1 ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : categoriesError ? (
              <Text
                style={{
                  color: colors.danger,
                  fontSize: 13,
                  fontFamily: "Poppins_500Medium",
                }}
              >
                Failed to load categories
              </Text>
            ) : (
              <ScrollView
                ref={categoryScrollRef}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleCategoryScroll}
                scrollEventThrottle={16}
                onContentSizeChange={(width) => setCategoryContentWidth(width)}
                contentContainerStyle={{
                  gap: 10,
                  paddingRight: 4,
                }}
              >
                {categoryPills.map((category) => {
                  const isActive = selectedCategoryId === category.id;

                  return (
                    <TouchableOpacity
                      key={category.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (selectedCategoryId !== category.id) {
                          setSelectedCategoryId(category.id);
                        }
                      }}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isActive ? colors.accent : colors.border,
                        backgroundColor: isActive
                          ? colors.accent
                          : colors.surface,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          color: isActive
                            ? colors.accentForeground
                            : colors.foreground,
                          fontSize: 13,
                          fontFamily: "Poppins_500Medium",
                        }}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {hasMoreCategories ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={categoriesFetching}
                    onPress={handleLoadMoreCategories}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      opacity: categoriesFetching ? 0.7 : 1,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.accent,
                        fontSize: 13,
                        fontFamily: "Poppins_600SemiBold",
                      }}
                    >
                      {categoriesFetching ? "Loading..." : "More"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            )}
          </View>

          {showCategoryNextButton ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSlideRight}
              style={{
                height: 38,
                width: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.accent}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 20,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Communities
          </Text>

          <Text
            style={{
              marginTop: 4,
              color: colors.muted,
              fontSize: 13,
              lineHeight: 20,
              fontFamily: "Poppins_400Regular",
            }}
          >
            {selectedCategoryId === "all"
              ? "All active communities are shown here."
              : "Communities for the selected category are shown here."}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isInitialLoading) {
      return (
        <View style={{ paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (communitiesError) {
      return (
        <View
          style={{
            marginTop: 8,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 20,
          }}
        >
          <Text
            style={{
              color: colors.danger,
              fontSize: 14,
              fontFamily: "Poppins_500Medium",
            }}
          >
            Failed to load communities
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          marginTop: 8,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 20,
        }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          No communities found
        </Text>

        <Text
          style={{
            marginTop: 8,
            color: colors.muted,
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "Poppins_400Regular",
          }}
        >
          There are no communities in this category yet.
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={communities}
      keyExtractor={(item) => item.id}
      renderItem={renderCommunity}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingBottom: 140,
      }}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
    />
  );
}