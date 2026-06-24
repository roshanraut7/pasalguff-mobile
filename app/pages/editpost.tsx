import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Tabs } from "heroui-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useGetCommunityPostQuery,
  useUpdatePostMutation,
} from "@/store/api/postApi";

import { useUploadPostMediaMutation } from "@/store/api/uploadApi";
import { useCreateEditor } from "@/components/editor/editor";

import {
  createCreatePostStyles,
  getCreatePostPalette,
} from "@/constants/styles/create-post.styles";

import { stripHtml } from "@/schema/post.schema";

import type { CommunityPost } from "@/types/post";

import type {
  CommunityPostMedia,
  ComposerAttachment,
  PostTab,
  PostTag,
  UploadPostMediaItem,
  UploadPostMediaResponse,
} from "@/components/post/Post.types";

import {
  FOOTER_RESERVED_SPACE,
  MAX_ATTACHMENTS,
  TAG_OPTIONS,
  makeId,
  parseLinkInput,
} from "@/utils/post.utils";

import { TagPickerModal } from "@/components/post/Postpickermodals";

import { TextTab, MediaTab, LinkTab } from "@/components/post/Postcomposertabs";

/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────── */

type StatusModalVariant = "success" | "danger";

type StatusModalState = {
  visible: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
};

/* ──────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────── */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeEditorContent(content?: string | null) {
  const value = content?.trim();

  if (!value) return "<p></p>";

  if (value.startsWith("<")) {
    return value;
  }

  return `<p>${escapeHtml(value).replace(/\n/g, "<br />")}</p>`;
}

function getInitialPostTab(post: CommunityPost): PostTab {
  if (post.poll) return "text";
  if (post.media?.length) return "media";
  if (post.linkUrl) return "link";
  return "text";
}

/* ──────────────────────────────────────────────────────────────
   Action Button
────────────────────────────────────────────────────────────── */

