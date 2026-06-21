import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { AppColors } from "@/constants/theme";
import { discussionDetailStyles as styles } from "@/constants/styles/disscusion-detail.styles";
import { DiscussionAnswerRow } from "@/components/DiscussionRow";
import {
  useAcceptDiscussionAnswerMutation,
  useCreateContributorRequestMutation,
  useCreateDiscussionAnswerMutation,
  useCreateDiscussionAnswerReplyMutation,
  useDeleteDiscussionAnswerMutation,
  useDeleteDiscussionAnswerReplyMutation,
  useGetCommunityDiscussionQuery,
  useGetDiscussionAnswersQuery,
  useToggleDiscussionAnswerHighlightMutation,
  useToggleDiscussionAnswerPinMutation,
  useUpdateDiscussionParticipantModeMutation,
  useVoteDiscussionAnswerMutation,
  useVoteDiscussionAnswerReplyMutation,
  type CommunityDiscussionAnswer,
  type CommunityDiscussionAnswerReply,
  type DiscussionParticipantMode,
} from "@/store/api/communityDiscussionApi";
import type {
  DiscussionComment,
  DiscussionPermissions,
  DiscussionReply,
  VoteValue,
} from "@/types/discussion";

type ActiveVote = Exclude<VoteValue, null>;

function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getInitials(name?: string | null) {
  const cleanName = name?.trim();

  if (!cleanName) return "U";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAuthorName(author?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
}) {
  if (!author) return "Unknown user";

  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown user";
}

