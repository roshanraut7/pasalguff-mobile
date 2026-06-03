import React from "react";
import {
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppRichTextEditor } from "@/components/editor/editor";
import type { CreatePostPalette } from "@/constants/styles/create-post.styles";
import type { createCreatePostStyles } from "@/constants/styles/create-post.styles";
import type {
  ComposerAttachment,
  LocalLinkPreview,
} from "./Post.types";
import { MAX_ATTACHMENTS, MAX_POLL_OPTIONS } from "@/utils/post.utils";

type SharedTabProps = {
  p: CreatePostPalette;
  styles: ReturnType<typeof createCreatePostStyles>;
  title: string;
  setTitle: (v: string) => void;
  titleRequired: boolean;
  errors: Record<string, string>;
  editor: any;
  onChangeHtml: (v: string) => void;
};

// ─── Title field (shared across all tabs) ────────────────────────────────────

export function TitleField({
  p,
  styles,
  title,
  setTitle,
  titleRequired,
  errors,
}: Omit<SharedTabProps, "editor" | "onChangeHtml">) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>Title</Text>
        {titleRequired ? (
          <Text style={styles.requiredLabel}>Required</Text>
        ) : (
          <Text style={styles.optionalLabel}>Optional</Text>
        )}
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={
          titleRequired
            ? "Add a clear title for this post"
            : "Add a title (optional)"
        }
        placeholderTextColor={p.placeholder}
        maxLength={160}
        style={styles.titleInput}
      />

      {errors.title ? (
        <Text style={styles.errorText}>{errors.title}</Text>
      ) : null}
    </View>
  );
}

// ─── Text Tab ────────────────────────────────────────────────────────────────

