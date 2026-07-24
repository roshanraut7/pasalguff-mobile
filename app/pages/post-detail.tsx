import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetCommunityPostQuery } from "@/store/api/postApi";
import CommunityPostCard from "@/components/post/CommunityPostCard";

export default function PostDetailScreen() {
  const { postId, communityId } = useLocalSearchParams<{ postId: string; communityId: string }>();
  const { colors } = useAppTheme();

  const { data: post, isLoading, isError, refetch } = useGetCommunityPostQuery(
    { communityId: communityId ?? "", postId: postId ?? "" },
    { skip: !postId || !communityId },
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.foreground, marginLeft: 4 }}>Post</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : isError || !post ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Text style={{ color: colors.muted, textAlign: "center" }}>
            This post is unavailable or was removed.
          </Text>
          <Pressable onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.accent, fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <CommunityPostCard post={post} showCommunityHeader />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}   