function getAuthorHandle(author?: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
}) {
  const name = getAuthorName(author);

  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

  return `@${clean || "user"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data
  ) {
    const message = error.data.message;

    if (Array.isArray(message)) {
      return message.join("\n");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return "Could not load discussion. Please try again.";
}

function Avatar({
  initials,
  size = 42,
  colors,
}: {
  initials: string;
  size?: number;
  colors: AppColors;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceTertiary,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            color: colors.segmentForeground,
            fontSize: size / 3,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

function StatusPill({
  label,
  icon,
  colors,
  tone = "default",
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  colors: AppColors;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneColor =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "danger"
          ? colors.danger
          : colors.accent;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.surfaceTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={toneColor} /> : null}

      <Text style={[styles.pillText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

function MetricText({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  colors: AppColors;
}) {
  return (
    <View style={styles.metricItem}>
      <Ionicons name={icon} size={15} color={colors.muted} />

      <Text style={[styles.metricText, { color: colors.muted }]}>
        {value} {label}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  colors,
  variant = "soft",
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  colors: AppColors;
  variant?: "soft" | "primary" | "danger";
}) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  const backgroundColor = isPrimary
    ? colors.accent
    : colors.surfaceSecondary;

  const borderColor = isPrimary
    ? colors.accent
    : isDanger
      ? colors.danger
      : colors.border;

  const foregroundColor = isPrimary
    ? colors.accentForeground
    : isDanger
      ? colors.danger
      : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={foregroundColor} />

      <Text style={[styles.actionButtonText, { color: foregroundColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function mapReplyToUi(reply: CommunityDiscussionAnswerReply): DiscussionReply {
  const name = getAuthorName(reply.author);

  return {
    id: reply.id,
    author: {
      id: reply.author.id,
      name,
      handle: getAuthorHandle(reply.author),
      avatarInitials: getInitials(name),
    },
    body: reply.body,
    createdAt: formatDate(reply.createdAt),
    voteScore: reply.voteScore,
  viewerVote: reply.viewerVote ?? null,
  };
}

function mapAnswerToUi(answer: CommunityDiscussionAnswer): DiscussionComment {
  const name = getAuthorName(answer.author);

  return {
    id: answer.id,
    author: {
      id: answer.author.id,
      name,
      handle: getAuthorHandle(answer.author),
      avatarInitials: getInitials(name),
    },
    body: answer.body,
    createdAt: formatDate(answer.createdAt),
    voteScore: answer.voteScore,
    viewerVote: answer.viewerVote?? null,
    replies: (answer.replies ?? []).map(mapReplyToUi),
    isAcceptedAnswer: answer.isAcceptedAnswer,
    isAuthorHighlighted: answer.isAuthorHighlighted,
    isModeratorPinned: answer.isModeratorPinned,
  };
}

export default function DiscussionDetailPage() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();

  const params = useLocalSearchParams<{
    discussionId?: string | string[];
    communityId?: string | string[];
    communityName?: string | string[];
  }>();

  const discussionId = getParamValue(params.discussionId);
  const communityId = getParamValue(params.communityId);
  const paramCommunityName = getParamValue(params.communityName);

  const shouldSkipQuery = !communityId || !discussionId;

  const [answerDraft, setAnswerDraft] = useState("");
  const [openReplyIds, setOpenReplyIds] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const viewerId = session?.user?.id ?? "";

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityDiscussionQuery(
    {
      communityId: communityId ?? "",
      discussionId: discussionId ?? "",
    },
    {
      skip: shouldSkipQuery,
    },
  );

  const {
    data: answersResponse,
    isLoading: isLoadingAnswers,
    isFetching: isFetchingAnswers,
    error: answersError,
    refetch: refetchAnswers,
  } = useGetDiscussionAnswersQuery(
    {
      communityId: communityId ?? "",
      discussionId: discussionId ?? "",
      limit: 30,
    },
    {
      skip: shouldSkipQuery,
    },
  );

  const [createAnswer, { isLoading: isCreatingAnswer }] =
    useCreateDiscussionAnswerMutation();

  const [createReply, { isLoading: isCreatingReply }] =
    useCreateDiscussionAnswerReplyMutation();

  const [toggleHighlight, { isLoading: isHighlighting }] =
    useToggleDiscussionAnswerHighlightMutation();

  const [togglePin, { isLoading: isPinning }] =
    useToggleDiscussionAnswerPinMutation();

  const [acceptAnswer, { isLoading: isAccepting }] =
    useAcceptDiscussionAnswerMutation();
    const [voteAnswer, { isLoading: isVotingAnswer }] =
  useVoteDiscussionAnswerMutation();

const [voteReply, { isLoading: isVotingReply }] =
  useVoteDiscussionAnswerReplyMutation();

const [deleteAnswer, { isLoading: isDeletingAnswer }] =
  useDeleteDiscussionAnswerMutation();

const [deleteReply, { isLoading: isDeletingReply }] =
  useDeleteDiscussionAnswerReplyMutation();
  const [createContributorRequest, { isLoading: isRequestingContributor }] =
  useCreateContributorRequestMutation();

const [updateParticipantMode, { isLoading: isUpdatingParticipantMode }] =
  useUpdateDiscussionParticipantModeMutation();

const [showContributorRequest, setShowContributorRequest] = useState(false);

  const discussion = data?.data;

  const answers = useMemo(
    () => (answersResponse?.data ?? []).map(mapAnswerToUi),
    [answersResponse?.data],
  );

  const authorName = getAuthorName(discussion?.author);
  const authorInitials = getInitials(authorName);

  const communityName =
    discussion?.community?.name ?? paramCommunityName ?? "Selected community";

  const statusTone =
    discussion?.status === "SOLVED"
      ? "success"
      : discussion?.status === "LOCKED"
        ? "danger"
        : discussion?.status === "CLOSED"
          ? "warning"
          : "default";


const permissions = useMemo<DiscussionPermissions>(() => {
  const isAuthor = Boolean(viewerId) && discussion?.authorId === viewerId;

  // For now this is false because backend is not sending viewer role yet.
  // So only discussion author can manage participants for now.
  const isCommunityModerator = false;

  return {
    isAuthor,
    isCommunityModerator,

    canAnswer: true,
    canReport: true,
    canShare: true,

    canMarkAcceptedAnswer: isAuthor || isCommunityModerator,
    canHighlightAsAuthor: isAuthor,
    canPinModeratorNote: isAuthor || isCommunityModerator,
    canDeleteAnyComment: isAuthor || isCommunityModerator,

    // Add this line
    canManageParticipants: isAuthor || isCommunityModerator,

    canEditDiscussion: isAuthor,
    canDeleteDiscussion: isAuthor || isCommunityModerator,
    canLockDiscussion: isCommunityModerator,
    canCloseDiscussion: isAuthor || isCommunityModerator,

    canCloseAsSolved: isAuthor || isCommunityModerator,
    canMarkSpam: isCommunityModerator,
  };
}, [discussion?.authorId, viewerId]);


  const refreshDiscussionAndAnswers = useCallback(async () => {
    await Promise.all([
      refetch(),
      refetchAnswers(),
    ]);
  }, [refetch, refetchAnswers]);

  const handleShare = useCallback(async () => {
    if (!discussion) return;

    const url = `https://yourdomain.com/discussions/${discussion.id}`;

    await Share.share({
      title: discussion.title,
      message: `${discussion.title}\n\nJoin the discussion: ${url}`,
      url,
    });
  }, [discussion]);

  const handleReport = useCallback(() => {
    Alert.alert(
      "Report not connected",
      "The report API is not created yet. Build the report endpoint first, then connect this button.",
    );
  }, []);

  const handleFollow = useCallback(() => {
    Alert.alert(
      "Follow not connected",
      "The follow discussion API is not created yet. Build the follow endpoint first, then connect this button.",
    );
  }, []);

  const handlePostAnswer = useCallback(async () => {
    if (!communityId || !discussionId) return;

    const cleanBody = answerDraft.trim();

    if (!cleanBody) {
      Alert.alert("Answer required", "Please write your answer first.");
      return;
    }

    try {
      await createAnswer({
        communityId,
        discussionId,
        body: cleanBody,
      }).unwrap();

      setAnswerDraft("");
      await refreshDiscussionAndAnswers();
    } catch (createError) {
  const message = getErrorMessage(createError);

  if (
    message.toLowerCase().includes("viewer") ||
    message.toLowerCase().includes("request contributor") ||
    message.toLowerCase().includes("join this community")
  ) {
    setShowContributorRequest(true);
  }

  Alert.alert("Could not post answer", message);
}
  }, [
    answerDraft,
    communityId,
    discussionId,
    createAnswer,
    refreshDiscussionAndAnswers,
  ]);

  const handleToggleReplies = useCallback((answerId: string) => {
    setOpenReplyIds((previous) => ({
      ...previous,
      [answerId]: !previous[answerId],
    }));
  }, []);

  const handleOpenReplyBox = useCallback((answerId: string) => {
    setOpenReplyIds((previous) => ({
      ...previous,
      [answerId]: true,
    }));
  }, []);

  const handleChangeReply = useCallback((answerId: string, value: string) => {
    setReplyDrafts((previous) => ({
      ...previous,
      [answerId]: value,
    }));
  }, []);

  const handleSubmitReply = useCallback(
    async (answerId: string) => {
      if (!communityId || !discussionId) return;

      const cleanBody = replyDrafts[answerId]?.trim();

      if (!cleanBody) {
        Alert.alert("Reply required", "Please write your reply first.");
        return;
      }

      try {
        await createReply({
          communityId,
          discussionId,
          answerId,
          body: cleanBody,
        }).unwrap();

        setReplyDrafts((previous) => ({
          ...previous,
          [answerId]: "",
        }));

        setOpenReplyIds((previous) => ({
          ...previous,
          [answerId]: true,
        }));

        await refetchAnswers();
      } catch (replyError) {
  const message = getErrorMessage(replyError);

  if (
    message.toLowerCase().includes("limit") ||
    message.toLowerCase().includes("request contributor") ||
    message.toLowerCase().includes("join this community")
  ) {
    setShowContributorRequest(true);
  }

  Alert.alert("Could not post reply", message);
}
    },
    [
      communityId,
      discussionId,
      replyDrafts,
      createReply,
      refetchAnswers,
    ],
  );

  const handleAcceptAnswer = useCallback(
    async (answerId: string) => {
      if (!communityId || !discussionId) return;

      try {
        await acceptAnswer({
          communityId,
          discussionId,
          answerId,
        }).unwrap();

        await refreshDiscussionAndAnswers();
      } catch (acceptError) {
        Alert.alert("Could not accept answer", getErrorMessage(acceptError));
      }
    },
    [
      communityId,
      discussionId,
      acceptAnswer,
      refreshDiscussionAndAnswers,
    ],
  );

  const handleHighlightAnswer = useCallback(
    async (answerId: string) => {
      if (!communityId || !discussionId) return;

      try {
        await toggleHighlight({
          communityId,
          discussionId,
          answerId,
        }).unwrap();

        await refetchAnswers();
      } catch (highlightError) {
        Alert.alert(
          "Could not update highlight",
          getErrorMessage(highlightError),
        );
      }
    },
    [
      communityId,
      discussionId,
      toggleHighlight,
      refetchAnswers,
    ],
  );

  const handlePinAnswer = useCallback(
    async (answerId: string) => {
      if (!communityId || !discussionId) return;

      try {
        await togglePin({
          communityId,
          discussionId,
          answerId,
        }).unwrap();

        await refetchAnswers();
      } catch (pinError) {
        Alert.alert("Could not update pin", getErrorMessage(pinError));
      }
    },
    [
      communityId,
      discussionId,
      togglePin,
      refetchAnswers,
    ],
  );

