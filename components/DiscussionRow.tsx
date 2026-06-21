import React from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppColors } from "@/constants/theme";
import type {
  DiscussionComment,
  DiscussionPermissions,
  
} from "@/types/discussion";


type DiscussionAnswerRowProps = {
  comment: DiscussionComment;
  colors: AppColors;
  viewerId: string;
  permissions: DiscussionPermissions;

  isRepliesOpen: boolean;
  replyDraft: string;

  onToggleReplies: () => void;
  onOpenReplyBox: () => void;
  onChangeReply: (value: string) => void;
  onSubmitReply: () => void;

  onVoteAnswer: (vote: "UP" | "DOWN") => void;
  onVoteReply: (replyId: string, vote: "UP" | "DOWN") => void;

  onAccept: () => void;
  onHighlight: () => void;
  onPin: () => void;
  onDelete: () => void;
  onDeleteReply: (replyId: string) => void;
  onReport: () => void;

  // Add these
  onLimitUser?: (targetUserId: string) => void;
  onRemoveUserFromDiscussion?: (targetUserId: string) => void;
  onRestoreUserInDiscussion?: (targetUserId: string) => void;
};



function VoteButton({
  type,
  active,
  colors,
  onPress,
}: {
  type: "like" | "dislike";
  active: boolean;
  colors: AppColors;
  onPress: () => void;
}) {
  const isLike = type === "like";

  const iconName = active
    ? isLike
      ? "thumbs-up"
      : "thumbs-down"
    : isLike
      ? "thumbs-up-outline"
      : "thumbs-down-outline";

  const activeColor = isLike ? colors.success : colors.danger;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active
          ? colors.surfaceTertiary
          : colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: active ? activeColor : colors.border,
      }}
    >
      <Ionicons
        name={iconName}
        size={15}
        color={active ? activeColor : colors.muted}
      />

      <Text
        style={{
          fontSize: 12,
          fontFamily: "Poppins_500Medium",
          color: active ? activeColor : colors.muted,
        }}
      >
        {isLike ? "Like" : "Dislike"}
      </Text>
    </Pressable>
  );
}

