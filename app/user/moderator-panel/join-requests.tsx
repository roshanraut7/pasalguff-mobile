import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
  useGetCommunityJoinRequestsQuery,
  useReviewCommunityJoinRequestMutation,
} from "@/store/api/communityApi";

type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type JoinRequestUser = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
  businessName?: string | null;
};

type JoinRequestItem = {
  id: string;
  status: JoinRequestStatus;
  message?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  user: JoinRequestUser;
};

const STATUS_FILTERS: JoinRequestStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

export default function CommunityJoinRequestsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();
  const { colors } = useAppTheme();

  const [status, setStatus] = useState<JoinRequestStatus>("PENDING");
  const [page, setPage] = useState(1);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(
    null,
  );

  const {
    data: community,
    isLoading: communityLoading,
    error: communityError,
  } = useGetCommunityBySlugQuery(slug ?? "", {
    skip: !session?.user || !slug,
    refetchOnMountOrArgChange: true,
  });

  const { data: access, isLoading: accessLoading } =
    useGetCommunityAccessQuery(community?.id ?? "", {
      skip: !session?.user || !community?.id,
      refetchOnMountOrArgChange: true,
    });

  const isOwner =
    access?.role === "ADMIN" ||
    community?.myRole === "ADMIN" ||
    community?.isOwner === true;

  const isModerator =
    access?.role === "MODERATOR" || community?.myRole === "MODERATOR";

  const canManageMembers =
    isOwner || Boolean(access?.permissions?.canManageMembers);

  const canOpenScreen = isOwner || isModerator;

  const {
    data: requestsResponse,
    isLoading: requestsLoading,
    isFetching: requestsFetching,
    refetch: refetchRequests,
  } = useGetCommunityJoinRequestsQuery(
    {
      communityId: community?.id ?? "",
      page,
      limit: 20,
      status,
    },
    {
      skip: !community?.id || !canManageMembers,
      refetchOnMountOrArgChange: true,
    },
  );

  const [reviewJoinRequest] = useReviewCommunityJoinRequestMutation();

  const requests = useMemo(() => {
    return (requestsResponse?.data ?? []) as JoinRequestItem[];
  }, [requestsResponse?.data]);

  const total = requestsResponse?.meta?.total ?? requests.length;
  const totalPages = requestsResponse?.meta?.totalPages ?? 1;
  const currentPage = requestsResponse?.meta?.page ?? page;

  const handleChangeStatus = useCallback((nextStatus: JoinRequestStatus) => {
    setStatus(nextStatus);
    setPage(1);
  }, []);

  const handleReviewRequest = useCallback(
    (request: JoinRequestItem, action: "APPROVE" | "REJECT") => {
      if (!community?.id) {
        return;
      }

      const actionLabel = action === "APPROVE" ? "approve" : "reject";
      const userName = getUserDisplayName(request.user);

      Alert.alert(
        action === "APPROVE" ? "Approve request" : "Reject request",
        `Are you sure you want to ${actionLabel} ${userName}'s join request?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: action === "APPROVE" ? "Approve" : "Reject",
            style: action === "APPROVE" ? "default" : "destructive",
            onPress: async () => {
              try {
                setReviewingRequestId(request.id);

                await reviewJoinRequest({
                  communityId: community.id,
                  requestId: request.id,
                  action,
                }).unwrap();

                await refetchRequests();

                Alert.alert(
                  "Success",
                  action === "APPROVE"
                    ? "Join request approved successfully."
                    : "Join request rejected successfully.",
                );
              } catch (error: any) {
                console.log("Review join request failed:", error);

                Alert.alert(
                  "Action failed",
                  error?.data?.message ??
                    "Something went wrong while reviewing this request.",
                );
              } finally {
                setReviewingRequestId(null);
              }
            },
          },
        ],
      );
    },
    [community?.id, reviewJoinRequest, refetchRequests],
  );

  const handleLoadMore = useCallback(() => {
    if (requestsFetching || currentPage >= totalPages) {
      return;
    }

    setPage((previousPage) => previousPage + 1);
  }, [requestsFetching, currentPage, totalPages]);

  if (isPending || communityLoading || accessLoading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  if (communityError || !community) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.safe,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Header title="Join Requests" colors={colors} />

        <View style={styles.center}>
          <Text
            style={[
              styles.emptyTitle,
              {
                color: colors.foreground,
              },
            ]}
          >
            Community not found
          </Text>

          <Text
            style={[
              styles.emptyText,
              {
                color: colors.muted,
              },
            ]}
          >
            This community could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canOpenScreen || !canManageMembers) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.safe,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Header title="Join Requests" colors={colors} />

        <View style={styles.center}>
          <Ionicons
            name="lock-closed-outline"
            size={44}
            color={colors.accent}
          />

          <Text
            style={[
              styles.emptyTitle,
              {
                marginTop: 14,
                color: colors.foreground,
              },
            ]}
          >
            No permission
          </Text>

          <Text
            style={[
              styles.emptyText,
              {
                color: colors.muted,
              },
            ]}
          >
            Only the owner or moderators with member-management permission can
            review join requests.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safe,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header title="Join Requests" colors={colors} />

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name="person-add-outline"
              size={22}
              color={colors.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={[
                styles.summaryTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              {community.name}
            </Text>

            <Text
              style={[
                styles.summaryText,
                {
                  color: colors.muted,
                },
              ]}
            >
              Review people who requested to join this community.
            </Text>
          </View>
        </View>

        <StatusTabs
          status={status}
          colors={colors}
          onChangeStatus={handleChangeStatus}
        />

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              {formatStatus(status)} Requests
            </Text>

            <Text
              style={[
                styles.sectionSubText,
                {
                  color: colors.muted,
                },
              ]}
            >
              {status === "PENDING"
                ? "Approve or reject new members"
                : "Review request history"}
            </Text>
          </View>

          <Text
            style={[
              styles.sectionCount,
              {
                color: colors.muted,
              },
            ]}
          >
            {total} total
          </Text>
        </View>

        {requestsLoading && requests.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : requests.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="file-tray-outline"
              size={36}
              color={colors.accent}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  marginTop: 12,
                  color: colors.foreground,
                },
              ]}
            >
              No requests found
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.muted,
                },
              ]}
            >
              There are no {formatStatus(status).toLowerCase()} join requests
              right now.
            </Text>
          </View>
        ) : (
          <View style={styles.requestList}>
            {requests.map((request) => (
              <JoinRequestCard
                key={request.id}
                request={request}
                colors={colors}
                isReviewing={reviewingRequestId === request.id}
                onApprove={() => handleReviewRequest(request, "APPROVE")}
                onReject={() => handleReviewRequest(request, "REJECT")}
              />
            ))}

            {currentPage < totalPages ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={requestsFetching}
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {requestsFetching ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text
                    style={[
                      styles.loadMoreText,
                      {
                        color: colors.accent,
                      },
                    ]}
                  >
                    Load more
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={[
          styles.backButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={colors.foreground}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.headerSubtitle,
            {
              color: colors.muted,
            },
          ]}
        >
          Community moderation
        </Text>
      </View>
    </View>
  );
}

function StatusTabs({
  status,
  colors,
  onChangeStatus,
}: {
  status: JoinRequestStatus;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onChangeStatus: (status: JoinRequestStatus) => void;
}) {
  return (
    <View
      style={[
        styles.statusTabsContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {STATUS_FILTERS.map((item) => {
        const isActive = item === status;

        return (
          <Pressable
            key={item}
            onPress={() => onChangeStatus(item)}
            style={[
              styles.statusTab,
              {
                backgroundColor: isActive ? colors.accent : "transparent",
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.statusTabText,
                {
                  color: isActive ? colors.accentForeground : colors.muted,
                },
              ]}
            >
              {formatStatus(item)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function JoinRequestCard({
  request,
  colors,
  isReviewing,
  onApprove,
  onReject,
}: {
  request: JoinRequestItem;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isReviewing: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const avatarUrl = toAbsoluteFileUrl(request.user.image);
  const userName = getUserDisplayName(request.user);
  const showActions = request.status === "PENDING";

  return (
    <View
      style={[
        styles.requestCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.requestTop}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="person-outline"
              size={22}
              color={colors.accent}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[
              styles.userName,
              {
                color: colors.foreground,
              },
            ]}
          >
            {userName}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.userMeta,
              {
                color: colors.muted,
              },
            ]}
          >
            {request.user.businessName ||
              request.user.email ||
              "Community member request"}
          </Text>
        </View>

        <StatusBadge status={request.status} colors={colors} />
      </View>

      {request.message ? (
        <View
          style={[
            styles.messageBox,
            {
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              {
                color: colors.foreground,
              },
            ]}
          >
            {request.message}
          </Text>
        </View>
      ) : (
        <Text
          style={[
            styles.noMessageText,
            {
              color: colors.muted,
            },
          ]}
        >
          No message provided.
        </Text>
      )}

      <Text
        style={[
          styles.dateText,
          {
            color: colors.muted,
          },
        ]}
      >
        Requested {formatDate(request.createdAt)}
      </Text>

      {showActions ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={onReject}
            disabled={isReviewing}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.rejectText,
                {
                  color: colors.danger,
                },
              ]}
            >
              Reject
            </Text>
          </Pressable>

          <Pressable
            onPress={onApprove}
            disabled={isReviewing}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              },
            ]}
          >
            {isReviewing ? (
              <ActivityIndicator
                size="small"
                color={colors.accentForeground}
              />
            ) : (
              <Text
                style={[
                  styles.approveText,
                  {
                    color: colors.accentForeground,
                  },
                ]}
              >
                Approve
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function StatusBadge({
  status,
  colors,
}: {
  status: JoinRequestStatus;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const icon =
    status === "PENDING"
      ? "time-outline"
      : status === "APPROVED"
        ? "checkmark-circle-outline"
        : status === "REJECTED"
          ? "close-circle-outline"
          : "remove-circle-outline";

  const textColor =
    status === "REJECTED" || status === "CANCELLED"
      ? colors.danger
      : colors.accent;

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: colors.surfaceSecondary,
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={textColor} />

      <Text
        style={[
          styles.statusText,
          {
            color: textColor,
          },
        ]}
      >
        {formatStatus(status)}
      </Text>
    </View>
  );
}

function getUserDisplayName(user: JoinRequestUser) {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return user.name || fullName || user.businessName || "Unknown User";
}

function formatStatus(status: JoinRequestStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  summaryText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  statusTabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
  },

  statusTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  statusTabText: {
    fontSize: 10.5,
    fontFamily: "Poppins_700Bold",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
  },

  sectionSubText: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  sectionCount: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },

  loadingBox: {
    paddingVertical: 30,
  },

  requestList: {
    gap: 14,
  },

  requestCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },

  requestTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  userName: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },

  userMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },

  messageBox: {
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
  },

  messageText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  noMessageText: {
    marginTop: 14,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  dateText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  actionRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  rejectText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  approveText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  loadMoreButton: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  loadMoreText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
});