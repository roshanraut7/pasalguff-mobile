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
import { SearchField } from "heroui-native";

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

type ExploreHeaderProps = {
  colors: ReturnType<typeof useAppTheme>["colors"];

  selectedCategoryId: string;
  categoryPills: CategoryPillItem[];

  searchValue: string;
  isSearchVisible: boolean;

  categoriesLoading: boolean;
  categoriesFetching: boolean;
  categoriesError: unknown;
  categoryPage: number;
  hasMoreCategories: boolean;
  showCategoryNextButton: boolean;
  isPullRefreshing: boolean;

  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onSearchChange: (value: string) => void;
  onOpenCreateCommunity: () => void;

  onSelectCategory: (categoryId: string) => void;
  onCategoryContainerLayout: (event: LayoutChangeEvent) => void;
  onCategoryScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onCategoryContentSizeChange: (width: number) => void;
  onSlideRight: () => void;
  onLoadMoreCategories: () => void;

  categoryScrollRef: React.RefObject<ScrollView | null>;
};

const ExploreHeader = React.memo(function ExploreHeader({
  colors,

  selectedCategoryId,
  categoryPills,

  searchValue,
  isSearchVisible,

  categoriesLoading,
  categoriesFetching,
  categoriesError,
  categoryPage,
  hasMoreCategories,
  showCategoryNextButton,
  isPullRefreshing,

  onOpenSearch,
  onCloseSearch,
  onSearchChange,
  onOpenCreateCommunity,

  onSelectCategory,
  onCategoryContainerLayout,
  onCategoryScroll,
  onCategoryContentSizeChange,
  onSlideRight,
  onLoadMoreCategories,

  categoryScrollRef,
}: ExploreHeaderProps) {
  const shouldShowCategoryLoader =
    categoriesLoading && categoryPage === 1 && categoryPills.length <= 1;

  const shouldShowMoreButton =
    hasMoreCategories &&
    !isPullRefreshing &&
    categoryPills.length > 1;

  return (
    <View style={{ paddingTop: 16, paddingBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: isSearchVisible ? 10 : 0,
        }}
      >
        <View style={{ flex: 1, minWidth: 90 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.foreground,
              fontSize: 26,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Explore
          </Text>
        </View>

        {isSearchVisible ? (
          <>
            <View
              style={{
                flex: 1.45,
                minWidth: 170,
              }}
            >
              <SearchField value={searchValue} onChange={onSearchChange}>
                <SearchField.Group>
                  <SearchField.SearchIcon
                    iconProps={{
                      size: 16,
                      color: colors.muted,
                    }}
                  />

                  <SearchField.Input
                    autoFocus
                    placeholder="Search communities"
                    returnKeyType="search"
                    style={{
                      color: colors.foreground,
                      fontSize: 13,
                      fontFamily: "Poppins_400Regular",
                    }}
                    placeholderTextColor={colors.placeholder}
                  />

                  <SearchField.ClearButton
                    iconProps={{
                      size: 14,
                      color: colors.muted,
                    }}
                  />
                </SearchField.Group>
              </SearchField>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onCloseSearch}
              style={{
                height: 42,
                width: 42,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onOpenCreateCommunity}
              style={{
                height: 44,
                width: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={24} color={colors.accent} />
            </TouchableOpacity>
          </>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onOpenSearch}
              style={{
                height: 44,
                width: 34,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="search-outline" size={22} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onOpenCreateCommunity}
              style={{
                height: 44,
                width: 34,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View
        style={{
          marginTop: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }} onLayout={onCategoryContainerLayout}>
          {shouldShowCategoryLoader ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : categoriesError && categoryPills.length <= 1 ? (
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
              onScroll={onCategoryScroll}
              scrollEventThrottle={16}
              onContentSizeChange={onCategoryContentSizeChange}
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
                    onPress={() => onSelectCategory(category.id)}
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

              {shouldShowMoreButton ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={categoriesFetching}
                  onPress={onLoadMoreCategories}
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

        {showCategoryNextButton && !isPullRefreshing ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSlideRight}
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
      </View>
    </View>
  );
});

export default function ExploreScreen() {
  const categoryScrollRef = useRef<ScrollView>(null);
  const currentScrollX = useRef(0);

  const { colors } = useAppTheme();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [actionCommunityId, setActionCommunityId] = useState<string | null>(
    null,
  );

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  const [categoryContainerWidth, setCategoryContainerWidth] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);

  const [page, setPage] = useState(1);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryItems, setCategoryItems] = useState<CategoryRow[]>([]);
  const [hasMoreCategories, setHasMoreCategories] = useState(true);

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isListTransitioning, setIsListTransitioning] = useState(true);

  const activeSearchText = debouncedSearchValue.trim();

  const communityListKey = useMemo(() => {
    return `${selectedCategoryId}__${activeSearchText}`;
  }, [selectedCategoryId, activeSearchText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const {
    currentData: categoriesResponse,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    error: categoriesError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery({
    page: categoryPage,
    limit: CATEGORY_PAGE_LIMIT,
    status: "ACTIVE",
    sortBy: "sortOrder",
    sortDirection: "asc",
  });

  const {
    currentData: communitiesResponse,
    isLoading: communitiesLoading,
    isFetching: communitiesFetching,
    error: communitiesError,
    refetch: refetchCommunities,
  } = useGetExploreCommunitiesQuery({
    page,
    limit: COMMUNITY_PAGE_LIMIT,
    ...(activeSearchText ? { search: activeSearchText } : {}),
    ...(selectedCategoryId !== "all" ? { categoryId: selectedCategoryId } : {}),
    sortBy: "newest",
  });

  const [joinCommunity] = useJoinCommunityMutation();
  const [leaveCommunity] = useLeaveCommunityMutation();

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

  useEffect(() => {
    /**
     * When search text or category changes:
     * - clear old community list
     * - show loader
     * - wait for the new API response
     *
     * This prevents the temporary "No communities found" flicker.
     */
    setIsListTransitioning(true);
    setPage(1);
    setCommunities([]);
    setHasMore(true);
  }, [communityListKey]);

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

    if (page === 1) {
      setIsListTransitioning(false);
    }
  }, [communitiesResponse, page, communityListKey]);

  useEffect(() => {
    if (communitiesError && page === 1) {
      setIsListTransitioning(false);
    }
  }, [communitiesError, page, communityListKey]);

  const isInitialLoading =
    communitiesLoading && page === 1 && communities.length === 0;

  const isFirstPageFetching =
    communitiesFetching && page === 1 && communities.length === 0;

  const isLoadingMore = communitiesFetching && page > 1;

  const showCategoryNextButton =
    categoryContentWidth > categoryContainerWidth + 8;

  const handleOpenSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchVisible(false);
    setSearchValue("");
    setDebouncedSearchValue("");
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleOpenCreateCommunity = useCallback(() => {
    router.push("/pages/createCommunity");
  }, []);

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      if (selectedCategoryId !== categoryId) {
        setSelectedCategoryId(categoryId);
      }
    },
    [selectedCategoryId],
  );

  const handleCategoryScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      currentScrollX.current = event.nativeEvent.contentOffset.x;
    },
    [],
  );

  const handleCategoryContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setCategoryContainerWidth(event.nativeEvent.layout.width);
    },
    [],
  );

  const handleCategoryContentSizeChange = useCallback((width: number) => {
    setCategoryContentWidth(width);
  }, []);

  const handleSlideRight = useCallback(() => {
    categoryScrollRef.current?.scrollTo({
      x: currentScrollX.current + 180,
      animated: true,
    });
  }, []);

  const handleLoadMoreCategories = useCallback(() => {
    if (categoriesFetching || !hasMoreCategories || isPullRefreshing) return;

    setCategoryPage((prev) => prev + 1);
  }, [categoriesFetching, hasMoreCategories, isPullRefreshing]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsPullRefreshing(true);

      currentScrollX.current = 0;
      categoryScrollRef.current?.scrollTo({
        x: 0,
        animated: false,
      });

      /**
       * Do not clear categoryItems or communities during pull refresh.
       * Keep old data visible while fresh data loads.
       */
      setCategoryPage(1);
      setPage(1);
      setHasMore(true);

      await Promise.allSettled([
        refetchCategories().unwrap(),
        refetchCommunities().unwrap(),
      ]);
    } catch (error) {
      console.log("Explore refresh failed:", error);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetchCategories, refetchCommunities]);

  const handleLoadMore = useCallback(() => {
    if (
      communitiesFetching ||
      isPullRefreshing ||
      isListTransitioning ||
      !hasMore ||
      communities.length === 0
    ) {
      return;
    }

    setPage((prev) => prev + 1);
  }, [
    communitiesFetching,
    isPullRefreshing,
    isListTransitioning,
    hasMore,
    communities.length,
  ]);

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

  const renderEmpty = () => {
    /**
     * Pull refresh already has its own spinner.
     * So do not show empty state or big loader during pull refresh.
     */
    if (isPullRefreshing) {
      return null;
    }

    /**
     * Search/category changed but new API result has not arrived yet.
     * Show loader, not "No communities found".
     */
    if (isListTransitioning || isInitialLoading || isFirstPageFetching) {
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
          {activeSearchText
            ? `No communities matched "${activeSearchText}".`
            : "There are no communities in this category yet."}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore || isPullRefreshing || isListTransitioning) return null;

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
      ListHeaderComponent={
        <ExploreHeader
          colors={colors}
          selectedCategoryId={selectedCategoryId}
          categoryPills={categoryPills}
          searchValue={searchValue}
          isSearchVisible={isSearchVisible}
          categoriesLoading={categoriesLoading}
          categoriesFetching={categoriesFetching}
          categoriesError={categoriesError}
          categoryPage={categoryPage}
          hasMoreCategories={hasMoreCategories}
          showCategoryNextButton={showCategoryNextButton}
          isPullRefreshing={isPullRefreshing}
          onOpenSearch={handleOpenSearch}
          onCloseSearch={handleCloseSearch}
          onSearchChange={handleSearchChange}
          onOpenCreateCommunity={handleOpenCreateCommunity}
          onSelectCategory={handleSelectCategory}
          onCategoryContainerLayout={handleCategoryContainerLayout}
          onCategoryScroll={handleCategoryScroll}
          onCategoryContentSizeChange={handleCategoryContentSizeChange}
          onSlideRight={handleSlideRight}
          onLoadMoreCategories={handleLoadMoreCategories}
          categoryScrollRef={categoryScrollRef}
        />
      }
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingBottom: 140,
      }}
      keyboardShouldPersistTaps="handled"
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