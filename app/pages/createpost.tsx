import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "heroui-native";

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
import {
  draftPostSchema,
  publishPostSchema,
  stripHtml,
} from "@/schema/post.schema";
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

type CommunityWithPurpose = {
  id: string;
  name: string;
  visibility?: string;
  purpose?: string;
};

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

function StartDiscussionButton({
  disabled,
  communityName,
  onPress,
  isDark,
  textColor,
  mutedColor,
  accentColor,
}: {
  disabled?: boolean;
  communityName?: string;
  onPress: () => void;
  isDark: boolean;
  textColor: string;
  mutedColor: string;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        borderRadius: 22,
        padding: 16,
        opacity: disabled ? 0.55 : 1,
        backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "#1E293B" : "#E2E8F0",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark
              ? "rgba(37, 99, 235, 0.18)"
              : "#DBEAFE",
          }}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={22}
            color={accentColor}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: textColor,
              fontSize: 15,
              fontWeight: "900",
            }}
          >
            Start Discussion
          </Text>

          <Text
            style={{
              marginTop: 3,
              color: mutedColor,
              fontSize: 12,
              lineHeight: 17,
              fontWeight: "500",
            }}
          >
            Ask a question, get answers, mark solution, and let members join the
            discussion
            {communityName ? ` in ${communityName}.` : "."}
          </Text>
        </View>

        <Ionicons name="arrow-forward-circle" size={26} color={accentColor} />
      </View>
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────
   Screen
────────────────────────────────────────────────────────────── */

