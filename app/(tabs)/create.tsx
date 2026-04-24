import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "heroui-native";
import { useBridgeState } from "@10play/tentap-editor";

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
import { AppRichTextEditor, useCreateEditor } from "@/components/editor/editor";
import { DraftPostsPanel } from "@/components/post/DraftPostsPanel";
import {
  POST_TAGS,
  draftPostSchema,
  publishPostSchema,
  stripHtml,
} from "@/schema/post.schema";
import {
  createCreatePostStyles,
  getCreatePostPalette,
} from "@/constants/styles/create-post.styles";
import { useAppTheme } from "@/hooks/useAppTheme";

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
const FLOATING_TAB_OFFSET = 92;
const FOOTER_RESERVED_SPACE = 180;

let _idCounter = 0;
function makeId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter}`;
}

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
};

function CommunityPickerModal({
  visible,
  communities,
  selectedId,
  searchValue,
  onSearchChange,
  onSelect,
  onClose,
}: CommunityPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.pickerOverlay} onPress={() => {}}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Post to</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={p.text} />
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={p.muted} />
              <TextInput
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder="Search communities"
                placeholderTextColor={p.placeholder}
                style={styles.searchInput}
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
                <Text style={styles.emptyText}>No community found</Text>
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
                        isSelected && styles.communityRowSelected,
                      ]}
                    >
                      <View style={styles.communityAvatar}>
                        {item.avatarImage ? (
                          <Image
                            source={{ uri: item.avatarImage }}
                            style={styles.communityAvatarImg}
                          />
                        ) : (
                          <Text style={styles.communityAvatarText}>
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.communityName}>{item.name}</Text>

                        {item.memberCount != null && (
                          <Text style={styles.communityMeta}>
                            {item.memberCount.toLocaleString()} members · Joined
                          </Text>
                        )}

                        {!!item.description && (
                          <Text numberOfLines={1} style={styles.communityDesc}>
                            {item.description}
                          </Text>
                        )}
                      </View>

                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={p.accentStrong}
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

type TagPickerModalProps = {
  visible: boolean;
  selectedTag: PostTag;
  onSelect: (tag: PostTag) => void;
  onClose: () => void;
};

function TagPickerModal({
  visible,
  selectedTag,
  onSelect,
  onClose,
}: TagPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.pickerOverlay} onPress={() => {}}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose tag</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
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
                  style={[styles.tagRow, isSelected && styles.tagRowSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tagLabel}>{item.label}</Text>
                    <Text style={styles.tagDesc}>{item.description}</Text>
                  </View>

                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={p.accentStrong}
                    />
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

export default function CreatePostScreen() {
  const { colors, isDark } = useAppTheme();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

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
            color={variant === "success" ? colors.success : colors.danger}
          />
        ),
      });
    },
    [toast, colors.success, colors.danger]
  );

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

  const editor = useCreateEditor();

  const bridgeState = useBridgeState(editor);
  const isEditorReady = bridgeState?.isReady ?? false;
  const isEditorFocused = bridgeState?.isFocused ?? false;

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
          showStatusToast("success", "Draft updated", "Your draft has been updated.");
        }
      } else {
        const created = await createCommunityDraft({
          communityId: selectedCommunityId,
          body,
        }).unwrap();

        if (isMountedRef.current) {
          setActiveDraftId(created.id);
          showStatusToast("success", "Draft saved", "Your draft has been saved.");
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
          style={[styles.mediaTile, index % 3 !== 2 && styles.mediaTileGap]}
        >
          <View style={styles.mediaPreviewWrap}>
            {isImage ? (
              <Image
                source={{ uri: item.uri }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mediaVideoBox}>
                <Ionicons name="videocam-outline" size={22} color={p.text} />
                <Text style={styles.videoText}>Video</Text>
              </View>
            )}

            <View style={styles.mediaActionRow}>
              <Pressable onPress={() => replaceAttachment(item.id)} style={styles.mediaActionBtn}>
                <Ionicons name="create-outline" size={15} color={p.text} />
              </Pressable>

              <Pressable onPress={() => removeAttachment(item.id)} style={styles.mediaActionBtn}>
                <Ionicons name="trash-outline" size={15} color={p.danger} />
              </Pressable>
            </View>

            <View style={styles.mediaBadge}>
              <Text numberOfLines={1} style={styles.mediaBadgeText}>
                {item.source === "local" ? "Ready" : "Uploaded"}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [p.text, p.danger, removeAttachment, replaceAttachment, styles]
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.contentWrap}>
          <View style={styles.topBar}>
            <Text style={styles.screenTitle}>Create post</Text>

            <Pressable onPress={() => setDraftsTabActive((v) => !v)} style={styles.draftsChip}>
              <Text style={styles.draftsChipText}>Drafts</Text>
              <View style={styles.draftsCount}>
                <Text style={styles.draftsCountText}>{drafts.length}</Text>
              </View>
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
            <>
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

              <View style={styles.tabBar}>
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
                          borderBottomColor: p.accentStrong,
                          borderBottomWidth: 2,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabLabel,
                          { color: isActive ? p.accentStrong : p.muted },
                        ]}
                      >
                        {labels[tab]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <ScrollView
                style={styles.composerScroll}
                scrollEnabled={!isEditorFocused}
                nestedScrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                contentContainerStyle={[
                  styles.scrollContent,
                  {
                    paddingBottom:
                      insets.bottom + FLOATING_TAB_OFFSET + FOOTER_RESERVED_SPACE,
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.tagsRow}>
                  <Pressable onPress={() => setTagModalVisible(true)} style={styles.tagChip}>
                    <Ionicons name="pricetag-outline" size={14} color={p.muted} />
                    <Text style={styles.tagChipText}>
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
                      label="Description"
                      editorHeight={320}
                      showToolbar
                    />
                    {errors.content ? <Text style={styles.errorText}>{errors.content}</Text> : null}
                  </>
                )}

                {postTab === "media" && (
                  <>
                    <AppRichTextEditor
                      editor={editor}
                      onChangeHtml={handleHtmlChange}
                      label="Description"
                      editorHeight={280}
                      showToolbar
                    />
                    {errors.content ? <Text style={styles.errorText}>{errors.content}</Text> : null}

                    <View style={styles.sectionCard}>
                      <View style={styles.mediaSectionHeader}>
                        <Text style={styles.sectionTitle}>Images & Video</Text>

                        {attachments.length > 0 && (
                          <Pressable onPress={pickMedia} style={styles.addMoreBtn}>
                            <Ionicons name="add" size={14} color={p.accentStrong} />
                            <Text style={styles.addMoreBtnText}>Add more</Text>
                          </Pressable>
                        )}
                      </View>

                      {attachments.length === 0 ? (
                        <Pressable onPress={pickMedia} style={styles.mediaDropZone}>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={28}
                            color={p.muted}
                          />
                          <Text style={styles.mediaDropText}>Tap to upload media</Text>
                        </Pressable>
                      ) : (
                        <>
                          <Text style={styles.uploadCountText}>
                            {attachments.length}/{MAX_ATTACHMENTS} selected
                          </Text>

                          <View style={styles.mediaGrid}>
                            {attachments.map((item, index) => renderMediaTile(item, index))}
                          </View>
                        </>
                      )}

                      {errors.media ? <Text style={styles.errorText}>{errors.media}</Text> : null}
                    </View>
                  </>
                )}

                {postTab === "link" && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Link</Text>

                    <View style={styles.linkWrap}>
                      <TextInput
                        value={linkUrl}
                        onChangeText={setLinkUrl}
                        placeholder="Link URL"
                        placeholderTextColor={p.placeholder}
                        autoCapitalize="none"
                        keyboardType="url"
                        style={styles.linkInput}
                      />
                    </View>

                    {errors.linkUrl ? <Text style={styles.errorText}>{errors.linkUrl}</Text> : null}
                  </View>
                )}
              </ScrollView>

              <View
                style={[
                  styles.footerWrap,
                  {
                    paddingBottom: Math.max(insets.bottom, 10),
                    marginBottom: FLOATING_TAB_OFFSET,
                  },
                ]}
              >
                <View style={styles.footerRow}>
                  {activeDraftId ? (
                    <ComposerActionButton
                      label="New post"
                      variant="outline"
                      disabled={busy}
                      onPress={resetComposer}
                      styles={styles}
                    />
                  ) : null}

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
      />

      <TagPickerModal
        visible={tagModalVisible}
        selectedTag={selectedTag}
        onSelect={(tag) => setSelectedTag(tag)}
        onClose={() => setTagModalVisible(false)}
      />
    </SafeAreaView>
  );
}