export function TextTab(props: SharedTabProps) {
  const { styles, errors, editor, onChangeHtml } = props;
  return (
    <View style={styles.sectionCard}>
      <TitleField {...props} />

      <View style={styles.cardDivider} />

      <View style={styles.descriptionBlock}>
        <AppRichTextEditor
          editor={editor}
          onChangeHtml={onChangeHtml}
          label="Description"
          editorHeight={300}
          showToolbar
        />
        {errors.content ? (
          <Text style={styles.errorText}>{errors.content}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Media Tab ───────────────────────────────────────────────────────────────

type MediaTabProps = SharedTabProps & {
  attachments: ComposerAttachment[];
  onPickMedia: () => void;
  onReplaceAttachment: (id: string) => void;
  onRemoveAttachment: (id: string) => void;
};

export function MediaTab(props: MediaTabProps) {
  const {
    p,
    styles,
    errors,
    editor,
    onChangeHtml,
    attachments,
    onPickMedia,
    onReplaceAttachment,
    onRemoveAttachment,
  } = props;

  return (
    <View style={styles.sectionCard}>
      <TitleField {...props} />

      <View style={styles.cardDivider} />

      <View style={styles.descriptionBlock}>
        <AppRichTextEditor
          editor={editor}
          onChangeHtml={onChangeHtml}
          label="Description"
          editorHeight={220}
          showToolbar
        />
        {errors.content ? (
          <Text style={styles.errorText}>{errors.content}</Text>
        ) : null}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.mediaSectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Images</Text>
          <Text style={styles.fieldHint}>Maximum {MAX_ATTACHMENTS} images</Text>
        </View>

        {attachments.length > 0 && (
          <Pressable onPress={onPickMedia} style={styles.addMoreBtn}>
            <Ionicons name="add" size={14} color={p.accentStrong} />
            <Text style={styles.addMoreBtnText}>Add more</Text>
          </Pressable>
        )}
      </View>

      {attachments.length === 0 ? (
        <Pressable onPress={onPickMedia} style={styles.mediaDropZone}>
          <Ionicons name="images-outline" size={28} color={p.muted} />
          <Text style={styles.mediaDropText}>Tap to upload images</Text>
          <Text style={styles.mediaDropSubText}>JPG, PNG or WEBP only</Text>
        </Pressable>
      ) : (
        <View>
          <Text style={styles.uploadCountText}>
            {attachments.length}/{MAX_ATTACHMENTS} selected
          </Text>
          <View style={styles.mediaGrid}>
            {attachments.map((item, index) => (
              <View
                key={item.id}
                style={[styles.mediaTile, index % 3 !== 2 && styles.mediaTileGap]}
              >
                <View style={styles.mediaPreviewWrap}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />

                  <View style={styles.mediaActionRow}>
                    <Pressable
                      onPress={() => onReplaceAttachment(item.id)}
                      style={styles.mediaActionBtn}
                    >
                      <Ionicons name="create-outline" size={15} color={p.text} />
                    </Pressable>

                    <Pressable
                      onPress={() => onRemoveAttachment(item.id)}
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
            ))}
          </View>
        </View>
      )}

      {errors.media ? (
        <Text style={styles.errorText}>{errors.media}</Text>
      ) : null}
    </View>
  );
}

// ─── Link Tab ────────────────────────────────────────────────────────────────

type LinkTabProps = SharedTabProps & {
  linkUrl: string;
  setLinkUrl: (v: string) => void;
  linkPreview: LocalLinkPreview | null;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

export function LinkTab(props: LinkTabProps) {
  const {
    p,
    styles,
    errors,
    editor,
    onChangeHtml,
    linkUrl,
    setLinkUrl,
    linkPreview,
    setErrors,
  } = props;

  return (
    <View style={styles.sectionCard}>
      <TitleField {...props} />

      <View style={styles.cardDivider} />

      <View style={styles.descriptionBlock}>
        <AppRichTextEditor
          editor={editor}
          onChangeHtml={onChangeHtml}
          label="Description"
          editorHeight={190}
          showToolbar
        />
        {errors.content ? (
          <Text style={styles.errorText}>{errors.content}</Text>
        ) : null}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>Embedded link</Text>
        <Text style={styles.optionalLabel}>YouTube or website</Text>
      </View>

      <View style={styles.linkWrap}>
        <View style={styles.linkLeadingIcon}>
          <Ionicons name="link-outline" size={18} color={p.accentStrong} />
        </View>

        <TextInput
          value={linkUrl}
          onChangeText={(value) => {
            setLinkUrl(value);
            setErrors((prev) => ({ ...prev, linkUrl: "" }));
          }}
          placeholder="Paste YouTube link, embed URL or website link"
          placeholderTextColor={p.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          multiline
          style={[styles.linkInput, styles.linkInputFlex]}
        />
      </View>

      <Text style={styles.linkHelperText}>
        External videos are streamed from the provider and are not uploaded to your server.
      </Text>

      {errors.linkUrl ? (
        <Text style={styles.errorText}>{errors.linkUrl}</Text>
      ) : null}

      {!!linkUrl.trim() && !linkPreview ? (
        <Text style={styles.errorText}>
          Enter a valid HTTP/HTTPS link or YouTube embed URL.
        </Text>
      ) : null}

      {linkPreview?.kind === "YOUTUBE" && (
        <View style={styles.linkPreviewCard}>
          <View style={styles.linkPreviewImageWrap}>
            <Image
              source={{ uri: linkPreview.thumbnailUrl }}
              style={styles.linkPreviewImage}
              resizeMode="cover"
            />
            <View style={styles.linkPreviewOverlay}>
              <View style={styles.playCircle}>
                <Ionicons name="play" size={22} color="#ffffff" />
              </View>
            </View>
          </View>
          <View style={styles.linkPreviewMeta}>
            <Text style={styles.linkPreviewLabel}>YouTube video detected</Text>
            <Text numberOfLines={1} style={styles.linkPreviewUrl}>
              {linkPreview.cleanUrl}
            </Text>
          </View>
        </View>
      )}

      {linkPreview?.kind === "IMAGE" && (
        <View style={styles.linkPreviewCard}>
          <Image
            source={{ uri: linkPreview.thumbnailUrl }}
            style={styles.externalImagePreview}
            resizeMode="cover"
          />
          <View style={styles.linkPreviewMeta}>
            <Text style={styles.linkPreviewLabel}>External image detected</Text>
            <Text numberOfLines={1} style={styles.linkPreviewUrl}>
              {linkPreview.cleanUrl}
            </Text>
          </View>
        </View>
      )}

      {linkPreview?.kind === "WEBSITE" && (
        <View style={styles.websitePreviewCard}>
          <Ionicons name="globe-outline" size={21} color={p.accentStrong} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkPreviewLabel}>Website link detected</Text>
            <Text numberOfLines={2} style={styles.linkPreviewUrl}>
              {linkPreview.cleanUrl}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Poll Tab ────────────────────────────────────────────────────────────────

type PollTabProps = SharedTabProps & {
  pollQuestion: string;
  setPollQuestion: (v: string) => void;
  pollOptions: string[];
  setPollOptions: React.Dispatch<React.SetStateAction<string[]>>;
  pollClosesAt: string;
  setPollClosesAt: (v: string) => void;
};

export function PollTab(props: PollTabProps) {
  const {
    p,
    styles,
    errors,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    pollClosesAt,
    setPollClosesAt,
  } = props;

  return (
    <View style={styles.sectionCard}>
      <TitleField {...props} />

      <View style={styles.cardDivider} />

      <Text style={styles.sectionTitle}>Poll Question</Text>

      <View style={styles.linkWrap}>
        <TextInput
          value={pollQuestion}
          onChangeText={setPollQuestion}
          placeholder="Ask a question"
          placeholderTextColor={p.placeholder}
          maxLength={160}
          style={styles.linkInput}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Options</Text>

      {pollOptions.map((option, index) => (
        <View
          key={`poll-option-${index}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <View style={[styles.linkWrap, { flex: 1 }]}>
            <TextInput
              value={option}
              onChangeText={(value) =>
                setPollOptions((prev) =>
                  prev.map((item, i) => (i === index ? value : item)),
                )
              }
              placeholder={`Option ${index + 1}`}
              placeholderTextColor={p.placeholder}
              maxLength={120}
              style={styles.linkInput}
            />
          </View>

          {pollOptions.length > 2 && (
            <Pressable
              onPress={() =>
                setPollOptions((prev) => prev.filter((_, i) => i !== index))
              }
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="trash-outline" size={18} color={p.danger} />
            </Pressable>
          )}
        </View>
      ))}

      {pollOptions.length < MAX_POLL_OPTIONS && (
        <Pressable
          onPress={() => setPollOptions((prev) => [...prev, ""])}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}
        >
          <Ionicons name="add-circle-outline" size={18} color={p.accentStrong} />
          <Text style={{ color: p.accentStrong, fontFamily: "Poppins_600SemiBold", fontSize: 13 }}>
            Add option
          </Text>
        </Pressable>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Close Date Optional</Text>

      <View style={styles.linkWrap}>
        <TextInput
          value={pollClosesAt}
          onChangeText={setPollClosesAt}
          placeholder="Example: 2026-06-01T18:00:00"
          placeholderTextColor={p.placeholder}
          autoCapitalize="none"
          style={styles.linkInput}
        />
      </View>

      {errors.poll ? (
        <Text style={styles.errorText}>{errors.poll}</Text>
      ) : null}
    </View>
  );
}