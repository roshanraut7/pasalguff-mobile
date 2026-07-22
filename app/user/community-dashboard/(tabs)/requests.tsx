import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  useGetContributorRequestsQuery,
  useReviewContributorRequestMutation,
} from "@/store/api/postApi";
import type { ContributorRequestItem } from "@/types/post";

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getInitialLetter(name?: string | null) {
  const safeName = name?.trim();
  if (!safeName) return "U";
  return safeName.charAt(0).toUpperCase();
}

export default function CommunityContributorRequestsScreen() {
  const { colors } = useAppTheme();

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

  const [page, setPage] = useState(1);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );

  const limit = 20;

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetContributorRequestsQuery(
    { communityId, status: "PENDING", page, limit },
    {
      skip: !communityId,
      refetchOnMountOrArgChange: true,
    },
  );

  const [reviewRequest] = useReviewContributorRequestMutation();

  const requests = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.meta?.total ?? 0;
  const hasMore = requests.length < total && requests.length > 0;

  async function handlePullRefresh() {
    setIsPullRefreshing(true);
    setPage(1);
    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }

  function handleLoadMore() {
    if (!hasMore || isFetching) return;
    setPage((prev) => prev + 1);
  }

  const handleDecision = useCallback(
    async (requestId: string, decision: "APPROVED" | "REJECTED") => {
      if (!communityId) return;

      setProcessingRequestId(requestId);
      try {
        await reviewRequest({
          communityId,
          requestId,
          decision,
        }).unwrap();
      } catch (err) {
        // swallow — surface via toast/snackbar if you have a global one
        console.warn("Failed to review contributor request", err);
      } finally {
        setProcessingRequestId(null);
      }
    },
    [communityId, reviewRequest],
  );

  const renderItem = useCallback(
    ({ item }: { item: ContributorRequestItem }) => {
      const avatarUrl = toAbsoluteFileUrl(item.user?.avatarImage) ?? null;
      const isProcessing = processingRequestId === item.id;

      return (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: colors.accent, fontFamily: "Poppins_700Bold" }}>
                  {getInitialLetter(item.user?.name)}
                </Text>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={[styles.userName, { color: colors.foreground }]}
              >
                {item.user?.name ?? "Unknown user"}
              </Text>

              {item.user?.email ? (
                <Text
                  numberOfLines={1}
                  style={[styles.userEmail, { color: colors.muted }]}
                >
                  {item.user.email}
                </Text>
              ) : null}
            </View>
          </View>

          {item.message ? (
            <Text style={[styles.message, { color: colors.foreground }]}>
              {item.message}
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              disabled={isProcessing}
              onPress={() => handleDecision(item.id, "REJECTED")}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.muted} />
              ) : (
                <>
                  <Ionicons name="close" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>
                    Reject
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              disabled={isProcessing}
              onPress={() => handleDecision(item.id, "APPROVED")}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.accent, borderColor: colors.accent },
                pressed && { opacity: 0.85 },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={[styles.actionText, { color: "#fff" }]}>
                    Approve
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [colors, handleDecision, processingRequestId],
  );

  if (!communityId) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={30} color={colors.warning} />
        <Text style={[styles.centerTitle, { color: colors.foreground }]}>
          Community ID missing
        </Text>
      </View>
    );
  }

  if (isLoading && !data) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.centerSubtitle, { color: colors.muted }]}>
          Loading requests...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
        <Text style={[styles.centerTitle, { color: colors.danger }]}>
          Failed to load requests
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      data={requests}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={handlePullRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      onEndReachedThreshold={0.4}
      onEndReached={handleLoadMore}
      ListFooterComponent={
        isFetching && page > 1 ? (
          <ActivityIndicator
            style={{ marginVertical: 16 }}
            size="small"
            color={colors.accent}
          />
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="person-add-outline" size={30} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No pending requests
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            New contributor requests will show up here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 140, gap: 12 },

  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  userName: { fontSize: 14, fontFamily: "Poppins_700Bold" },
  userEmail: { fontSize: 12, fontFamily: "Poppins_400Regular", marginTop: 2 },

  message: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
  },

  actionText: { fontSize: 13, fontFamily: "Poppins_600SemiBold" },

  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerTitle: { marginTop: 12, fontSize: 16, fontFamily: "Poppins_700Bold" },
  centerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Poppins_700Bold" },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    paddingHorizontal: 30,
  },
});