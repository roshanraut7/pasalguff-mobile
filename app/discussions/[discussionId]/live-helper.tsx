import React from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppColors } from "@/constants/theme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityContributorRequest } from "@/store/api/communityDiscussionApi";
import type {
  CommunityDiscussionLiveMessage,
  DiscussionLiveStatus,
} from "@/store/api/communityDiscussionLiveApi";

import { styles } from "@/constants/styles/livechat.styles";

export type BasicAuthor = {
  id?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  businessName?: string | null;
};

export type LiveTab = "chat" | "members";

export type LiveMember = {
  id: string;
  name: string;
  image?: string | null;
  subtitle?: string;
};

export type JoinLeaveNotice = {
  id: string;
  type: "joined" | "left";
  text: string;
  createdAt: string;
  member: LiveMember;
};

export type ChatListItem =
  | {
      type: "message";
      id: string;
      createdAt: string;
      message: CommunityDiscussionLiveMessage;
    }
  | {
      type: "notice";
      id: string;
      createdAt: string;
      notice: JoinLeaveNotice;
    };

export type ActionTarget = {
  userId: string;
  name: string;
  image?: string | null;
  messageId?: string;
  isOwnMessage?: boolean;
};

export function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getAuthorName(author?: BasicAuthor | null) {
  if (!author) return "Unknown user";

  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown user";
}

export function getInitials(name?: string | null) {
  const cleanName = name?.trim();

  if (!cleanName) return "U";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMessageTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data
  ) {
    const message = error.data.message;

    if (Array.isArray(message)) return message.join("\n");
    if (typeof message === "string") return message;
  }

  return "Please try again.";
}

export function makeClientMessageId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getLiveStatusMeta(status?: DiscussionLiveStatus | null) {
  if (status === "LIVE") {
    return {
      label: "Live now",
      icon: "radio" as const,
      tone: "danger" as const,
    };
  }

  if (status === "SCHEDULED") {
    return {
      label: "Scheduled",
      icon: "calendar-outline" as const,
      tone: "warning" as const,
    };
  }

  if (status === "ENDED") {
    return {
      label: "Ended",
      icon: "checkmark-circle-outline" as const,
      tone: "success" as const,
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Cancelled",
      icon: "close-circle-outline" as const,
      tone: "danger" as const,
    };
  }

  return {
    label: "Not active",
    icon: "chatbubbles-outline" as const,
    tone: "default" as const,
  };
}

export function getToneColor(
  tone: "default" | "success" | "warning" | "danger",
  colors: AppColors,
) {
  if (tone === "success") return colors.success;
  if (tone === "warning") return colors.warning;
  if (tone === "danger") return colors.danger;

  return colors.accent;
}

export function getRequestDiscussionId(request: CommunityContributorRequest) {
  const safeRequest = request as CommunityContributorRequest & {
    discussionId?: string | null;
    requestedFromDiscussion?: { id?: string | null } | null;
  };

  return (
    safeRequest.requestedFromDiscussionId ??
    safeRequest.requestedFromDiscussion?.id ??
    safeRequest.discussionId ??
    null
  );
}

