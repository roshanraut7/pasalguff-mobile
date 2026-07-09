import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { FeedComment } from "@/utils/post/comment";
import { useAppTheme } from "@/hooks/useAppTheme";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import type { CommunityPost, PostMedia } from "@/types/post";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Colors = ReturnType<typeof useAppTheme>["colors"];

type CommentPostModalProps = {
  visible: boolean;
   showCommunityHeader?: boolean;
  ownedCommunityIds?: Set<string>;
  post: CommunityPost | null;
  comments: FeedComment[];
  isLoading: boolean;
  isCreating: boolean;

  /**
   * ------------------------------------------------------------
   * PERFORMANCE NOTE (why inputValue/onChangeInput usage changed):
   *
   * Previously this modal was a fully "controlled" text input —
   * every keystroke called onChangeInput(value), which updated
   * state living in the parent screen (HomeScreen). That caused
   * the ENTIRE HomeScreen (post list, tabs, header animation) to
   * re-render on every single character typed -> visible jitter.
   *
   * Now the modal keeps its own local `localInput` state for
   * typing. `inputValue`/`onChangeInput` are only used to prime
   * the field when it's first opened (or reset) — not on every
   * keystroke. The final typed text is handed back to the parent
   * only once, via `onSubmit(content, replyingTo)`, when the user
   * actually sends the comment/reply.
   * ------------------------------------------------------------
   */
  inputValue: string;
  onChangeInput: (value: string) => void;

  onClose: () => void;
  onSubmit: (content: string, replyingTo?: FeedComment | null) => void;
  onPressMedia?: (media: PostMedia[], startIndex: number) => void;
  onPressPostLike?: (post: CommunityPost) => void;
  onPressPostShare?: (post: CommunityPost) => void;
  onRefreshComments?: () => void;
  onPressCommentLike?: (comment: FeedComment) => void;
  canWriteComment?: boolean;
  onRequestFollow?: () => void;
  colors: Colors;
};

const FIXED_INPUT_HEIGHT = 42;

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  return toAbsoluteFileUrl(comment.author?.image ?? null);
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

