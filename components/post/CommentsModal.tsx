import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import type { CommunityPost, PostMedia } from "@/types/post";

export type FeedComment = {
  id: string;
  postId?: string;
  authorId?: string;
  parentId?: string | null;
  content: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  likeCount?: number | null;
  isLikedByMe?: boolean | null;
  author?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
    image?: string | null;
  } | null;
  replies?: FeedComment[];
  replyCount?: number;
};

type Colors = ReturnType<typeof useAppTheme>["colors"];

type CommentPostModalProps = {
  visible: boolean;
  post: CommunityPost | null;
  comments: FeedComment[];
  isLoading: boolean;
  isCreating: boolean;
  inputValue: string;
  onChangeInput: (value: string) => void;
  onClose: () => void;
  onSubmit: (replyingTo?: FeedComment | null) => void;
  onPressMedia?: (media: PostMedia[], startIndex: number) => void;
  onPressPostLike?: (post: CommunityPost) => void;
  onPressPostShare?: (post: CommunityPost) => void;
  onRefreshComments?: () => void;
  colors: Colors;
};

const MIN_INPUT_HEIGHT = 42;
const MAX_INPUT_HEIGHT = 126;

function normalizeFileUrl(value?: string | null) {
  if (!value) return null;

  if (/^(https?:|file:|content:|data:|blob:)/i.test(value)) {
    return value;
  }

  const rawBaseUrl =
    process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

  if (!rawBaseUrl) return value;

  const origin = rawBaseUrl
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/$/, "");

  if (!origin) return value;

  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

function getCommentAuthorName(comment: FeedComment) {
  const author = comment.author;

  if (!author) return "Unknown user";

  const fullName = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim();

  if (fullName) return fullName;
  if (author.name?.trim()) return author.name.trim();
  if (author.businessName?.trim()) return author.businessName.trim();

  return "Unknown user";
}

