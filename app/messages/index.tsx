import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchField } from "heroui-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  CONVERSATIONS,
  ONLINE_USERS,
  type ConversationItem,
} from "@/mocks/messages.mock";

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return CONVERSATIONS;

    return CONVERSATIONS.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [search]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>

          <Text style={styles.title}>Messages</Text>

          <Pressable style={styles.newChatButton}>
            <Ionicons
              name="create-outline"
              size={20}
              color={colors.accentForeground}
            />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>Stay connected with your contacts</Text>

        <View style={styles.searchWrap}>
          <SearchField value={search} onChange={setSearch}>
            <SearchField.Group className="rounded-[18px] bg-field-background px-3 py-2">
              <SearchField.SearchIcon className="px-3" />
              <SearchField.Input placeholder="Search messages" />
             <SearchField.ClearButton className="mr-2 px-2" />
            </SearchField.Group>
          </SearchField>
        </View>

        <View style={styles.onlineSection}> 
          <Text style={styles.sectionTitle}>Online Friends</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.onlineRow}
          >
            {ONLINE_USERS.map((user, index) => (
              <Pressable
                key={user.id}
                style={styles.onlineItem}
                onPress={() =>
                  router.push(`/messages/${CONVERSATIONS[index]?.id ?? "c1"}`)
                }
              >
                <View style={styles.onlineAvatarWrap}>
                  <Image source={{ uri: user.avatar }} style={styles.onlineAvatar} />
                  <View style={styles.onlineDot} />
                </View>

                <Text numberOfLines={1} style={styles.onlineName}>
                  {user.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filteredConversations.map((item, index) => (
            <ConversationRow
              key={item.id}
              item={item}
              styles={styles}
              showBorder={index !== filteredConversations.length - 1}
              onPress={() => router.push(`/messages/${item.id}`)}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ConversationRow({
  item,
  styles,
  showBorder,
  onPress,
}: {
  item: ConversationItem;
  styles: ReturnType<typeof createStyles>;
  showBorder: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, showBorder && styles.rowBorder]}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.isOnline ? <View style={styles.rowOnlineDot} /> : null}
      </View>

      <View style={styles.rowMiddle}>
        <Text numberOfLines={1} style={styles.rowName}>
          {item.name}
        </Text>

        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.rowMessage}>
          {item.lastMessage}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.rowTime}>{item.lastSeenLabel}</Text>

        {item.unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      flex: 1,
      marginLeft: 12,
      fontSize: 28,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },
    subtitle: {
      marginTop: 8,
      marginBottom: 16,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },
    newChatButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    searchWrap: {
      marginBottom: 18,
    },
    onlineSection: {
      marginBottom: 12,
    },
    sectionTitle: {
      marginBottom: 12,
      fontSize: 16,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },
    onlineRow: {
      paddingRight: 10,
      gap: 14,
    },
    onlineItem: {
      width: 68,
      alignItems: "center",
    },
    onlineAvatarWrap: {
      position: "relative",
      width: 58,
      height: 58,
      marginBottom: 8,
    },
    onlineAvatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
    },
    onlineDot: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#22c55e",
      borderWidth: 2,
      borderColor: colors.background,
    },
    onlineName: {
      width: "100%",
      textAlign: "center",
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
      color: colors.foreground,
    },
    listContent: {
      paddingBottom: 40,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      backgroundColor: colors.background,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    avatarWrap: {
      position: "relative",
      width: 56,
      height: 56,
      marginRight: 12,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    rowOnlineDot: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#22c55e",
      borderWidth: 2,
      borderColor: colors.background,
    },
    rowMiddle: {
      flex: 1,
      paddingRight: 10,
    },
    rowName: {
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },
    rowMessage: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },
    rowRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      minWidth: 58,
    },
    rowTime: {
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
      color: colors.muted,
    },
    unreadBadge: {
      marginTop: 8,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      backgroundColor: colors.accent,
    },
    unreadBadgeText: {
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
      color: colors.accentForeground,
    },
  });
}