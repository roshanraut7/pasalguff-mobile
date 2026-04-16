import React, { useCallback, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  useGetCategoriesQuery,
  useGetExploreCommunitiesQuery,
  useJoinCommunityMutation,
} from "@/store/api/communityApi";

export default function ExploreScreen() {
  const categoryScrollRef = useRef<ScrollView>(null);
  const currentScrollX = useRef(0);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(
    null,
  );
  const [categoryContainerWidth, setCategoryContainerWidth] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);

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
    data: communities = [],
    isLoading: communitiesLoading,
    isFetching: communitiesFetching,
    error: communitiesError,
    refetch: refetchCommunities,
  } = useGetExploreCommunitiesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [joinCommunity] = useJoinCommunityMutation();

  const categoryPills = useMemo(() => {
    return [{ id: "all", name: "All", slug: "all" }, ...categories];
  }, [categories]);

  const filteredCommunities = useMemo(() => {
    if (selectedCategoryId === "all") {
      return communities;
    }

    return communities.filter(
      (community) => community.category?.id === selectedCategoryId,
    );
  }, [communities, selectedCategoryId]);

  const isRefreshing =
    !categoriesLoading &&
    !communitiesLoading &&
    (categoriesFetching || communitiesFetching);

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
    await Promise.all([refetchCategories(), refetchCommunities()]);
  }, [refetchCategories, refetchCommunities]);

  const handleJoin = useCallback(
    async (communityId: string) => {
      try {
        setJoiningCommunityId(communityId);
        await joinCommunity(communityId).unwrap();
      } catch (error) {
        console.log("Join community failed:", error);
      } finally {
        setJoiningCommunityId(null);
      }
    },
    [joinCommunity],
  );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      <View className="px-4 pt-4">
        <View>
          <Text
            className="text-foreground"
            style={{
              fontSize: 26,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Explore
          </Text>

          <Text
            className="mt-1 text-muted"
            style={{
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_400Regular",
            }}
          >
            Discover categories and communities.
          </Text>
        </View>

        <View className="mt-5 flex-row items-center gap-2">
          <View className="flex-1" onLayout={handleCategoryContainerLayout}>
            {categoriesLoading ? (
              <View className="py-3">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : categoriesError ? (
              <Text
                style={{
                  color: COLORS.danger,
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
                    <Pressable
                      key={category.id}
                      onPress={() => setSelectedCategoryId(category.id)}
                      className={`rounded-full border px-4 py-2.5 ${
                        isActive
                          ? "border-accent bg-accent"
                          : "border-border bg-surface"
                      }`}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          color: isActive ? "#ffffff" : COLORS.text,
                          fontSize: 13,
                          fontFamily: "Poppins_500Medium",
                        }}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {showCategoryNextButton ? (
            <Pressable
              onPress={handleSlideRight}
              className="h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-surface"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.primary}
              />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-6">
          <Text
            className="text-foreground"
            style={{
              fontSize: 20,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Communities
          </Text>

          <Text
            className="mt-1 text-muted"
            style={{
              fontSize: 13,
              lineHeight: 20,
              fontFamily: "Poppins_400Regular",
            }}
          >
            {selectedCategoryId === "all"
              ? "All active communities are shown here for now."
              : "Communities for the selected category are shown here."}
          </Text>
        </View>

        <View className="mt-4 gap-4">
          {communitiesLoading ? (
            <View className="py-8">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : communitiesError ? (
            <Text
              style={{
                color: COLORS.danger,
                fontSize: 14,
                fontFamily: "Poppins_500Medium",
              }}
            >
              Failed to load communities
            </Text>
          ) : filteredCommunities.length === 0 ? (
            <View className="rounded-[24px] border border-border bg-surface px-4 py-5">
              <Text
                className="text-foreground"
                style={{
                  fontSize: 16,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                No communities found
              </Text>

              <Text
                className="mt-2 text-muted"
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: "Poppins_400Regular",
                }}
              >
                There are no communities in this category yet.
              </Text>
            </View>
          ) : (
            filteredCommunities.map((community) => {
              const coverUrl = toAbsoluteFileUrl(community.coverImage);
              const avatarUrl = toAbsoluteFileUrl(community.avatarImage);

              const isOwner = community.memberRole === "ADMIN";
              const isJoined =
                Boolean(community.isJoined) ||
                community.memberRole === "ADMIN" ||
                community.memberRole === "MODERATOR" ||
                community.memberRole === "MEMBER";

              const showJoinButton = !isOwner && !isJoined;
              const joiningThisCommunity =
                joiningCommunityId === community.id;

              return (
                <Pressable
                  key={community.id}
                  onPress={() => router.push(`/community/${community.slug}`)}
                  className="overflow-hidden rounded-[24px] border border-border bg-surface"
                >
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      style={{ width: "100%", height: 132 }}
                      resizeMode="cover"
                    />
                  ) : null}

                  <View className="p-4">
                    <View className="flex-row items-start gap-3">
                      <View className="h-[58px] w-[58px] overflow-hidden rounded-full border border-border bg-segment">
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Ionicons
                              name="people-outline"
                              size={24}
                              color={COLORS.primary}
                            />
                          </View>
                        )}
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1 pr-2">
                            <Text
                              numberOfLines={2}
                              className="text-foreground"
                              style={{
                                fontSize: 18,
                                lineHeight: 24,
                                fontFamily: "Poppins_700Bold",
                              }}
                            >
                              {community.name}
                            </Text>

                            <Text
                              numberOfLines={1}
                              className="mt-1 text-muted"
                              style={{
                                fontSize: 13,
                                lineHeight: 18,
                                fontFamily: "Poppins_500Medium",
                              }}
                            >
                              {community.category?.name ?? "Unknown"} •{" "}
                              {community.visibility}
                            </Text>
                          </View>

                          {isOwner ? (
                            <View className="rounded-full bg-segment px-3 py-2">
                              <Text
                                style={{
                                  color: COLORS.primary,
                                  fontSize: 12,
                                  fontFamily: "Poppins_600SemiBold",
                                }}
                              >
                                Owner
                              </Text>
                            </View>
                          ) : isJoined ? (
                            <View className="rounded-full bg-segment px-3 py-2">
                              <Text
                                style={{
                                  color: COLORS.primary,
                                  fontSize: 12,
                                  fontFamily: "Poppins_600SemiBold",
                                }}
                              >
                                Joined
                              </Text>
                            </View>
                          ) : showJoinButton ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleJoin(community.id);
                              }}
                              disabled={joiningThisCommunity}
                              className="rounded-full bg-accent px-4 py-2"
                            >
                              {joiningThisCommunity ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#ffffff"
                                />
                              ) : (
                                <Text
                                  style={{
                                    color: "#ffffff",
                                    fontSize: 12,
                                    fontFamily: "Poppins_600SemiBold",
                                  }}
                                >
                                  Join
                                </Text>
                              )}
                            </Pressable>
                          ) : null}
                        </View>

                        {!!community.description ? (
                          <Text
                            numberOfLines={2}
                            className="mt-2 text-muted"
                            style={{
                              fontSize: 13,
                              lineHeight: 20,
                              fontFamily: "Poppins_400Regular",
                            }}
                          >
                            {community.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}