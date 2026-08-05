import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  type ReferralShareStats,
  useCompleteReferralShareMutation,
  useCreateReferralShareLinkMutation,
  useGetReferralShareStatsQuery,
} from "@/store/api/referralApi";

type ReferralShareSheetProps = {
  visible: boolean;
  initialStats: ReferralShareStats | null;
  onClose: () => void;
  onStatsChange: (
    stats: ReferralShareStats,
  ) => void;
};

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (
      error as {
        data?: {
          message?: string | string[];
        };
      }
    ).data;

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }
  }

  return fallback;
}

export default function ReferralShareSheet({
  visible,
  initialStats,
  onClose,
  onStatsChange,
}: ReferralShareSheetProps) {
  const { colors } = useAppTheme();

  const [stats, setStats] =
    useState<ReferralShareStats | null>(
      initialStats,
    );

  const [error, setError] = useState("");
  const [isSharing, setIsSharing] =
    useState(false);

  const [
    createReferralShareLink,
    { isLoading: isCreating },
  ] = useCreateReferralShareLinkMutation();

  const [
    completeReferralShare,
    { isLoading: isCompleting },
  ] = useCompleteReferralShareMutation();

  /*
   * Automatically refresh counts every 10 seconds
   * while this sheet is open.
   */
  const {
    data: refreshedStats,
    isFetching: isRefreshing,
    refetch,
  } = useGetReferralShareStatsQuery(
    stats?.token ?? "",
    {
      skip:
        !visible ||
        !stats?.token,
      pollingInterval: 10_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const saveStats = useCallback(
    (value: ReferralShareStats) => {
      setStats(value);
      onStatsChange(value);
    },
    [onStatsChange],
  );

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    if (refreshedStats) {
      saveStats(refreshedStats);
    }
  }, [refreshedStats, saveStats]);

  const ensureReferralLink =
    async (): Promise<ReferralShareStats> => {
      if (stats) {
        return stats;
      }

      const created =
        await createReferralShareLink().unwrap();

      saveStats(created);

      return created;
    };

  const handleShare = async () => {
    if (
      isSharing ||
      isCreating ||
      isCompleting
    ) {
      return;
    }

    setError("");
    setIsSharing(true);

    try {
      const referral =
        await ensureReferralLink();

      const result = await Share.share(
        {
          title: "Download KamKuro",
          message:
            "Join me on KamKuro, a community for technical students, " +
            "businesses, institutes and professionals.\n\n" +
            `Download KamKuro here:\n${referral.shareUrl}`,
          url: referral.shareUrl,
        },
        {
          dialogTitle:
            "Share KamKuro download link",
        },
      );

      if (
        result.action ===
        Share.dismissedAction
      ) {
        return;
      }

      const updated =
        await completeReferralShare({
          token: referral.token,
        }).unwrap();

      saveStats(updated);
    } catch (shareError) {
      setError(
        getErrorMessage(
          shareError,
          "Unable to share the referral link.",
        ),
      );
    } finally {
      setIsSharing(false);
    }
  };

  const isBusy =
    isSharing ||
    isCreating ||
    isCompleting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor:
            "rgba(0,0,0,0.45)",
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 26,
          }}
        >
          <View
            style={{
              width: 42,
              height: 4,
              borderRadius: 999,
              alignSelf: "center",
              backgroundColor: colors.border,
              marginBottom: 16,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 20,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                Share KamKuro
              </Text>

              <Text
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  lineHeight: 18,
                  fontFamily: "Poppins_400Regular",
                  marginTop: 3,
                }}
              >
                Invite friends using your tracked link.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surface,
              }}
            >
              <Ionicons
                name="close-outline"
                size={22}
                color={colors.muted}
              />
            </Pressable>
          </View>

          {stats ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 18,
                }}
              >
                <SheetCount
                  label="Shares"
                  value={stats.shareCount}
                />

                <SheetCount
                  label="Opens"
                  value={stats.pageOpenCount}
                />

                <SheetCount
                  label="Downloads"
                  value={stats.downloadCount}
                />
              </View>

              <View
                style={{
                  padding: 12,
                  borderRadius: 15,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  marginTop: 12,
                }}
              >
                <Text
                  selectable
                  numberOfLines={2}
                  style={{
                    color: colors.muted,
                    fontSize: 11,
                    lineHeight: 17,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  {stats.shareUrl}
                </Text>
              </View>
            </>
          ) : null}

          {error ? (
            <Text
              style={{
                color: colors.danger,
                fontSize: 12,
                lineHeight: 18,
                fontFamily: "Poppins_500Medium",
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleShare}
            disabled={isBusy}
            style={{
              minHeight: 52,
              borderRadius: 999,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              marginTop: 18,
              opacity: isBusy ? 0.65 : 1,
            }}
          >
            {isBusy ? (
              <ActivityIndicator
                size="small"
                color={colors.accentForeground}
              />
            ) : (
              <Ionicons
                name="share-social-outline"
                size={19}
                color={colors.accentForeground}
              />
            )}

            <Text
              style={{
                color: colors.accentForeground,
                fontSize: 14,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              {isBusy
                ? "Opening share options..."
                : stats
                  ? "Share again"
                  : "Create and share link"}
            </Text>
          </Pressable>

          {stats ? (
            <Pressable
              onPress={() => {
                void refetch();
              }}
              disabled={isRefreshing}
              style={{
                minHeight: 45,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 7,
                marginTop: 9,
                opacity: isRefreshing ? 0.6 : 1,
              }}
            >
              {isRefreshing ? (
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                />
              ) : (
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={colors.accent}
                />
              )}

              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 12,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Refresh counts
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SheetCount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 15,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 9,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: 17,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 9,
          fontFamily: "Poppins_500Medium",
        }}
      >
        {label}
      </Text>
    </View>
  );
}