export function Avatar({
  name,
  image,
  colors,
  size = 36,
}: {
  name: string;
  image?: string | null;
  colors: AppColors;
  size?: number;
}) {
  const uri = image ? toAbsoluteFileUrl(image) ?? undefined : undefined;

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
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <Text
          style={[
            styles.avatarText,
            {
              color: colors.segmentForeground,
              fontSize: Math.max(10, size * 0.32),
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

export function RequestCard({
  request,
  colors,
  disabled,
  onAccept,
  onReject,
}: {
  request: CommunityContributorRequest;
  colors: AppColors;
  disabled: boolean;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  const userName = getAuthorName(request.user);
  const userImage = request.user?.image ?? null;

  return (
    <View
      style={[
        styles.requestCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.requestUserRow}>
        <Avatar name={userName} image={userImage} colors={colors} size={34} />

        <View style={styles.requestTextWrap}>
          <Text
            numberOfLines={1}
            style={[styles.requestName, { color: colors.foreground }]}
          >
            {userName}
          </Text>

          <Text
            numberOfLines={2}
            style={[styles.requestMessage, { color: colors.muted }]}
          >
            {request.message || "Wants contributor access."}
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <Pressable
          disabled={disabled}
          onPress={() => onAccept(request.id)}
          style={[
            styles.acceptButton,
            {
              backgroundColor: colors.success,
              opacity: disabled ? 0.65 : 1,
            },
          ]}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => onReject(request.id)}
          style={[
            styles.rejectButton,
            {
              borderColor: colors.danger,
              opacity: disabled ? 0.65 : 1,
            },
          ]}
        >
          <Text style={[styles.rejectButtonText, { color: colors.danger }]}>
            Reject
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function JoinLeaveCard({
  notice,
  colors,
}: {
  notice: JoinLeaveNotice;
  colors: AppColors;
}) {
  const isJoined = notice.type === "joined";

  return (
    <View
      style={[
        styles.messageCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.messageTopRow}>
        <View
          style={[
            styles.avatar,
            {
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name={isJoined ? "person-add-outline" : "person-remove-outline"}
            size={17}
            color={isJoined ? colors.success : colors.warning}
          />
        </View>

        <View style={styles.messageMain}>
          <View style={styles.messageHeaderRow}>
            <Text
              numberOfLines={1}
              style={[styles.messageAuthorName, { color: colors.foreground }]}
            >
              {notice.text}
            </Text>

            <Text style={[styles.messageTime, { color: colors.muted }]}>
              {formatMessageTime(notice.createdAt)}
            </Text>
          </View>

          <Text style={[styles.messageBody, { color: colors.muted }]}>
            {isJoined
              ? "This member joined the live discussion."
              : "This member left the live discussion."}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MessageCard({
  message,
  colors,
  canOpenActions,
  onOpenActions,
}: {
  message: CommunityDiscussionLiveMessage;
  colors: AppColors;
  canOpenActions: boolean;
  onOpenActions: (message: CommunityDiscussionLiveMessage) => void;
}) {
  const author = message.author as BasicAuthor | undefined;
  const authorName = getAuthorName(author);
  const authorImage = author?.image ?? null;

  return (
    <Pressable
      onLongPress={() => {
        if (canOpenActions) {
          onOpenActions(message);
        }
      }}
      style={[
        styles.messageCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.messageTopRow}>
        <Avatar name={authorName} image={authorImage} colors={colors} size={36} />

        <View style={styles.messageMain}>
          <View style={styles.messageHeaderRow}>
            <Text
              numberOfLines={1}
              style={[styles.messageAuthorName, { color: colors.foreground }]}
            >
              {authorName}
            </Text>

            <Text style={[styles.messageTime, { color: colors.muted }]}>
              {formatMessageTime(message.createdAt)}
            </Text>

            {canOpenActions ? (
              <Pressable
                onPress={() => onOpenActions(message)}
                hitSlop={10}
                style={styles.messageMenuButton}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.messageBody, { color: colors.foreground }]}>
            {message.body}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function MemberRow({
  member,
  colors,
  isSelf,
  canManage,
  onOpenActions,
}: {
  member: LiveMember;
  colors: AppColors;
  isSelf: boolean;
  canManage: boolean;
  onOpenActions: (member: LiveMember) => void;
}) {
  return (
    <View
      style={[
        styles.memberRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Avatar name={member.name} image={member.image} colors={colors} size={38} />

      <View style={styles.memberInfo}>
        <Text
          numberOfLines={1}
          style={[styles.memberName, { color: colors.foreground }]}
        >
          {member.name}
        </Text>

        <Text
          numberOfLines={1}
          style={[styles.memberSubtitle, { color: colors.muted }]}
        >
          {isSelf ? "You" : member.subtitle || "Watching live"}
        </Text>
      </View>

      {canManage && !isSelf ? (
        <Pressable
          onPress={() => onOpenActions(member)}
          hitSlop={10}
          style={styles.memberMenuButton}
        >
          <Ionicons
            name="ellipsis-horizontal-circle-outline"
            size={25}
            color={colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ActionModal({
  visible,
  target,
  colors,
  canDeleteMessage,
  canManageUser,
  isWorking,
  onClose,
  onDeleteMessage,
  onLimitMessages,
  onAllowAgain,
  onRemoveFromLive,
}: {
  visible: boolean;
  target: ActionTarget | null;
  colors: AppColors;
  canDeleteMessage: boolean;
  canManageUser: boolean;
  isWorking: boolean;
  onClose: () => void;
  onDeleteMessage: () => void;
  onLimitMessages: () => void;
  onAllowAgain: () => void;
  onRemoveFromLive: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.actionModal,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text
                numberOfLines={1}
                style={[styles.modalTitle, { color: colors.foreground }]}
              >
                {target?.name || "Member actions"}
              </Text>

              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                Choose what you want to do with this member.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.modalCloseButton,
                {
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {canDeleteMessage ? (
            <Pressable
              disabled={isWorking}
              onPress={onDeleteMessage}
              style={[
                styles.modalActionButton,
                {
                  borderColor: colors.border,
                  opacity: isWorking ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
              <Text style={[styles.modalActionText, { color: colors.danger }]}>
                Delete this message
              </Text>
            </Pressable>
          ) : null}

          {canManageUser ? (
            <>
              <Pressable
                disabled={isWorking}
                onPress={onLimitMessages}
                style={[
                  styles.modalActionButton,
                  {
                    borderColor: colors.border,
                    opacity: isWorking ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={19}
                  color={colors.warning}
                />
                <Text
                  style={[styles.modalActionText, { color: colors.foreground }]}
                >
                  Limit messages
                </Text>
              </Pressable>

              <Pressable
                disabled={isWorking}
                onPress={onAllowAgain}
                style={[
                  styles.modalActionButton,
                  {
                    borderColor: colors.border,
                    opacity: isWorking ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color={colors.success}
                />
                <Text
                  style={[styles.modalActionText, { color: colors.foreground }]}
                >
                  Allow again
                </Text>
              </Pressable>

              <Pressable
                disabled={isWorking}
                onPress={onRemoveFromLive}
                style={[
                  styles.modalActionButton,
                  {
                    borderColor: colors.border,
                    opacity: isWorking ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons name="ban-outline" size={19} color={colors.danger} />
                <Text style={[styles.modalActionText, { color: colors.danger }]}>
                  Remove from live discussion
                </Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}