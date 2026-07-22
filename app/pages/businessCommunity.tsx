import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetMyVerificationStatusQuery } from "@/store/api/verificationApi";
import { useGetCategoriesQuery } from "@/store/api/category.api";
import {
  useGetMyBusinessCommunityStatusQuery,
  useSubmitBusinessCommunityRequestMutation,
} from "@/store/api/businessCommunityApi";
import type { CommunityVisibility } from "@/types/community";

const VISIBILITY_OPTIONS: { label: string; value: CommunityVisibility }[] = [
  { label: "Public", value: "PUBLIC" },
  { label: "Restricted", value: "RESTRICTED" },
  { label: "Private", value: "PRIVATE" },
];

export default function BusinessCommunityScreen() {
  const { colors } = useAppTheme();

  const { data: verification, isLoading: verificationLoading } =
    useGetMyVerificationStatusQuery();

  const {
    data: statusData,
    isLoading: statusLoading,
    refetch,
  } = useGetMyBusinessCommunityStatusQuery();

  const { data: categoriesResponse, isLoading: categoriesLoading } =
    useGetCategoriesQuery({ page: 1, limit: 50, status: "ACTIVE" });

  const [submitRequest, { isLoading: isSubmitting }] =
    useSubmitBusinessCommunityRequestMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<CommunityVisibility>("PUBLIC");

  const categories = categoriesResponse?.data ?? [];
  const latestRequest = statusData?.latestRequest ?? null;

  const isEligible =
    verification?.isVerified &&
    (verification.verificationTrack === "BUSINESS" ||
      verification.verificationTrack === "TRAINING");

  const hasPending = latestRequest?.status === "PENDING";
  const isApproved = latestRequest?.status === "APPROVED";

  const canSubmitForm = isEligible && !hasPending && !isApproved;

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a community name.");
      return;
    }

    if (!categoryId) {
      Alert.alert("Category required", "Please choose a category.");
      return;
    }

    try {
      await submitRequest({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        visibility,
      }).unwrap();

      Alert.alert(
        "Request submitted",
        "Your business community request is now pending admin review.",
      );

      await refetch();
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not submit your request.",
      );
    }
  };

  const isLoading = verificationLoading || statusLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          height: 58,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: colors.foreground,
            fontSize: 19,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Business Community
        </Text>

        <View style={{ width: 42, height: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!isEligible ? (
          <View
            style={{
              borderRadius: 20,
              padding: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 15,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Verification required
            </Text>
            <Text
              style={{
                marginTop: 8,
                color: colors.muted,
                fontSize: 13,
                lineHeight: 20,
                fontFamily: "Poppins_400Regular",
              }}
            >
              Only verified business or institute accounts can request a
              dedicated community. Complete verification first.
            </Text>

            <Pressable
              onPress={() => router.push("/pages/verification")}
              style={{
                marginTop: 14,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: colors.accent,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Get Verified
              </Text>
            </Pressable>
          </View>
        ) : latestRequest ? (
          <View
            style={{
              borderRadius: 20,
              padding: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons
                name={
                  latestRequest.status === "APPROVED"
                    ? "checkmark-circle"
                    : latestRequest.status === "REJECTED"
                      ? "close-circle"
                      : "time-outline"
                }
                size={20}
                color={
                  latestRequest.status === "APPROVED"
                    ? colors.accent
                    : latestRequest.status === "REJECTED"
                      ? colors.danger
                      : colors.muted
                }
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 15,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                {latestRequest.name}
              </Text>
            </View>

            <Text
              style={{
                marginTop: 8,
                color: colors.muted,
                fontSize: 13,
                fontFamily: "Poppins_500Medium",
              }}
            >
              Status: {latestRequest.status}
            </Text>

            {latestRequest.status === "REJECTED" && latestRequest.rejectionReason ? (
              <Text
                style={{
                  marginTop: 6,
                  color: colors.danger,
                  fontSize: 13,
                  lineHeight: 19,
                  fontFamily: "Poppins_400Regular",
                }}
              >
                Reason: {latestRequest.rejectionReason}
              </Text>
            ) : null}

            {latestRequest.status === "REJECTED" ? (
              <Pressable
                onPress={() => {
                  setName("");
                  setDescription("");
                  setCategoryId(null);
                  refetch();
                }}
                style={{
                  marginTop: 14,
                  paddingVertical: 12,
                  borderRadius: 999,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "Poppins_600SemiBold",
                  }}
                >
                  Submit a new request
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {canSubmitForm ? (
          <View style={{ marginTop: latestRequest ? 20 : 0 }}>
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontFamily: "Poppins_700Bold",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Community details
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Community name"
              placeholderTextColor={colors.placeholder}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.foreground,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: "Poppins_400Regular",
                fontSize: 14,
                marginBottom: 12,
              }}
            />

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={3}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.foreground,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: "Poppins_400Regular",
                fontSize: 14,
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 12,
              }}
            />

            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontFamily: "Poppins_600SemiBold",
                marginBottom: 8,
              }}
            >
              Category
            </Text>

            {categoriesLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {categories.map((category) => {
                  const isActive = categoryId === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setCategoryId(category.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isActive ? colors.accent : colors.border,
                        backgroundColor: isActive
                          ? colors.accent
                          : colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: isActive
                            ? colors.accentForeground
                            : colors.foreground,
                          fontSize: 13,
                          fontFamily: "Poppins_500Medium",
                        }}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontFamily: "Poppins_600SemiBold",
                marginBottom: 8,
              }}
            >
              Visibility
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {VISIBILITY_OPTIONS.map((option) => {
                const isActive = visibility === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setVisibility(option.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 14,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: isActive ? colors.accent : colors.border,
                      backgroundColor: isActive
                        ? colors.accent
                        : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive
                          ? colors.accentForeground
                          : colors.foreground,
                        fontSize: 13,
                        fontFamily: "Poppins_600SemiBold",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={{
                paddingVertical: 14,
                borderRadius: 999,
                backgroundColor: colors.accent,
                alignItems: "center",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 15,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Submit request
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}