function isCommentLiked(comment: FeedComment) {
  return Boolean((comment as any).liked || (comment as any).isLiked);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
  styles,
  onReply,
  onPressLike,
}: {
  item: FeedComment;
  styles: ReturnType<typeof createStyles>;
  onReply: (comment: FeedComment) => void;
  onPressLike?: (comment: FeedComment) => void;
}) {
  const replyAuthorName = getCommentAuthorName(item);
  const likeLabel = formatCount((item as any).likeCount);
  const liked = isCommentLiked(item);
  return (
    <View style={styles.replyRow}>
      <CommentAvatar comment={item} size={26} styles={styles} />
      <View style={styles.replyBody}>
        <View style={styles.replyBubble}>
          <Text style={styles.replyAuthor}>{replyAuthorName}</Text>
          <Text style={styles.replyText}>{item.content}</Text>
        </View>
        <View style={styles.replyActions}>
          <Pressable hitSlop={8} onPress={() => onPressLike?.(item)}>
            <Text style={[styles.replyActionText, liked && styles.likedActionText]}>
              {liked ? "Liked" : "Like"}
            </Text>
          </Pressable>
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
  onPressLike,
  isRepliesExpanded,
  onViewReplies,
}: {
  item: FeedComment;
  styles: ReturnType<typeof createStyles>;
  onReply: (comment: FeedComment) => void;
  onPressLike?: (comment: FeedComment) => void;
  isRepliesExpanded: boolean;
  onViewReplies: (comment: FeedComment) => void;
}) {
  const authorName = getCommentAuthorName(item);
  const replies = item.replies ?? [];
  const totalReplyCount = Math.max((item as any).replyCount ?? 0, replies.length);
  const visibleReplies = isRepliesExpanded ? replies : [];
  const likeLabel = formatCount((item as any).likeCount);
  const liked = isCommentLiked(item);

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
            <Pressable hitSlop={8} onPress={() => onPressLike?.(item)}>
              <Text style={[styles.commentActionText, liked && styles.likedActionText]}>
                {liked ? "Liked" : "Like"}
              </Text>
            </Pressable>
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
            <Pressable hitSlop={8} onPress={() => onViewReplies(item)} style={styles.viewRepliesButton}>
              <Text style={styles.viewMoreReplies}>
                View {totalReplyCount} {totalReplyCount === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          ) : null}
          {visibleReplies.map((reply) => (
            <ReplyItem
              key={reply.id}
              item={reply}
              styles={styles}
              onReply={onReply}
              onPressLike={onPressLike}
            />
          ))}
          {isRepliesExpanded && replies.length > 0 ? (
            <Pressable hitSlop={8} onPress={() => onViewReplies(item)} style={styles.viewRepliesButton}>
              <Text style={styles.hideReplies}>Hide replies</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

// ─── Main Modal ─────────────────────────────────────────────────────────────

function CommentPostModal({
  visible,
    showCommunityHeader = true,
  ownedCommunityIds,
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
  onPressCommentLike,
  canWriteComment = true,
  onRequestFollow,
  colors,
}: CommentPostModalProps) {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [replyingTo, setReplyingTo] = useState<FeedComment | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(() => new Set());
  // const [textInputHeight, setTextInputHeight] = useState(MIN_INPUT_HEIGHT);

  // ------------------------------------------------------------
  // FIX: typing lives HERE, locally, instead of in the parent
  // screen's state. This is the actual fix for the jitter/jump
  // while typing — every keystroke now only re-renders THIS
  // modal, never the HomeScreen behind it (its FlashList, tabs,
  // header animation, etc. stay completely untouched).
  //
  // `inputValue` (prop) is only used to *seed* localInput when
  // the modal opens for a post, or when the parent explicitly
  // resets it (e.g. clears after a failed submit). It is NOT
  // synced on every keystroke anymore.
  // ------------------------------------------------------------
  // const [localInput, setLocalInput] = useState(inputValue);
  const inputTextRef = useRef("");
  const [hasText, setHasText] = useState(false);
  const lastSeededPostId = useRef<string | null>(null);

 // ------------------------------------------------------------
// Since the TextInput is now uncontrolled (no `value` prop),
// we can't "push" new text into it via setState anymore.
// Instead, when we need to seed/reset the box's starting text
// (opening a different post, or parent restoring text after a
// failed send), we bump `resetKey` — this forces the TextInput
// to remount with a fresh `defaultValue`, which is the only way
// to change an uncontrolled input's text from outside.
// ------------------------------------------------------------
const [resetKey, setResetKey] = useState(0);
const seedValueRef = useRef(inputValue);

useEffect(() => {
  if (!visible) return;

  const currentPostId = post?.id ?? null;

  // Re-seed only when a *different* post is opened.
  if (currentPostId !== lastSeededPostId.current) {
    lastSeededPostId.current = currentPostId;

    seedValueRef.current = inputValue;
    inputTextRef.current = inputValue;
    setHasText(inputValue.trim().length > 0);
    setResetKey((k) => k + 1); // force remount with new defaultValue
  }
}, [visible, post?.id, inputValue]);

// If parent clears/restores inputValue externally (e.g. after a
// failed send where it restores the typed text), pick that up.
const prevExternalValueRef = useRef(inputValue);
useEffect(() => {
  if (prevExternalValueRef.current !== inputValue) {
    prevExternalValueRef.current = inputValue;

    seedValueRef.current = inputValue;
    inputTextRef.current = inputValue;
    setHasText(inputValue.trim().length > 0);
    setResetKey((k) => k + 1);
  }
}, [inputValue]);

const handleChangeText = useCallback((text: string) => {
  inputTextRef.current = text;

  const nonEmpty = text.trim().length > 0;
  setHasText((prev) => (prev !== nonEmpty ? nonEmpty : prev));
}, []);

  // ── THE KEY FIX ──
  // With edgeToEdgeEnabled:true + softwareKeyboardLayoutMode:"pan" in app.json,
  // the system pans the whole screen up when keyboard opens — but the bottom sheet
  // sits in a Portal ABOVE the pan layer, so it doesn't move.
  // We manually track keyboard height and push the inputContainer up ourselves.

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // useEffect(() => {
  //   if (!localInput.trim()) {
  //     setTextInputHeight(MIN_INPUT_HEIGHT);
  //   }
  // }, [localInput]);

  const totalComments = post?.commentCount ?? comments.length;

  const handleReply = useCallback((comment: FeedComment) => {
    if (!canWriteComment) { onRequestFollow?.(); return; }
    setReplyingTo(comment);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [canWriteComment, onRequestFollow]);

  const handleViewReplies = useCallback((comment: FeedComment) => {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);
      next.has(comment.id) ? next.delete(comment.id) : next.add(comment.id);
      return next;
    });
    onRefreshComments?.();
  }, [onRefreshComments]);

 const handleSubmitPress = useCallback(() => {
  if (!canWriteComment) { onRequestFollow?.(); return; }

  const content = inputTextRef.current.trim();
  if (!content || isCreating) return;

  const selectedReply = replyingTo;

  if (selectedReply?.id) {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);
      next.add(selectedReply.id);
      return next;
    });
  }

  setReplyingTo(null);

  // Clear the native box directly (no React round-trip needed)
  inputRef.current?.clear();
  inputTextRef.current = "";
  setHasText(false);

  onChangeInput("");
  onSubmit(content, selectedReply);
}, [canWriteComment, onRequestFollow, isCreating, replyingTo, onChangeInput, onSubmit]);

  const handleInputFocus = useCallback(() => {
    if (!canWriteComment) {
      inputRef.current?.blur();
      Keyboard.dismiss();
      onRequestFollow?.();
      return;
    }
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 300);
  }, [canWriteComment, onRequestFollow]);

