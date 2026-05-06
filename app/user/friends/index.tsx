import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Tabs } from "heroui-native";
import { router } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useGetIncomingFriendRequestsQuery,
  useGetMyFriendsQuery,
  useGetOutgoingFriendRequestsQuery,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
} from "@/store/api/friendApi";

import type { FriendRequest, FriendUser } from "@/types/friend";

type TabKey = "friends" | "incoming" | "outgoing";

function goToUserProfile(userId: string) {
  router.push({
    pathname: "/user/profile/[userId]",
    params: {
      userId,
    },
  });
}

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() || "U";
  }

  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FriendAvatar({
  image,
  name,
  size = 72,
}: {
  image?: string | null;
  name?: string | null;
  size?: number;
}) {
  const { colors } = useAppTheme();
  const imageUrl = toAbsoluteFileUrl(image);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={avatarStyle} />;
  }

  return (
    <View
      style={[
        avatarStyle,
        styles.avatarFallback,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { color: colors.accent }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function FriendRequestCard({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  isActionLoading,
}: {
  request: FriendRequest;
  type: "incoming" | "outgoing";
  onAccept?: (request: FriendRequest) => void;
  onReject?: (request: FriendRequest) => void;
  onCancel?: (request: FriendRequest) => void;
  isActionLoading?: boolean;
}) {
  const { colors } = useAppTheme();
  const user = request.otherUser;

  return (
    <Pressable
      onPress={() => goToUserProfile(user.id)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <FriendAvatar image={user.image} name={user.displayName} />

      <View style={styles.cardBody}>
        <Text
          numberOfLines={1}
          style={[styles.nameText, { color: colors.foreground }]}
        >
          {user.displayName}
        </Text>

        {user.businessName ? (
          <Text
            numberOfLines={1}
            style={[styles.businessText, { color: colors.muted }]}
          >
            {user.businessName}
          </Text>
        ) : null}

        {request.message ? (
          <Text
            numberOfLines={2}
            style={[styles.messageText, { color: colors.muted }]}
          >
            “{request.message}”
          </Text>
        ) : (
          <Text style={[styles.messageText, { color: colors.muted }]}>
            {type === "incoming"
              ? `Request received on ${formatDate(request.createdAt)}`
              : `Request sent on ${formatDate(request.createdAt)}`}
          </Text>
        )}

        {type === "incoming" ? (
          <View style={styles.actionRow}>
            <Button
              size="sm"
              variant="primary"
              isDisabled={isActionLoading}
              onPress={() => onAccept?.(request)}
              style={styles.actionButton}
            >
              <Button.Label>Confirm</Button.Label>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              isDisabled={isActionLoading}
              onPress={() => onReject?.(request)}
              style={styles.actionButton}
            >
              <Button.Label>Delete</Button.Label>
            </Button>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={isActionLoading}
              onPress={() => onCancel?.(request)}
              style={styles.fullActionButton}
            >
              <Button.Label>Cancel Request</Button.Label>
            </Button>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function MyFriendCard({
  friend,
  onRemove,
  isActionLoading,
}: {
  friend: FriendUser;
  onRemove?: (friend: FriendUser) => void;
  isActionLoading?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => goToUserProfile(friend.id)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <FriendAvatar image={friend.image} name={friend.displayName} />

      <View style={styles.cardBody}>
        <Text
          numberOfLines={1}
          style={[styles.nameText, { color: colors.foreground }]}
        >
          {friend.displayName}
        </Text>

        {friend.businessName ? (
          <Text
            numberOfLines={1}
            style={[styles.businessText, { color: colors.muted }]}
          >
            {friend.businessName}
          </Text>
        ) : null}

        <Text style={[styles.messageText, { color: colors.muted }]}>
          Friend since {formatDate(friend.createdAt)}
        </Text>

        <View style={styles.actionRow}>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => goToUserProfile(friend.id)}
            style={styles.actionButton}
          >
            <Button.Label>View Profile</Button.Label>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            isDisabled={isActionLoading}
            onPress={() => onRemove?.(friend)}
            style={styles.actionButton}
          >
            <Button.Label>Remove</Button.Label>
          </Button>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ activeTab }: { activeTab: TabKey }) {
  const { colors } = useAppTheme();

  const content = {
    friends: {
      icon: "person-circle-outline" as const,
      title: "No friends yet",
      text: "When your friend requests are accepted, your friends will appear here.",
    },
    incoming: {
      icon: "people-outline" as const,
      title: "No friend requests",
      text: "When someone sends you a friend request, it will appear here.",
    },
    outgoing: {
      icon: "paper-plane-outline" as const,
      title: "No sent requests",
      text: "Friend requests you send will appear here.",
    },
  }[activeTab];

  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name={content.icon} size={30} color={colors.accent} />

      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {content.title}
      </Text>

      <Text style={[styles.emptyText, { color: colors.muted }]}>
        {content.text}
      </Text>
    </View>
  );
}

export default function FriendsScreen() {
  const { colors } = useAppTheme();

  // Changed from "incoming" to "friends"
  const [activeTab, setActiveTab] = useState<TabKey>("friends");

  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const [actionFriendId, setActionFriendId] = useState<string | null>(null);

  const {
    data: incomingData,
    isLoading: incomingLoading,
    isFetching: incomingFetching,
    refetch: refetchIncoming,
  } = useGetIncomingFriendRequestsQuery({
    page: 1,
    limit: 20,
  });

  const {
    data: outgoingData,
    isLoading: outgoingLoading,
    isFetching: outgoingFetching,
    refetch: refetchOutgoing,
  } = useGetOutgoingFriendRequestsQuery({
    page: 1,
    limit: 20,
  });

  const {
    data: friendsData,
    isLoading: friendsLoading,
    isFetching: friendsFetching,
    refetch: refetchFriends,
  } = useGetMyFriendsQuery({
    page: 1,
    limit: 20,
  });

  const [acceptFriendRequest] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest] = useRejectFriendRequestMutation();
  const [cancelFriendRequest] = useCancelFriendRequestMutation();
  const [removeFriend] = useRemoveFriendMutation();

  const incomingCount = incomingData?.meta?.total ?? 0;
  const outgoingCount = outgoingData?.meta?.total ?? 0;
  const friendsCount = friendsData?.meta?.total ?? 0;

  // Changed order: My Friends first
  const tabs = useMemo(
    () => [
      {
        key: "friends" as const,
        label: friendsCount ? `My Friends (${friendsCount})` : "My Friends",
      },
      {
        key: "incoming" as const,
        label: incomingCount
          ? `Friend Requests (${incomingCount})`
          : "Friend Requests",
      },
      {
        key: "outgoing" as const,
        label: outgoingCount
          ? `Sent Requests (${outgoingCount})`
          : "Sent Requests",
      },
    ],
    [friendsCount, incomingCount, outgoingCount],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  };

  const handleRefresh = async () => {
    if (activeTab === "friends") {
      await refetchFriends();
      return;
    }

    if (activeTab === "incoming") {
      await refetchIncoming();
      return;
    }

    await refetchOutgoing();
  };

  const handleAccept = async (request: FriendRequest) => {
    try {
      setActionRequestId(request.id);
      await acceptFriendRequest(request.id).unwrap();
      Alert.alert("Success", "Friend request accepted.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not accept friend request.",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  const handleReject = async (request: FriendRequest) => {
    try {
      setActionRequestId(request.id);
      await rejectFriendRequest(request.id).unwrap();
      Alert.alert("Removed", "Friend request deleted.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not delete friend request.",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  const handleCancel = async (request: FriendRequest) => {
    try {
      setActionRequestId(request.id);
      await cancelFriendRequest(request.id).unwrap();
      Alert.alert("Cancelled", "Friend request cancelled.");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not cancel friend request.",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  const handleRemoveFriend = async (friend: FriendUser) => {
    Alert.alert(
      "Remove friend",
      `Are you sure you want to remove ${friend.displayName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setActionFriendId(friend.id);
              await removeFriend(friend.id).unwrap();
              Alert.alert("Removed", "Friend removed successfully.");
            } catch (error: any) {
              Alert.alert(
                "Failed",
                error?.data?.message ?? "Could not remove friend.",
              );
            } finally {
              setActionFriendId(null);
            }
          },
        },
      ],
    );
  };

  const renderFriendsList = () => {
    const friends = friendsData?.data ?? [];

    if (friendsLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={friendsFetching && !friendsLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={<EmptyState activeTab="friends" />}
        renderItem={({ item }) => (
          <MyFriendCard
            friend={item}
            isActionLoading={actionFriendId === item.id}
            onRemove={handleRemoveFriend}
          />
        )}
      />
    );
  };

  const renderIncomingList = () => {
    const requests = incomingData?.data ?? [];

    if (incomingLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={incomingFetching && !incomingLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={<EmptyState activeTab="incoming" />}
        renderItem={({ item }) => (
          <FriendRequestCard
            request={item}
            type="incoming"
            isActionLoading={actionRequestId === item.id}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
      />
    );
  };

  const renderOutgoingList = () => {
    const requests = outgoingData?.data ?? [];

    if (outgoingLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    return (
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={outgoingFetching && !outgoingLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={<EmptyState activeTab="outgoing" />}
        renderItem={({ item }) => (
          <FriendRequestCard
            request={item}
            type="outgoing"
            isActionLoading={actionRequestId === item.id}
            onCancel={handleCancel}
          />
        )}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              onPress={handleBack}
              hitSlop={12}
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
                size={22}
                color={colors.foreground}
              />
            </Pressable>

            <Text style={[styles.title, { color: colors.foreground }]}>
              Friends
            </Text>
          </View>
        </View>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabKey)}
          variant="secondary"
          style={styles.tabsRoot}
        >
          <View style={styles.tabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              nestedScrollEnabled
              contentContainerStyle={styles.tabsScrollContent}
            >
              <Tabs.List style={styles.tabsList}>
                <Tabs.Indicator />

                {tabs.map((tab) => (
                  <Tabs.Trigger
                    key={tab.key}
                    value={tab.key}
                    style={styles.tabTrigger}
                  >
                    <Tabs.Label>{tab.label}</Tabs.Label>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </ScrollView>
          </View>

          <Tabs.Content value="friends" style={styles.tabContent}>
            {activeTab === "friends" ? renderFriendsList() : null}
          </Tabs.Content>

          <Tabs.Content value="incoming" style={styles.tabContent}>
            {activeTab === "incoming" ? renderIncomingList() : null}
          </Tabs.Content>

          <Tabs.Content value="outgoing" style={styles.tabContent}>
            {activeTab === "outgoing" ? renderOutgoingList() : null}
          </Tabs.Content>
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },

  headerTopRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRightSpace: {
    width: 40,
    height: 40,
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  tabsRoot: {
    flex: 1,
  },

  tabsWrapper: {
    marginHorizontal: -16,
    paddingLeft: 16,
  },

  tabsScrollContent: {
    paddingRight: 16,
  },

  tabsList: {
    flexDirection: "row",
    alignSelf: "flex-start",
  },

  tabTrigger: {
    minWidth: 145,
  },

  tabContent: {
    flex: 1,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 12,
  },

  avatarFallback: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitials: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
  },

  cardBody: {
    flex: 1,
  },

  nameText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold",
  },

  businessText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  messageText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },

  actionButton: {
    flex: 1,
  },

  fullActionButton: {
    flex: 1,
  },

  emptyCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});