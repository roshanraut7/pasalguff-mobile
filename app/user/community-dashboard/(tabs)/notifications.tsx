import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useGlobalSearchParams, useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  AppNotification,
  useGetMyNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "@/store/api/notificationApi";

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatNotificationTime(value: string) {
  const date = new Date(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "COMMUNITY_JOIN_REQUEST":
      return "person-add-outline";

    case "COMMUNITY_JOIN_REQUEST_APPROVED":
      return "checkmark-circle-outline";

    case "COMMUNITY_JOIN_REQUEST_REJECTED":
      return "close-circle-outline";

    case "COMMUNITY_MEMBER_JOINED":
      return "people-outline";

    case "COMMUNITY_MEMBER_LEFT":
      return "person-remove-outline";

    case "COMMUNITY_MEMBER_BANNED":
      return "ban-outline";

    case "COMMUNITY_MODERATOR_ASSIGNED":
    case "COMMUNITY_MODERATOR_PERMISSIONS_UPDATED":
      return "shield-checkmark-outline";

    case "POST_REPORTED":
      return "flag-outline";

    case "POST_COMMENTED":
    case "COMMENT_REPLIED":
      return "chatbubble-outline";

    default:
      return "notifications-outline";
  }
}

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const [page] = useState(1);
  const [limit] = useState(20);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const {
    data: notificationsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetMyNotificationsQuery(
    {
      page,
      limit,
      unreadOnly,
      communityId,
    },
    {
      skip: !communityId,
      refetchOnMountOrArgChange: true,
    },
  );

  const [markNotificationAsRead, { isLoading: markingSingle }] =
    useMarkNotificationAsReadMutation();

  const [markAllAsRead, { isLoading: markingAll }] =
    useMarkAllNotificationsAsReadMutation();

  const notifications = notificationsResponse?.data ?? [];
  const unreadCount = notificationsResponse?.meta?.unreadCount ?? 0;

  async function handleRefresh() {
    await refetch();
  }

  async function handleMarkAsRead(notification: AppNotification) {
    if (notification.isRead) {
      handleOpenNotification(notification);
      return;
    }

    try {
      await markNotificationAsRead({
        notificationId: notification.id,
      }).unwrap();

      handleOpenNotification(notification);
    } catch (error) {
      console.log("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead({
        communityId,
      }).unwrap();
    } catch (error) {
      console.log("Failed to mark all notifications as read:", error);
    }
  }

  function handleOpenNotification(notification: AppNotification) {
    const data = notification.data ?? {};

    if (notification.type === "COMMUNITY_JOIN_REQUEST") {
      router.push({
        pathname: "/user/community-dashboard/(tabs)/member",
        params: {
          communityId: String(data.communityId ?? communityId),
        },
      });
      return;
    }

    if (
      notification.type === "COMMUNITY_MODERATOR_ASSIGNED" ||
      notification.type === "COMMUNITY_MODERATOR_PERMISSIONS_UPDATED"
    ) {
      router.push({
        pathname: "/user/community-dashboard/(tabs)/moderator",
        params: {
          communityId: String(data.communityId ?? communityId),
        },
      });
      return;
    }

    if (
      notification.type === "POST_REPORTED" ||
      notification.type === "POST_COMMENTED" ||
      notification.type === "COMMENT_REPLIED"
    ) {
      router.push({
        pathname: "/user/community-dashboard/(tabs)/post",
        params: {
          communityId: String(data.communityId ?? communityId),
        },
      });
      return;
    }
  }

  if (!communityId) {
    return (
      <View style={styles.centerWrap}>
        <Ionicons name="warning-outline" size={30} color={colors.warning} />

        <Text style={styles.centerTitle}>Community ID missing</Text>

        <Text style={styles.centerSubtitle}>
          Open this page with communityId in route params.
        </Text>
      </View>
    );
  }

  if (isLoading && !notificationsResponse) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={colors.accent} />

        <Text style={styles.centerSubtitle}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>

          <Text style={styles.subtitle}>
            {unreadCount} unread notifications
          </Text>
        </View>

        <Pressable
          onPress={() => setUnreadOnly((prev) => !prev)}
          style={({ pressed }) => [
            styles.filterButton,
            unreadOnly && styles.filterButtonActive,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Ionicons
            name={unreadOnly ? "mail-unread" : "mail-unread-outline"}
            size={17}
            color={unreadOnly ? colors.accentForeground : colors.accent}
          />

          <Text
            style={[
              styles.filterButtonText,
              unreadOnly && { color: colors.accentForeground },
            ]}
          >
            Unread
          </Text>
        </Pressable>
      </View>

    <View style={styles.actionRow}>
  <Text style={styles.pullHint}>Pull down to refresh</Text>

  <Pressable
    onPress={handleMarkAllAsRead}
    disabled={markingAll || unreadCount === 0}
    style={({ pressed }) => [
      styles.actionButton,
      (markingAll || unreadCount === 0) && { opacity: 0.45 },
      pressed && { opacity: 0.75 },
    ]}
  >
    {markingAll ? (
      <ActivityIndicator size="small" color={colors.accent} />
    ) : (
      <Ionicons
        name="checkmark-done-outline"
        size={17}
        color={colors.accent}
      />
    )}

    <Text style={styles.actionButtonText}>Mark all read</Text>
  </Pressable>
</View>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={colors.danger}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Failed to load notifications</Text>

            <Text style={styles.errorMessage}>
              Please refresh or check your connection.
            </Text>
          </View>
        </View>
      ) : null}

      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons
            name="notifications-off-outline"
            size={36}
            color={colors.muted}
          />

          <Text style={styles.emptyTitle}>No notifications found</Text>

          <Text style={styles.emptySubtitle}>
            New community activity will appear here.
          </Text>
        </View>
      ) : (
        notifications.map((item) => {
          const icon = getNotificationIcon(item.type);

          return (
            <Pressable
              key={item.id}
              onPress={() => handleMarkAsRead(item)}
              disabled={markingSingle}
              style={({ pressed }) => [
                styles.card,
                !item.isRead && styles.unreadCard,
                pressed && { opacity: 0.78 },
              ]}
            >
              <View style={styles.iconBox}>
                <Ionicons
                  name={icon}
                  size={22}
                  color={!item.isRead ? colors.accent : colors.muted}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text numberOfLines={2} style={styles.cardTitle}>
                    {item.title}
                  </Text>

                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>

                <Text numberOfLines={3} style={styles.cardDescription}>
                  {item.body}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardDate}>
                    {formatNotificationTime(item.createdAt)}
                  </Text>

                  <Text style={styles.cardType}>
                    {item.type.replaceAll("_", " ")}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      padding: 16,
      paddingBottom: 140,
      gap: 12,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    title: {
      fontSize: 22,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    filterButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },

    filterButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

   actionRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},
    pullHint: {
  flex: 1,
  color: colors.muted,
  fontSize: 12,
  fontFamily: "Poppins_400Regular",
},

    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
    },

    actionButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    errorBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surface,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    errorMessage: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    emptyBox: {
      minHeight: 260,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      padding: 22,
      backgroundColor: colors.surface,
    },

    emptyTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
      textAlign: "center",
    },

    emptySubtitle: {
      marginTop: 5,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      textAlign: "center",
    },

    card: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },

    unreadCard: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSecondary,
    },

    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceTertiary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    cardTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },

    cardTitle: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.accent,
      marginTop: 5,
    },

    cardDescription: {
      marginTop: 4,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "Poppins_400Regular",
    },

    cardFooter: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    cardDate: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },

    cardType: {
      flex: 1,
      textAlign: "right",
      color: colors.accent,
      fontSize: 10,
      fontFamily: "Poppins_700Bold",
    },

    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      backgroundColor: colors.background,
    },

    centerTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },

    centerSubtitle: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      fontFamily: "Poppins_400Regular",
    },
  });
}