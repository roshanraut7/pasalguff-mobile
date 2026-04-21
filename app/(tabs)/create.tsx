import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, useToast } from "heroui-native";
import { useBridgeState } from "@10play/tentap-editor";

import { COLORS } from "@/constants/colors";
import {
  CommunityPost,
  CommunityPostMedia,
  PostMediaType,
  PostTag,
  useCreateCommunityDraftMutation,
  useCreateCommunityPostMutation,
  useDeleteCommunityPostMutation,
  useGetMyDraftsQuery,
  usePublishCommunityDraftMutation,
  useUpdateCommunityPostMutation,
  useUploadPostMediaMutation,
} from "@/store/api/postApi";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import {
  AppRichTextEditor,
  useCreateEditor,
} from "@/components/editor/editor";
import { DraftPostsPanel } from "@/components/post/DraftPostsPanel";
import {
  POST_TAGS,
  draftPostSchema,
  publishPostSchema,
  stripHtml,
} from "@/schema/post.schema";

// ─── Types ───────────────────────────────────────────────────────────────────

type ComposerAttachment = {
  id: string;
  source: "local" | "remote";
  uri: string;
  mediaType: PostMediaType;
  name?: string;
  mimeType?: string;
};

type PostTab = "text" | "media" | "link";

type TagOptionMeta = {
  value: PostTag;
  label: string;
  description: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TAG_DESCRIPTIONS: Record<PostTag, string> = {
  GENERAL: "General update or everyday post",
  ANNOUNCEMENT: "Important notice for members",
  QUESTION: "Ask the community for help",
  OFFER: "Share products, deals, or promotions",
  EVENT: "Events, launches, and meetups",
  NEWS: "Industry or community news",
  HELP: "Support request or urgent assistance",
};

const TAG_OPTIONS: TagOptionMeta[] = POST_TAGS.map((tag) => ({
  value: tag,
  label: tag.charAt(0) + tag.slice(1).toLowerCase(),
  description: TAG_DESCRIPTIONS[tag],
}));

const MAX_ATTACHMENTS = 10;

let _idCounter = 0;
function makeId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter}`;
}

// ─── Community Picker Modal ───────────────────────────────────────────────────

type CommunityPickerModalProps = {
  visible: boolean;
  communities: {
    id: string;
    name: string;
    memberCount?: number | null;
    description?: string | null;
    avatarImage?: string | null;
  }[];
  selectedId: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
  isDark: boolean;
};

function CommunityPickerModal({
  visible,
  communities,
  selectedId,
  searchValue,
  onSearchChange,
  onSelect,
  onClose,
  isDark,
}: CommunityPickerModalProps) {
  const p = {
    backdrop: "rgba(0,0,0,0.3)",
    overlay: isDark ? "#0b3f20" : "#ffffff",
    surface: isDark ? "#14532d" : "#f8fffa",
    text: isDark ? "#f0fdf4" : COLORS.text,
    muted: isDark ? "#a7f3d0" : COLORS.muted,
    border: isDark ? "#166534" : COLORS.border,
    placeholder: isDark ? "#a7f3d0" : COLORS.placeholder,
    selected: isDark ? "#166534" : "#dcfce7",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: p.backdrop }]}
          onPress={onClose}
        >
          <Pressable
            style={[
              styles.pickerOverlay,
              { backgroundColor: p.overlay, borderColor: p.border },
            ]}
            onPress={() => {}}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: p.text }]}>Post to</Text>
              <Pressable
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: p.surface, borderColor: p.border },
                ]}
              >
                <Ionicons name="close" size={18} color={p.text} />
              </Pressable>
            </View>

            <View
              style={[
                styles.searchRow,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={p.muted} />
              <TextInput
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder="Search communities"
                placeholderTextColor={p.placeholder}
                style={[styles.searchInput, { color: p.text }]}
                returnKeyType="search"
                autoCorrect={false}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerList}
              keyboardShouldPersistTaps="handled"
            >
              {communities.length === 0 ? (
                <Text style={[styles.emptyText, { color: p.muted }]}>
                  No community found
                </Text>
              ) : (
                communities.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      style={[
                        styles.communityRow,
                        {
                          borderBottomColor: p.border,
                          backgroundColor: isSelected ? p.selected : "transparent",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.communityAvatar,
                          { backgroundColor: p.surface, borderColor: p.border },
                        ]}
                      >
                        {item.avatarImage ? (
                          <Image
                            source={{ uri: item.avatarImage }}
                            style={styles.communityAvatarImg}
                          />
                        ) : (
                          <Text
                            style={[styles.communityAvatarText, { color: p.muted }]}
                          >
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.communityName, { color: p.text }]}>
                          {item.name}
                        </Text>
                        {item.memberCount != null && (
                          <Text style={[styles.communityMeta, { color: p.muted }]}>
                            {item.memberCount.toLocaleString()} members · Joined
                          </Text>
                        )}
                        {!!item.description && (
                          <Text
                            numberOfLines={1}
                            style={[styles.communityDesc, { color: p.muted }]}
                          >
                            {item.description}
                          </Text>
                        )}
                      </View>

                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={COLORS.primary}
                        />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Tag Picker Modal ─────────────────────────────────────────────────────────

type TagPickerModalProps = {
  visible: boolean;
  selectedTag: PostTag;
  onSelect: (tag: PostTag) => void;
  onClose: () => void;
  isDark: boolean;
};

function TagPickerModal({
  visible,
  selectedTag,
  onSelect,
  onClose,
  isDark,
}: TagPickerModalProps) {
  const p = {
    backdrop: "rgba(0,0,0,0.3)",
    overlay: isDark ? "#0b3f20" : "#ffffff",
    surface: isDark ? "#14532d" : "#f8fffa",
    text: isDark ? "#f0fdf4" : COLORS.text,
    muted: isDark ? "#a7f3d0" : COLORS.muted,
    border: isDark ? "#166534" : COLORS.border,
    selected: isDark ? "#166534" : "#dcfce7",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: p.backdrop }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.pickerOverlay,
            { backgroundColor: p.overlay, borderColor: p.border },
          ]}
          onPress={() => {}}
        >
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: p.text }]}>Choose tag</Text>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <Ionicons name="close" size={18} color={p.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerList}
          >
            {TAG_OPTIONS.map((item) => {
              const isSelected = item.value === selectedTag;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  style={[
                    styles.tagRow,
                    {
                      borderColor: p.border,
                      backgroundColor: isSelected ? p.selected : p.surface,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tagLabel, { color: p.text }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.tagDesc, { color: p.muted }]}>
                      {item.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreatePostScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const p = {
    screen: isDark ? "#052e16" : COLORS.background,
    card: isDark ? "#0b3f20" : COLORS.card,
    soft: isDark ? "#14532d" : "#f8fffa",
    text: isDark ? "#f0fdf4" : COLORS.text,
    muted: isDark ? "#a7f3d0" : COLORS.muted,
    border: isDark ? "#166534" : COLORS.border,
    input: isDark ? "#14532d" : COLORS.card,
    placeholder: isDark ? "#a7f3d0" : COLORS.placeholder,
    danger: COLORS.danger,
    divider: isDark ? "#166534" : "#e8f5e9",
    iconSurface: isDark ? "rgba(5,46,22,0.9)" : "rgba(255,255,255,0.95)",
    iconBorder: isDark ? "#166534" : "#d1fae5",
    badgeBg: isDark ? "rgba(5,46,22,0.85)" : "rgba(255,255,255,0.92)",
  };

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
            color={variant === "success" ? COLORS.primary : COLORS.danger}
          />
        ),
      });
    },
    [toast]
  );

  // ── State ──
  const [postTab, setPostTab] = useState<PostTab>("text");
  const [draftsTabActive, setDraftsTabActive] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [selectedTag, setSelectedTag] = useState<PostTag>("GENERAL");
  const [linkUrl, setLinkUrl] = useState("");
  const [html, setHtml] = useState("<p></p>");
  const [plainText, setPlainText] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Queries ──
  const { data: communities = [], isLoading: isLoadingCommunities } =
    useGetMyCommunitiesQuery();
  const { data: drafts = [], isLoading: isLoadingDrafts } = useGetMyDraftsQuery();

  const [uploadPostMedia, { isLoading: isUploadingMedia }] =
    useUploadPostMediaMutation();
  const [createCommunityPost, { isLoading: isCreatingPost }] =
    useCreateCommunityPostMutation();
  const [createCommunityDraft, { isLoading: isCreatingDraft }] =
    useCreateCommunityDraftMutation();
  const [updateCommunityPost, { isLoading: isUpdatingPost }] =
    useUpdateCommunityPostMutation();
  const [publishCommunityDraft, { isLoading: isPublishingDraft }] =
    usePublishCommunityDraftMutation();
  const [deleteCommunityPost] = useDeleteCommunityPostMutation();

  const busy =
    isUploadingMedia ||
    isCreatingPost ||
    isCreatingDraft ||
    isUpdatingPost ||
    isPublishingDraft;

  // ── Editor ──
  const editor = useCreateEditor(isDark);

  const bridgeState = useBridgeState(editor);
  const isEditorReady = bridgeState?.isReady ?? false;
  const isEditorReadyRef = useRef(false);
  const pendingContentRef = useRef<string | null>(null);

  useEffect(() => {
    isEditorReadyRef.current = isEditorReady;

    if (isEditorReady && pendingContentRef.current !== null) {
      editor.setContent(pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, [isEditorReady, editor]);

  const safeSetContent = useCallback(
    (content: string) => {
      if (isEditorReadyRef.current) {
        editor.setContent(content);
      } else {
        pendingContentRef.current = content;
      }
    },
    [editor]
  );

  // ── Defaults ──
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
    [communities, selectedCommunityId]
  );

  const selectedTagMeta = useMemo(
    () => TAG_OPTIONS.find((t) => t.value === selectedTag),
    [selectedTag]
  );

  // ── Helpers ──
  const resetComposer = useCallback(() => {
    setActiveDraftId(null);
    setSelectedTag("GENERAL");
    setLinkUrl("");
    setHtml("<p></p>");
    setPlainText("");
    setAttachments([]);
    setErrors({});
    setPostTab("text");
    safeSetContent("<p></p>");
  }, [safeSetContent]);

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
      showStatusToast(
        "danger",
        "Permission required",
        "Media library permission is required."
      );
      return false;
    }

    return true;
  }, [showStatusToast]);

  const pickMedia = useCallback(async () => {
    const hasPermission = await ensureMediaPermission();
    if (!hasPermission) return;

    if (attachments.length >= MAX_ATTACHMENTS) {
      showStatusToast(
        "danger",
        "Limit reached",
        `You can upload up to ${MAX_ATTACHMENTS} files only.`
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    const mapped: ComposerAttachment[] = result.assets.map((asset, i) => ({
      id: makeId(`local-${i}`),
      source: "local",
      uri: asset.uri,
      mediaType: asset.type === "video" ? "VIDEO" : "IMAGE",
      name: asset.fileName ?? undefined,
      mimeType:
        asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
    }));

    setAttachments((prev) => [...prev, ...mapped].slice(0, MAX_ATTACHMENTS));
  }, [attachments.length, ensureMediaPermission, showStatusToast]);

  const replaceAttachment = useCallback(
    async (id: string) => {
      const hasPermission = await ensureMediaPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
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
                mediaType: asset.type === "video" ? "VIDEO" : "IMAGE",
                name: asset.fileName ?? undefined,
                mimeType:
                  asset.mimeType ??
                  (asset.type === "video" ? "video/mp4" : "image/jpeg"),
              }
            : item
        )
      );
    },
    [ensureMediaPermission]
  );

  const flattenErrors = (issues: { path: PropertyKey[]; message: string }[]) => {
    const next: Record<string, string> = {};
    for (const issue of issues) {
      const key = String(issue.path[0] ?? "root");
      if (!next[key]) next[key] = issue.message;
    }
    return next;
  };

  const uploadAbortRef = useRef<(() => void) | null>(null);

  const buildUploadedMediaPayload = async (): Promise<CommunityPostMedia[]> => {
    const remoteMedia = attachments
      .filter((a) => a.source === "remote")
      .map((a, i) => ({
        type: a.mediaType,
        url: a.uri,
        sortOrder: i,
      }));

    const localMedia = attachments.filter((a) => a.source === "local");

    if (!localMedia.length) {
      return remoteMedia.map((a, i) => ({ ...a, sortOrder: i }));
    }

    const uploadPromise = uploadPostMedia({
      files: localMedia.map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType,
        mediaType: a.mediaType,
      })),
    });

    uploadAbortRef.current = () => uploadPromise.abort();
    const uploadResponse = await uploadPromise.unwrap();

    if (!isMountedRef.current) throw new Error("UNMOUNTED");

    uploadAbortRef.current = null;

    const uploaded = uploadResponse.items.map((item, i) => ({
      type: localMedia[i].mediaType,
      url: item.url,
      sortOrder: remoteMedia.length + i,
    })) as CommunityPostMedia[];

    return [...remoteMedia, ...uploaded].map((a, i) => ({
      ...a,
      sortOrder: i,
    }));
  };

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.();
    };
  }, []);

  // ── Actions ──
  const saveDraft = async () => {
    try {
      setErrors({});
      let media: CommunityPostMedia[];

      try {
        media = await buildUploadedMediaPayload();
      } catch (err: any) {
        if (err?.message === "UNMOUNTED") return;
        throw err;
      }

      const parsed = draftPostSchema.safeParse({
        communityId: selectedCommunityId,
        tag: selectedTag,
        html,
        plainText,
        linkUrl,
        media,
      });

      if (!parsed.success) {
        if (isMountedRef.current) {
          setErrors(flattenErrors(parsed.error.issues));
        }
        return;
      }

      const body = {
        tag: parsed.data.tag,
        content: parsed.data.html,
        linkUrl: parsed.data.linkUrl || null,
        media,
      };

      if (activeDraftId) {
        await updateCommunityPost({
          communityId: selectedCommunityId,
          postId: activeDraftId,
          body,
        }).unwrap();

        if (isMountedRef.current) {
          showStatusToast(
            "success",
            "Draft updated",
            "Your draft has been updated."
          );
        }
      } else {
        const created = await createCommunityDraft({
          communityId: selectedCommunityId,
          body,
        }).unwrap();

        if (isMountedRef.current) {
          setActiveDraftId(created.id);
          showStatusToast(
            "success",
            "Draft saved",
            "Your draft has been saved."
          );
        }
      }

      if (isMountedRef.current) setDraftsTabActive(true);
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusToast(
          "danger",
          "Could not save draft",
          error?.data?.message ?? "Try again."
        );
      }
    }
  };

  const publish = async () => {
    try {
      setErrors({});
      let media: CommunityPostMedia[];

      try {
        media = await buildUploadedMediaPayload();
      } catch (err: any) {
        if (err?.message === "UNMOUNTED") return;
        throw err;
      }

      const parsed = publishPostSchema.safeParse({
        communityId: selectedCommunityId,
        tag: selectedTag,
        html,
        plainText,
        linkUrl,
        media,
      });

      if (!parsed.success) {
        if (isMountedRef.current) {
          setErrors(flattenErrors(parsed.error.issues));
        }
        return;
      }

      const body = {
        tag: parsed.data.tag,
        content: parsed.data.html,
        linkUrl: parsed.data.linkUrl || null,
        media,
      };

      if (activeDraftId) {
        await updateCommunityPost({
          communityId: selectedCommunityId,
          postId: activeDraftId,
          body,
        }).unwrap();

        await publishCommunityDraft({
          communityId: selectedCommunityId,
          postId: activeDraftId,
        }).unwrap();
      } else {
        await createCommunityPost({
          communityId: selectedCommunityId,
          body,
        }).unwrap();
      }

      if (isMountedRef.current) {
        showStatusToast(
          "success",
          "Post published",
          "Your post is now visible in the community."
        );
        resetComposer();
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusToast(
          "danger",
          "Could not publish",
          error?.data?.message ?? "Try again."
        );
      }
    }
  };

  const openDraft = useCallback(
    (draft: CommunityPost) => {
      setActiveDraftId(draft.id);
      setSelectedCommunityId(draft.communityId);
      setSelectedTag(draft.tag);
      setLinkUrl(draft.linkUrl ?? "");
      setHtml(draft.content ?? "<p></p>");
      setPlainText(stripHtml(draft.content ?? ""));
      setAttachments(
        draft.media.map((m) => ({
          id: m.id ?? makeId("remote"),
          source: "remote" as const,
          uri: m.url,
          mediaType: m.type,
        }))
      );
      setErrors({});
      setDraftsTabActive(false);
      setPostTab("text");
      safeSetContent(draft.content ?? "<p></p>");
    },
    [safeSetContent]
  );

  const deleteDraft = useCallback(
    async (draft: CommunityPost) => {
      try {
        await deleteCommunityPost({
          communityId: draft.communityId,
          postId: draft.id,
        }).unwrap();

        if (!isMountedRef.current) return;

        if (activeDraftId === draft.id) resetComposer();

        showStatusToast(
          "success",
          "Draft deleted",
          "The selected draft has been removed."
        );
      } catch (error: any) {
        if (isMountedRef.current) {
          showStatusToast(
            "danger",
            "Could not delete draft",
            error?.data?.message ?? "Try again."
          );
        }
      }
    },
    [activeDraftId, deleteCommunityPost, resetComposer, showStatusToast]
  );

  const renderMediaTile = useCallback(
    (item: ComposerAttachment, index: number) => {
      const isImage = item.mediaType === "IMAGE";

      return (
        <View
          key={item.id}
          style={[
            styles.mediaTile,
            index % 3 !== 2 && styles.mediaTileGap,
            { backgroundColor: p.soft, borderColor: p.border },
          ]}
        >
          <View style={styles.mediaPreviewWrap}>
            {isImage ? (
              <Image
                source={{ uri: item.uri }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.mediaVideoBox, { backgroundColor: p.soft }]}>
                <Ionicons name="videocam-outline" size={22} color={p.text} />
                <Text style={[styles.videoText, { color: p.text }]}>Video</Text>
              </View>
            )}

            <View style={styles.mediaActionRow}>
              <Pressable
                onPress={() => replaceAttachment(item.id)}
                style={[
                  styles.mediaActionBtn,
                  {
                    backgroundColor: p.iconSurface,
                    borderColor: p.iconBorder,
                  },
                ]}
              >
                <Ionicons name="create-outline" size={15} color={p.text} />
              </Pressable>

              <Pressable
                onPress={() => removeAttachment(item.id)}
                style={[
                  styles.mediaActionBtn,
                  {
                    backgroundColor: p.iconSurface,
                    borderColor: p.iconBorder,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
              </Pressable>
            </View>

            <View
              style={[
                styles.mediaBadge,
                {
                  backgroundColor: p.badgeBg,
                  borderColor: p.iconBorder,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.mediaBadgeText, { color: p.text }]}
              >
                {item.source === "local" ? "Ready" : "Uploaded"}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [p, removeAttachment, replaceAttachment]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.screen }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1 }}>
          <View style={[styles.topBar, { borderBottomColor: p.divider }]}>
            <Text style={[styles.screenTitle, { color: p.text }]}>Create post</Text>

            <Pressable
              onPress={() => setDraftsTabActive((v) => !v)}
              style={styles.draftsChip}
            >
              <Text style={[styles.draftsChipText, { color: COLORS.primary }]}>
                Drafts
              </Text>
              <View style={[styles.draftsCount, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.draftsCountText}>{drafts.length}</Text>
              </View>
            </Pressable>
          </View>

          {draftsTabActive ? (
            <View style={styles.draftsContainer}>
              <View style={[styles.draftsHeader, { borderBottomColor: p.divider }]}>
                <Text style={[styles.draftPanelTitle, { color: p.text }]}>
                  Your drafts
                </Text>
                <Pressable onPress={() => setDraftsTabActive(false)}>
                  <Ionicons name="close" size={22} color={p.muted} />
                </Pressable>
              </View>

              <Text style={[styles.draftPanelSub, { color: p.muted }]}>
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
            <>
              <View style={[styles.communityBar, { borderBottomColor: p.divider }]}>
                <Pressable
                  onPress={() => setCommunityModalVisible(true)}
                  style={[
                    styles.communityBtn,
                    { backgroundColor: p.soft, borderColor: p.border },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.communityBtnText,
                      { color: selectedCommunity ? p.text : p.placeholder },
                    ]}
                  >
                    {isLoadingCommunities
                      ? "Loading..."
                      : selectedCommunity?.name ?? "Select Community"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={p.muted} />
                </Pressable>
              </View>

              <View style={[styles.tabBar, { borderBottomColor: p.divider }]}>
                {(["text", "media", "link"] as PostTab[]).map((tab) => {
                  const labels: Record<PostTab, string> = {
                    text: "Text",
                    media: "Images & Video",
                    link: "Link",
                  };
                  const isActive = postTab === tab;

                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setPostTab(tab)}
                      style={[
                        styles.tabItem,
                        isActive && {
                          borderBottomColor: COLORS.primary,
                          borderBottomWidth: 2,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabLabel,
                          { color: isActive ? COLORS.primary : p.muted },
                        ]}
                      >
                        {labels[tab]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: insets.bottom + 16 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.tagsRow}>
                  <Pressable
                    onPress={() => setTagModalVisible(true)}
                    style={[
                      styles.tagChip,
                      { backgroundColor: p.soft, borderColor: p.border },
                    ]}
                  >
                    <Ionicons name="pricetag-outline" size={14} color={p.muted} />
                    <Text style={[styles.tagChipText, { color: p.muted }]}>
                      {selectedTagMeta ? selectedTagMeta.label : "Add tags"}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={p.muted} />
                  </Pressable>
                </View>

                {postTab === "text" && (
                  <>
                    <AppRichTextEditor
                      editor={editor}
                      onChangeHtml={handleHtmlChange}
                      placeholder="Write something..."
                      label="Description"
                      editorHeight={260}
                      showToolbar={true}
                    />
                    {errors.content ? (
                      <Text style={[styles.errorText, { color: p.danger }]}>
                        {errors.content}
                      </Text>
                    ) : null}
                  </>
                )}

                {postTab === "media" && (
                  <>
                    <AppRichTextEditor
                      editor={editor}
                      onChangeHtml={handleHtmlChange}
                      placeholder="Write something..."
                      label="Description"
                      editorHeight={220}
                      showToolbar={true}
                    />
                    {errors.content ? (
                      <Text style={[styles.errorText, { color: p.danger }]}>
                        {errors.content}
                      </Text>
                    ) : null}

                    <View
                      style={[
                        styles.sectionCard,
                        { backgroundColor: p.card, borderColor: p.border },
                      ]}
                    >
                      <View style={styles.mediaSectionHeader}>
                        <Text style={[styles.sectionTitle, { color: p.text }]}>
                          Images & Video
                        </Text>

                        {attachments.length > 0 && (
                          <Pressable
                            onPress={pickMedia}
                            style={[
                              styles.addMoreBtn,
                              { backgroundColor: p.soft, borderColor: p.border },
                            ]}
                          >
                            <Ionicons name="add" size={14} color={COLORS.primary} />
                            <Text style={styles.addMoreBtnText}>Add more</Text>
                          </Pressable>
                        )}
                      </View>

                      {attachments.length === 0 ? (
                        <Pressable
                          onPress={pickMedia}
                          style={[
                            styles.mediaDropZone,
                            { borderColor: p.border, backgroundColor: p.soft },
                          ]}
                        >
                          <Ionicons
                            name="cloud-upload-outline"
                            size={28}
                            color={p.muted}
                          />
                          <Text style={[styles.mediaDropText, { color: p.muted }]}>
                            Tap to upload media
                          </Text>
                        </Pressable>
                      ) : (
                        <>
                          <Text style={[styles.uploadCountText, { color: p.muted }]}>
                            {attachments.length}/{MAX_ATTACHMENTS} selected
                          </Text>

                          <View style={styles.mediaGrid}>
                            {attachments.map((item, index) =>
                              renderMediaTile(item, index)
                            )}
                          </View>
                        </>
                      )}

                      {errors.media ? (
                        <Text style={[styles.errorText, { color: p.danger }]}>
                          {errors.media}
                        </Text>
                      ) : null}
                    </View>
                  </>
                )}

                {postTab === "link" && (
                  <View
                    style={[
                      styles.sectionCard,
                      { backgroundColor: p.card, borderColor: p.border },
                    ]}
                  >
                    <Text style={[styles.sectionTitle, { color: p.text }]}>
                      Link
                    </Text>

                    <View
                      style={[
                        styles.linkWrap,
                        {
                          borderColor: p.border,
                          backgroundColor: p.input,
                        },
                      ]}
                    >
                      <TextInput
                        value={linkUrl}
                        onChangeText={setLinkUrl}
                        placeholder="Link URL"
                        placeholderTextColor={p.placeholder}
                        autoCapitalize="none"
                        keyboardType="url"
                        style={[styles.linkInput, { color: p.text }]}
                      />
                    </View>

                    {errors.linkUrl ? (
                      <Text style={[styles.errorText, { color: p.danger }]}>
                        {errors.linkUrl}
                      </Text>
                    ) : null}
                  </View>
                )}

                <View style={[styles.actionRow, { borderTopColor: p.divider }]}>
                  {activeDraftId && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      isDisabled={busy}
                      onPress={resetComposer}
                    >
                      <Button.Label>New post</Button.Label>
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    className="flex-1"
                    isDisabled={busy || isLoadingCommunities}
                    onPress={saveDraft}
                  >
                    <Button.Label>Save Draft</Button.Label>
                  </Button>

                  <Button
                    variant="primary"
                    className="flex-1"
                    isDisabled={busy || isLoadingCommunities}
                    onPress={publish}
                  >
                    <Button.Label>Post</Button.Label>
                  </Button>
                </View>
              </ScrollView>
            </>
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
        isDark={isDark}
      />

      <TagPickerModal
        visible={tagModalVisible}
        selectedTag={selectedTag}
        onSelect={(tag) => setSelectedTag(tag)}
        onClose={() => setTagModalVisible(false)}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
  },

  draftsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  draftsChipText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  draftsCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  draftsCountText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },

  communityBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  communityBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  communityBtnText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    maxWidth: 200,
  },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },

  tagsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 20,
    borderStyle: "dashed",
  },
  tagChipText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },

  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },

  mediaSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addMoreBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: "Poppins_500Medium",
  },
  uploadCountText: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  linkWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  linkInput: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    minHeight: 46,
  },

  errorText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 6,
  },

  mediaDropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },
  mediaDropText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },

  mediaGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  mediaTile: {
    width: "31.33%",
    marginBottom: 10,
  },
  mediaTileGap: {
    marginRight: "3%",
  },
  mediaPreviewWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "transparent",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaVideoBox: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  videoText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },
  mediaActionRow: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    gap: 6,
  },
  mediaActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "80%",
  },
  mediaBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },

  draftsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  draftsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  draftPanelTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
  },
  draftPanelSub: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  pickerOverlay: {
    maxHeight: "78%",
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
  },
  pickerList: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  communityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  communityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  communityAvatarImg: {
    width: 40,
    height: 40,
  },
  communityAvatarText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  communityName: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  communityMeta: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  communityDesc: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    padding: 24,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },

  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    gap: 12,
  },
  tagLabel: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
  tagDesc: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 3,
    lineHeight: 18,
  },
});