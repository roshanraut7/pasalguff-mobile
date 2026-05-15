import React, { memo, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  AppNotification,
  useGetMyNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "@/store/api/notificationApi";

dayjs.extend(relativeTime);

type Colors = ReturnType<typeof useAppTheme>["colors"];

type NotificationModalProps = {
  visible: boolean;
  onClose: () => void;
  onOpenNotification?: (notification: AppNotification) => void;
};

function getNotificationIcon(type?: string) {
  switch (type) {
    case "POST_COMMENT":
      return "chatbubble-ellipses-outline";

    case "COMMENT_REPLY":
    case "POST_REPLY":
      return "return-down-forward-outline";
       case "POST_COMMENT":
      return "chatbubble-ellipses-outline";

    case "COMMENT_REPLY":
    case "POST_REPLY":
      return "return-down-forward-outline";

    case "COMMUNITY_MEMBER_BANNED":
      return "ban-outline";

    case "COMMUNITY_MEMBER_UNBANNED":
      return "refresh-outline";

    case "COMMUNITY_MEMBER_REMOVED":
      return "person-remove-outline";

    default:
      return "notifications-outline";
  }
}

function formatNotificationTime(value?: string) {
  if (!value) return "";

  const date = dayjs(value);
  if (!date.isValid()) return "";

  return date.fromNow();
}

const NotificationRow = memo(function NotificationRow({
  item,
  colors,
  styles,
  onPress,
}: {
  item: AppNotification;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
  onPress: (notification: AppNotification) => void;
}) {
  const isUnread = !item.isRead;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.notificationRow,
        isUnread && styles.notificationRowUnread,
        pressed && styles.notificationRowPressed,
      ]}
    >
      <View style={[styles.iconCircle, isUnread && styles.iconCircleUnread]}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={20}
          color={isUnread ? "#FFFFFF" : colors.accent}
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationTitleRow}>
          <Text
            numberOfLines={2}
            style={[
              styles.notificationTitle,
              isUnread && styles.notificationTitleUnread,
            ]}
          >
            {item.title || "Notification"}
          </Text>

          {isUnread ? <View style={styles.unreadDot} /> : null}
        </View>

        {!!item.body && (
          <Text numberOfLines={2} style={styles.notificationBody}>
            {item.body}
          </Text>
        )}

        <Text style={styles.notificationTime}>
          {formatNotificationTime(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
});

export default function NotificationModal({
  visible,
  onClose,
  onOpenNotification,
}: NotificationModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetMyNotificationsQuery(
    {
      page: 1,
      limit: 30,
      unreadOnly: false,
    },
    {
      skip: !visible,
      refetchOnMountOrArgChange: true,
    },
  );

  const [markNotificationAsRead] = useMarkNotificationAsReadMutation();
  const [markAllNotificationsAsRead, { isLoading: isMarkingAll }] =
    useMarkAllNotificationsAsReadMutation();

  const notifications = data?.data ?? [];
  const unreadCount = data?.meta?.unreadCount ?? 0;

  const handlePressNotification = async (notification: AppNotification) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead({
          notificationId: notification.id,
        }).unwrap();
      }

      onOpenNotification?.(notification);
    } catch (error) {
      console.log("Open notification failed:", error);
      onOpenNotification?.(notification);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead({}).unwrap();
    } catch (error) {
      console.log("Mark all notifications read failed:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.dragHandleWrapper}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You are all caught up"}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={handleMarkAllRead}
                  disabled={isMarkingAll}
                  style={styles.markAllButton}
                >
                  {isMarkingAll ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Text style={styles.markAllText}>Mark all</Text>
                  )}
                </Pressable>
              ) : null}

              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={refetch}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name="notifications-off-outline"
                      size={34}
                      color={colors.muted}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>No notifications yet</Text>

                <Text style={styles.emptyText}>
  Community updates, comments, replies and account activity will appear here.
</Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <NotificationRow
                item={item}
                colors={colors}
                styles={styles}
                onPress={handlePressNotification}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      height: "86%",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    dragHandleWrapper: {
      alignItems: "center",
      paddingTop: 9,
      paddingBottom: 4,
    },
    dragHandle: {
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    headerTitle: {
      color: colors.foreground,
      fontSize: 20,
      fontFamily: "Poppins_700Bold",
    },
    headerSubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    markAllButton: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    markAllText: {
      color: colors.accent,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    listContent: {
      paddingTop: 8,
      paddingBottom: 28,
    },
    notificationRow: {
      marginHorizontal: 12,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notificationRowUnread: {
      backgroundColor: colors.surfaceSecondary,
    },
    notificationRowPressed: {
      opacity: 0.75,
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCircleUnread: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    notificationContent: {
      flex: 1,
      minWidth: 0,
    },
    notificationTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    notificationTitle: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_500Medium",
    },
    notificationTitleUnread: {
      fontFamily: "Poppins_700Bold",
    },
    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 999,
      marginTop: 5,
      backgroundColor: colors.accent,
    },
    notificationBody: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "Poppins_400Regular",
    },
    notificationTime: {
      marginTop: 5,
      color: colors.accent,
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingVertical: 70,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      marginTop: 14,
      color: colors.foreground,
      fontSize: 16,
      fontFamily: "Poppins_700Bold",
    },
    emptyText: {
      marginTop: 6,
      textAlign: "center",
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
    },
  });
}