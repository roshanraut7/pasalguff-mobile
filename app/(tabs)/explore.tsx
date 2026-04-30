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
  Image,
  LayoutChangeEvent,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useGetCategoriesQuery,
  useGetExploreCommunitiesQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} from "@/store/api/communityApi";
import type { CommunityItem } from "@/store/api/communityApi";
import CommunityCard from "@/components/common/communityCard";

const COMMUNITY_PAGE_LIMIT = 20;

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
   * Page-based infinite loading for community list.
   *
   * Backend response:
   * {
   *   data: CommunityItem[],
   *   meta: { total, page, limit, totalPages }
   * }
   */
  const [page, setPage] = useState(1);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    error: categoriesError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

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

  const categoryPills = useMemo(() => {
    return [{ id: "all", name: "All", slug: "all" }, ...categories];
  }, [categories]);

  /**
   * IMPORTANT:
   * When category changes, reset loaded communities.
   * Otherwise old category data will remain visible.
   */
  useEffect(() => {
    setPage(1);
    setCommunities([]);
    setHasMore(true);
  }, [selectedCategoryId]);

  /**
   * Append newly fetched page data.
   *
   * page 1 = replace list
   * page 2+ = append unique records
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

  const isRefreshing =
    !categoriesLoading &&
    !communitiesLoading &&
    page === 1 &&
    (categoriesFetching || communitiesFetching);

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

  const handleRefresh = useCallback(async () => {
    setHasMore(true);

    if (page !== 1) {
      setPage(1);
      await refetchCategories();
      return;
    }

    await Promise.all([refetchCategories(), refetchCommunities()]);
  }, [page, refetchCategories, refetchCommunities]);

  const handleLoadMore = useCallback(() => {
    if (communitiesFetching || !hasMore || communities.length === 0) return;
    setPage((prev) => prev + 1);
  }, [communitiesFetching, hasMore, communities.length]);

  /**
   * Correct owner check.
   *
   * Do not rely on myRole only.
   * It must also be ACTIVE membership.
   */
  const isCommunityOwner = useCallback((community: CommunityItem) => {
    return community.myRole === "ADMIN" && community.myMemberStatus === "ACTIVE";
  }, []);

  /**
   * Correct joined check.
   *
   * Important:
   * After leaving, backend may still return:
   * myRole: "MEMBER"
   * myMemberStatus: "LEFT"
   *
   * So do NOT treat myRole === MEMBER as joined.
   */
  const isCommunityJoined = useCallback((community: CommunityItem) => {
    return community.isJoined === true || community.myMemberStatus === "ACTIVE";
  }, []);

  /**
   * Optimistic update helper.
   *
   * This makes Join/Joined button change immediately,
   * instead of waiting for refetch.
   */
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

  /**
   * Toggle join/unjoin.
   *
   * Not joined -> join API
   * Joined -> leave API
   * Owner -> disabled
   */
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

        /**
         * Rollback optimistic UI if API fails.
         */
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
            {categoriesLoading ? (
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
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
    />
  );
}