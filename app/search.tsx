import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useLazyGlobalSearchQuery,
  type SearchHit,
  type SearchableType,
} from "@/store/api/searchApi";

const RECENT_SEARCHES_KEY = "recent_searches_v1";
const MAX_RECENT = 10;

type DisplayHit = SearchHit & { type: SearchableType | string; [key: string]: any };

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [triggerSearch, { data: results = [], isFetching: loading }] = useLazyGlobalSearchQuery();

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    loadRecentSearches();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!query.trim()) return;

    const debounce = setTimeout(() => {
      triggerSearch({ q: query.trim() });
    }, 350);

    return () => clearTimeout(debounce);
  }, [query]);

  async function loadRecentSearches() {
    try {
      const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      setRecentSearches(raw ? JSON.parse(raw) : []);
    } catch (error) {
      console.log("Failed to load recent searches:", error);
    }
  }

  async function saveRecentSearch(term: string) {
    try {
      const trimmed = term.trim();
      if (!trimmed) return;

      const updated = [
        trimmed,
        ...recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_RECENT);

      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.log("Failed to save recent search:", error);
    }
  }

  async function removeRecentSearch(term: string) {
    const updated = recentSearches.filter((item) => item !== term);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }

  async function clearAllRecentSearches() {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  }

  function handleSubmit() {
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
  }

  function handleRecentPress(term: string) {
    setQuery(term);
    triggerSearch({ q: term });
  }

function handleResultPress(hit: DisplayHit) {
  saveRecentSearch(query.trim());

  if (hit.type === "users") {
    router.push({
      pathname: "/user/profile/[userId]",
      params: { userId: hit.id },
    });
  } else if (hit.type === "posts") {
    router.push({
      pathname: "/pages/post-detail", // adjust to your actual file location
      params: { postId: hit.id, communityId: hit.communityId ?? "" },
    });
  } else if (hit.type === "communities") {
    router.push({
      pathname: "/user/community/[slug]",
      params: { slug: hit.slug },
    });
  }
}
  const hasQuery = query.trim().length > 0;

  const allHits: DisplayHit[] = results.flatMap((group) =>
    group.hits.map((hit) => ({ ...hit, type: group.type } as DisplayHit)),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header row: back button + input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.surface,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            placeholder="Search people, posts, communities"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={{
              flex: 1,
              paddingVertical: 8,
              color: colors.foreground,
              fontSize: 14,
            }}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Body: recent searches OR live results */}
      {!hasQuery ? (
        <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 12 }}>
          {recentSearches.length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
                  Recent
                </Text>
                <Pressable onPress={clearAllRecentSearches}>
                  <Text style={{ color: colors.accent, fontSize: 12 }}>Clear all</Text>
                </Pressable>
              </View>

              <FlatList
                data={recentSearches}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 10,
                    }}
                  >
                    <Pressable
                      onPress={() => handleRecentPress(item)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
                    >
                      <Ionicons name="time-outline" size={18} color={colors.muted} />
                      <Text style={{ color: colors.foreground, fontSize: 14 }}>{item}</Text>
                    </Pressable>
                    <Pressable onPress={() => removeRecentSearch(item)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={16} color={colors.muted} />
                    </Pressable>
                  </View>
                )}
              />
            </>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 40 }}>
              No recent searches
            </Text>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
          ) : allHits.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 40 }}>
              No results found
            </Text>
          ) : (
            <FlatList
              data={allHits}
              keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
              contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleResultPress(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 10,
                  }}
                >
                  {item.image || item.avatarImage ? (
                    <Image
                      source={{ uri: toAbsoluteFileUrl(item.image ?? item.avatarImage) ?? undefined }}
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: colors.surface,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={
                          item.type === "users"
                            ? "person-outline"
                            : item.type === "communities"
                              ? "people-circle-outline"
                              : "document-text-outline"
                        }
                        size={18}
                        color={colors.muted}
                      />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
                      {item.name || item.title || "Untitled"}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                      {item.type === "users"
                        ? item.businessName || item.email
                        : item.type === "communities"
                          ? item.description
                          : item.content?.replace(/<[^>]*>/g, "")}
                    </Text>
                  </View>

                  <Text style={{ color: colors.muted, fontSize: 10, textTransform: "uppercase" }}>
                    {item.type}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}