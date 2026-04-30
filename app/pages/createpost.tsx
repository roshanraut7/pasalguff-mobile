import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
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

type PostMediaType = "IMAGE" | "VIDEO";

type PostTag =
  | "GENERAL"
  | "ANNOUNCEMENT"
  | "QUESTION"
  | "OFFER"
  | "EVENT"
  | "NEWS"
  | "HELP";

type CommunityPostMedia = {
  id?: string;
  type: PostMediaType;
  url: string;
  sortOrder?: number;
};

type CommunityPost = {
  id: string;
  communityId: string;
  tag: PostTag;
  content: string | null;
  linkUrl: string | null;
  media: CommunityPostMedia[];
};

type ComposerAttachment = {
  id: string;
  source: "local" | "remote";
  uri: string;
  mediaType: PostMediaType;
  name?: string;
  mimeType?: string;
};

type UploadPostMediaItem = {
  url: string;
  filename?: string;
  mimetype?: string;
  size?: number;
};

type UploadPostMediaResponse = {
  total: number;
  items: UploadPostMediaItem[];
};

type PostTab = "text" | "media" | "link";

type TagOptionMeta = {
  value: PostTag;
  label: string;
};

const TAG_OPTIONS: TagOptionMeta[] = POST_TAGS.map((tag) => ({
  value: tag as PostTag,
  label: tag.charAt(0) + tag.slice(1).toLowerCase(),
}));

