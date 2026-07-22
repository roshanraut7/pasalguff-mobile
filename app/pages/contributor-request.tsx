import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  useGetMyContributorStatusQuery,
  useRequestContributorAccessMutation,
  useCancelContributorRequestMutation,
} from "@/store/api/postApi";

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function ContributorRequestScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{
    communityId?: string | string[];
    communityName?: string | string[];
    slug?: string | string[];
  }>();

  const communityId = getParamValue(params.communityId);
  const communityName = getParamValue(params.communityName) || "this community";

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    data: status,
    isLoading,
    refetch,
  } = useGetMyContributorStatusQuery(
    { communityId },
    { skip: !communityId, refetchOnMountOrArgChange: true },
  );

  const [requestContributorAccess] = useRequestContributorAccessMutation();
  const [cancelContributorRequest] = useCancelContributorRequestMutation();

  const handleSubmit = useCallback(async () => {
    if (!communityId) return;
    try {
      setIsSubmitting(true);
      await requestContributorAccess({
        communityId,
        message: message.trim() || undefined,
      }).unwrap();
      await refetch();
      Alert.alert(
        "Request sent",
        "Your request to post has been sent to the admin for review.",
      );
    } catch (error: any) {
      Alert.alert(
        "Could not send request",
        error?.data?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [communityId, message, requestContributorAccess, refetch]);

  const handleCancel = useCallback(() => {
    if (!communityId) return;
    Alert.alert(
      "Cancel request",
      "Do you want to cancel your pending request to post?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCancelling(true);
              await cancelContributorRequest({ communityId }).unwrap();
              await refetch();
            } catch (error: any) {
              Alert.alert(
                "Could not cancel",
                error?.data?.message ?? "Something went wrong. Please try again.",
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  }, [communityId, cancelContributorRequest, refetch]);

  if (!communityId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Community ID missing</Text>
      </SafeAreaView>
    );
  }

  if (isLoading && !status) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  const currentStatus = status?.status ?? "NONE";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>Request to Post</Text>
          </View>

          <View style={styles.content}>
            <Text style={[styles.subtitle, { color: colors.foreground }]}>
              {communityName} is a restricted community
            </Text>
            <Text style={[styles.description, { color: colors.muted }]}>
              Only approved contributors can create posts here. Send a short
              message to the admin explaining why you'd like posting access.
            </Text>

            {currentStatus === "APPROVED" ? (
              <StatusCard
                colors={colors}
                icon="checkmark-circle"
                tone="success"
                title="Approved"
                description="You can now create posts in this community."
              />
            ) : currentStatus === "PENDING" ? (
              <StatusCard
                colors={colors}
                icon="time"
                tone="warning"
                title="Request Pending"
                description="Your request is being reviewed by the admin."
              />
            ) : (
              <>
                {currentStatus === "REJECTED" && status?.request?.reviewNote && (
                  <StatusCard
                    colors={colors}
                    icon="close-circle"
                    tone="danger"
                    title="Request Rejected"
                    description={status.request.reviewNote}
                  />
                )}

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    Message to admin (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { 
                        backgroundColor: colors.surface, 
                        color: colors.foreground, 
                        borderColor: colors.border 
                      },
                    ]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Write a short message..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={[
                    styles.button,
                    { backgroundColor: colors.accent, opacity: isSubmitting ? 0.7 : 1 },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.accentForeground} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.accentForeground }]}>
                      Send Request
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            {currentStatus === "PENDING" && (
              <Pressable
                onPress={handleCancel}
                disabled={isCancelling}
                style={[styles.cancelButton, { borderColor: colors.danger }]}
              >
                {isCancelling ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <Text style={[styles.cancelText, { color: colors.danger }]}>
                    Cancel Request
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusCard({
  colors,
  icon,
  tone,
  title,
  description,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  icon: keyof typeof Ionicons.glyphMap;
  tone: "success" | "warning" | "danger";
  title: string;
  description: string;
}) {
  const toneColor =
    tone === "success"
      ? colors.success ?? colors.accent
      : tone === "warning"
      ? colors.warning
      : colors.danger;

  return (
    <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: toneColor }]}>
      <Ionicons name={icon} size={32} color={toneColor} />
      <View style={styles.statusTextContainer}>
        <Text style={[styles.statusTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.statusDesc, { color: colors.muted }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    height: 38,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 16,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  cancelButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: "600",
  },
  statusCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 5,
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusDesc: {
    fontSize: 15,
    lineHeight: 20,
  },
});