const handleVoteAnswer = useCallback(
  async (answerId: string, vote: ActiveVote) => {
    if (!communityId || !discussionId) return;

    const currentAnswer = answers.find((answer) => answer.id === answerId);

    const nextVote = currentAnswer?.viewerVote === vote ? "REMOVE" : vote;

    try {
      await voteAnswer({
        communityId,
        discussionId,
        answerId,
        vote: nextVote,
      }).unwrap();

      await refetchAnswers();
    } catch (voteError) {
      Alert.alert("Could not vote answer", getErrorMessage(voteError));
    }
  },
  [answers, communityId, discussionId, voteAnswer, refetchAnswers],
);

const handleVoteReply = useCallback(
  async (answerId: string, replyId: string, vote: ActiveVote) => {
    if (!communityId || !discussionId) return;

    const currentAnswer = answers.find((answer) => answer.id === answerId);
    const currentReply = currentAnswer?.replies.find(
      (reply) => reply.id === replyId,
    );

    const nextVote = currentReply?.viewerVote === vote ? "REMOVE" : vote;

    try {
      await voteReply({
        communityId,
        discussionId,
        answerId,
        replyId,
        vote: nextVote,
      }).unwrap();

      await refetchAnswers();
    } catch (voteError) {
      Alert.alert("Could not vote reply", getErrorMessage(voteError));
    }
  },
  [answers, communityId, discussionId, voteReply, refetchAnswers],
);

  const handleDeleteAnswer = useCallback(
  (answerId: string) => {
    if (!communityId || !discussionId) return;

    Alert.alert(
      "Delete answer",
      "Are you sure you want to delete this answer?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAnswer({
                communityId,
                discussionId,
                answerId,
              }).unwrap();

              await refreshDiscussionAndAnswers();
            } catch (deleteError) {
              Alert.alert(
                "Could not delete answer",
                getErrorMessage(deleteError),
              );
            }
          },
        },
      ],
    );
  },
  [communityId, discussionId, deleteAnswer, refreshDiscussionAndAnswers],
);
const handleDeleteReply = useCallback(
  (answerId: string, replyId: string) => {
    if (!communityId || !discussionId) return;

    Alert.alert(
      "Delete reply",
      "Are you sure you want to delete this reply?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReply({
                communityId,
                discussionId,
                answerId,
                replyId,
              }).unwrap();

              await refetchAnswers();
            } catch (deleteError) {
              Alert.alert(
                "Could not delete reply",
                getErrorMessage(deleteError),
              );
            }
          },
        },
      ],
    );
  },
  [communityId, discussionId, deleteReply, refetchAnswers],
);
const handleRequestContributor = useCallback(async () => {
  if (!communityId || !discussionId) return;

  try {
    await createContributorRequest({
      communityId,
      requestedFromDiscussionId: discussionId,
      message: "I want to contribute to this discussion.",
    }).unwrap();

    setShowContributorRequest(false);

    Alert.alert(
      "Request sent",
      "Your contributor request has been sent to the community team.",
    );
  } catch (requestError) {
    Alert.alert(
      "Could not request contributor access",
      getErrorMessage(requestError),
    );
  }
}, [
  communityId,
  discussionId,
  createContributorRequest,
]);
const handleUpdateParticipantMode = useCallback(
  async (
    targetUserId: string,
    mode: DiscussionParticipantMode,
    reason?: string,
  ) => {
    if (!communityId || !discussionId) return;

    try {
      await updateParticipantMode({
        communityId,
        discussionId,
        targetUserId,
        mode,
        reason,
      }).unwrap();

      await refreshDiscussionAndAnswers();

      Alert.alert(
        "Updated",
        mode === "NORMAL"
          ? "User restored in this discussion."
          : mode === "VIEWER_LIMITED"
            ? "User limited in this discussion."
            : "User removed from this discussion.",
      );
    } catch (modeError) {
      Alert.alert("Could not update user", getErrorMessage(modeError));
    }
  },
  [
    communityId,
    discussionId,
    updateParticipantMode,
    refreshDiscussionAndAnswers,
  ],
);

  const handleReportAnswer = useCallback(() => {
    Alert.alert(
      "Report not connected",
      "Report answer API is not created yet.",
    );
  }, []);
  const handleLimitUser = useCallback(
  (targetUserId: string) => {
    Alert.alert(
      "Limit user",
      "This will make the user viewer-limited in this discussion only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Limit",
          onPress: () => {
            void handleUpdateParticipantMode(
              targetUserId,
              "VIEWER_LIMITED",
              "Limited by discussion manager",
            );
          },
        },
      ],
    );
  },
  [handleUpdateParticipantMode],
);