// const handleInputContentSizeChange = useCallback((event: {
//   nativeEvent: { contentSize: { height: number } };
// }) => {
//   const h = event.nativeEvent.contentSize.height;
//   const nextHeight = Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, Math.ceil(h) + 12));

//   // Only grow the box, never shrink it while the user is actively typing.
//   // Shrinking is handled separately (only when the field becomes empty).
//   // This stops the "grow then snap back" flicker caused by predictive
//   // keyboards (SwiftKey/Gboard) briefly reporting a smaller size mid-word.
//   setTextInputHeight((prev) => Math.max(prev, nextHeight));
// }, []);

  const handlePostCardCommentPress = useCallback(() => {
    if (!canWriteComment) { onRequestFollow?.(); return; }
    inputRef.current?.focus();
  }, [canWriteComment, onRequestFollow]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setReplyingTo(null);
    setExpandedReplyIds(new Set());
    onClose();
  }, [onClose]);

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) onClose();
  }, [onClose]);

  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.5}
      pressBehavior="close"
    />
  ), []);

  const renderItem = useCallback(({ item }: { item: FeedComment }) => (
    <CommentItem
      item={item}
      styles={styles}
      onReply={handleReply}
      onPressLike={onPressCommentLike}
      isRepliesExpanded={expandedReplyIds.has(item.id)}
      onViewReplies={handleViewReplies}
    />
  ), [styles, handleReply, onPressCommentLike, expandedReplyIds, handleViewReplies]);

  const ListHeader = useMemo(() => (
    <View style={styles.postHeaderWrap}>
      {post ? (
        <CommunityPostCard
          post={post}
            showCommunityHeader={showCommunityHeader}
    ownedCommunityIds={ownedCommunityIds}
          disableMediaPlayback={false}
          onPressLike={onPressPostLike}
          onPressComment={handlePostCardCommentPress}
          onPressShare={onPressPostShare}
          onPressMedia={onPressMedia}
        />
      ) : null}
      <View style={styles.commentSectionHeader}>
        <Text style={styles.commentSectionTitle}>Comments</Text>
      </View>
    </View>
  ), [post, onPressPostLike, handlePostCardCommentPress, onPressPostShare, onPressMedia, styles]);

  const ListEmpty = useMemo(() => (
    isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    ) : (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={34} color={colors.muted} />
        <Text style={styles.emptyTitle}>No comments yet</Text>
        <Text style={styles.emptyText}>Be the first to write a comment.</Text>
      </View>
    )
  ), [isLoading, colors, styles]);

  const ListFooter = useMemo(() => <View style={{ height: 16 }} />, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={["95%"]}
      topInset={insets.top}
      onDismiss={handleClose}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
      enablePanDownToClose
      enableDynamicSizing={false}
      handleIndicatorStyle={styles.dragHandle}
      handleStyle={styles.dragHandleWrapper}
      backgroundStyle={{ backgroundColor: colors.surface }}
    >
      {/* Root: plain View with flex:1 — NOT BottomSheetView */}
      <View style={styles.sheetRoot}>

        {/* Header — fixed */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.headerIconButton}>
            <Ionicons name="chevron-down" size={24} color={colors.foreground} />
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
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        {/* List — flex:1 fills space between header and input */}
        <View style={styles.listWrapper}>
          <BottomSheetFlatList
            ref={listRef}
            data={isLoading ? [] : comments}
            keyExtractor={(item: FeedComment) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            ListFooterComponent={ListFooter}
          />
        </View>

        {/* Input — always visible above keyboard */}
        <View style={styles.inputContainer}>
          {replyingTo ? (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText} numberOfLines={1}>
                Replying to {getCommentAuthorName(replyingTo)}
              </Text>
              <Pressable hitSlop={8} onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputBar}>
          <View style={[styles.inputWrapper, { height: FIXED_INPUT_HEIGHT }]}>
              <BottomSheetTextInput
                ref={inputRef as any}
                defaultValue=""
                onChangeText={handleChangeText}
                onFocus={handleInputFocus}
                placeholder={
                  !canWriteComment
                    ? "Follow community to comment..."
                    : replyingTo
                    ? `Reply to ${getCommentAuthorName(replyingTo)}...`
                    : "Write a comment..."
                }
                placeholderTextColor={colors.muted}
                editable={!isCreating}
                multiline
                scrollEnabled={true}
                textAlignVertical="top"
                blurOnSubmit={false}
                returnKeyType="default"
                style={[styles.input, { height: FIXED_INPUT_HEIGHT }]}
              />
            </View>
            <Pressable
              onPress={handleSubmitPress}
              disabled={!hasText || isCreating}
              style={[styles.sendButton, !hasText && styles.sendButtonDisabled]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={19}
                  color={hasText ? "#FFFFFF" : colors.muted}
                />
              )}
            </Pressable>
          </View>
        </View>

      </View>
    </BottomSheetModal>
  );
}

