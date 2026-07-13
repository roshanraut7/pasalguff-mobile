// app/pages/group-info.tsx
import React, { useCallback, useMemo } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useSession } from "@/api/better-auth-client";
import {
  type ChatMember,
  useGetChatQuery,
  useLeaveGroupMutation,
  useRemoveGroupMemberMutation,
} from "@/store/api/chatApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

function getAvatarUrl(name: string, image?: string | null) {
  const absoluteImage = toAbsoluteFileUrl(image);
  if (absoluteImage) return absoluteImage;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}`;
}

function getMemberName(member: ChatMember) {
  return member.user?.name || member.user?.businessName || "Unknown User";
}

export default function GroupInfoScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data: chat, isLoading, refetch } = useGetChatQuery(chatId!, {
    skip: !chatId,
  });

  const [removeGroupMember, { isLoading: isRemoving }] =
    useRemoveGroupMemberMutation();
  const [leaveGroup, { isLoading: isLeaving }] = useLeaveGroupMutation();

  const currentMember = useMemo(
    () => chat?.members?.find((m) => m.userId === currentUserId),
    [chat, currentUserId],
  );

  const isAdmin = currentMember?.role === "ADMIN";

  const members = useMemo(() => {
    return [...(chat?.members ?? [])].sort((a, b) => {
      if (a.role === "ADMIN" && b.role !== "ADMIN") return -1;
      if (b.role === "ADMIN" && a.role !== "ADMIN") return 1;
      return 0;
    });
  }, [chat]);

  const handleRemoveMember = useCallback(
    (member: ChatMember) => {
      Alert.alert(
        "Remove member?",
        `Remove ${getMemberName(member)} from this group?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeGroupMember({
                  chatId: chatId!,
                  userId: member.userId,
                }).unwrap();
                await refetch();
              } catch (error: any) {
                Alert.alert(
                  "Could not remove member",
                  error?.data?.message ?? "Please try again.",
                );
              }
            },
          },
        ],
      );
    },
    [chatId, removeGroupMember, refetch],
  );

  const handleLeaveGroup = useCallback(() => {
    Alert.alert("Leave group?", "You will no longer receive messages from this group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveGroup(chatId!).unwrap();
            router.replace("/messages");
          } catch (error: any) {
            Alert.alert(
              "Could not leave group",
              error?.data?.message ?? "Please try again.",
            );
          }
        },
      },
    ]);
  }, [chatId, leaveGroup]);

  if (isLoading || !chat) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerWrap}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const groupAvatar = getAvatarUrl(chat.name || "Group", chat.avatarImage);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>
          <Text style={styles.title}>Group Info</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.groupHeader}>
            <Image source={{ uri: groupAvatar }} style={styles.groupAvatar} />
            <Text style={styles.groupName}>{chat.name || "Group Chat"}</Text>
            <Text style={styles.memberCount}>
              {members.length} member{members.length === 1 ? "" : "s"}
            </Text>
          </View>

          <Pressable
            style={styles.addMemberRow}
            onPress={() =>
              router.push({
                pathname: "/pages/add-group-members",
                params: { chatId: chat.id },
              })
            }
          >
            <View style={styles.addMemberIcon}>
              <Ionicons name="person-add" size={18} color={colors.accentForeground} />
            </View>
            <Text style={styles.addMemberText}>Add Members</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Members</Text>

          {members.map((member) => {
            const name = getMemberName(member);
            const isSelf = member.userId === currentUserId;

            return (
              <View key={member.id} style={styles.memberRow}>
                <Image
                  source={{ uri: getAvatarUrl(name, member.user?.image) }}
                  style={styles.memberAvatar}
                />

                <View style={styles.memberMiddle}>
                  <Text numberOfLines={1} style={styles.memberName}>
                    {name} {isSelf ? "(You)" : ""}
                  </Text>
                  {member.role === "ADMIN" ? (
                    <Text style={styles.adminBadge}>Admin</Text>
                  ) : null}
                </View>

                {isAdmin && !isSelf ? (
                  <Pressable
                    onPress={() => handleRemoveMember(member)}
                    disabled={isRemoving}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          <Pressable
            style={styles.leaveButton}
            onPress={handleLeaveGroup}
            disabled={isLeaving}
          >
            {isLeaving ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <>
                <Ionicons name="exit-outline" size={18} color="#ef4444" />
                <Text style={styles.leaveButtonText}>Leave Group</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
    centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
    headerSpacer: { width: 38, height: 38 },
    title: { fontSize: 18, fontWeight: "800", color: colors.foreground },
    groupHeader: { alignItems: "center", marginTop: 20, marginBottom: 20 },
    groupAvatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surfaceSecondary,
    },
    groupName: { marginTop: 12, fontSize: 18, fontWeight: "800", color: colors.foreground },
    memberCount: { marginTop: 4, fontSize: 13, color: colors.muted },
    addMemberRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    addMemberIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    addMemberText: { fontSize: 15, fontWeight: "700", color: colors.accent },
    sectionTitle: {
      marginTop: 16,
      marginBottom: 6,
      fontSize: 13,
      fontWeight: "800",
      color: colors.muted,
      textTransform: "uppercase",
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      gap: 12,
    },
    memberAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surfaceSecondary,
    },
    memberMiddle: { flex: 1, minWidth: 0 },
    memberName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
    adminBadge: { marginTop: 2, fontSize: 11, fontWeight: "700", color: colors.accent },
    removeButton: { padding: 4 },
    leaveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 24,
      marginBottom: 20,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#ef4444",
    },
    leaveButtonText: { color: "#ef4444", fontSize: 15, fontWeight: "800" },
  });
}