function getAuthorImage(comment: FeedComment) {
  return normalizeFileUrl(comment.author?.image ?? null);
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatCommentTime(dateValue?: string) {
  if (!dateValue) return "now";

  const date = new Date(dateValue);
  const time = date.getTime();

  if (Number.isNaN(time)) return "now";

  const diffSeconds = Math.max(1, Math.floor((Date.now() - time) / 1000));

  if (diffSeconds < 60) return "now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return `${Math.floor(diffDays / 7)}w`;
}

function formatCount(value?: number | null) {
  const count = value ?? 0;

  if (count <= 0) return "";
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}K`;
  return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
}

const CommentAvatar = memo(function CommentAvatar({
  comment,
  size = 34,
  styles,
}: {
  comment: FeedComment;
  size?: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const name = getCommentAuthorName(comment);
  const imageUrl = getAuthorImage(comment);

  return (
    <View style={[styles.avatar, { width: size, height: size }]}> 
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.avatarImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Text style={styles.avatarInitial}>{getInitial(name)}</Text>
      )}
    </View>
  );
});

const ReplyItem = memo(function ReplyItem({
  item,
  parent,
  styles,
  onReply,
}: {
  item: FeedComment;
  parent: FeedComment;
  styles: ReturnType<typeof createStyles>;
  onReply: (comment: FeedComment) => void;
}) {
  const replyAuthorName = getCommentAuthorName(item);
  const likeLabel = formatCount(item.likeCount);

  return (
    <View style={styles.replyRow}>
      <CommentAvatar comment={item} size={26} styles={styles} />

      <View style={styles.replyBody}>
        <View style={styles.replyBubble}>
          <Text style={styles.replyAuthor}>{replyAuthorName}</Text>
          <Text style={styles.replyText}>{item.content}</Text>
        </View>

        <View style={styles.replyActions}>
          <Text style={styles.replyActionText}>Like</Text>

          <Pressable hitSlop={8} onPress={() => onReply(item)}>
            <Text style={styles.replyActionText}>Reply</Text>
          </Pressable>

          <Text style={styles.replyTime}>{formatCommentTime(item.createdAt)}</Text>

          {likeLabel ? <Text style={styles.replyReactionCount}>{likeLabel} ♥</Text> : null}
        </View>
      </View>
    </View>
  );
});

const CommentItem = memo(function CommentItem({
  item,
  styles,
  onReply,
  isRepliesExpanded,
  onViewReplies,
}: {
  item: FeedComment;
  styles: ReturnType<typeof createStyles>;
  onReply: (comment: FeedComment) => void;
  isRepliesExpanded: boolean;
  onViewReplies: (comment: FeedComment) => void;
}) {
  const authorName = getCommentAuthorName(item);
  const replies = item.replies ?? [];
  const totalReplyCount = Math.max(item.replyCount ?? 0, replies.length);
  const visibleReplies = isRepliesExpanded ? replies : [];
  const likeLabel = formatCount(item.likeCount);
  const missingReplyCount = Math.max(0, totalReplyCount - replies.length);

  return (
    <View style={styles.commentBlock}>
      <View style={styles.commentRow}>
        <CommentAvatar comment={item} styles={styles} />

        <View style={styles.commentBody}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthor}>{authorName}</Text>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>

          <View style={styles.commentActions}>
            <Text style={styles.commentActionText}>Like</Text>

            <Pressable hitSlop={8} onPress={() => onReply(item)}>
              <Text style={styles.commentActionText}>Reply</Text>
            </Pressable>

            <Text style={styles.commentTime}>{formatCommentTime(item.createdAt)}</Text>

            {likeLabel ? <Text style={styles.commentReactionCount}>{likeLabel} ♥</Text> : null}
          </View>
        </View>
      </View>

      {totalReplyCount > 0 ? (
        <View style={styles.replyContainer}>
          {isRepliesExpanded && visibleReplies.length > 0 ? (
            <View style={styles.replyThreadLine} />
          ) : null}

          {!isRepliesExpanded ? (
            <Pressable
              hitSlop={8}
              onPress={() => onViewReplies(item)}
              style={styles.viewRepliesButton}
            >
              <Text style={styles.viewMoreReplies}>
                View {totalReplyCount} {totalReplyCount === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          ) : null}

          {visibleReplies.map((reply) => (
            <ReplyItem
              key={reply.id}
              item={reply}
              parent={item}
              styles={styles}
              onReply={onReply}
            />
          ))}

          {isRepliesExpanded && missingReplyCount > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={() => onViewReplies(item)}
              style={styles.viewRepliesButton}
            >
              <Text style={styles.viewMoreReplies}>
                Refresh {missingReplyCount} more {missingReplyCount === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          ) : null}

          {isRepliesExpanded && replies.length > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={() => onViewReplies(item)}
              style={styles.viewRepliesButton}
            >
              <Text style={styles.hideReplies}>Hide replies</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

function CommentPostModal({
  visible,
  post,
  comments,
  isLoading,
  isCreating,
  inputValue,
  onChangeInput,
  onClose,
  onSubmit,
  onPressMedia,
  onPressPostLike,
  onPressPostShare,
  onRefreshComments,
  colors,
}: CommentPostModalProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<FeedComment>>(null);
  const { height: windowHeight } = useWindowDimensions();

  const [replyingTo, setReplyingTo] = useState<FeedComment | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [composerHeight, setComposerHeight] = useState(76);
  const [textInputHeight, setTextInputHeight] = useState(MIN_INPUT_HEIGHT);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      setIsInputFocused(false);
      setTextInputHeight(MIN_INPUT_HEIGHT);
      setExpandedReplyIds(new Set());
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsInputFocused(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!inputValue.trim()) {
      setTextInputHeight(MIN_INPUT_HEIGHT);
    }
  }, [inputValue]);

  const totalComments = post?.commentCount ?? comments.length;

  const fallbackKeyboardHeight =
    Platform.OS === "android" && isInputFocused
      ? Math.round(windowHeight * 0.42)
      : 0;

  const keyboardLift =
    Platform.OS === "android"
      ? Math.max(keyboardHeight, fallbackKeyboardHeight)
      : 0;

  const androidExtraGap = Platform.OS === "android" && keyboardLift > 0 ? 14 : 0;

  const sheetHeight =
    Platform.OS === "android" && keyboardLift > 0
      ? Math.max(320, windowHeight - keyboardLift - androidExtraGap)
      : windowHeight * 0.94;

  const sheetBottomGap =
    Platform.OS === "android" && keyboardLift > 0
      ? keyboardLift + androidExtraGap
      : 0;

  const handleReply = (comment: FeedComment) => {
    setReplyingTo(comment);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleViewReplies = (comment: FeedComment) => {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);

      if (next.has(comment.id)) {
        next.delete(comment.id);
      } else {
        next.add(comment.id);
      }

      return next;
    });

    // Useful when the parent has replyCount but the API did not include replies yet.
    onRefreshComments?.();
  };

  const handleSubmitPress = () => {
    if (!inputValue.trim() || isCreating) return;

    const selectedReply = replyingTo;

    if (selectedReply?.id) {
      setExpandedReplyIds((prev) => {
        const next = new Set(prev);
        next.add(selectedReply.id);
        return next;
      });
    }

    setReplyingTo(null);
    setTextInputHeight(MIN_INPUT_HEIGHT);
    onSubmit(selectedReply);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  const handleInputContentSizeChange = (event: {
    nativeEvent: { contentSize: { height: number } };
  }) => {
    const contentHeight = event.nativeEvent.contentSize.height;
    const nextHeight = Math.min(
      MAX_INPUT_HEIGHT,
      Math.max(MIN_INPUT_HEIGHT, Math.ceil(contentHeight) + 12),
    );

    setTextInputHeight(nextHeight);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setKeyboardHeight(0);
    setIsInputFocused(false);
    setReplyingTo(null);
    setExpandedReplyIds(new Set());
    setTextInputHeight(MIN_INPUT_HEIGHT);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.sheet,
              {
                height: sheetHeight,
                marginBottom: sheetBottomGap,
              },
            ]}
          >
            <View style={styles.dragHandleWrapper}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.header}>
              <Pressable onPress={handleClose} style={styles.headerIconButton}>
                <Ionicons name="chevron-down" size={24} color="#050505" />
              </Pressable>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Post</Text>
                <Text style={styles.headerSubtitle}>
                  {totalComments > 0
                    ? `${totalComments} ${totalComments === 1 ? "comment" : "comments"}`
                    : "Be the first to comment"}
                </Text>
              </View>

              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#050505" />
              </Pressable>
            </View>

            <FlatList
              ref={listRef}
              data={isLoading ? [] : comments}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom: composerHeight + 18,
                },
              ]}
              ListHeaderComponent={
                <View style={styles.postHeaderWrap}>
                  {post ? (
                    <CommunityPostCard
                      post={post}
                      disableMediaPlayback={false}
                      onPressLike={onPressPostLike}
                      onPressComment={() => inputRef.current?.focus()}
                      onPressShare={onPressPostShare}
                      onPressMedia={onPressMedia}
                    />
                  ) : null}

                  <View style={styles.commentSectionHeader}>
                    <Text style={styles.commentSectionTitle}>Comments</Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={34}
                      color="#8A8D91"
                    />

                    <Text style={styles.emptyTitle}>No comments yet</Text>

                    <Text style={styles.emptyText}>Be the first to write a comment.</Text>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <CommentItem
                  item={item}
                  styles={styles}
                  onReply={handleReply}
                  isRepliesExpanded={expandedReplyIds.has(item.id)}
                  onViewReplies={handleViewReplies}
                />
              )}
            />

            <View
              style={styles.inputOuter}
              onLayout={(event) => {
                setComposerHeight(event.nativeEvent.layout.height);
              }}
            >
              {replyingTo ? (
                <View style={styles.replyingBar}>
                  <Text style={styles.replyingText} numberOfLines={1}>
                    Replying to {getCommentAuthorName(replyingTo)}
                  </Text>

                  <Pressable hitSlop={8} onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close" size={16} color="#65676B" />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.inputBar}>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      height: textInputHeight,
                    },
                  ]}
                >
                  <TextInput
                    ref={inputRef}
                    value={inputValue}
                    onChangeText={onChangeInput}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onContentSizeChange={handleInputContentSizeChange}
                    placeholder={
                      replyingTo
                        ? `Reply to ${getCommentAuthorName(replyingTo)}...`
                        : "Write a comment..."
                    }
                    placeholderTextColor="#65676B"
                    editable={!isCreating}
                    multiline
                    scrollEnabled={textInputHeight >= MAX_INPUT_HEIGHT - 2}
                    textAlignVertical="top"
                    blurOnSubmit={false}
                    returnKeyType="default"
                    style={[
                      styles.input,
                      {
                        height: textInputHeight,
                      },
                    ]}
                  />
                </View>

                <Pressable
                  onPress={handleSubmitPress}
                  disabled={!inputValue.trim() || isCreating}
                  style={[
                    styles.sendButton,
                    !inputValue.trim() && styles.sendButtonDisabled,
                  ]}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={19}
                      color={inputValue.trim() ? "#FFFFFF" : "#BCC0C4"}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default memo(CommentPostModal);

function createStyles(colors: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    keyboardContainer: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: "#FFFFFF",
      overflow: "hidden",
    },
    dragHandleWrapper: {
      alignItems: "center",
      paddingTop: 8,
      paddingBottom: 4,
    },
    dragHandle: {
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: "#CED0D4",
    },
    header: {
      height: 58,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#E4E6EB",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#FFFFFF",
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      color: "#050505",
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
    },
    headerSubtitle: {
      marginTop: 1,
      color: "#65676B",
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#E4E6EB",
    },
    list: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    listContent: {
      paddingBottom: 110,
    },
    postHeaderWrap: {
      backgroundColor: "#FFFFFF",
    },
    commentSectionHeader: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#E4E6EB",
    },
    commentSectionTitle: {
      color: "#050505",
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },
    loadingContainer: {
      paddingVertical: 30,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      marginTop: 10,
      color: "#050505",
      fontSize: 15,
      fontFamily: "Poppins_700Bold",
    },
    emptyText: {
      marginTop: 4,
      color: "#65676B",
      textAlign: "center",
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
    },
    commentBlock: {
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    commentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    avatar: {
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: "#E4E6EB",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarInitial: {
      color: "#050505",
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },
    commentBody: {
      flex: 1,
    },
    commentBubble: {
      alignSelf: "flex-start",
      maxWidth: "96%",
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: "#F0F2F5",
    },
    commentAuthor: {
      color: "#050505",
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },
    commentText: {
      marginTop: 2,
      color: "#050505",
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
    },
    commentActions: {
      marginTop: 4,
      marginLeft: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    commentActionText: {
      color: "#65676B",
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },
    commentTime: {
      color: "#65676B",
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },
    commentReactionCount: {
      marginLeft: "auto",
      color: "#65676B",
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },
    replyContainer: {
      marginLeft: 45,
      marginTop: 8,
      gap: 8,
      position: "relative",
    },
    replyThreadLine: {
      position: "absolute",
      left: -22,
      top: -6,
      bottom: 8,
      width: 2,
      borderRadius: 999,
      backgroundColor: "#DADDE1",
    },
    replyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 7,
    },
    replyBody: {
      flex: 1,
    },
    replyBubble: {
      alignSelf: "flex-start",
      maxWidth: "96%",
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: "#F0F2F5",
    },
    replyAuthor: {
      color: "#050505",
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },
    replyText: {
      marginTop: 1,
      color: "#050505",
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },
    replyActions: {
      marginTop: 3,
      marginLeft: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    replyActionText: {
      color: "#65676B",
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },
    replyTime: {
      color: "#65676B",
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },
    replyReactionCount: {
      marginLeft: "auto",
      color: "#65676B",
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },
    viewRepliesButton: {
      marginLeft: 34,
      alignSelf: "flex-start",
      paddingVertical: 2,
    },
    viewMoreReplies: {
      color: "#65676B",
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },
    hideReplies: {
      color: "#65676B",
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },
    inputOuter: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#E4E6EB",
      backgroundColor: "#FFFFFF",
      paddingBottom: Platform.OS === "ios" ? 22 : 18,
    },
    replyingBar: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    replyingText: {
      flex: 1,
      color: "#65676B",
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },
    inputBar: {
      paddingHorizontal: 10,
      paddingTop: 8,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    inputWrapper: {
      flex: 1,
      minHeight: MIN_INPUT_HEIGHT,
      maxHeight: MAX_INPUT_HEIGHT,
      borderRadius: 22,
      backgroundColor: "#F0F2F5",
      justifyContent: "center",
      overflow: "hidden",
    },
    input: {
      minHeight: MIN_INPUT_HEIGHT,
      maxHeight: MAX_INPUT_HEIGHT,
      paddingHorizontal: 14,
      paddingTop: Platform.OS === "ios" ? 11 : 9,
      paddingBottom: Platform.OS === "ios" ? 11 : 9,
      color: "#050505",
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      includeFontPadding: false,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      marginBottom: 0,
    },
    sendButtonDisabled: {
      backgroundColor: "#F0F2F5",
    },
  });
}