export default function CreatePostScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  const isMountedRef = useRef(true);
  const uploadAbortRef = useRef<(() => void) | null>(null);
  const statusModalCloseActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      uploadAbortRef.current?.();
    };
  }, []);

  /* ──────────────────────────────────────────────────────────────
     Status modal state
  ────────────────────────────────────────────────────────────── */

  const [statusModal, setStatusModal] = useState<StatusModalState>({
    visible: false,
    variant: "success",
    title: "",
    message: "",
  });

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

  /* ──────────────────────────────────────────────────────────────
     UI state
  ────────────────────────────────────────────────────────────── */

  const [postTab, setPostTab] = useState<PostTab>("text");
  const [draftsTabActive, setDraftsTabActive] = useState(false);

  const [communitySearch, setCommunitySearch] = useState("");
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);

  /* ──────────────────────────────────────────────────────────────
     Post form state
  ────────────────────────────────────────────────────────────── */

  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [selectedTag, setSelectedTag] = useState<PostTag>("GENERAL");
  const [selectedVisibility, setSelectedVisibility] =
    useState<PostVisibility>("PUBLIC");

  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [html, setHtml] = useState("<p></p>");
  const [plainText, setPlainText] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // const canCreatePost = Boolean(targetCommunityId);

  /* ──────────────────────────────────────────────────────────────
     Poll state
  ────────────────────────────────────────────────────────────── */

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollClosesAt, setPollClosesAt] = useState("");

  const linkPreview = useMemo(() => parseLinkInput(linkUrl), [linkUrl]);

  /* ──────────────────────────────────────────────────────────────
     APIs
  ────────────────────────────────────────────────────────────── */

  const { data: communitiesResponse, isLoading: isLoadingCommunities } =
    useGetMyCommunitiesQuery({ page: 1, limit: 50 });

  const allJoinedCommunities =
    (communitiesResponse?.data ?? []) as CommunityWithPurpose[];

  /*
   * Official district community is received from backend.
   * It is hidden from dropdown, but used automatically as fallback target.
   */
  const officialCommunity = useMemo(
    () =>
      allJoinedCommunities.find(
        (community) => community.purpose === "DISTRICT_OFFICIAL",
      ),
    [allJoinedCommunities],
  );

  /*
   * Only normal communities are visible in select dropdown.
   */
  const communities = useMemo(
    () =>
      allJoinedCommunities.filter(
        (community) => community.purpose !== "DISTRICT_OFFICIAL",
      ),
    [allJoinedCommunities],
  );

  const { data: draftsResponse, isLoading: isLoadingDrafts } =
    useGetMyDraftsQuery({ limit: 50 });

  const allDrafts = (draftsResponse?.data ?? []) as CommunityPost[];

  /*
   * Drafts from visible communities and hidden official district community are allowed.
   */
  const drafts = useMemo(() => {
    const allowedCommunityIds = new Set(
      [
        ...communities.map((community) => community.id),
        officialCommunity?.id,
      ].filter(Boolean) as string[],
    );

    return allDrafts.filter((draft) =>
      allowedCommunityIds.has(draft.communityId),
    );
  }, [allDrafts, communities, officialCommunity?.id]);

  const [uploadPostMedia, { isLoading: isUploadingMedia }] =
    useUploadPostMediaMutation();
  const [createPublishedPost, { isLoading: isCreatingPost }] =
    useCreatePublishedPostMutation();
  const [createDraftPost, { isLoading: isCreatingDraft }] =
    useCreateDraftPostMutation();
  const [updatePost, { isLoading: isUpdatingPost }] =
    useUpdatePostMutation();
  const [publishDraft, { isLoading: isPublishingDraft }] =
    usePublishDraftMutation();
  const [deletePost] = useDeletePostMutation();

  const busy =
    isUploadingMedia ||
    isCreatingPost ||
    isCreatingDraft ||
    isUpdatingPost ||
    isPublishingDraft;

  /* ──────────────────────────────────────────────────────────────
     Editor
  ────────────────────────────────────────────────────────────── */

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

  /* ──────────────────────────────────────────────────────────────
     Community state
  ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (isLoadingCommunities) return;

    if (communities.length === 0) {
      if (selectedCommunityId) {
        setSelectedCommunityId("");
      }

      return;
    }

    const selectedCommunityStillExists = communities.some(
      (community) => community.id === selectedCommunityId,
    );

    if (!selectedCommunityId || !selectedCommunityStillExists) {
      setSelectedCommunityId(communities[0].id);
    }
  }, [communities, isLoadingCommunities, selectedCommunityId]);

  const filteredCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();

    if (!q) return communities;

    return communities.filter((community) =>
      community.name.toLowerCase().includes(q),
    );
  }, [communities, communitySearch]);

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedCommunityId),
    [communities, selectedCommunityId],
  );

  /*
   * Target rule:
   * 1. If normal community selected, post there.
   * 2. If no normal community selected, post to hidden official district community.
   */
  const targetCommunityId = selectedCommunity?.id ?? officialCommunity?.id ?? "";

  const targetCommunityName =
    selectedCommunity?.name ?? officialCommunity?.name ?? "";

  const canCreatePost = Boolean(targetCommunityId);

  const isPrivateCommunity = selectedCommunity?.visibility === "PRIVATE";

  const availableVisibilityOptions = useMemo(
    () =>
      isPrivateCommunity
        ? POST_VISIBILITY_OPTIONS.filter((item) => item.value !== "PUBLIC")
        : POST_VISIBILITY_OPTIONS,
    [isPrivateCommunity],
  );

  const selectedTagMeta = useMemo(
    () => TAG_OPTIONS.find((tag) => tag.value === selectedTag),
    [selectedTag],
  );

  const selectedVisibilityMeta = useMemo(
    () =>
      POST_VISIBILITY_OPTIONS.find(
        (item) => item.value === selectedVisibility,
      ),
    [selectedVisibility],
  );

  useEffect(() => {
    if (isPrivateCommunity && selectedVisibility === "PUBLIC") {
      setSelectedVisibility("COMMUNITY");
    }
  }, [isPrivateCommunity, selectedVisibility]);

  /* ──────────────────────────────────────────────────────────────
     Helpers
  ────────────────────────────────────────────────────────────── */

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

  const clearComposerAfterPost = useCallback(() => {
    setActiveDraftId(null);

    /*
     * Do not clear selectedCommunityId.
     * User may want to post again in the same normal community.
     * If no normal community exists, official district remains automatic fallback.
     */
    setSelectedTag("GENERAL");
    setSelectedVisibility("PUBLIC");

    setTitle("");
    setLinkUrl("");
    setHtml("<p></p>");
    setPlainText("");

    setAttachments([]);
    setErrors({});
    setPostTab("text");

    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollClosesAt("");

    setCommunitySearch("");
    setCommunityModalVisible(false);
    setTagModalVisible(false);
    setVisibilityModalVisible(false);
    setDraftsTabActive(false);

    safeSetContent("<p></p>");
  }, [safeSetContent]);

  const handleHtmlChange = useCallback((value: string) => {
    setHtml(value);
    setPlainText(stripHtml(value ?? ""));
  }, []);

 const showNoCommunityModal = useCallback(() => {
  showStatusModal(
    "danger",
    "Community not found",
    "You are not connected to any community where a post can be created.",
  );
}, [showStatusModal]);

