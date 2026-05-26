import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Avatar, Dialog, Menu, Surface } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import Carousel from "react-native-reanimated-carousel";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image as ExpoImage } from "expo-image";
import RenderHTML, { defaultSystemFonts } from "react-native-render-html";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityPost, PostMedia, PostPoll } from "@/types/post";

const systemFonts = [
  ...defaultSystemFonts,
  "Poppins_400Regular",
  "Poppins_500Medium",
  "Poppins_600SemiBold",
  "Poppins_700Bold",
  "Poppins_400Italic",
];

dayjs.extend(relativeTime);

type AppColors = ReturnType<typeof useAppTheme>["colors"];

type CommunityPostCardProps = {
  post: CommunityPost;
  disableMediaPlayback?: boolean;
  onPressLike?: (post: CommunityPost) => void;
  onPressComment?: (post: CommunityPost) => void;
  onPressShare?: (post: CommunityPost) => void;
  onPressAuthor?: (authorId: string) => void;
  onPressMedia?: (media: PostMedia[], startIndex: number) => void;

  /**
   * Poll option click.
   * HomeScreen should pass this and call votePostPoll mutation.
   */
  onPressPollOption?: (post: CommunityPost, optionId: string) => void;

  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: (post: CommunityPost) => Promise<void> | void;
};

function getAuthorName(author: CommunityPost["author"]) {
  const full = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim();

  if (full) return full;
  if (author.name?.trim()) return author.name.trim();
  if (author.businessName?.trim()) return author.businessName.trim();

  return "Unknown user";
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);

  if (!parts.length) return "U";

  if (parts.length === 1) {
    return parts[0]?.charAt(0)?.toUpperCase() || "U";
  }

  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function getPostTime(post: CommunityPost) {
  return dayjs(post.publishedAt || post.createdAt).fromNow();
}

function formatCount(value?: number | null) {
  const count = value ?? 0;

  if (count <= 0) return "";
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) {
    return `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}K`;
  }

  return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
}

function actionLabel(label: string, value?: number | null) {
  const count = formatCount(value);

  return count ? `${label} ${count}` : label;
}