const MAX_ATTACHMENTS = 10;
const FOOTER_RESERVED_SPACE = 150;

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
  const insets = useSafeAreaInsets();

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View
          style={[
            styles.backdrop,
            {
              justifyContent: "flex-start",
              paddingTop: insets.top + 18,
              paddingHorizontal: 16,
            },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />

          <View
            style={[
              styles.pickerOverlay,
              {
                width: "100%",
                maxHeight: "78%",
              },
            ]}
          >
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
                autoCapitalize="none"
              />
            </View>

            <ScrollView
              style={{ flexGrow: 0 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              contentContainerStyle={[styles.pickerList, { paddingBottom: 24 }]}
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
                            {item.memberCount.toLocaleString()} members
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
          </View>
        </View>
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
  const uploadAbortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      uploadAbortRef.current?.();
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
    [toast, colors.success, colors.danger],
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

  const { data: communitiesResponse, isLoading: isLoadingCommunities } =
    useGetMyCommunitiesQuery({
      page: 1,
      limit: 50,
    });

  const communities = communitiesResponse?.data ?? [];

  const { data: draftsResponse, isLoading: isLoadingDrafts } =
    useGetMyDraftsQuery({
      limit: 50,
    });

  const drafts = (draftsResponse?.data ?? []) as CommunityPost[];

  const [uploadPostMedia, { isLoading: isUploadingMedia }] =
    useUploadPostMediaMutation();

  const [createPublishedPost, { isLoading: isCreatingPost }] =
    useCreatePublishedPostMutation();

  const [createDraftPost, { isLoading: isCreatingDraft }] =
    useCreateDraftPostMutation();

  const [updatePost, { isLoading: isUpdatingPost }] = useUpdatePostMutation();

  const [publishDraft, { isLoading: isPublishingDraft }] =
    usePublishDraftMutation();

  const [deletePost] = useDeletePostMutation();

  const busy =
    isUploadingMedia ||
    isCreatingPost ||
    isCreatingDraft ||
    isUpdatingPost ||
    isPublishingDraft;

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

  useEffect(() => {
    if (!selectedCommunityId && communities.length > 0) {
      setSelectedCommunityId(communities[0].id);
    }
  }, [communities, selectedCommunityId]);

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

  const selectedTagMeta = useMemo(
    () => TAG_OPTIONS.find((tag) => tag.value === selectedTag),
    [selectedTag],
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
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const ensureMediaPermission = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showStatusToast(
        "danger",
        "Permission required",
        "Media library permission is required.",
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
        `You can upload up to ${MAX_ATTACHMENTS} files only.`,
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

    const mapped: ComposerAttachment[] = result.assets.map((asset, index) => ({
      id: makeId(`local-${index}`),
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
            : item,
        ),
      );
    },
    [ensureMediaPermission],
  );

  const flattenErrors = (issues: { path: PropertyKey[]; message: string }[]) => {
    const next: Record<string, string> = {};

    for (const issue of issues) {
      const key = String(issue.path[0] ?? "root");
      if (!next[key]) next[key] = issue.message;
    }

    return next;
  };

  const buildUploadedMediaPayload = async (): Promise<CommunityPostMedia[]> => {
    const remoteMedia: CommunityPostMedia[] = attachments
      .filter((attachment) => attachment.source === "remote")
      .map((attachment, index) => ({
        type: attachment.mediaType,
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
        mediaType: attachment.mediaType,
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
        type: localMedia[index].mediaType,
        url: item.url,
        sortOrder: remoteMedia.length + index,
      }),
    );

    return [...remoteMedia, ...uploaded].map((media, index) => ({
      ...media,
      sortOrder: index,
    }));
  };

  const saveDraft = async () => {
    try {
      setErrors({});

      let media: CommunityPostMedia[];

      try {
        media = await buildUploadedMediaPayload();
      } catch (error: any) {
        if (error?.message === "UNMOUNTED") return;
        throw error;
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

      const createBody = {
        tag: parsed.data.tag,
        content: parsed.data.html,
        linkUrl: parsed.data.linkUrl?.trim() || undefined,
        media,
      };

      const updateBody = {
        tag: parsed.data.tag,
        content: parsed.data.html,
        linkUrl: parsed.data.linkUrl?.trim() || null,
        media,
      };

      if (activeDraftId) {
        await updatePost({
          communityId: selectedCommunityId,
          postId: activeDraftId,
          body: updateBody,
        }).unwrap();

        if (isMountedRef.current) {
          showStatusToast(
            "success",
            "Draft updated",
            "Your draft has been updated.",
          );
        }
      } else {
        const created = await createDraftPost({
          communityId: selectedCommunityId,
          body: createBody,
        }).unwrap();

        if (isMountedRef.current) {
          setActiveDraftId(created.id);
          showStatusToast("success", "Draft saved", "Your draft has been saved.");
        }
      }

      if (isMountedRef.current) {
        setDraftsTabActive(true);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusToast(
          "danger",
          "Could not save draft",
          error?.data?.message ?? "Try again.",
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
      } catch (error: any) {
        if (error?.message === "UNMOUNTED") return;
        throw error;
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

      const createBody = {
        tag: parsed.data.tag,
        content: parsed.data.html,
        linkUrl: parsed.data.linkUrl?.trim() || undefined,
        media,
      };

      const updateBody = {
        tag: parsed.data.tag,
        content: parsed.data.html,
        linkUrl: parsed.data.linkUrl?.trim() || null,
        media,
      };

      if (activeDraftId) {
        await updatePost({
          communityId: selectedCommunityId,
          postId: activeDraftId,
          body: updateBody,
        }).unwrap();

        await publishDraft({
          communityId: selectedCommunityId,
          postId: activeDraftId,
        }).unwrap();
      } else {
        await createPublishedPost({
          communityId: selectedCommunityId,
          body: createBody,
        }).unwrap();
      }

      if (isMountedRef.current) {
        showStatusToast(
          "success",
          "Post published",
          "Your post is now visible in the community.",
        );
        resetComposer();
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        showStatusToast(
          "danger",
          "Could not publish",
          error?.data?.message ?? "Try again.",
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
        draft.media.map((media) => ({
          id: media.id ?? makeId("remote"),
          source: "remote" as const,
          uri: media.url,
          mediaType: media.type,
        })),
      );
      setErrors({});
      setDraftsTabActive(false);
      setPostTab("text");
      safeSetContent(draft.content ?? "<p></p>");
    },
    [safeSetContent],
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

        showStatusToast(
          "success",
          "Draft deleted",
          "The selected draft has been removed.",
        );
      } catch (error: any) {
        if (isMountedRef.current) {
          showStatusToast(
            "danger",
            "Could not delete draft",
            error?.data?.message ?? "Try again.",
          );
        }
      }
    },
    [activeDraftId, deletePost, resetComposer, showStatusToast],
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
              <Pressable
                onPress={() => replaceAttachment(item.id)}
                style={styles.mediaActionBtn}
              >
                <Ionicons name="create-outline" size={15} color={p.text} />
              </Pressable>

              <Pressable
                onPress={() => removeAttachment(item.id)}
                style={styles.mediaActionBtn}
              >
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
    [p.text, p.danger, removeAttachment, replaceAttachment, styles],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.contentWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.contentWrap}>
          <View style={styles.topBar}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/(tabs)");
                  }
                }}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={22} color={p.text} />
              </Pressable>

              <Text style={styles.screenTitle}>Create post</Text>
            </View>

            <Pressable
              onPress={() => setDraftsTabActive((value) => !value)}
              style={styles.draftsChip}
            >
              <Text style={styles.draftsChipText}>Drafts</Text>

              {drafts.length > 0 ? (
                <View style={styles.draftsCount}>
                  <Text style={styles.draftsCountText}>{drafts.length}</Text>
                </View>
              ) : null}
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
                        <Tabs.Label>Images & Video</Tabs.Label>
                      </Tabs.Trigger>

                      <Tabs.Trigger value="link">
                        <Tabs.Label>Link</Tabs.Label>
                      </Tabs.Trigger>
                    </Tabs.ScrollView>
                  </Tabs.List>
                </Tabs>
              </View>

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
                      editorHeight={360}
                      showToolbar
                    />

                    {errors.content ? (
                      <Text style={styles.errorText}>{errors.content}</Text>
                    ) : null}
                  </>
                )}

                {postTab === "media" && (
                  <>
                    <AppRichTextEditor
                      editor={editor}
                      onChangeHtml={handleHtmlChange}
                      label="Description"
                      editorHeight={260}
                      showToolbar
                    />

                    {errors.content ? (
                      <Text style={styles.errorText}>{errors.content}</Text>
                    ) : null}

                    <View style={styles.sectionCard}>
                      <View style={styles.mediaSectionHeader}>
                        <Text style={styles.sectionTitle}>Images & Video</Text>

                        {attachments.length > 0 && (
                          <Pressable onPress={pickMedia} style={styles.addMoreBtn}>
                            <Ionicons
                              name="add"
                              size={14}
                              color={p.accentStrong}
                            />

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

                          <Text style={styles.mediaDropText}>
                            Tap to upload media
                          </Text>
                        </Pressable>
                      ) : (
                        <>
                          <Text style={styles.uploadCountText}>
                            {attachments.length}/{MAX_ATTACHMENTS} selected
                          </Text>

                          <View style={styles.mediaGrid}>
                            {attachments.map((item, index) =>
                              renderMediaTile(item, index),
                            )}
                          </View>
                        </>
                      )}

                      {errors.media ? (
                        <Text style={styles.errorText}>{errors.media}</Text>
                      ) : null}
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

                    {errors.linkUrl ? (
                      <Text style={styles.errorText}>{errors.linkUrl}</Text>
                    ) : null}
                  </View>
                )}
              </ScrollView>

              <View
                style={[
                  styles.footerWrap,
                  {
                    paddingBottom: Math.max(insets.bottom, 10),
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