import React from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "heroui-native";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  useGetPendingStudentInvitesQuery,
  useGetVerifiedStudentsQuery,
  useRevokeStudentInviteMutation,
  useRevokeStudentVerificationMutation,
} from "@/store/api/studentVerificationApi";

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getInitials(name?: string | null) {
  if (!name) return "S";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() || "S";
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

export default function StudentsScreen() {
  const { colors } = useAppTheme();

  const localParams = useLocalSearchParams<{ communityId?: string | string[] }>();
  const globalParams = useGlobalSearchParams<{ communityId?: string | string[] }>();
  const communityId =
    getParamValue(localParams.communityId) || getParamValue(globalParams.communityId);

  const {
    data: pendingInvites,
    isLoading,
    isFetching,
    refetch,
  } = useGetPendingStudentInvitesQuery(communityId, { skip: !communityId });

  const {
    data: verifiedStudents,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
    refetch: refetchStudents,
  } = useGetVerifiedStudentsQuery(communityId, { skip: !communityId });

  const [revokeInvite, { isLoading: isRevoking }] = useRevokeStudentInviteMutation();

  const [revokeVerification, { isLoading: isRevokingVerification }] =
    useRevokeStudentVerificationMutation();

  async function handleRevoke(inviteId: string, name: string) {
    if (!communityId) return;

    Alert.alert("Revoke invite?", `Cancel the pending invite for ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          try {
            await revokeInvite({ communityId, inviteId }).unwrap();
          } catch (error) {
            Alert.alert("Failed to revoke invite");
          }
        },
      },
    ]);
  }

  async function handleRevokeVerification(memberUserId: string, name: string) {
    if (!communityId) return;

    Alert.alert(
      "Revoke verification?",
      `Remove the verified-student badge for ${name}? They will need a new invite to be verified again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeVerification({ communityId, memberUserId }).unwrap();
            } catch (error) {
              Alert.alert("Failed to revoke verification");
            }
          },
        },
      ],
    );
  }

  if (!communityId) {
    return (
      <View style={styles.centerWrap}>
        <Text style={{ color: colors.foreground }}>Community ID missing</Text>
      </View>
    );
  }

  if (isLoading || isLoadingStudents) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={pendingInvites ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}
      refreshing={isFetching || isFetchingStudents}
      onRefresh={() => {
        refetch();
        refetchStudents();
      }}
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>
          {/* ===================== VERIFIED STUDENTS SECTION ===================== */}
          <Text
            style={{
              color: colors.foreground,
              fontSize: 20,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Verified Students
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            Members who have completed student verification.
          </Text>

          {(verifiedStudents ?? []).length === 0 ? (
            <View
              style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                No verified students yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {(verifiedStudents ?? []).map((member) => {
                const fullName = `${member.user?.firstName ?? ""} ${
                  member.user?.lastName ?? ""
                }`.trim();
                const name = member.user?.name ?? (fullName || "Member");
                const imageUri = toAbsoluteFileUrl(member.user?.image);

                return (
                  <View
                    key={member.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: colors.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Avatar alt={name} size="md" variant="soft" color="success">
                      {imageUri ? <Avatar.Image source={{ uri: imageUri }} /> : null}
                      <Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
                    </Avatar>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Poppins_600SemiBold",
                        }}
                      >
                        {name}
                      </Text>

                      <Text
                        style={{
                          color: colors.accent,
                          fontSize: 12,
                          marginTop: 2,
                          fontFamily: "Poppins_500Medium",
                        }}
                      >
                        {member.studentBatch
                          ? `Batch ${member.studentBatch}`
                          : "Verified Student"}
                      </Text>
                    </View>

                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#22C55E"
                      style={{ marginRight: 4 }}
                    />

                    <Pressable
                      disabled={isRevokingVerification}
                      onPress={() => handleRevokeVerification(member.userId, name)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 999,
                        backgroundColor: colors.danger,
                        opacity: isRevokingVerification ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontFamily: "Poppins_600SemiBold",
                        }}
                      >
                        Revoke
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* ===================== PENDING INVITES SECTION HEADER ===================== */}
          <Text
            style={{
              color: colors.foreground,
              fontSize: 20,
              fontFamily: "Poppins_700Bold",
              marginTop: 24,
            }}
          >
            Pending Student Verifications
          </Text>

          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
            Invites waiting for a member to submit their batch. Send new invites
            from the Members tab.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.centerWrap}>
          <Ionicons name="school-outline" size={30} color={colors.muted} />
          <Text style={{ color: colors.muted, marginTop: 10, textAlign: "center" }}>
            No pending invites. Go to the Members tab and tap a member to send
            a verification invite.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const fullName = `${item.targetUser?.firstName ?? ""} ${
          item.targetUser?.lastName ?? ""
        }`.trim();
        const name = item.targetUser?.name ?? (fullName || "Member");
        const imageUri = toAbsoluteFileUrl(item.targetUser?.image);

        return (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 16,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Avatar alt={name} size="md" variant="soft" color="accent">
              {imageUri ? <Avatar.Image source={{ uri: imageUri }} /> : null}
              <Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
            </Avatar>

            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Poppins_600SemiBold" }}>
                {name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                Invited {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>

            <Pressable
              disabled={isRevoking}
              onPress={() => handleRevoke(item.id, name)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: colors.danger,
                opacity: isRevoking ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Poppins_600SemiBold" }}>
                Revoke
              </Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
});