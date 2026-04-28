import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  AppNotification,
  NotificationCategory,
  notificationsMock,
} from "@/mocks/notifications";

type FilterKey = "ALL" | "UNREAD" | NotificationCategory;

const filters: { label: string; value: FilterKey }[] = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Requests", value: "REQUEST" },
  { label: "Posts", value: "POST" },
  { label: "Moderation", value: "MODERATION" },
];

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "ALL") {
      return notificationsMock;
    }

    if (activeFilter === "UNREAD") {
      return notificationsMock.filter((item) => !item.isRead);
    }

    return notificationsMock.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const groupedNotifications = useMemo(() => {
    const sections: Record<string, AppNotification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    filteredNotifications.forEach((item) => {
      sections[item.section].push(item);
    });

    return Object.entries(sections).filter(([, items]) => items.length > 0);
  }, [filteredNotifications]);

  const unreadCount = notificationsMock.filter((item) => !item.isRead).length;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Stay updated with your communities
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Ionicons
              name="checkmark-done-outline"
              size={20}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="notifications" size={22} color={colors.accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>
              You have {unreadCount} unread notifications
            </Text>
            <Text style={styles.summaryText}>
              Review requests, comments and community updates.
            </Text>
          </View>
        </View>
0
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((item) => {
            const isActive = activeFilter === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => setActiveFilter(item.value)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {groupedNotifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-off-outline"
                size={34}
                color={colors.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>No notifications found</Text>
            <Text style={styles.emptyText}>
              Try changing the filter or check again later.
            </Text>
          </View>
        ) : (
          groupedNotifications.map(([sectionTitle, items]) => (
            <View key={sectionTitle} style={styles.section}>
              <Text style={styles.sectionTitle}>{sectionTitle}</Text>

              {items.map((item) => (
                <NotificationCard key={item.id} item={item} colors={colors} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationCard({
  item,
  colors,
}: {
  item: AppNotification;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[
        styles.notificationCard,
        !item.isRead && styles.notificationCardUnread,
      ]}
    >
      <View style={styles.avatarWrap}>
        {item.actorImage ? (
          <Image source={{ uri: item.actorImage }} style={styles.avatar} />
        ) : (
          <View style={styles.iconAvatar}>
            <Ionicons name={item.icon} size={21} color={colors.accent} />
          </View>
        )}

        {!item.isRead && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.notificationBody}>
        <View style={styles.notificationTopRow}>
          <Text numberOfLines={1} style={styles.notificationTitle}>
            {item.title}
          </Text>

          <Text style={styles.timeText}>{item.time}</Text>
        </View>

        <Text numberOfLines={2} style={styles.notificationMessage}>
          {item.message}
        </Text>

        {item.hasActions && (
          <View style={styles.actionRow}>
            <TouchableOpacity activeOpacity={0.75} style={styles.approveButton}>
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.75} style={styles.rejectButton}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 120,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    title: {
      fontSize: 30,
      lineHeight: 38,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    subtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },

    summaryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceTertiary,
    },

    summaryTitle: {
      fontSize: 15,
      lineHeight: 21,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },

    summaryText: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    filterRow: {
      gap: 10,
      paddingBottom: 20,
    },

    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },

    filterText: {
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
      color: colors.muted,
    },

    filterTextActive: {
      color: colors.accentForeground,
    },

    section: {
      marginBottom: 18,
    },

    sectionTitle: {
      marginBottom: 10,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },

    notificationCard: {
      flexDirection: "row",
      gap: 12,
      padding: 14,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },

    notificationCardUnread: {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.separator,
    },

    avatarWrap: {
      position: "relative",
      width: 46,
      height: 46,
    },

    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
    },

    iconAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceTertiary,
    },

    unreadDot: {
      position: "absolute",
      top: 1,
      right: 1,
      width: 11,
      height: 11,
      borderRadius: 999,
      backgroundColor: colors.danger,
      borderWidth: 2,
      borderColor: colors.surface,
    },

    notificationBody: {
      flex: 1,
      minWidth: 0,
    },

    notificationTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    notificationTitle: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },

    timeText: {
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    notificationMessage: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
    },

    approveButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },

    approveText: {
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
      color: colors.accentForeground,
    },

    rejectButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceTertiary,
    },

    rejectText: {
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
      color: colors.accent,
    },

    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceTertiary,
      marginBottom: 14,
    },

    emptyTitle: {
      fontSize: 16,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },

    emptyText: {
      marginTop: 6,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },
  });
}