function htmlToPlainText(html?: string | null) {
  if (!html) return "";

  return html
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getPostTagLabel(tag?: string | null) {
  if (!tag) return null;

  return tag
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPollOptionPercentage(
  option: PostPoll["options"][number],
  totalVotes: number,
) {
  if (typeof option.percentage === "number") {
    return Math.max(0, Math.min(option.percentage, 100));
  }

  const voteCount = option.voteCount ?? 0;

  if (totalVotes <= 0) return 0;

  return Math.round((voteCount / totalVotes) * 100);
}

const ReactionButton = memo(function ReactionButton({
  icon,
  label,
  active = false,
  onPress,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.reactionButton,
        pressed && styles.reactionButtonPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? colors.accent : colors.muted}
      />

      <Text
        numberOfLines={1}
        style={[styles.reactionText, active && styles.reactionTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const PollResultCard = memo(function PollResultCard({
  post,
  poll,
  onPressOption,
  styles,
}: {
  post: CommunityPost;
  poll: PostPoll;
  onPressOption?: (post: CommunityPost, optionId: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const options = useMemo(
    () =>
      [...(poll.options ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [poll.options],
  );

  const totalVotes =
    poll.totalVotes ??
    options.reduce((sum, option) => sum + (option.voteCount ?? 0), 0);

  const isPollClosed =
    Boolean(poll.isClosed) ||
    Boolean(poll.closesAt && dayjs(poll.closesAt).isBefore(dayjs()));

  return (
    <View style={styles.pollCard}>
      <View style={styles.pollHeaderRow}>
        <View style={styles.pollIconWrap}>
          <Ionicons name="bar-chart-outline" size={15} color="#ffffff" />
        </View>

        <Text style={styles.pollQuestion}>{poll.question}</Text>
      </View>

      <View style={styles.pollOptionsWrap}>
        {options.map((option) => {
          const percentage = getPollOptionPercentage(option, totalVotes);
          const voted = Boolean(option.isVotedByMe);

          return (
            <Pressable
              key={option.id}
              disabled={isPollClosed || !onPressOption}
              onPress={() => onPressOption?.(post, option.id)}
              style={({ pressed }) => [
                styles.pollOption,
                voted && styles.pollOptionSelected,
                pressed && styles.pollOptionPressed,
                isPollClosed && styles.pollOptionDisabled,
              ]}
            >
              <View style={styles.pollOptionTop}>
                <View style={styles.pollOptionLabelRow}>
                  {voted ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color="#22c55e"
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={15}
                      color="#94a3b8"
                    />
                  )}

                  <Text numberOfLines={2} style={styles.pollOptionText}>
                    {option.text}
                  </Text>
                </View>

                <Text style={styles.pollPercent}>{percentage}%</Text>
              </View>

              <View style={styles.pollBarTrack}>
                <View
                  style={[
                    styles.pollBarFill,
                    {
                      width: `${percentage}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.pollVoteCount}>
                {option.voteCount ?? 0}{" "}
                {(option.voteCount ?? 0) === 1 ? "vote" : "votes"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.pollFooterRow}>
        <Text style={styles.pollMeta}>
          Tap an option to vote • {totalVotes}{" "}
          {totalVotes === 1 ? "vote" : "votes"}
        </Text>

        {isPollClosed ? (
          <Text style={styles.pollClosedText}>Closed</Text>
        ) : poll.closesAt ? (
          <Text style={styles.pollMeta}>
            Ends {dayjs(poll.closesAt).fromNow()}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const MediaTapLayer = memo(function MediaTapLayer({
  children,
  onSingleTap,
  onDoubleTap,
}: {
  children: React.ReactNode;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
}) {
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
    };
  }, []);

  const handlePress = () => {
    const now = Date.now();

    if (now - lastTapRef.current < 240) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      lastTapRef.current = 0;
      onDoubleTap?.();

      return;
    }

    lastTapRef.current = now;

    singleTapTimeoutRef.current = setTimeout(() => {
      onSingleTap?.();
      lastTapRef.current = 0;
    }, 240);
  };

  return (
    <Pressable onPress={handlePress} style={stylesStatic.tapLayer}>
      {children}
    </Pressable>
  );
});

const ImageSlide = memo(function ImageSlide({
  uri,
  onSingleTap,
  onDoubleTap,
  styles,
}: {
  uri: string;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <MediaTapLayer onSingleTap={onSingleTap} onDoubleTap={onDoubleTap}>
      <ExpoImage
        source={{ uri }}
        style={styles.slideMedia}
        contentFit="contain"
        contentPosition="center"
        transition={180}
        cachePolicy="memory-disk"
      />
    </MediaTapLayer>
  );
});

const VideoSlide = memo(function VideoSlide({
  uri,
  active,
  onSingleTap,
  onDoubleTap,
  styles,
}: {
  uri: string;
  active: boolean;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    if (!active) {
      player.pause();
    }
  }, [active, player]);

  return (
    <MediaTapLayer onSingleTap={onSingleTap} onDoubleTap={onDoubleTap}>
      <View style={styles.slideMedia}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          nativeControls={active}
          contentFit="contain"
          allowsPictureInPicture
        />
      </View>
    </MediaTapLayer>
  );
});

const PostMediaCarousel = memo(function PostMediaCarousel({
  media,
  disabled,
  onPressMedia,
  onDoubleTapLike,
  colors: _colors,
  styles,
}: {
  media: PostMedia[];
  disabled?: boolean;
  onPressMedia?: (media: PostMedia[], startIndex: number) => void;
  onDoubleTapLike?: () => void;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const normalizedMedia = useMemo<PostMedia[]>(
    () =>
      [...media]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          ...item,
          url: toAbsoluteFileUrl(item.url) ?? item.url,
        })),
    [media],
  );

  const carouselWidth = screenWidth;
  const carouselHeight = Math.min(screenWidth * 0.76, 360);

  const heartScale = useSharedValue(0.6);
  const heartOpacity = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const triggerHeart = useCallback(() => {
    onDoubleTapLike?.();

    heartOpacity.value = 1;
    heartScale.value = 0.72;

    heartScale.value = withSequence(
      withSpring(1.08, { damping: 10, stiffness: 180 }),
      withTiming(1, { duration: 120 }),
    );

    heartOpacity.value = withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(0, { duration: 420 }),
    );
  }, [heartOpacity, heartScale, onDoubleTapLike]);

  return (
    <View style={styles.mediaWrap}>
      <Carousel
        loop={normalizedMedia.length > 1}
        enabled={normalizedMedia.length > 1}
        pagingEnabled
        snapEnabled
        width={carouselWidth}
        height={carouselHeight}
        style={{ width: carouselWidth, height: carouselHeight }}
        data={normalizedMedia}
        scrollAnimationDuration={300}
        onSnapToItem={setIndex}
        onConfigurePanGesture={(gesture) => {
          "worklet";
          gesture.activeOffsetX([-12, 12]);
          gesture.failOffsetY([-8, 8]);
        }}
        renderItem={({ item, index: mediaIndex }) =>
          item.type === "VIDEO" ? (
            <VideoSlide
              uri={item.url}
              active={!disabled && index === mediaIndex}
              onSingleTap={() => onPressMedia?.(normalizedMedia, mediaIndex)}
              onDoubleTap={triggerHeart}
              styles={styles}
            />
          ) : (
            <ImageSlide
              uri={item.url}
              onSingleTap={() => onPressMedia?.(normalizedMedia, mediaIndex)}
              onDoubleTap={triggerHeart}
              styles={styles}
            />
          )
        }
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.heartOverlay, heartStyle]}
      >
        <Ionicons name="heart" size={88} color="#ffffff" />
      </Animated.View>

      {normalizedMedia.length > 1 && (
        <View style={styles.dotsRow}>
          {normalizedMedia.map((item, dotIndex) => (
            <View
              key={item.id ?? `${item.url}-${dotIndex}`}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default function CommunityPostCard({
  post,
  disableMediaPlayback = false,
  onPressLike,
  onPressComment,
  onPressShare,
  onPressAuthor,
  onPressMedia,
  onPressPollOption,
  canDelete = false,
  isDeleting = false,
  onDelete,
}: CommunityPostCardProps) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const authorName = getAuthorName(post.author);
  const authorImage = toAbsoluteFileUrl(post.author.image) ?? undefined;
  const hasMedia = !!post.media?.length;
  const tagLabel = getPostTagLabel(post.tag);

  const [expanded, setExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const liked = Boolean(post.isLikedByMe);
  const plainText = useMemo(() => htmlToPlainText(post.content), [post.content]);

  const shouldCollapse = plainText.length > 220;

  const htmlSource = useMemo(() => {
    if (!post.content?.trim()) return null;

    return { html: `<div>${post.content}</div>` };
  }, [post.content]);

  const contentWidth = Math.max(width - 24, 220);

  const toggleLike = useCallback(() => {
    onPressLike?.(post);
  }, [onPressLike, post]);

  const handleDoubleTapLike = useCallback(() => {
    if (liked) return;

    onPressLike?.(post);
  }, [liked, onPressLike, post]);

  const handleShare = useCallback(() => {
    onPressShare?.(post);
  }, [onPressShare, post]);

  const handleOpenLink = useCallback(async (_event: unknown, href?: string) => {
    if (!href) return;

    const finalUrl =
      /^https?:\/\//i.test(href) ||
      /^mailto:/i.test(href) ||
      /^tel:/i.test(href)
        ? href
        : `https://${href}`;

    try {
      await Linking.openURL(finalUrl);
    } catch (error) {
      console.log("Could not open link:", error);
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!onDelete) return;

    try {
      await onDelete(post);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.log("Delete post failed:", error);
    }
  }, [onDelete, post]);

  const renderPostHtml = () => {
    if (!htmlSource) return null;

    return (
      <RenderHTML
        contentWidth={contentWidth}
        source={htmlSource}
        systemFonts={systemFonts}
        ignoredDomTags={["label"]}
        baseStyle={styles.htmlBody}
        tagsStyles={{
          body: styles.htmlBody,
          div: styles.htmlBody,
          p: styles.htmlParagraph,
          span: styles.htmlSpan,

          strong: styles.htmlStrong,
          b: styles.htmlStrong,

          em: styles.htmlEm,
          i: styles.htmlEm,

          u: styles.htmlUnderline,

          ul: styles.htmlList,
          ol: styles.htmlList,
          li: styles.htmlListItem,

          a: styles.htmlLink,

          h1: styles.htmlH1,
          h2: styles.htmlH2,
          h3: styles.htmlH3,
          h4: styles.htmlH4,
          h5: styles.htmlH5,
          h6: styles.htmlH6,
        }}
        defaultTextProps={{
          selectable: false,
        }}
        renderersProps={{
          a: {
            onPress: handleOpenLink,
          },
        }}
      />
    );
  };

  return (
    <Surface variant="default" style={styles.card}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onPressAuthor?.(post.author.id)}
          style={styles.authorRow}
        >
          <Avatar alt="" size="md" variant="soft" color="accent">
            {authorImage ? (
              <Avatar.Image source={{ uri: authorImage }} />
            ) : null}

            <Avatar.Fallback>{getInitials(authorName)}</Avatar.Fallback>
          </Avatar>

          <View style={styles.authorMeta}>
            <Text numberOfLines={1} style={styles.authorName}>
              {authorName}
            </Text>

            <View style={styles.subMetaRow}>
              {!!post.community?.name && (
                <>
                  <Text numberOfLines={1} style={styles.communityName}>
                    {post.community.name}
                  </Text>

                  <Text style={styles.subMetaDot}>•</Text>
                </>
              )}

              <Text style={styles.timeText}>{getPostTime(post)}</Text>
            </View>
          </View>
        </Pressable>

        {canDelete ? (
          <View style={styles.moreWrap}>
            <Menu>
              <Menu.Trigger asChild>
                <Pressable style={styles.moreButton}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </Menu.Trigger>

              <Menu.Portal>
                <Menu.Overlay />

                <Menu.Content
                  presentation="popover"
                  placement="bottom"
                  align="end"
                  width={180}
                  className="rounded-2xl border border-border bg-surface"
                >
                  <Menu.Item
                    onPress={() => setIsDeleteDialogOpen(true)}
                    variant="danger"
                    className="flex-row items-center gap-3"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.danger}
                    />

                    <Menu.ItemTitle>Delete post</Menu.ItemTitle>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu>
          </View>
        ) : (
          <Pressable style={styles.moreButton}>
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.muted}
            />
          </Pressable>
        )}
      </View>

      {!!tagLabel && (
        <View style={styles.tagWrap}>
          <View style={styles.postTagChip}>
            <Ionicons name="pricetag-outline" size={12} color={colors.accent} />
            <Text style={styles.postTagText}>{tagLabel}</Text>
          </View>
        </View>
      )}

      {!!post.title && (
        <View style={styles.titleWrap}>
          <Text style={styles.postTitle}>{post.title}</Text>
        </View>
      )}

      {htmlSource ? (
        <View style={styles.htmlWrap}>
          {shouldCollapse && !expanded ? (
            <Text
              style={styles.previewText}
              numberOfLines={4}
              ellipsizeMode="tail"
            >
              {plainText}
            </Text>
          ) : (
            renderPostHtml()
          )}

          {shouldCollapse && (
            <Pressable
              onPress={() => setExpanded((prev) => !prev)}
              style={styles.seeMoreWrap}
            >
              <Text style={styles.seeMoreText}>
                {expanded ? "See less" : "See more"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {!!post.linkUrl && !hasMedia && (
        <Pressable
          style={styles.linkCard}
          onPress={() => handleOpenLink(null, post.linkUrl ?? undefined)}
        >
          <Ionicons name="link-outline" size={16} color={colors.link} />

          <Text numberOfLines={1} style={styles.linkText}>
            {post.linkUrl}
          </Text>
        </Pressable>
      )}

      {hasMedia ? (
        <PostMediaCarousel
          media={post.media ?? []}
          disabled={disableMediaPlayback}
          onPressMedia={onPressMedia}
          onDoubleTapLike={handleDoubleTapLike}
          colors={colors}
          styles={styles}
        />
      ) : null}

      {post.poll ? (
        <PollResultCard
          post={post}
          poll={post.poll}
          onPressOption={onPressPollOption}
          styles={styles}
        />
      ) : null}

      <View style={styles.reactionsRow}>
        <ReactionButton
          icon={liked ? "heart" : "heart-outline"}
          label={actionLabel("Like", post.likeCount)}
          active={liked}
          onPress={toggleLike}
          colors={colors}
          styles={styles}
        />

        <ReactionButton
          icon="chatbubble-outline"
          label={actionLabel("Comment", post.commentCount)}
          onPress={() => onPressComment?.(post)}
          colors={colors}
          styles={styles}
        />

        <ReactionButton
          icon="share-social-outline"
          label={actionLabel("Share", post.shareCount)}
          onPress={handleShare}
          colors={colors}
          styles={styles}
        />
      </View>

      <Dialog isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />

          <Dialog.Content className="mx-5 rounded-[24px] bg-surface px-5 py-5">
            <View style={styles.dialogContent}>
              <Dialog.Title>Delete post</Dialog.Title>

              <Dialog.Description>
                Are you sure you want to delete this post? This action cannot be
                undone.
              </Dialog.Description>

              <View style={styles.deleteWarningRow}>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />

                <View style={styles.deleteWarningTextWrap}>
                  <Text style={styles.deleteWarningTitle}>
                    Permanent action
                  </Text>

                  <Text style={styles.deleteWarningText}>
                    The post will be removed from your profile and community
                    feed.
                  </Text>
                </View>
              </View>

              <View style={styles.dialogActions}>
                <Pressable
                  style={[styles.dialogButton, styles.dialogCancelButton]}
                  onPress={() => setIsDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.dialogButton, styles.dialogDeleteButton]}
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.dangerForeground}
                  />

                  <Text style={styles.dialogDeleteText}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Surface>
  );
}

const stylesStatic = StyleSheet.create({
  tapLayer: {
    width: "100%",
    height: "100%",
  },
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      marginTop: 6,
      paddingHorizontal: 0,
      paddingTop: 10,
      paddingBottom: 8,
      borderRadius: 0,
      gap: 8,
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
      backgroundColor: colors.surface,
    },

    header: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
    },

    authorRow: {
      width: "86%",
      flexDirection: "row",
      alignItems: "center",
    },

    authorMeta: {
      width: "78%",
      marginLeft: 8,
    },

    authorName: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Poppins_600SemiBold",
    },

    subMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 1,
    },

    communityName: {
      maxWidth: 130,
      fontSize: 12,
      color: colors.muted,
      fontFamily: "Poppins_400Regular",
    },

    subMetaDot: {
      marginHorizontal: 6,
      color: colors.placeholder,
    },

    timeText: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: "Poppins_400Regular",
    },

    moreWrap: {
      position: "relative",
    },

    moreButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
    },

    tagWrap: {
      paddingHorizontal: 12,
      paddingTop: 2,
      flexDirection: "row",
    },

    postTagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    postTagText: {
      color: colors.accent,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    titleWrap: {
      paddingHorizontal: 12,
      paddingTop: 1,
    },

    postTitle: {
      color: colors.foreground,
      fontSize: 17,
      lineHeight: 24,
      fontFamily: "Poppins_700Bold",
    },

    htmlWrap: {
      width: "100%",
      marginTop: 2,
      paddingHorizontal: 12,
      paddingBottom: 2,
    },

    previewText: {
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Poppins_400Regular",
    },

    seeMoreWrap: {
      marginTop: 6,
    },

    seeMoreText: {
      color: colors.link,
      fontSize: 13,
      fontFamily: "Poppins_600SemiBold",
    },

    htmlBody: {
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Poppins_400Regular",
    },

    htmlParagraph: {
      marginTop: 0,
      marginBottom: 8,
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Poppins_400Regular",
    },

    htmlSpan: {
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Poppins_400Regular",
    },

    htmlStrong: {
      color: colors.foreground,
      fontFamily: "Poppins_700Bold",
      fontWeight: "700",
    },

    htmlEm: {
      color: colors.foreground,
      fontFamily: "Poppins_400Italic",
      fontStyle: "italic",
    },

    htmlUnderline: {
      color: colors.foreground,
      textDecorationLine: "underline",
    },

    htmlList: {
      marginTop: 0,
      marginBottom: 8,
      paddingLeft: 18,
    },

    htmlListItem: {
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 4,
      fontFamily: "Poppins_400Regular",
    },

    htmlLink: {
      color: colors.link,
      textDecorationLine: "underline",
    },

    htmlH1: {
      fontSize: 26,
      lineHeight: 34,
      fontFamily: "Poppins_700Bold",
      fontWeight: "700",
      color: colors.foreground,
      marginTop: 4,
      marginBottom: 8,
    },

    htmlH2: {
      fontSize: 22,
      lineHeight: 30,
      fontFamily: "Poppins_700Bold",
      fontWeight: "700",
      color: colors.foreground,
      marginTop: 4,
      marginBottom: 8,
    },

    htmlH3: {
      fontSize: 19,
      lineHeight: 27,
      fontFamily: "Poppins_600SemiBold",
      fontWeight: "600",
      color: colors.foreground,
      marginTop: 4,
      marginBottom: 8,
    },

    htmlH4: {
      fontSize: 17,
      lineHeight: 25,
      fontFamily: "Poppins_600SemiBold",
      fontWeight: "600",
      color: colors.foreground,
      marginTop: 4,
      marginBottom: 8,
    },

    htmlH5: {
      fontSize: 16,
      lineHeight: 24,
      fontFamily: "Poppins_600SemiBold",
      fontWeight: "600",
      color: colors.foreground,
      marginTop: 4,
      marginBottom: 8,
    },

    htmlH6: {
      fontSize: 15,
      lineHeight: 23,
      fontFamily: "Poppins_600SemiBold",
      fontWeight: "600",
      color: colors.foreground,
      marginTop: 4,
      marginBottom: 8,
    },

    linkCard: {
      marginHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    linkText: {
      width: "92%",
      color: colors.link,
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
    },

    mediaWrap: {
      width: "100%",
      borderRadius: 0,
      overflow: "hidden",
      backgroundColor: colors.surface,
      position: "relative",
      marginTop: 4,
    },

    slideMedia: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.surface,
    },

    heartOverlay: {
      position: "absolute",
      top: "50%",
      left: "50%",
      marginLeft: -44,
      marginTop: -44,
      zIndex: 20,
    },

    dotsRow: {
      position: "absolute",
      bottom: 8,
      alignSelf: "center",
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.28)",
    },

    dot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.55)",
    },

    dotActive: {
      backgroundColor: "#ffffff",
      width: 16,
    },

    pollCard: {
      marginHorizontal: 12,
      marginTop: 6,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      gap: 10,
    },

    pollHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },

    pollIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      marginTop: 1,
    },

    pollQuestion: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "Poppins_700Bold",
    },

    pollOptionsWrap: {
      gap: 10,
    },

    pollOption: {
      gap: 5,
      borderRadius: 12,
      padding: 8,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    pollOptionSelected: {
      borderColor: colors.accent,
    },

    pollOptionPressed: {
      opacity: 0.75,
    },

    pollOptionDisabled: {
      opacity: 0.65,
    },

    pollOptionTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },

    pollOptionLabelRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    pollOptionText: {
      flex: 1,
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "Poppins_500Medium",
    },

    pollPercent: {
      color: colors.foreground,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },

    pollBarTrack: {
      height: 8,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.border,
    },

    pollBarFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accent,
    },

    pollVoteCount: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    pollFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 2,
    },

    pollMeta: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    pollClosedText: {
      color: colors.danger,
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },

    reactionsRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 6,
      paddingHorizontal: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },

    reactionButton: {
      width: "32.2%",
      minHeight: 36,
      borderRadius: 12,
      paddingHorizontal: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    reactionButtonPressed: {
      backgroundColor: colors.segment,
    },

    reactionText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    reactionTextActive: {
      color: colors.accent,
    },

    dialogContent: {
      gap: 14,
    },

    deleteWarningRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },

    deleteWarningTextWrap: {
      width: "88%",
    },

    deleteWarningTitle: {
      color: colors.danger,
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
    },

    deleteWarningText: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "Poppins_400Regular",
    },

    dialogActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 4,
    },

    dialogButton: {
      minHeight: 42,
      borderRadius: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },

    dialogCancelButton: {
      backgroundColor: colors.surfaceSecondary,
    },

    dialogDeleteButton: {
      backgroundColor: colors.danger,
    },

    dialogCancelText: {
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
    },

    dialogDeleteText: {
      color: colors.dangerForeground,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
    },
  });
}