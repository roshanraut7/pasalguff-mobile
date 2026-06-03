import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useToast } from "heroui-native";

import {
  useCreateDraftPostMutation,
  useCreatePublishedPostMutation,
  useDeletePostMutation,
  useGetMyDraftsQuery,
  usePublishDraftMutation,
  useUpdatePostMutation,
} from "@/store/api/postApi";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import { useUploadPostMediaMutation } from "@/store/api/uploadApi";
import { useCreateEditor } from "@/components/editor/editor";
import { DraftPostsPanel } from "@/components/post/DraftPostsPanel";
import { draftPostSchema, publishPostSchema, stripHtml } from "@/schema/post.schema";
import {
  createCreatePostStyles,
  getCreatePostPalette,
} from "@/constants/styles/create-post.styles";
import { useAppTheme } from "@/hooks/useAppTheme";

import type {
  CommunityPost,
  CommunityPostMedia,
  ComposerAttachment,
  PostPollPayload,
  PostTab,
  PostTag,
  PostVisibility,
  UploadPostMediaResponse,
  UploadPostMediaItem,
} from "@/components/post/Post.types";
import {
  flattenErrors,
  makeId,
  parseLinkInput,
  POST_VISIBILITY_OPTIONS,
  TAG_OPTIONS,
  FOOTER_RESERVED_SPACE,
  MAX_ATTACHMENTS,
} from "@/utils/post.utils";
import {
  CommunityPickerModal,
  TagPickerModal,
  VisibilityPickerModal,
} from "@/components/post/Postpickermodals";
import {
  TextTab,
  MediaTab,
  LinkTab,
  PollTab,
} from "@/components/post/Postcomposertabs";