const handleStartDiscussion = useCallback(() => {
  if (!targetCommunityId) {
    showNoCommunityModal();
    return;
  }

  router.push({
    pathname: "/discussions/create",
    params: {
      communityId: targetCommunityId,
      communityName: targetCommunityName,
    },
  });
}, [targetCommunityId, targetCommunityName, showNoCommunityModal]);

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
      quality: 0.85,
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
    showStatusModal,
  ]);

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

  /* ──────────────────────────────────────────────────────────────
     Upload helper
  ────────────────────────────────────────────────────────────── */

 const buildUploadedMediaPayload = async (): Promise<CommunityPostMedia[]> => {
  const remoteMedia: CommunityPostMedia[] = attachments
    .filter((attachment) => attachment.source === "remote")
    .map((attachment, index) => ({
      type: "IMAGE",
      url: attachment.uri,
      sortOrder: index,
    }));

  const localMedia = attachments.filter(
    (attachment) => attachment.source === "local"
  );

  if (!localMedia.length) {
    return remoteMedia.map((media, index) => ({ ...media, sortOrder: index }));
  }

  try {
    const uploadPromise = uploadPostMedia({
      files: localMedia.map((attachment) => ({
        uri: attachment.uri,
        name: attachment.name,
        mimeType: attachment.mimeType,
      })),
    });

    uploadAbortRef.current = () => uploadPromise.abort();

    const uploadResponse = (await uploadPromise.unwrap()) as UploadPostMediaResponse;

    if (!isMountedRef.current) {
      throw new Error("UNMOUNTED");
    }

    uploadAbortRef.current = null;

    const uploaded: CommunityPostMedia[] = uploadResponse.items.map(
      (item: UploadPostMediaItem, index: number) => ({
        type: "IMAGE",
        url: item.url,
        sortOrder: remoteMedia.length + index,
      })
    );

    return [...remoteMedia, ...uploaded].map((media, index) => ({
      ...media,
      sortOrder: index,
    }));
  } catch (error: any) {
    // IMPORTANT: Clear upload abort
    uploadAbortRef.current = null;

    // Optional: Remove failed local attachments so user can re-pick
    // setAttachments(prev => prev.filter(a => a.source === "remote"));

    throw error; // re-throw so publish() can catch it
  }
};

  /* ──────────────────────────────────────────────────────────────
     Poll helper
  ────────────────────────────────────────────────────────────── */

  const buildPollPayload = useCallback(
    (requireValid: boolean): PostPollPayload | undefined => {
      if (postTab !== "poll") return undefined;

      const question = pollQuestion.trim();
      const options = pollOptions.map((option) => option.trim()).filter(Boolean);
      const closesAt = pollClosesAt.trim();

      if (!question && options.length === 0) return undefined;

      if (!question) {
        if (requireValid) {
          setErrors((prev) => ({
            ...prev,
            poll: "Poll question is required.",
          }));
        }

        return undefined;
      }

      if (options.length < 2) {
        if (requireValid) {
          setErrors((prev) => ({
            ...prev,
            poll: "Poll must have at least 2 options.",
          }));
        }

        return undefined;
      }

      const uniqueOptions = new Set(
        options.map((option) => option.toLowerCase()),
      );

      if (uniqueOptions.size !== options.length) {
        if (requireValid) {
          setErrors((prev) => ({
            ...prev,
            poll: "Poll options must be unique.",
          }));
        }

        return undefined;
      }

      if (closesAt) {
        const parsedDate = new Date(closesAt);

        if (Number.isNaN(parsedDate.getTime())) {
          if (requireValid) {
            setErrors((prev) => ({
              ...prev,
              poll: "Poll close date must be valid.",
            }));
          }

          return undefined;
        }

        return {
          question,
          options,
          closesAt: parsedDate.toISOString(),
        };
      }

      return {
        question,
        options,
      };
    },
    [pollClosesAt, pollOptions, pollQuestion, postTab],
  );

  /* ──────────────────────────────────────────────────────────────
     Save draft
  ────────────────────────────────────────────────────────────── */

  const saveDraft = async () => {
    try {
      setErrors({});

      if (!targetCommunityId) {
        showNoCommunityModal();
        return;
      }

      const media = postTab === "media" ? await buildUploadedMediaPayload() : [];
      const poll = buildPollPayload(false);
      const cleanLinkUrl =
        postTab === "link" ? linkPreview?.cleanUrl ?? linkUrl.trim() : "";

      const parsed = draftPostSchema.safeParse({
        communityId: targetCommunityId,
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
        if (isMountedRef.current) {
          setErrors(flattenErrors(parsed.error.issues));
        }

        return;
      }

      const createBody = {
        title: title.trim() || undefined,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : undefined,
        linkUrl:
          postTab === "link"
            ? parsed.data.linkUrl?.trim() || undefined
            : undefined,
        media: postTab === "media" ? media : [],
        poll: postTab === "poll" ? poll : undefined,
      };

      const updateBody = {
        title: title.trim() || null,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : null,
        linkUrl:
          postTab === "link"
            ? parsed.data.linkUrl?.trim() || null
            : null,
        media: postTab === "media" ? media : [],
      };

      if (activeDraftId) {
        await updatePost({
          communityId: targetCommunityId,
          postId: activeDraftId,
          body: updateBody,
        }).unwrap();

        if (isMountedRef.current) {
          showStatusModal(
            "success",
            "Draft updated",
            "Your draft has been updated successfully.",
          );
        }
      } else {
        const created = await createDraftPost({
          communityId: targetCommunityId,
          body: createBody,
        }).unwrap();

        if (isMountedRef.current) {
          setActiveDraftId(created.id);

          showStatusModal(
            "success",
            "Draft saved",
            "Your draft has been saved successfully.",
          );
        }
      }

      if (isMountedRef.current) {
        setDraftsTabActive(true);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusModal(
          "danger",
          "Could not save draft",
          error?.data?.message ?? "Please try again.",
        );
      }
    }
  };

  /* ──────────────────────────────────────────────────────────────
     Publish
  ────────────────────────────────────────────────────────────── */

  const publish = async () => {
    try {
      setErrors({});

      if (!targetCommunityId) {
        showNoCommunityModal();
        return;
      }

      const media = postTab === "media" ? await buildUploadedMediaPayload() : [];
      const poll = buildPollPayload(true);

      if (postTab === "poll" && !poll) return;

      const cleanLinkUrl =
        postTab === "link" ? linkPreview?.cleanUrl ?? linkUrl.trim() : "";

      const parsed = publishPostSchema.safeParse({
        communityId: targetCommunityId,
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
        if (isMountedRef.current) {
          setErrors(flattenErrors(parsed.error.issues));
        }

        return;
      }

      const createBody = {
        title: title.trim() || undefined,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : undefined,
        linkUrl:
          postTab === "link"
            ? parsed.data.linkUrl?.trim() || undefined
            : undefined,
        media: postTab === "media" ? media : [],
        poll: postTab === "poll" ? poll : undefined,
      };

      const updateBody = {
        title: title.trim() || null,
        tag: parsed.data.tag,
        visibility: selectedVisibility,
        content: plainText.trim() ? parsed.data.html : null,
        linkUrl:
          postTab === "link"
            ? parsed.data.linkUrl?.trim() || null
            : null,
        media: postTab === "media" ? media : [],
      };

      if (activeDraftId) {
        await updatePost({
          communityId: targetCommunityId,
          postId: activeDraftId,
          body: updateBody,
        }).unwrap();

        await publishDraft({
          communityId: targetCommunityId,
          postId: activeDraftId,
        }).unwrap();
      } else {
        await createPublishedPost({
          communityId: targetCommunityId,
          body: createBody,
        }).unwrap();
      }

      if (isMountedRef.current) {
        clearComposerAfterPost();

        showStatusModal(
          "success",
          "Post posted",
          targetCommunityName
            ? `Your post has been posted successfully in ${targetCommunityName}.`
            : "Your post has been posted successfully.",
        );
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusModal(
          "danger",
          "Could not post",
          error?.data?.message ?? "Please try again.",
        );
      }
    }
  };

  /* ──────────────────────────────────────────────────────────────
     Draft management
  ────────────────────────────────────────────────────────────── */

  const openDraft = useCallback(
    (draft: CommunityPost) => {
      const isVisibleCommunityDraft = communities.some(
        (community) => community.id === draft.communityId,
      );

      const isOfficialCommunityDraft =
        officialCommunity?.id === draft.communityId;

      if (!isVisibleCommunityDraft && !isOfficialCommunityDraft) {
        showStatusModal(
          "danger",
          "Draft unavailable",
          "This draft belongs to a community that is not available anymore.",
        );

        return;
      }

      setActiveDraftId(draft.id);
      setSelectedCommunityId(isVisibleCommunityDraft ? draft.communityId : "");
      setSelectedTag(draft.tag);
      setSelectedVisibility(draft.visibility ?? "PUBLIC");
      setTitle(draft.title ?? "");
      setLinkUrl(draft.linkUrl ?? "");
      setHtml(draft.content ?? "<p></p>");
      setPlainText(stripHtml(draft.content ?? ""));

      setAttachments(
        draft.media.map((media) => ({
          id: media.id ?? makeId("remote"),
          source: "remote" as const,
          uri: media.url,
          mediaType: media.type,
        })),
      );

      if (draft.poll) {
        setPostTab("poll");
        setPollQuestion(draft.poll.question ?? "");
        setPollOptions(
          draft.poll.options?.length
            ? draft.poll.options.map((option) => option.text)
            : ["", ""],
        );
        setPollClosesAt(draft.poll.closesAt ?? "");
      } else {
        resetPoll();

        if (draft.media?.length) {
          setPostTab("media");
        } else if (draft.linkUrl) {
          setPostTab("link");
        } else {
          setPostTab("text");
        }
      }

      setErrors({});
      setDraftsTabActive(false);
      safeSetContent(draft.content ?? "<p></p>");
    },
    [
      communities,
      officialCommunity?.id,
      resetPoll,
      safeSetContent,
      showStatusModal,
    ],
  );

  const deleteDraft = useCallback(
    async (draft: CommunityPost) => {
      try {
        await deletePost({
          communityId: draft.communityId,
          postId: draft.id,
        }).unwrap();

        if (!isMountedRef.current) return;

        if (activeDraftId === draft.id) {
          resetComposer();
        }

        showStatusModal(
          "success",
          "Draft deleted",
          "The selected draft has been removed.",
        );
      } catch (error: any) {
        if (isMountedRef.current) {
          showStatusModal(
            "danger",
            "Could not delete draft",
            error?.data?.message ?? "Please try again.",
          );
        }
      }
    },
    [
      activeDraftId,
      deletePost,
      resetComposer,
      showStatusModal,
    ],
  );

  /* ──────────────────────────────────────────────────────────────
     Derived
  ────────────────────────────────────────────────────────────── */

const titleRequired = false;     

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

  /* ──────────────────────────────────────────────────────────────
     Render
  ────────────────────────────────────────────────────────────── */

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.contentWrap}>
          {/* Top bar */}
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
              onPress={() => setDraftsTabActive((value) => !value)}
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
              {/* Community selector */}
              <View style={styles.communityBar}>
                <Pressable
                  onPress={() => {
                    if (communities.length === 0) {
                      if (officialCommunity) {
                        showStatusModal(
                          "success",
                          "Auto district community",
                          "Your official district community is hidden from the selector but will be used automatically.",
                        );
                        return;
                      }

                      showNoCommunityModal();
                      return;
                    }

                    setCommunityModalVisible(true);
                  }}
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
                      : selectedCommunity?.name ??
                        (officialCommunity ? "Auto district community" : "Select Community")}
                  </Text>

                  <Ionicons name="chevron-down" size={16} color={p.muted} />
                </Pressable>
              </View>

              {!isLoadingCommunities && communities.length === 0 && officialCommunity && (
                <Text style={styles.visibilityHintText}>
                  Official district community is hidden but selected automatically.
                </Text>
              )}

              {!isLoadingCommunities && !canCreatePost && (
                <Text style={styles.visibilityHintText}>
                  You need to join a community before creating a post.
                </Text>
              )}
              <StartDiscussionButton
  disabled={busy || isLoadingCommunities || !canCreatePost}
  communityName={targetCommunityName}
  onPress={handleStartDiscussion}
  isDark={isDark}
  textColor={p.text}
  mutedColor={p.muted}
  accentColor={colors.accent}
