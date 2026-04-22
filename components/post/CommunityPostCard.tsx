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
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Avatar, Surface } from "heroui-native";
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

import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityPost, CommunityPostMedia } from "@/store/api/postApi";
const systemFonts = [
  ...defaultSystemFonts,
  "Poppins_400Regular",
  "Poppins_500Medium",
  "Poppins_600SemiBold",
  "Poppins_700Bold",
  "Poppins_400Italic",
];

dayjs.extend(relativeTime);

type CommunityPostCardProps = {
  post: CommunityPost;
  disableMediaPlayback?: boolean;
  onPressLike?: (post: CommunityPost) => void;
  onPressComment?: (post: CommunityPost) => void;
  onPressShare?: (post: CommunityPost) => void;
  onPressAuthor?: (authorId: string) => void;
  onPressMedia?: (media: CommunityPostMedia[], startIndex: number) => void;
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
  if (parts.length === 1) return parts[0]?.charAt(0)?.toUpperCase() || "U";
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function getPostTime(post: CommunityPost) {
  return dayjs(post.publishedAt || post.createdAt).fromNow();
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

const ReactionButton = memo(function ReactionButton({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
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
        color={active ? "#166534" : "#6b7280"}
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
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <Pressable onPress={handlePress} style={styles.tapLayer}>
      {children}
    </Pressable>
  );
});

const ImageSlide = memo(function ImageSlide({
  uri,
  onSingleTap,
  onDoubleTap,
}: {
  uri: string;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
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
}: {
  uri: string;
  active: boolean;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
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
}: {
  media: CommunityPostMedia[];
  disabled?: boolean;
  onPressMedia?: (media: CommunityPostMedia[], startIndex: number) => void;
  onDoubleTapLike?: () => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const normalizedMedia = useMemo<CommunityPostMedia[]>(
    () =>
      [...media]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          ...item,
          url: toAbsoluteFileUrl(item.url) ?? item.url,
        })),
    [media]
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
      withTiming(1, { duration: 120 })
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(0, { duration: 420 })
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
        renderItem={({ item, index: mediaIndex }) =>
          item.type === "VIDEO" ? (
            <VideoSlide
              uri={item.url}
              active={!disabled && index === mediaIndex}
              onSingleTap={() => onPressMedia?.(normalizedMedia, mediaIndex)}
              onDoubleTap={triggerHeart}
            />
          ) : (
            <ImageSlide
              uri={item.url}
              onSingleTap={() => onPressMedia?.(normalizedMedia, mediaIndex)}
              onDoubleTap={triggerHeart}
            />
          )
        }
      />

      <Animated.View pointerEvents="none" style={[styles.heartOverlay, heartStyle]}>
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
}: CommunityPostCardProps) {
  const { width } = useWindowDimensions();

  const authorName = getAuthorName(post.author);
  const authorImage = toAbsoluteFileUrl(post.author.image) ?? undefined;
  const hasMedia = !!post.media?.length;

  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);

  const plainText = useMemo(() => htmlToPlainText(post.content), [post.content]);
  const shouldCollapse = plainText.length > 220;

  const htmlSource = useMemo(() => {
    if (!post.content?.trim()) return null;
    return { html: `<div>${post.content}</div>` };
  }, [post.content]);

  const contentWidth = Math.max(width - 24, 220);

  const toggleLike = useCallback(() => {
    setLiked((prev) => !prev);
    onPressLike?.(post);
  }, [onPressLike, post]);

  const handleDoubleTapLike = useCallback(() => {
    if (!liked) {
      setLiked(true);
    }
    onPressLike?.(post);
  }, [liked, onPressLike, post]);

  const handleShare = async () => {
    if (onPressShare) {
      onPressShare(post);
      return;
    }

    const shareMessage = [plainText, post.linkUrl].filter(Boolean).join("\n\n");

    await Share.share({
      message: shareMessage || "Check out this post",
    });
  };

  const handleOpenLink = useCallback(async (_event: unknown, href?: string) => {
    if (!href) return;

    const finalUrl =
      /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href)
        ? href
        : `https://${href}`;

    try {
      await Linking.openURL(finalUrl);
    } catch (error) {
      console.log("Could not open link:", error);
    }
  }, []);

  return (
    <Surface variant="default" style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={() => onPressAuthor?.(post.author.id)} style={styles.authorRow}>
          <Avatar alt="" size="md" variant="soft" color="accent">
            {authorImage ? <Avatar.Image source={{ uri: authorImage }} /> : null}
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

        <Pressable style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
        </Pressable>
      </View>

      {htmlSource ? (
        <View style={styles.htmlWrap}>
          <View
            style={[
              styles.htmlRenderBox,
              !expanded && shouldCollapse && styles.htmlRenderBoxCollapsed,
            ]}
          >
            <RenderHTML
              contentWidth={contentWidth}
              source={htmlSource}
                systemFonts={systemFonts}
                ignoredDomTags={["label"]}
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
            {!expanded && shouldCollapse ? <View style={styles.fadeOverlay} /> : null}
          </View>

          {shouldCollapse && (
            <Pressable onPress={() => setExpanded((prev) => !prev)}>
              <Text style={styles.seeMoreText}>
                {expanded ? "See less" : "See more"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {!!post.linkUrl && !hasMedia && (
        <Pressable style={styles.linkCard} onPress={() => handleOpenLink(null, post.linkUrl ?? undefined)}>
          <Ionicons name="link-outline" size={16} color="#166534" />
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
        />
      ) : null}

      <View style={styles.reactionsRow}>
        <ReactionButton
          icon={liked ? "heart" : "heart-outline"}
          label="Like"
          active={liked}
          onPress={toggleLike}
        />
        <ReactionButton
          icon="chatbubble-outline"
          label="Comment"
          onPress={() => onPressComment?.(post)}
        />
        <ReactionButton
          icon="share-social-outline"
          label="Share"
          onPress={handleShare}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#ffffff",
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
    color: "#052e16",
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
    color: "#6b7280",
    fontFamily: "Poppins_400Regular",
  },
  subMetaDot: {
    marginHorizontal: 6,
    color: "#9ca3af",
  },
  timeText: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "Poppins_400Regular",
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  htmlWrap: {
    width: "100%",
    marginTop: 2,
    paddingHorizontal: 12,
  },
  htmlRenderBox: {
    position: "relative",
    overflow: "hidden",
  },
  htmlRenderBoxCollapsed: {
    maxHeight: 126,
  },
  fadeOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  seeMoreText: {
    marginTop: 4,
    color: "#166534",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  htmlBody: {
    color: "#052e16",
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
  },
  htmlParagraph: {
    marginTop: 0,
    marginBottom: 8,
    color: "#052e16",
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
  },
  htmlSpan: {
    color: "#052e16",
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
  },
  htmlStrong: {
    color: "#052e16",
    fontFamily: "Poppins_600SemiBold",
  },
  htmlEm: {
    color: "#052e16",
    fontStyle: "italic",
  },
  htmlUnderline: {
    color: "#052e16",
    textDecorationLine: "underline",
  },
  htmlList: {
    marginTop: 0,
    marginBottom: 8,
    paddingLeft: 18,
  },
  htmlListItem: {
    color: "#052e16",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",
  },
  htmlLink: {
    color: "#166534",
    textDecorationLine: "underline",
  },
  htmlH1: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: "Poppins_700Bold",
    color: "#052e16",
    marginBottom: 8,
  },
  htmlH2: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
    color: "#052e16",
    marginBottom: 8,
  },
  htmlH3: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: "Poppins_600SemiBold",
    color: "#052e16",
    marginBottom: 8,
  },
  htmlH4: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: "Poppins_600SemiBold",
    color: "#052e16",
    marginBottom: 8,
  },
  htmlH5: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_600SemiBold",
    color: "#052e16",
    marginBottom: 8,
  },
  htmlH6: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_600SemiBold",
    color: "#052e16",
    marginBottom: 8,
  },
  linkCard: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
    backgroundColor: "#f8fffa",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    width: "92%",
    color: "#166534",
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },
  mediaWrap: {
    width: "100%",
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    position: "relative",
    marginTop: 2,
  },
  tapLayer: {
    width: "100%",
    height: "100%",
  },
  slideMedia: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
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
  reactionsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
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
    backgroundColor: "#f0fdf4",
  },
  reactionText: {
    color: "#6b7280",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  reactionTextActive: {
    color: "#166534",
  },
});