export default memo(CommentPostModal);

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(
  colors: Colors,
  insets: { top: number; bottom: number; left: number; right: number },
) {
  return StyleSheet.create({
    sheetRoot: {
      flex: 1,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },

    dragHandleWrapper: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },

    dragHandle: {
      width: 42,
      height: 4,
      backgroundColor: colors.border,
    },

    header: {
      height: 58,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
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
      color: colors.foreground,
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
    },

    headerSubtitle: {
      marginTop: 1,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    listWrapper: {
      flex: 1,
    },

    listContent: {
      paddingBottom: 8,
    },

    postHeaderWrap: {
      backgroundColor: colors.surface,
    },

    commentSectionHeader: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },

    commentSectionTitle: {
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },

    loadingContainer: {
      paddingVertical: 30,
      alignItems: "center",
    },

    emptyContainer: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
    },

    emptyTitle: {
      marginTop: 10,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Poppins_700Bold",
    },

    emptyText: {
      marginTop: 4,
      color: colors.muted,
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
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    avatarImage: {
      width: "100%",
      height: "100%",
    },

    avatarInitial: {
      color: colors.foreground,
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
      backgroundColor: colors.surfaceSecondary,
    },

    commentAuthor: {
      color: colors.foreground,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    commentText: {
      marginTop: 2,
      color: colors.foreground,
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
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    likedActionText: {
      color: colors.accent,
    },

    commentTime: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    commentReactionCount: {
      marginLeft: "auto",
      color: colors.muted,
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
      backgroundColor: colors.border,
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
      backgroundColor: colors.surfaceSecondary,
    },

    replyAuthor: {
      color: colors.foreground,
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    replyText: {
      marginTop: 1,
      color: colors.foreground,
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
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    replyTime: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    replyReactionCount: {
      marginLeft: "auto",
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },

    viewRepliesButton: {
      marginLeft: 34,
      alignSelf: "flex-start",
      paddingVertical: 2,
    },

    viewMoreReplies: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },

    hideReplies: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },

    replyingBar: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      backgroundColor: colors.surface,
    },

    replyingText: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    inputContainer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, 12),
    },

    inputBar: {
      paddingHorizontal: 10,
      paddingTop: 6,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },

    inputWrapper: {
      flex: 1,
      borderRadius: 22,
      backgroundColor: colors.surfaceSecondary,
      justifyContent: "center",
      overflow: "hidden",
    },

    input: {

      paddingHorizontal: 12,
      paddingTop: Platform.OS === "ios" ? 11 : 9,
      paddingBottom: Platform.OS === "ios" ? 11 : 9,
      color: colors.foreground,
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
    },

    sendButtonDisabled: {
      backgroundColor: colors.surfaceSecondary,
    },
  });
}