/>

              {/* Post type tabs */}
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

                      <Tabs.Trigger value="text">
                        <Tabs.Label>Text</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="media">
                        <Tabs.Label>Images</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="link">
                        <Tabs.Label>Link</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="poll">
                        <Tabs.Label>Poll</Tabs.Label>
                      </Tabs.Trigger>
                    </Tabs.ScrollView>
                  </Tabs.List>
                </Tabs>
              </View>

              {/* Composer */}
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
                <View style={styles.tagsRow}>
                  <Pressable
                    onPress={() => setTagModalVisible(true)}
                    style={styles.tagChip}
                  >
                    <Ionicons name="pricetag-outline" size={14} color={p.muted} />

                    <Text style={styles.tagChipText}>
                      {selectedTagMeta ? selectedTagMeta.label : "Add tags"}
                    </Text>

                    <Ionicons name="chevron-down" size={14} color={p.muted} />
                  </Pressable>

                  <Pressable
                    onPress={() => setVisibilityModalVisible(true)}
                    style={styles.tagChip}
                  >
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

              {/* Footer */}
              <View
                style={[
                  styles.footerWrap,
                  { paddingBottom: Math.max(insets.bottom, 10) },
                ]}
              >
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
                    disabled={busy || isLoadingCommunities || !canCreatePost}
                    onPress={saveDraft}
                    styles={styles}
                  />

                  <ComposerActionButton
                    label="Post"
                    variant="primary"
                    disabled={busy || isLoadingCommunities || !canCreatePost}
                    onPress={publish}
                    styles={styles}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

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