// ─── Action Button ────────────────────────────────────────────────────────────

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreatePostScreen() {
  const { colors, isDark } = useAppTheme();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  // ── Lifecycle refs ──────────────────────────────────────────────────────────
  const isMountedRef = useRef(true);
  const uploadAbortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      uploadAbortRef.current?.();
    };
  }, []);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showStatusToast = useCallback(
    (variant: "success" | "danger", label: string, description: string) => {
      toast.show({
        variant,
        label,
        description,
        icon: (
          <Ionicons
            name={variant === "success" ? "checkmark-circle" : "close-circle"}
            size={20}
            color={variant === "success" ? colors.success : colors.danger}
          />
        ),
      });
    },
    [toast, colors.success, colors.danger],
  );

  // ── UI state ────────────────────────────────────────────────────────────────
  const [postTab, setPostTab] = useState<PostTab>("text");
  const [draftsTabActive, setDraftsTabActive] = useState(false);

  const [communitySearch, setCommunitySearch] = useState("");
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);

  // ── Post field state ────────────────────────────────────────────────────────
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [selectedTag, setSelectedTag] = useState<PostTag>("GENERAL");
  const [selectedVisibility, setSelectedVisibility] = useState<PostVisibility>("PUBLIC");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [html, setHtml] = useState("<p></p>");
  const [plainText, setPlainText] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Poll state ──────────────────────────────────────────────────────────────
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollClosesAt, setPollClosesAt] = useState("");

  const linkPreview = useMemo(() => parseLinkInput(linkUrl), [linkUrl]);

  // ── API hooks ───────────────────────────────────────────────────────────────
  const { data: communitiesResponse, isLoading: isLoadingCommunities } =
    useGetMyCommunitiesQuery({ page: 1, limit: 50 });

  const communities = communitiesResponse?.data ?? [];

  const { data: draftsResponse, isLoading: isLoadingDrafts } =
    useGetMyDraftsQuery({ limit: 50 });

  const drafts = (draftsResponse?.data ?? []) as CommunityPost[];

  const [uploadPostMedia, { isLoading: isUploadingMedia }] = useUploadPostMediaMutation();
  const [createPublishedPost, { isLoading: isCreatingPost }] = useCreatePublishedPostMutation();
  const [createDraftPost, { isLoading: isCreatingDraft }] = useCreateDraftPostMutation();
  const [updatePost, { isLoading: isUpdatingPost }] = useUpdatePostMutation();
  const [publishDraft, { isLoading: isPublishingDraft }] = usePublishDraftMutation();
  const [deletePost] = useDeletePostMutation();

  const busy =
    isUploadingMedia || isCreatingPost || isCreatingDraft || isUpdatingPost || isPublishingDraft;

  // ── Editor ──────────────────────────────────────────────────────────────────
  const editor = useCreateEditor();
  const isEditorReadyRef = useRef(false);
  const pendingContentRef = useRef<string | null>(null);

  useEffect(() => {
    isEditorReadyRef.current = true;
    if (pendingContentRef.current !== null) {
      editor.setContent(pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, [editor]);

  const safeSetContent = useCallback(
    (content: string) => {
      if (isEditorReadyRef.current) {
        editor.setContent(content);
      } else {
        pendingContentRef.current = content;
      }
    },
    [editor],
  );

  // ── Community derived state ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCommunityId && communities.length > 0) {
      setSelectedCommunityId(communities[0].id);
    }
  }, [communities, selectedCommunityId]);

  const filteredCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c) => c.name.toLowerCase().includes(q));
  }, [communities, communitySearch]);

  const selectedCommunity = useMemo(
    () => communities.find((c) => c.id === selectedCommunityId),
    [communities, selectedCommunityId],
  );

  const isPrivateCommunity =
    (selectedCommunity as { visibility?: string } | undefined)?.visibility === "PRIVATE";

  const availableVisibilityOptions = useMemo(
    () =>
      isPrivateCommunity
        ? POST_VISIBILITY_OPTIONS.filter((item) => item.value !== "PUBLIC")
        : POST_VISIBILITY_OPTIONS,
    [isPrivateCommunity],
  );

  const selectedTagMeta = useMemo(
    () => TAG_OPTIONS.find((t) => t.value === selectedTag),
    [selectedTag],
  );

  const selectedVisibilityMeta = useMemo(
    () => POST_VISIBILITY_OPTIONS.find((item) => item.value === selectedVisibility),
    [selectedVisibility],
  );

  useEffect(() => {
    if (isPrivateCommunity && selectedVisibility === "PUBLIC") {
      setSelectedVisibility("COMMUNITY");
    }
  }, [isPrivateCommunity, selectedVisibility]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const resetPoll = useCallback(() => {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollClosesAt("");
  }, []);

  const resetComposer = useCallback(() => {
    setActiveDraftId(null);
    setSelectedTag("GENERAL");
    setSelectedVisibility("PUBLIC");
    setTitle("");
    setLinkUrl("");
    setHtml("<p></p>");
    setPlainText("");
    setAttachments([]);
    setErrors({});
    setPostTab("text");
    resetPoll();
    safeSetContent("<p></p>");
  }, [resetPoll, safeSetContent]);

  const handleHtmlChange = useCallback((value: string) => {
    setHtml(value);
    setPlainText(stripHtml(value ?? ""));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const ensureMediaPermission = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showStatusToast("danger", "Permission required", "Media library permission is required.");
      return false;
    }
    return true;
  }, [showStatusToast]);

  const pickMedia = useCallback(async () => {
    const hasPermission = await ensureMediaPermission();
    if (!hasPermission) return;

    if (attachments.length >= MAX_ATTACHMENTS) {
      showStatusToast("danger", "Limit reached", `You can upload up to ${MAX_ATTACHMENTS} images only.`);
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
  }, [attachments.length, ensureMediaPermission, showStatusToast]);

  const replaceAttachment = useCallback(
    async (id: string) => {
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
    [ensureMediaPermission],
  );

  // ── Upload helper ───────────────────────────────────────────────────────────
  const buildUploadedMediaPayload = async (): Promise<CommunityPostMedia[]> => {
    const remoteMedia: CommunityPostMedia[] = attachments
      .filter((a) => a.source === "remote")
      .map((a, index) => ({ type: "IMAGE", url: a.uri, sortOrder: index }));

    const localMedia = attachments.filter((a) => a.source === "local");

    if (!localMedia.length) {
      return remoteMedia.map((m, index) => ({ ...m, sortOrder: index }));
    }

    const uploadPromise = uploadPostMedia({
      files: localMedia.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType })),
    });

    uploadAbortRef.current = () => uploadPromise.abort();

    const uploadResponse = (await uploadPromise.unwrap()) as UploadPostMediaResponse;

    if (!isMountedRef.current) throw new Error("UNMOUNTED");

    uploadAbortRef.current = null;

    const uploaded: CommunityPostMedia[] = uploadResponse.items.map(
      (item: UploadPostMediaItem, index: number) => ({
        type: "IMAGE",
        url: item.url,
        sortOrder: remoteMedia.length + index,
      }),
    );

    return [...remoteMedia, ...uploaded].map((m, index) => ({ ...m, sortOrder: index }));
  };

  // ── Poll helper ─────────────────────────────────────────────────────────────
  const buildPollPayload = useCallback(
    (requireValid: boolean): PostPollPayload | undefined => {
      if (postTab !== "poll") return undefined;

      const question = pollQuestion.trim();
      const options = pollOptions.map((o) => o.trim()).filter(Boolean);
      const closesAt = pollClosesAt.trim();

      if (!question && options.length === 0) return undefined;

      if (!question) {
        if (requireValid) setErrors((prev) => ({ ...prev, poll: "Poll question is required." }));
        return undefined;
      }

      if (options.length < 2) {
        if (requireValid) setErrors((prev) => ({ ...prev, poll: "Poll must have at least 2 options." }));
        return undefined;
      }

      const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
      if (uniqueOptions.size !== options.length) {
        if (requireValid) setErrors((prev) => ({ ...prev, poll: "Poll options must be unique." }));
        return undefined;
      }

      if (closesAt) {
        const parsedDate = new Date(closesAt);
        if (Number.isNaN(parsedDate.getTime())) {
          if (requireValid) setErrors((prev) => ({ ...prev, poll: "Poll close date must be valid." }));
          return undefined;
        }
        return { question, options, closesAt: parsedDate.toISOString() };
      }

      return { question, options };
    },
    [pollClosesAt, pollOptions, pollQuestion, postTab],
  );

  // ── Save draft ──────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    try {
      setErrors({});

      const media = postTab === "media" ? await buildUploadedMediaPayload() : [];
      const poll = buildPollPayload(false);
      const cleanLinkUrl = postTab === "link" ? linkPreview?.cleanUrl ?? linkUrl.trim() : "";

      const parsed = draftPostSchema.safeParse({
        communityId: selectedCommunityId,
        title,
        tag: selectedTag,
        visibility: selectedVisibility,
        html,
        plainText,
        linkUrl: cleanLinkUrl,
        media,
        poll,
      });

      if (!parsed.success) {
        if (isMountedRef.current) setErrors(flattenErrors(parsed.error.issues));
        return;
      }

      const createBody = {
        title: title.trim() || undefined,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : undefined,
        linkUrl: postTab === "link" ? parsed.data.linkUrl?.trim() || undefined : undefined,
        media: postTab === "media" ? media : [],
        poll: postTab === "poll" ? poll : undefined,
      };

      const updateBody = {
        title: title.trim() || null,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : null,
        linkUrl: postTab === "link" ? parsed.data.linkUrl?.trim() || null : null,
        media: postTab === "media" ? media : [],
      };

      if (activeDraftId) {
        await updatePost({ communityId: selectedCommunityId, postId: activeDraftId, body: updateBody }).unwrap();
        if (isMountedRef.current) showStatusToast("success", "Draft updated", "Your draft has been updated.");
      } else {
        const created = await createDraftPost({ communityId: selectedCommunityId, body: createBody }).unwrap();
        if (isMountedRef.current) {
          setActiveDraftId(created.id);
          showStatusToast("success", "Draft saved", "Your draft has been saved.");
        }
      }

      if (isMountedRef.current) setDraftsTabActive(true);
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusToast("danger", "Could not save draft", error?.data?.message ?? "Try again.");
      }
    }
  };

  // ── Publish ─────────────────────────────────────────────────────────────────
  const publish = async () => {
    try {
      setErrors({});

      const media = postTab === "media" ? await buildUploadedMediaPayload() : [];
      const poll = buildPollPayload(true);

      if (postTab === "poll" && !poll) return;

      const cleanLinkUrl = postTab === "link" ? linkPreview?.cleanUrl ?? linkUrl.trim() : "";

      const parsed = publishPostSchema.safeParse({
        communityId: selectedCommunityId,
        title,
        tag: selectedTag,
        visibility: selectedVisibility,
        html,
        plainText,
        linkUrl: cleanLinkUrl,
        media,
        poll,
      });

      if (!parsed.success) {
        if (isMountedRef.current) setErrors(flattenErrors(parsed.error.issues));
        return;
      }

      const createBody = {
        title: title.trim() || undefined,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : undefined,
        linkUrl: postTab === "link" ? parsed.data.linkUrl?.trim() || undefined : undefined,
        media: postTab === "media" ? media : [],
        poll: postTab === "poll" ? poll : undefined,
      };

      const updateBody = {
        title: title.trim() || null,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : null,
        linkUrl: postTab === "link" ? parsed.data.linkUrl?.trim() || null : null,
        media: postTab === "media" ? media : [],
      };

      if (activeDraftId) {
        await updatePost({ communityId: selectedCommunityId, postId: activeDraftId, body: updateBody }).unwrap();
        await publishDraft({ communityId: selectedCommunityId, postId: activeDraftId }).unwrap();
      } else {
        await createPublishedPost({ communityId: selectedCommunityId, body: createBody }).unwrap();
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusToast("danger", "Could not publish", error?.data?.message ?? "Try again.");
      }
    }
  };

  // ── Draft management ────────────────────────────────────────────────────────
  const openDraft = useCallback(
    (draft: CommunityPost) => {
      setActiveDraftId(draft.id);
      setSelectedCommunityId(draft.communityId);
      setSelectedTag(draft.tag);
      setSelectedVisibility(draft.visibility ?? "PUBLIC");
      setTitle(draft.title ?? "");
      setLinkUrl(draft.linkUrl ?? "");
      setHtml(draft.content ?? "<p></p>");
      setPlainText(stripHtml(draft.content ?? ""));
      setAttachments(
        draft.media.map((m) => ({
          id: m.id ?? makeId("remote"),
          source: "remote" as const,
          uri: m.url,
          mediaType: m.type,
        })),
      );

      if (draft.poll) {
        setPostTab("poll");
        setPollQuestion(draft.poll.question ?? "");
        setPollOptions(
          draft.poll.options?.length ? draft.poll.options.map((o) => o.text) : ["", ""],
        );
        setPollClosesAt(draft.poll.closesAt ?? "");
      } else {
        resetPoll();
        if (draft.media?.length) setPostTab("media");
        else if (draft.linkUrl) setPostTab("link");
        else setPostTab("text");
      }

      setErrors({});
      setDraftsTabActive(false);
      safeSetContent(draft.content ?? "<p></p>");
    },
    [resetPoll, safeSetContent],
  );

  const deleteDraft = useCallback(
    async (draft: CommunityPost) => {
      try {
        await deletePost({ communityId: draft.communityId, postId: draft.id }).unwrap();
        if (!isMountedRef.current) return;
        if (activeDraftId === draft.id) resetComposer();
        showStatusToast("success", "Draft deleted", "The selected draft has been removed.");
      } catch (error: any) {
        if (isMountedRef.current) {
          showStatusToast("danger", "Could not delete draft", error?.data?.message ?? "Try again.");
        }
      }
    },
    [activeDraftId, deletePost, resetComposer, showStatusToast],
  );

  // ── Derived ─────────────────────────────────────────────────────────────────
  const titleRequired =
    postTab === "poll" ||
    ["ANNOUNCEMENT", "QUESTION", "OFFER", "EVENT", "NEWS"].includes(selectedTag);

  const sharedTabProps = {
    p,
    styles,
    title,
    setTitle,
    titleRequired,
    errors,
    editor,
    onChangeHtml: handleHtmlChange,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.contentWrap}>

          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Pressable onPress={() => router.push("/")} style={styles.backButton}>
                <Ionicons name="chevron-back" size={22} color={p.text} />
              </Pressable>
              <Text style={styles.screenTitle}>
                {activeDraftId ? "Edit draft" : "Create post"}
              </Text>
            </View>

            <Pressable
              onPress={() => setDraftsTabActive((v) => !v)}
              style={styles.draftsChip}
            >
              <Text style={styles.draftsChipText}>Drafts</Text>
              {drafts.length > 0 && (
                <View style={styles.draftsCount}>
                  <Text style={styles.draftsCountText}>{drafts.length}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Drafts panel ── */}
          {draftsTabActive ? (
            <View style={styles.draftsContainer}>
              <View style={styles.draftsHeader}>
                <Text style={styles.draftPanelTitle}>Your drafts</Text>
                <Pressable onPress={() => setDraftsTabActive(false)}>
                  <Ionicons name="close" size={22} color={p.muted} />
                </Pressable>
              </View>

              <Text style={styles.draftPanelSub}>
                Open a draft to continue editing or delete the ones you do not need.
              </Text>

              <View style={{ flex: 1, marginTop: 16 }}>
                <DraftPostsPanel
                  drafts={drafts}
                  activeDraftId={activeDraftId}
                  isLoading={isLoadingDrafts}
                  onOpenDraft={openDraft}
                  onDeleteDraft={deleteDraft}
                />
              </View>
            </View>

          ) : (
            <View style={styles.contentWrap}>
              {/* ── Community selector ── */}
              <View style={styles.communityBar}>
                <Pressable
                  onPress={() => setCommunityModalVisible(true)}
                  style={styles.communityBtn}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.communityBtnText,
                      !selectedCommunity && { color: p.placeholder },
                    ]}
                  >
                    {isLoadingCommunities
                      ? "Loading..."
                      : selectedCommunity?.name ?? "Select Community"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={p.muted} />
                </Pressable>
              </View>

              {/* ── Post type tabs ── */}
              <View style={styles.postTypeTabsWrap}>
                <Tabs
                  value={postTab}
                  onValueChange={(value) => setPostTab(value as PostTab)}
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
                      <Tabs.Trigger value="text"><Tabs.Label>Text</Tabs.Label></Tabs.Trigger>
                      <Tabs.Trigger value="media"><Tabs.Label>Images</Tabs.Label></Tabs.Trigger>
                      <Tabs.Trigger value="link"><Tabs.Label>Link</Tabs.Label></Tabs.Trigger>
                      <Tabs.Trigger value="poll"><Tabs.Label>Poll</Tabs.Label></Tabs.Trigger>
                    </Tabs.ScrollView>
                  </Tabs.List>
                </Tabs>
              </View>

              {/* ── Composer scroll ── */}
              <ScrollView
                style={styles.composerScroll}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: insets.bottom + FOOTER_RESERVED_SPACE },
                ]}
              >
                {/* Tags + visibility row */}
                <View style={styles.tagsRow}>
                  <Pressable onPress={() => setTagModalVisible(true)} style={styles.tagChip}>
                    <Ionicons name="pricetag-outline" size={14} color={p.muted} />
                    <Text style={styles.tagChipText}>
                      {selectedTagMeta ? selectedTagMeta.label : "Add tags"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={p.muted} />
                  </Pressable>

                  <Pressable onPress={() => setVisibilityModalVisible(true)} style={styles.tagChip}>
                    <Ionicons
                      name={(selectedVisibilityMeta?.icon ?? "earth-outline") as any}
                      size={14}
                      color={p.muted}
                    />
                    <Text style={styles.tagChipText}>
                      {selectedVisibilityMeta?.label ?? "Visibility"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={p.muted} />
                  </Pressable>
                </View>

                {isPrivateCommunity && (
                  <Text style={styles.visibilityHintText}>
                    Public visibility is disabled in private communities.
                  </Text>
                )}

                {/* Tab content */}
                {postTab === "text" && <TextTab {...sharedTabProps} />}

                {postTab === "media" && (
                  <MediaTab
                    {...sharedTabProps}
                    attachments={attachments}
                    onPickMedia={pickMedia}
                    onReplaceAttachment={replaceAttachment}
                    onRemoveAttachment={removeAttachment}
                  />
                )}

                {postTab === "link" && (
                  <LinkTab
                    {...sharedTabProps}
                    linkUrl={linkUrl}
                    setLinkUrl={setLinkUrl}
                    linkPreview={linkPreview}
                    setErrors={setErrors}
                  />
                )}

                {postTab === "poll" && (
                  <PollTab
                    {...sharedTabProps}
                    pollQuestion={pollQuestion}
                    setPollQuestion={setPollQuestion}
                    pollOptions={pollOptions}
                    setPollOptions={setPollOptions}
                    pollClosesAt={pollClosesAt}
                    setPollClosesAt={setPollClosesAt}
                  />
                )}
              </ScrollView>

              {/* ── Footer ── */}
              <View style={[styles.footerWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <View style={styles.footerRow}>
                  {activeDraftId && (
                    <ComposerActionButton
                      label="New post"
                      variant="outline"
                      disabled={busy}
                      onPress={resetComposer}
                      styles={styles}
                    />
                  )}

                  <ComposerActionButton
                    label="Save Draft"
                    variant="secondary"
                    disabled={busy || isLoadingCommunities}
                    onPress={saveDraft}
                    styles={styles}
                  />

                  <ComposerActionButton
                    label="Post"
                    variant="primary"
                    disabled={busy || isLoadingCommunities}
                    onPress={publish}
                    styles={styles}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Modals ── */}
      <CommunityPickerModal
        visible={communityModalVisible}
        communities={filteredCommunities}
        selectedId={selectedCommunityId}
        searchValue={communitySearch}
        onSearchChange={setCommunitySearch}
        onSelect={setSelectedCommunityId}
        onClose={() => {
          setCommunityModalVisible(false);
          setCommunitySearch("");
        }}
      />

      <TagPickerModal
        visible={tagModalVisible}
        selectedTag={selectedTag}
        onSelect={setSelectedTag}
        onClose={() => setTagModalVisible(false)}
      />

      <VisibilityPickerModal
        visible={visibilityModalVisible}
        selectedVisibility={selectedVisibility}
        options={availableVisibilityOptions}
        onSelect={setSelectedVisibility}
        onClose={() => setVisibilityModalVisible(false)}
      />
    </SafeAreaView>
  );
} 