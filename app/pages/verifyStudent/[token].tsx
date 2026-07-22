import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  useGetStudentInviteByTokenQuery,
  useSubmitStudentInviteMutation,
} from "@/store/api/studentVerificationApi";

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Something went wrong. Please try again.";
  }

  const apiError = error as { data?: { message?: string | string[] } };
  const message = apiError.data?.message;

  if (Array.isArray(message)) return message.join("\n");
  if (typeof message === "string") return message;

  return "Something went wrong. Please try again.";
}

function getInitialLetter(name?: string | null) {
  const safeName = name?.trim();
  if (!safeName) return "C";
  return safeName.charAt(0).toUpperCase();
}

export default function VerifyStudentScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const { token } = useLocalSearchParams<{ token: string }>();

  const [batch, setBatch] = useState("");

  const {
    data: invite,
    isLoading,
    error,
  } = useGetStudentInviteByTokenQuery(token ?? "", {
    skip: !token,
  });

  const [submitInvite, { isLoading: isSubmitting }] =
    useSubmitStudentInviteMutation();

  async function handleSubmit() {
    if (!token) return;

    const trimmedBatch = batch.trim();

    if (!trimmedBatch) {
      Alert.alert("Batch required", "Please enter your batch to continue.");
      return;
    }

    try {
      await submitInvite({ token, batch: trimmedBatch }).unwrap();

      Alert.alert(
        "Verified!",
        "Your student verification has been submitted successfully.",
        [
          {
            text: "Done",
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/profile" as any);
              }
            },
          },
        ],
      );
    } catch (submitError) {
      Alert.alert("Submission failed", getErrorMessage(submitError));
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centerWrap}>
          <Ionicons name="warning-outline" size={30} color={colors.warning} />
          <Text style={styles.centerTitle}>Invalid link</Text>
          <Text style={styles.centerSubtitle}>
            This verification link is missing required information.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.centerSubtitle}>Loading verification details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invite) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
          <Text style={styles.centerTitle}>Link unavailable</Text>
          <Text style={styles.centerSubtitle}>
            {getErrorMessage(error) ||
              "This verification link is invalid, expired, or has already been used."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUrl = toAbsoluteFileUrl(invite.community.avatarImage);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color={colors.foreground} />
          </Pressable>

          <Text style={styles.headerTitle}>Student Verification</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.communityCard}>
            <View style={styles.communityAvatar}>
              {avatarUrl ? (
                <Ionicons name="school" size={22} color={colors.accent} />
              ) : (
                <Text style={styles.communityAvatarText}>
                  {getInitialLetter(invite.community.name)}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.communityName} numberOfLines={1}>
                {invite.community.name}
              </Text>
              <Text style={styles.communitySubtitle}>
                wants to verify your enrollment
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.infoText}>
              Enter your batch to confirm you're a student at this institute.
              This will show a verified badge on your posts in this community.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Batch</Text>
            <TextInput
              value={batch}
              onChangeText={setBatch}
              placeholder="e.g. 2021-2025 or Batch 12"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || !batch.trim()}
            style={[
              styles.submitButton,
              (isSubmitting || !batch.trim()) && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Verification</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: colors.foreground,
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
    },
    content: {
      padding: 18,
      paddingBottom: 60,
      gap: 18,
    },
    communityCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    communityAvatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    communityAvatarText: {
      color: colors.accent,
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
    },
    communityName: {
      color: colors.foreground,
      fontSize: 16,
      fontFamily: "Poppins_700Bold",
    },
    communitySubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },
    infoBox: {
      flexDirection: "row",
      gap: 10,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoText: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },
    formSection: {
      gap: 8,
    },
    fieldLabel: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_600SemiBold",
    },
    input: {
      minHeight: 50,
      borderRadius: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Poppins_400Regular",
    },
    submitButton: {
      minHeight: 52,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
    },
    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    centerTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 17,
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