const handleRemoveUserFromDiscussion = useCallback(
  (targetUserId: string) => {
    Alert.alert(
      "Remove from discussion",
      "This will block the user from this discussion only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void handleUpdateParticipantMode(
              targetUserId,
              "BLOCKED",
              "Removed by discussion manager",
            );
          },
        },
      ],
    );
  },
  [handleUpdateParticipantMode],
);

const handleRestoreUserInDiscussion = useCallback(
  (targetUserId: string) => {
    Alert.alert(
      "Restore user",
      "This will restore the user in this discussion.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: () => {
            void handleUpdateParticipantMode(targetUserId, "NORMAL");
          },
        },
      ],
    );
  },
  [handleUpdateParticipantMode],
);

  if (shouldSkipQuery) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.topTitleWrap}>
            <Text style={[styles.topTitle, { color: colors.foreground }]}>
              Discussion
            </Text>

            <Text style={[styles.topSubtitle, { color: colors.muted }]}>
              Missing route params
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={colors.danger}
          />

          <Text
            style={{
              marginTop: 12,
              color: colors.foreground,
              fontSize: 16,
              fontFamily: "Poppins_600SemiBold",
              textAlign: "center",
            }}
          >
            Missing discussion information
          </Text>

          <Text
            style={{
              marginTop: 8,
              color: colors.muted,
              fontSize: 13,
              lineHeight: 20,
              fontFamily: "Poppins_400Regular",
              textAlign: "center",
            }}
          >
            communityId and discussionId are required to load this discussion.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.topTitleWrap}>
            <Text style={[styles.topTitle, { color: colors.foreground }]}>
              Discussion
            </Text>

            <Text style={[styles.topSubtitle, { color: colors.muted }]}>
              Loading...
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator />
          <Text
            style={{
              marginTop: 12,
              color: colors.muted,
              fontSize: 13,
              fontFamily: "Poppins_400Regular",
            }}
          >
            Loading discussion...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !discussion) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.topTitleWrap}>
            <Text style={[styles.topTitle, { color: colors.foreground }]}>
              Discussion
            </Text>

            <Text style={[styles.topSubtitle, { color: colors.muted }]}>
              Could not load
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={colors.danger}
          />

          <Text
            style={{
              marginTop: 12,
              color: colors.foreground,
              fontSize: 16,
              fontFamily: "Poppins_600SemiBold",
              textAlign: "center",
            }}
          >
            Could not load discussion
          </Text>

          <Text
            style={{
              marginTop: 8,
              color: colors.muted,
              fontSize: 13,
              lineHeight: 20,
              fontFamily: "Poppins_400Regular",
              textAlign: "center",
            }}
          >
            {getErrorMessage(error)}
          </Text>

          <Pressable
            onPress={() => refetch()}
            style={{
              marginTop: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: colors.accent,
            }}
          >
            <Text
              style={{
                color: colors.accentForeground,
                fontSize: 13,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

 const actionBusy =
  isCreatingAnswer ||
  isCreatingReply ||
  isAccepting ||
  isHighlighting ||
  isPinning ||
  isVotingAnswer ||
  isVotingReply ||
  isDeletingAnswer ||
  isDeletingReply ||
  isRequestingContributor ||
  isUpdatingParticipantMode;

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <View style={styles.topTitleWrap}>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>
            Discussion
          </Text>

          <Text style={[styles.topSubtitle, { color: colors.muted }]}>
            ID: {discussion.id}
          </Text>
        </View>

        {isFetching || isFetchingAnswers || actionBusy ? (
          <ActivityIndicator />
        ) : null}

        <Pressable onPress={handleShare} style={styles.iconButton}>
          <Ionicons
            name="share-social-outline"
            size={21}
            color={colors.foreground}
          />
        </Pressable>

        <Pressable style={styles.iconButton}>
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={colors.foreground}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroPillRow}>
            <StatusPill
              label={discussion.status}
              icon={
                discussion.status === "SOLVED"
                  ? "checkmark-circle"
                  : discussion.status === "LOCKED"
                    ? "lock-closed-outline"
                    : "chatbubble-ellipses-outline"
              }
              tone={statusTone}
              colors={colors}
            />

            <StatusPill
              label={discussion.community.visibility}
              icon={
                discussion.community.visibility === "PRIVATE"
                  ? "lock-closed-outline"
                  : "globe-outline"
              }
              colors={colors}
            />

            <StatusPill
              label={discussion.visibility}
              icon={
                discussion.visibility === "COMMUNITY"
                  ? "people-outline"
                  : "earth-outline"
              }
              colors={colors}
            />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {discussion.title}
          </Text>

          <View style={styles.authorRow}>
            <Avatar initials={authorInitials} colors={colors} />

            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.foreground }]}>
                {authorName}
              </Text>

              <Text style={[styles.authorMeta, { color: colors.muted }]}>
                Asked {formatDate(discussion.createdAt)} · Updated{" "}
                {formatDate(discussion.updatedAt)} · {communityName}
              </Text>
            </View>
          </View>

          <Text style={[styles.bodyText, { color: colors.foreground }]}>
            {discussion.body}
          </Text>

          <View style={styles.tagWrap}>
            <View
              style={[
                styles.tag,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.tagText, { color: colors.muted }]}>
                #{discussion.source.toLowerCase()}
              </Text>
            </View>

            <View
              style={[
                styles.tag,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.tagText, { color: colors.muted }]}>
                #{discussion.status.toLowerCase()}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricText
              icon="eye-outline"
              label="views"
              value={discussion.viewCount}
              colors={colors}
            />

            <MetricText
              icon="chatbubble-ellipses-outline"
              label="answers"
              value={discussion.answerCount}
              colors={colors}
            />

            <MetricText
              icon="share-social-outline"
              label="shares"
              value={discussion.shareCount}
              colors={colors}
            />

            <MetricText
              icon="notifications-outline"
              label="followers"
              value={discussion.followerCount}
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          <ActionButton
            label="Share"
            icon="share-social-outline"
            onPress={handleShare}
            colors={colors}
          />

          <ActionButton
            label="Follow"
            icon="notifications-outline"
            onPress={handleFollow}
            colors={colors}
          />

          <ActionButton
            label="Report"
            icon="flag-outline"
            onPress={handleReport}
            colors={colors}
            variant="danger"
          />
        </View>

        <View
          style={[
            styles.composerCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Write an answer
          </Text>
{showContributorRequest ? (
  <View
    style={{
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    }}
  >
    <Text
      style={{
        color: colors.foreground,
        fontSize: 13,
        lineHeight: 20,
        fontFamily: "Poppins_400Regular",
      }}
    >
      You may need contributor access to continue participating in this
      discussion.
    </Text>

    <Pressable
      disabled={isRequestingContributor}
      onPress={handleRequestContributor}
      style={{
        marginTop: 10,
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: "center",
        backgroundColor: isRequestingContributor
          ? colors.surfaceTertiary
          : colors.accent,
      }}
    >
      {isRequestingContributor ? (
        <ActivityIndicator size="small" color={colors.muted} />
      ) : (
        <Text
          style={{
            color: colors.accentForeground,
            fontSize: 13,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          Request contributor access
        </Text>
      )}
    </Pressable>
  </View>
) : null}
          <TextInput
            value={answerDraft}
            onChangeText={setAnswerDraft}
            multiline
            placeholder="Write your answer..."
            placeholderTextColor={colors.placeholder}
            style={{
              minHeight: 120,
              marginTop: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: colors.surfaceSecondary,
              color: colors.foreground,
              fontSize: 14,
              lineHeight: 21,
              fontFamily: "Poppins_400Regular",
              textAlignVertical: "top",
            }}
          />

          <Pressable
            disabled={isCreatingAnswer}
            onPress={handlePostAnswer}
            style={[
              styles.submitButton,
              {
                backgroundColor: isCreatingAnswer
                  ? colors.surfaceTertiary
                  : colors.accent,
                opacity: isCreatingAnswer ? 0.7 : 1,
              },
            ]}
          >
            {isCreatingAnswer ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <Text
                style={[
                  styles.submitButtonText,
                  {
                    color: colors.accentForeground,
                  },
                ]}
              >
                Post answer
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.answerSectionHeader}>
          <View style={styles.answerTitleRow}>
            <Text style={[styles.answerTitle, { color: colors.foreground }]}>
              Answers
            </Text>

            <View
              style={[
                styles.answerUnderline,
                {
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </View>

        {isLoadingAnswers ? (
          <View style={styles.emptyAnswerBlock}>
            <ActivityIndicator />
            <Text style={[styles.emptyAnswerText, { color: colors.muted }]}>
              Loading answers...
            </Text>
          </View>
        ) : answersError ? (
          <View style={styles.emptyAnswerBlock}>
            <Text style={[styles.emptyAnswerText, { color: colors.danger }]}>
              {getErrorMessage(answersError)}
            </Text>

            <Pressable
              onPress={() => refetchAnswers()}
              style={{
                marginTop: 12,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: colors.accent,
              }}
            >
              <Text
                style={{
                  color: colors.accentForeground,
                  fontSize: 12,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Reload answers
              </Text>
            </Pressable>
          </View>
        ) : answers.length === 0 ? (
          <View style={styles.emptyAnswerBlock}>
            <Text style={[styles.emptyAnswerText, { color: colors.muted }]}>
              No answers yet. Be the first to answer this discussion.
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 18,
              paddingHorizontal: 16,
            }}
          >
           {answers.map((answer) => (
 <DiscussionAnswerRow
  key={answer.id}
  comment={answer}
  colors={colors}
  viewerId={viewerId}
  permissions={permissions}
  isRepliesOpen={Boolean(openReplyIds[answer.id])}
  replyDraft={replyDrafts[answer.id] ?? ""}
  onToggleReplies={() => handleToggleReplies(answer.id)}
  onOpenReplyBox={() => handleOpenReplyBox(answer.id)}
  onChangeReply={(value) => handleChangeReply(answer.id, value)}
  onSubmitReply={() => {
    void handleSubmitReply(answer.id);
  }}
  onVoteAnswer={(vote) => handleVoteAnswer(answer.id, vote)}
  onVoteReply={(replyId, vote) =>
    handleVoteReply(answer.id, replyId, vote)
  }
  onAccept={() => {
    void handleAcceptAnswer(answer.id);
  }}
  onHighlight={() => {
    void handleHighlightAnswer(answer.id);
  }}
  onPin={() => {
    void handlePinAnswer(answer.id);
  }}
  onDelete={() => handleDeleteAnswer(answer.id)}
  onDeleteReply={(replyId) => handleDeleteReply(answer.id, replyId)}
  onReport={handleReportAnswer}
  onLimitUser={handleLimitUser}
  onRemoveUserFromDiscussion={handleRemoveUserFromDiscussion}
  onRestoreUserInDiscussion={handleRestoreUserInDiscussion}
/>
))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}