function SmallAction({
  label,
  icon,
  colors,
  onPress,
  danger = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: AppColors;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 6,
      }}
    >
      <Ionicons
        name={icon}
        size={14}
        color={danger ? colors.danger : colors.muted}
      />

      <Text
        style={{
          fontSize: 12,
          fontFamily: "Poppins_500Medium",
          color: danger ? colors.danger : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}


export function DiscussionAnswerRow({
  comment,
  colors,
  viewerId,
  permissions,

  isRepliesOpen,
  replyDraft,

  onToggleReplies,
  onOpenReplyBox,
  onChangeReply,
  onSubmitReply,

  onVoteAnswer,
  onVoteReply,

  onAccept,
  onHighlight,
  onPin,
  onDelete,
  onDeleteReply,
  onReport,

  onLimitUser,
  onRemoveUserFromDiscussion,
  onRestoreUserInDiscussion,
}: DiscussionAnswerRowProps) {

  const isOwnAnswer = comment.author.id === viewerId;
  const replyCount = comment.replies.length;

  const canDeleteAnswer =
    isOwnAnswer ||
    permissions.canDeleteAnyComment ||
    permissions.isAuthor ||
    permissions.isCommunityModerator;

    const canManageAnswerAuthor =
  !isOwnAnswer &&
  (permissions.canManageParticipants ??
    (permissions.canDeleteAnyComment ||
      permissions.isAuthor ||
      permissions.isCommunityModerator));

  return (
    <View
      style={{
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.surfaceTertiary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.segmentForeground,
              fontSize: 13,
              fontFamily: "Poppins_600SemiBold",
            }}
          >
            {comment.author.avatarInitials}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 14,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              {comment.author.name}
            </Text>

            {comment.author.roleLabel ? (
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 11,
                  fontFamily: "Poppins_500Medium",
                }}
              >
                {comment.author.roleLabel}
              </Text>
            ) : null}

            {isOwnAnswer ? (
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  fontFamily: "Poppins_400Regular",
                }}
              >
                Author
              </Text>
            ) : null}
          </View>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily: "Poppins_400Regular",
              marginTop: 2,
            }}
          >
            {comment.author.handle} · {comment.createdAt}
          </Text>

          {comment.isAcceptedAnswer ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 10,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.success}
              />

              <Text
                style={{
                  color: colors.success,
                  fontSize: 12,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Accepted answer
              </Text>
            </View>
          ) : null}

          {comment.isModeratorPinned ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 8,
              }}
            >
              <Ionicons name="pin" size={15} color={colors.accent} />

              <Text
                style={{
                  color: colors.accent,
                  fontSize: 12,
                  fontFamily: "Poppins_500Medium",
                }}
              >
                Moderator pinned
              </Text>
            </View>
          ) : null}

          {comment.isAuthorHighlighted ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 8,
              }}
            >
              <Ionicons name="star" size={15} color={colors.warning} />

              <Text
                style={{
                  color: colors.warning,
                  fontSize: 12,
                  fontFamily: "Poppins_500Medium",
                }}
              >
                Highlighted by author
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              color: colors.foreground,
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_400Regular",
              marginTop: 12,
            }}
          >
            {comment.body}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
            }}
          >
            <VoteButton
              type="like"
              active={comment.viewerVote === "UP"}
              colors={colors}
              onPress={() => onVoteAnswer("UP")}
            />

            <VoteButton
              type="dislike"
              active={comment.viewerVote === "DOWN"}
              colors={colors}
              onPress={() => onVoteAnswer("DOWN")}
            />

            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontFamily: "Poppins_500Medium",
              }}
            >
              {comment.voteScore} score
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 12,
            }}
          >
            <SmallAction
              label={
                replyCount > 0
                  ? `View replies (${replyCount})`
                  : "View replies"
              }
              icon="chatbubble-outline"
              colors={colors}
              onPress={onToggleReplies}
            />

            <SmallAction
              label="Add reply"
              icon="create-outline"
              colors={colors}
              onPress={onOpenReplyBox}
            />

            <SmallAction
              label="Report"
              icon="flag-outline"
              colors={colors}
              onPress={onReport}
              danger
            />
          </View>

          {permissions.canMarkAcceptedAnswer && !comment.isAcceptedAnswer ? (
            <View style={{ marginTop: 8 }}>
              <SmallAction
                label="Mark accepted"
                icon="checkmark-circle-outline"
                colors={colors}
                onPress={onAccept}
              />
            </View>
          ) : null}

          {permissions.canHighlightAsAuthor ? (
            <View style={{ marginTop: 4 }}>
              <SmallAction
                label={
                  comment.isAuthorHighlighted
                    ? "Remove highlight"
                    : "Highlight as author"
                }
                icon="star-outline"
                colors={colors}
                onPress={onHighlight}
              />
            </View>
          ) : null}

          {permissions.canPinModeratorNote ? (
            <View style={{ marginTop: 4 }}>
              <SmallAction
                label={comment.isModeratorPinned ? "Unpin" : "Pin"}
                icon="pin-outline"
                colors={colors}
                onPress={onPin}
              />
            </View>
          ) : null}

          {canDeleteAnswer ? (
            <View style={{ marginTop: 4 }}>
              <SmallAction
                label="Delete answer"
                icon="trash-outline"
                colors={colors}
                onPress={onDelete}
                danger
              />
            </View>
          ) : null}

          {isRepliesOpen ? (
            <View
              style={{
                marginTop: 16,
                paddingLeft: 14,
                borderLeftWidth: 1,
                borderLeftColor: colors.separator,
              }}
            >
              {comment.replies.map((reply) => {
                const isOwnReply = reply.author.id === viewerId;

                const canDeleteReply =
                  isOwnReply ||
                  isOwnAnswer ||
                  permissions.canDeleteAnyComment ||
                  permissions.isAuthor ||
                  permissions.isCommunityModerator;

                return (
                  <View
                    key={reply.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.separator,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: colors.surfaceTertiary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.segmentForeground,
                            fontSize: 11,
                            fontFamily: "Poppins_600SemiBold",
                          }}
                        >
                          {reply.author.avatarInitials}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 13,
                            fontFamily: "Poppins_600SemiBold",
                          }}
                        >
                          {reply.author.name}
                        </Text>

                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 11,
                            fontFamily: "Poppins_400Regular",
                            marginTop: 1,
                          }}
                        >
                          {reply.createdAt}
                        </Text>

                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 13,
                            lineHeight: 20,
                            fontFamily: "Poppins_400Regular",
                            marginTop: 8,
                          }}
                        >
                          {reply.body}
                        </Text>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          <VoteButton
                            type="like"
                            active={reply.viewerVote === "UP"}
                            colors={colors}
                            onPress={() => onVoteReply(reply.id, "UP")}
                          />

                          <VoteButton
                            type="dislike"
                            active={reply.viewerVote === "DOWN"}
                            colors={colors}
                            onPress={() => onVoteReply(reply.id, "DOWN")}
                          />

                          <Text
                            style={{
                              color: colors.muted,
                              fontSize: 12,
                              fontFamily: "Poppins_500Medium",
                            }}
                          >
                            {reply.voteScore} score
                          </Text>
                        </View>

                        {canDeleteReply ? (
                          <View style={{ marginTop: 8 }}>
                            <SmallAction
                              label="Delete reply"
                              icon="trash-outline"
                              colors={colors}
                              onPress={() => onDeleteReply(reply.id)}
                              danger
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}

              <View style={{ marginTop: 14 }}>
                <TextInput
                  value={replyDraft}
                  onChangeText={onChangeReply}
                  multiline
                  placeholder="Write a reply..."
                  placeholderTextColor={colors.placeholder}
                  style={{
                    minHeight: 90,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.foreground,
                    fontSize: 13,
                    fontFamily: "Poppins_400Regular",
                    textAlignVertical: "top",
                  }}
                />

                <Pressable
                  onPress={onSubmitReply}
                  style={{
                    marginTop: 10,
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                  }}
                >
                  <Ionicons
                    name="send"
                    size={14}
                    color={colors.accentForeground}
                  />

                  <Text
                    style={{
                      color: colors.accentForeground,
                      fontSize: 12,
                      fontFamily: "Poppins_600SemiBold",
                    }}
                  >
                    Post reply
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}