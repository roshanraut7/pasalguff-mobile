import React, { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  useGetCategoriesQuery,
  useGetExploreCommunitiesQuery,
} from "@/store/api/communityApi";

export default function ExploreScreen() {
  const categoryScrollRef = useRef<ScrollView>(null);
  const currentScrollX = useRef(0);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetCategoriesQuery();

  const {
    data: communities = [],
    isLoading: communitiesLoading,
    error: communitiesError,
  } = useGetExploreCommunitiesQuery();

  const categoryPills = useMemo(() => {
    return [{ id: "all", name: "All", slug: "all" }, ...categories];
  }, [categories]);

  const handleCategoryScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    currentScrollX.current = event.nativeEvent.contentOffset.x;
  };

  const handleSlideRight = () => {
    categoryScrollRef.current?.scrollTo({
      x: currentScrollX.current + 180,
      animated: true,
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4 pt-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
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
        </View>

        <View className="mt-5">
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
              showsHorizontalScrollIndicator={false}
              onScroll={handleCategoryScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                gap: 10,
                paddingRight: 12,
              }}
            >
              {categoryPills.map((category) => (
                <View
                  key={category.id}
                  className={`rounded-full border px-4 py-2 ${
                    category.id === "all"
                      ? "border-accent bg-accent"
                      : "border-border bg-surface"
                  }`}
                >
                  <Text
                    style={{
                      color: category.id === "all" ? "#ffffff" : COLORS.text,
                      fontSize: 13,
                      fontFamily: "Poppins_500Medium",
                    }}
                  >
                    {category.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
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
            All active communities are shown here for now.
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
          ) : communities.length === 0 ? (
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
                There are no active communities yet.
              </Text>
            </View>
          ) : (
            communities.map((community) => {
              const coverUrl = toAbsoluteFileUrl(community.coverImage);
              const avatarUrl = toAbsoluteFileUrl(community.avatarImage);

              return (
                <Pressable
                  key={community.id}
                  className="overflow-hidden rounded-[24px] border border-border bg-surface"
                >
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      style={{ width: "100%", height: 150 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primary2, COLORS.soft]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ height: 150 }}
                    />
                  )}

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
                        <Text
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
                          className="mt-1 text-muted"
                          style={{
                            fontSize: 13,
                            lineHeight: 18,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          {community.category?.name} • {community.visibility}
                        </Text>

                        {!!community.description && (
                          <Text
                            className="mt-2 text-muted"
                            numberOfLines={3}
                            style={{
                              fontSize: 13,
                              lineHeight: 20,
                              fontFamily: "Poppins_400Regular",
                            }}
                          >
                            {community.description}
                          </Text>
                        )}
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