function ComposerActionButton({
  label,
  variant,
  disabled,
  onPress,
  styles,
}: {
  label: string;
  variant: "outline" | "secondary" | "primary";
  disabled?: boolean;
  onPress?: () => void;
  styles: ReturnType<typeof createCreatePostStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.footerButton,
        variant === "outline" && styles.footerButtonOutline,
        variant === "secondary" && styles.footerButtonSecondary,
        variant === "primary" && styles.footerButtonPrimary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          variant === "outline" && styles.footerButtonTextOutline,
          variant === "secondary" && styles.footerButtonTextSecondary,
          variant === "primary" && styles.footerButtonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────
   Status Modal
────────────────────────────────────────────────────────────── */

function StatusModal({
  visible,
  variant,
  title,
  message,
  onClose,
  isDark,
  successColor,
  dangerColor,
}: {
  visible: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
  onClose: () => void;
  isDark: boolean;
  successColor: string;
  dangerColor: string;
}) {
  const iconColor = variant === "success" ? successColor : dangerColor;
  const iconName = variant === "success" ? "checkmark-circle" : "close-circle";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 24,
            padding: 24,
            backgroundColor: isDark ? "#020617" : "#FFFFFF",
            alignItems: "center",
          }}
        >
          <Ionicons name={iconName} size={56} color={iconColor} />

          <Text
            style={{
              marginTop: 14,
              fontSize: 20,
              fontWeight: "800",
              color: isDark ? "#F9FAFB" : "#111827",
              textAlign: "center",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              lineHeight: 21,
              color: isDark ? "#CBD5E1" : "#4B5563",
              textAlign: "center",
            }}
          >
            {message}
          </Text>

          <Pressable
            onPress={onClose}
            style={{
              marginTop: 22,
              width: "100%",
              height: 48,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: iconColor,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: "800",
              }}
            >
              OK
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ──────────────────────────────────────────────────────────────
   Parent Screen: load post first
────────────────────────────────────────────────────────────── */

export default function EditPostScreen() {
  const { colors, isDark } = useAppTheme();

  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  const { postId, communityId } = useLocalSearchParams<{
    postId?: string;
    communityId?: string;
  }>();

  const safePostId = postId ? String(postId) : "";
  const safeCommunityId = communityId ? String(communityId) : "";

  const {
    data: editingPost,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityPostQuery(
    {
      communityId: safeCommunityId,
      postId: safePostId,
    },
    {
      skip: !safeCommunityId || !safePostId,
    },
  );

  if (!safeCommunityId || !safePostId) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View
          style={[
            styles.contentWrap,
            {
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.danger}
          />

          <Text
            style={{
              marginTop: 12,
              color: p.text,
              fontSize: 18,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Post not found
          </Text>

          <Text
            style={{
              marginTop: 6,
              color: p.muted,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Post ID or community ID is missing.
          </Text>

          <View style={{ marginTop: 18, width: "100%" }}>
            <ComposerActionButton
              label="Go back"
              variant="primary"
              onPress={() => router.back()}
              styles={styles}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View
          style={[
            styles.contentWrap,
            {
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.accent} />

          <Text style={{ color: p.muted, fontSize: 13 }}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !editingPost) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View
          style={[
            styles.contentWrap,
            {
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.danger}
          />

          <Text
            style={{
              marginTop: 12,
              color: p.text,
              fontSize: 18,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Could not load post
          </Text>

          <Text
            style={{
              marginTop: 6,
              color: p.muted,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Please try again.
          </Text>

          <View style={{ marginTop: 18, width: "100%" }}>
            <ComposerActionButton
              label="Retry"
              variant="primary"
              onPress={() => refetch()}
              styles={styles}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <EditPostComposer
      key={editingPost.id}
      editingPost={editingPost}
      communityId={safeCommunityId}
      postId={safePostId}
      isFetchingPost={isFetching}
    />
  );
}

/* ──────────────────────────────────────────────────────────────
   Composer: editor starts only after data exists
────────────────────────────────────────────────────────────── */

function EditPostComposer({
  editingPost,
  communityId,
  postId,
  isFetchingPost,
}: {
  editingPost: CommunityPost;
  communityId: string;
  postId: string;
  isFetchingPost: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  const isMountedRef = useRef(true);
  const uploadAbortRef = useRef<(() => void) | null>(null);
  const statusModalCloseActionRef = useRef<(() => void) | null>(null);

  const initialEditorContent = useMemo(
    () => normalizeEditorContent(editingPost.content),
    [editingPost.content],
  );

  const initialPostTab = useMemo(
    () => getInitialPostTab(editingPost),
    [editingPost],
  );

  const [statusModal, setStatusModal] = useState<StatusModalState>({
    visible: false,
    variant: "success",
    title: "",
    message: "",
  });

  const [postTab, setPostTab] = useState<PostTab>(initialPostTab);
  const [tagModalVisible, setTagModalVisible] = useState(false);

  const [selectedTag, setSelectedTag] = useState<PostTag>(
    (editingPost.tag ?? "GENERAL") as PostTag,
  );
  const [title, setTitle] = useState(editingPost.title ?? "");
  const [linkUrl, setLinkUrl] = useState(editingPost.linkUrl ?? "");
  const [html, setHtml] = useState(initialEditorContent);
  const [plainText, setPlainText] = useState(stripHtml(initialEditorContent));
  const [attachments, setAttachments] = useState<ComposerAttachment[]>(
    (editingPost.media ?? []).map((media) => ({
      id: media.id ?? makeId("remote"),
      source: "remote" as const,
      uri: toAbsoluteFileUrl(media.url) ?? media.url,
      mediaType: "IMAGE",
    })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasPoll = Boolean(editingPost.poll);
  const linkPreview = useMemo(() => parseLinkInput(linkUrl), [linkUrl]);

  const selectedTagMeta = useMemo(
    () => TAG_OPTIONS.find((tag) => tag.value === selectedTag),
    [selectedTag],
  );

  const [updatePost, { isLoading: isUpdatingPost }] = useUpdatePostMutation();
  const [uploadPostMedia, { isLoading: isUploadingMedia }] =
    useUploadPostMediaMutation();

  const busy = isUpdatingPost || isUploadingMedia;

  const editor = useCreateEditor();

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      uploadAbortRef.current?.();
    };
  }, []);

  /**
   * Important:
   * TenTap editor is WebView-based. Sometimes setContent runs before the
   * WebView is ready. These delayed calls force old description to appear.
   */
  useEffect(() => {
    setHtml(initialEditorContent);
    setPlainText(stripHtml(initialEditorContent));

    const timer1 = setTimeout(() => {
      editor.setContent(initialEditorContent);
    }, 250);

    const timer2 = setTimeout(() => {
      editor.setContent(initialEditorContent);
    }, 800);

    const timer3 = setTimeout(() => {
      editor.setContent(initialEditorContent);
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [editor, initialEditorContent]);

  const showStatusModal = useCallback(
    (
      variant: StatusModalVariant,
      title: string,
      message: string,
      onClose?: () => void,
    ) => {
      statusModalCloseActionRef.current = onClose ?? null;

      setStatusModal({
        visible: true,
        variant,
        title,
        message,
      });
    },
    [],
  );

  const closeStatusModal = useCallback(() => {
    setStatusModal((prev) => ({
      ...prev,
      visible: false,
    }));

    const action = statusModalCloseActionRef.current;
    statusModalCloseActionRef.current = null;

    action?.();
  }, []);

  const handleHtmlChange = useCallback((value: string) => {
    setHtml(value);
    setPlainText(stripHtml(value ?? ""));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const ensureMediaPermission = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showStatusModal(
        "danger",
        "Permission required",
        "Media library permission is required to upload images.",
      );

      return false;
    }

    return true;
  }, [showStatusModal]);

  const pickMedia = useCallback(async () => {
    if (hasPoll) {
      showStatusModal(
        "danger",
        "Poll post",
        "Poll posts cannot contain uploaded images or external links.",
      );
      return;
    }

    if (linkUrl.trim()) {
      showStatusModal(
        "danger",
        "Remove link first",
        "A post cannot contain both uploaded images and an embedded link.",
      );
      return;
    }

    const hasPermission = await ensureMediaPermission();
    if (!hasPermission) return;

    if (attachments.length >= MAX_ATTACHMENTS) {
      showStatusModal(
        "danger",
        "Limit reached",
        `You can upload up to ${MAX_ATTACHMENTS} images only.`,
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    const mapped: ComposerAttachment[] = result.assets.map((asset, index) => ({
      id: makeId(`local-${index}`),
      source: "local",
      uri: asset.uri,
      mediaType: "IMAGE",
      name: asset.fileName ?? `post-image-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
    }));

    setAttachments((prev) => [...prev, ...mapped].slice(0, MAX_ATTACHMENTS));
  }, [
    attachments.length,
    ensureMediaPermission,
    hasPoll,
    linkUrl,
    showStatusModal,
  ]);

  const replaceAttachment = useCallback(
    async (id: string) => {
      if (hasPoll) return;

      const hasPermission = await ensureMediaPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      setAttachments((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                source: "local",
                uri: asset.uri,
                mediaType: "IMAGE",
                name: asset.fileName ?? `post-image-${Date.now()}.jpg`,
                mimeType: asset.mimeType ?? "image/jpeg",
              }
            : item,
        ),
      );
    },
    [ensureMediaPermission, hasPoll],
  );

  const buildUploadedMediaPayload = async (): Promise<CommunityPostMedia[]> => {
    const remoteMedia: CommunityPostMedia[] = attachments
      .filter((attachment) => attachment.source === "remote")
      .map((attachment, index) => ({
        type: "IMAGE",
        url: attachment.uri,
        sortOrder: index,
      }));

    const localMedia = attachments.filter(
      (attachment) => attachment.source === "local",
    );

    if (!localMedia.length) {
      return remoteMedia.map((media, index) => ({
        ...media,
        sortOrder: index,
      }));
    }

    const uploadPromise = uploadPostMedia({
      files: localMedia.map((attachment) => ({
        uri: attachment.uri,
        name: attachment.name,
        mimeType: attachment.mimeType,
      })),
    });

    uploadAbortRef.current = () => uploadPromise.abort();

    const uploadResponse =
      (await uploadPromise.unwrap()) as UploadPostMediaResponse;

    if (!isMountedRef.current) {
      throw new Error("UNMOUNTED");
    }

    uploadAbortRef.current = null;

    const uploaded: CommunityPostMedia[] = uploadResponse.items.map(
      (item: UploadPostMediaItem, index: number) => ({
        type: "IMAGE",
        url: item.url,
        sortOrder: remoteMedia.length + index,
      }),
    );

    return [...remoteMedia, ...uploaded].map((media, index) => ({
      ...media,
      sortOrder: index,
    }));
  };

  const handleTabChange = useCallback(
    (value: string) => {
      const nextTab = value as PostTab;

      if (nextTab === "media" && linkUrl.trim()) {
        setLinkUrl("");
      }

      if (nextTab === "link" && attachments.length > 0) {
        setAttachments([]);
      }

      setPostTab(nextTab);
    },
    [attachments.length, linkUrl],
  );

  const handleLinkUrlChange = useCallback(
    (value: React.SetStateAction<string>) => {
      const nextValue =
        typeof value === "function" ? value(linkUrl) : value;

      if (attachments.length > 0 && nextValue.trim()) {
        showStatusModal(
          "danger",
          "Remove images first",
          "A post cannot contain both uploaded images and an embedded link.",
        );
        return;
      }

      setLinkUrl(nextValue);
    },
    [attachments.length, linkUrl, showStatusModal],
  );

  const updatePublishedPost = async () => {
    try {
      setErrors({});

      if (hasPoll && postTab !== "text") {
        showStatusModal(
          "danger",
          "Poll post",
          "Poll posts can only update text content from this page.",
        );
        return;
      }

      const cleanLinkUrl =
        postTab === "link" ? linkPreview?.cleanUrl ?? linkUrl.trim() : "";

      const media = postTab === "media" ? await buildUploadedMediaPayload() : [];

      const hasContent = Boolean(plainText.trim());
      const hasLink = Boolean(cleanLinkUrl.trim());
      const hasMedia = media.length > 0;

      if (!hasContent && !hasLink && !hasMedia && !hasPoll) {
        setErrors({
          content: "Post must contain text, images, or a link.",
        });

        showStatusModal(
          "danger",
          "Post is empty",
          "Post must contain text, images, or a link.",
        );

        return;
      }

      if (hasLink && hasMedia) {
        showStatusModal(
          "danger",
          "Choose one",
          "A post cannot contain both uploaded images and an embedded link.",
        );
        return;
      }

      if (hasPoll && (hasLink || hasMedia)) {
        showStatusModal(
          "danger",
          "Poll post",
          "A poll post cannot also contain images or an embedded link.",
        );
        return;
      }

      await updatePost({
        communityId,
        postId,
        body: {
          title: title.trim() || null,
          tag: selectedTag,
          content: hasContent ? html : null,
          linkUrl: postTab === "link" ? cleanLinkUrl.trim() || null : null,
          media: postTab === "media" ? media : [],
        },
      }).unwrap();

      if (!isMountedRef.current) return;

      showStatusModal(
        "success",
        "Post updated",
        "Your post has been updated successfully.",
        () => {
          router.back();
        },
      );
    } catch (error: any) {
      if (!isMountedRef.current) return;

      showStatusModal(
        "danger",
        "Could not update post",
        error?.data?.message ?? "Please try again.",
      );
    }
  };

  const sharedTabProps = {
    p,
    styles,
    title,
    setTitle,
    titleRequired: false,
    errors,
    editor,
    onChangeHtml: handleHtmlChange,
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.contentWrap}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
              }}
            >
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={22} color={p.text} />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text style={styles.screenTitle}>Edit post</Text>

                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 1,
                    color: p.muted,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {editingPost.community?.name ?? "Community post"}
                </Text>
              </View>
            </View>

            {isFetchingPost ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : null}
          </View>

          <View style={styles.contentWrap}>
            {hasPoll ? (
              <Text style={styles.visibilityHintText}>
                This is a poll post. You can update title, tag and text content.
                Poll options cannot be changed here.
              </Text>
            ) : null}

            {!hasPoll ? (
              <View style={styles.postTypeTabsWrap}>
                <Tabs
                  value={postTab}
                  onValueChange={handleTabChange}
                  variant="secondary"
                  style={{ width: "100%" }}
                >
                  <Tabs.List>
                    <Tabs.ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      scrollAlign="start"
                      contentContainerStyle={styles.postTypeTabsListContent}
                    >
                      <Tabs.Indicator />

                      <Tabs.Trigger value="text">
                        <Tabs.Label>Text</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="media">
                        <Tabs.Label>Images</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="link">
                        <Tabs.Label>Link</Tabs.Label>
                      </Tabs.Trigger>
                    </Tabs.ScrollView>
                  </Tabs.List>
                </Tabs>
              </View>
            ) : null}

            <ScrollView
              style={styles.composerScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingBottom: insets.bottom + FOOTER_RESERVED_SPACE,
                },
              ]}
            >
              <View style={styles.tagsRow}>
                <Pressable
                  onPress={() => setTagModalVisible(true)}
                  style={styles.tagChip}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={14}
                    color={p.muted}
                  />

                  <Text style={styles.tagChipText}>
                    {selectedTagMeta ? selectedTagMeta.label : "Add tags"}
                  </Text>

                  <Ionicons name="chevron-down" size={14} color={p.muted} />
                </Pressable>
              </View>

              {postTab === "text" || hasPoll ? (
                <TextTab {...sharedTabProps} />
              ) : null}

              {postTab === "media" && !hasPoll ? (
                <MediaTab
                  {...sharedTabProps}
                  attachments={attachments}
                  onPickMedia={pickMedia}
                  onReplaceAttachment={replaceAttachment}
                  onRemoveAttachment={removeAttachment}
                />
              ) : null}

              {postTab === "link" && !hasPoll ? (
                <LinkTab
                  {...sharedTabProps}
                  linkUrl={linkUrl}
                  setLinkUrl={handleLinkUrlChange}
                  linkPreview={linkPreview}
                  setErrors={setErrors}
                />
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.footerWrap,
                { paddingBottom: Math.max(insets.bottom, 10) },
              ]}
            >
              <View style={styles.footerRow}>
                <ComposerActionButton
                  label="Cancel"
                  variant="outline"
                  disabled={busy}
                  onPress={() => router.back()}
                  styles={styles}
                />

                <ComposerActionButton
                  label={busy ? "Updating..." : "Update Post"}
                  variant="primary"
                  disabled={busy}
                  onPress={updatePublishedPost}
                  styles={styles}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <TagPickerModal
        visible={tagModalVisible}
        selectedTag={selectedTag}
        onSelect={setSelectedTag}
        onClose={() => setTagModalVisible(false)}
      />

      <StatusModal
        visible={statusModal.visible}
        variant={statusModal.variant}
        title={statusModal.title}
        message={statusModal.message}
        onClose={closeStatusModal}
        isDark={isDark}
        successColor={colors.success}
        dangerColor={colors.danger}
      />
    </SafeAreaView>
  );
}       