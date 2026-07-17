import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Avatar, Dialog, Menu, Surface } from "heroui-native";
import { Ionicons, MaterialCommunityIcons, Entypo } from "@expo/vector-icons";
import Carousel from "react-native-reanimated-carousel";
import { Image as ExpoImage } from "expo-image";
import RenderHTML, { defaultSystemFonts } from "react-native-render-html";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import YouTubeEmbedPlayer from "./YouTubeEmbedPlayer";
import type { CommunityPost, PostMedia, PostPoll } from "@/types/post";
import { useJoinCommunityMutation, useLeaveCommunityMutation } from "@/store/api/communityApi";
import VerifiedBadge from "@/components/common/verifiedBadge";
import { router } from "expo-router";

const systemFonts = [
  ...defaultSystemFonts,
  "Poppins_400Regular",
  "Poppins_500Medium",
  "Poppins_600SemiBold",
  "Poppins_700Bold",
  "Poppins_400Italic",
];

dayjs.extend(relativeTime);

// how long the "Joined" pill stays visible before it collapses away,
// same idea as Reddit/TikTok — flash confirmation, then disappear for good
// (until the user leaves, at which point "Join" reappears normally).
const JOIN_PILL_COLLAPSE_DELAY_MS = 1500;

type AppColors = ReturnType<typeof useAppTheme>["colors"];

type CommunityPostCardProps = {
  post: CommunityPost;
  ownedCommunityIds?: Set<string>;
  disableMediaPlayback?: boolean;
  onPressLike?: (post: CommunityPost) => void;
  showCommunityHeader?: boolean;
  onPressJoin?: (post: CommunityPost) => void;
  onPressDislike?: (post: CommunityPost) => void;
  onPressComment?: (post: CommunityPost) => void;
  onPressShare?: (post: CommunityPost) => void;
  onPressAuthor?: (authorId: string) => void;
  onPressMedia?: (media: PostMedia[], startIndex: number) => void;
  onPressPollOption?: (post: CommunityPost, optionId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isDeleting?: boolean;
  onEdit?: (post: CommunityPost) => void;
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

function getPollOptionPercentage(option: PostPoll["options"][number], totalVotes: number) {
  if (typeof option.percentage === "number") {
    return Math.max(0, Math.min(option.percentage, 100));
  }
  const voteCount = option.voteCount ?? 0;
  if (totalVotes <= 0) return 0;
  return Math.round((voteCount / totalVotes) * 100);
}

const ReactionButton = memo(function ReactionButton({
  icon,
  iconFamily = "ionicons",
  label,
  active = false,
  activeColor,
  inactiveColor,
  compact = false,
  onPress,
  accessibilityLabel,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  iconFamily?: "ionicons" | "material-community";
  label: string;
  active?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  compact?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const selectedColor = activeColor ?? colors.accent;
  const iconColor = active ? selectedColor : inactiveColor ?? colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reactionButton,
        compact && styles.compactReactionButton,
        pressed && styles.reactionButtonPressed,
      ]}
    >
      {iconFamily === "material-community" ? (
        <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={19} color={iconColor} />
      ) : (
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={19} color={iconColor} />
      )}

      <Text
        numberOfLines={1}
        style={[styles.reactionText, active && { color: selectedColor, fontFamily: "Poppins_600SemiBold" }]}
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
    () => [...(poll.options ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [poll.options],
  );

  const totalVotes = poll.totalVotes ?? options.reduce((sum, option) => sum + (option.voteCount ?? 0), 0);

  const isPollClosed = Boolean(poll.isClosed) || Boolean(poll.closesAt && dayjs(poll.closesAt).isBefore(dayjs()));

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
                    <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={15} color="#94a3b8" />
                  )}
                  <Text numberOfLines={2} style={styles.pollOptionText}>
                    {option.text}
                  </Text>
                </View>
                <Text style={styles.pollPercent}>{percentage}%</Text>
              </View>

              <View style={styles.pollBarTrack}>
                <View style={[styles.pollBarFill, { width: `${percentage}%` }]} />
              </View>

              <Text style={styles.pollVoteCount}>
                {option.voteCount ?? 0} {(option.voteCount ?? 0) === 1 ? "vote" : "votes"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.pollFooterRow}>
        <Text style={styles.pollMeta}>
          Tap an option to vote • {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </Text>
        {isPollClosed ? (
          <Text style={styles.pollClosedText}>Closed</Text>
        ) : poll.closesAt ? (
          <Text style={styles.pollMeta}>Ends {dayjs(poll.closesAt).fromNow()}</Text>
        ) : null}
      </View>
    </View>
  );
});

const ImageSlide = memo(function ImageSlide({
  uri,
  onPress,
  styles,
}: {
  uri: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={stylesStatic.tapLayer}>
      <ExpoImage
        source={{ uri }}
        style={styles.slideMedia}
        contentFit="contain"
        contentPosition="center"
        transition={180}
        cachePolicy="memory-disk"
      />
    </Pressable>
  );
});

// ------------------------------------------------------------
// FIX: most posts have exactly one image. Mounting the full
// Carousel (pan gesture recognizer + reanimated worklets +
// snap/loop config) for a single static image is pure overhead,
// multiplied by every post card on screen. Fast-path it.
// ------------------------------------------------------------
const PostMediaCarousel = memo(function PostMediaCarousel({
  media,
  onPressMedia,
  styles,
}: {
  media: PostMedia[];
  onPressMedia?: (media: PostMedia[], startIndex: number) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const normalizedMedia = useMemo<PostMedia[]>(
    () =>
      [...media]
        .filter((item) => item.type === "IMAGE" && Boolean(item.url))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({ ...item, url: toAbsoluteFileUrl(item.url) ?? item.url })),
    [media],
  );

  if (normalizedMedia.length === 0) {
    return null;
  }

  const carouselWidth = screenWidth;
  const carouselHeight = Math.min(screenWidth * 0.76, 360);

  if (normalizedMedia.length === 1) {
    const only = normalizedMedia[0];
    return (
      <View style={[styles.mediaWrap, { width: carouselWidth, height: carouselHeight }]}>
        <ImageSlide uri={only.url} onPress={() => onPressMedia?.(normalizedMedia, 0)} styles={styles} />
      </View>
    );
  }

  return (
    <View style={styles.mediaWrap}>
      <Carousel
        loop
        enabled
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
        renderItem={({ item, index: mediaIndex }) => (
          <ImageSlide uri={item.url} onPress={() => onPressMedia?.(normalizedMedia, mediaIndex)} styles={styles} />
        )}
      />

      <View style={styles.dotsRow}>
        {normalizedMedia.map((item, dotIndex) => (
          <View key={item.id ?? `${item.url}-${dotIndex}`} style={[styles.dot, dotIndex === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
});

// ------------------------------------------------------------
// Renders the quoted/original post inside a "SHARE" type post.
// Shows a placeholder if the original post is no longer available
// (deleted/unpublished) instead of erroring or showing blank data.
// ------------------------------------------------------------
const SharedPostEmbed = memo(function SharedPostEmbed({
  sharedPost,
  styles,
  colors,
  onPressMedia,
}: {
  sharedPost: NonNullable<CommunityPost["sharedPost"]>;
  styles: ReturnType<typeof createStyles>;
  colors: AppColors;
  onPressMedia?: (media: PostMedia[], startIndex: number) => void;
}) {
  if (sharedPost.status !== "PUBLISHED") {
    return (
      <View style={styles.embedCard}>
        <Text style={styles.embedUnavailableText}>This post is no longer available.</Text>
      </View>
    );
  }

  const authorName = getAuthorName(sharedPost.author as CommunityPost["author"]);
  const previewText = htmlToPlainText(sharedPost.content);
  const sharedMedia = sharedPost.media ?? [];

  return (
    <View style={styles.embedCard}>
      <View style={styles.embedHeader}>
        <Avatar alt="" size="sm" variant="soft" color="accent">
          {sharedPost.author?.image ? (
            <Avatar.Image source={{ uri: toAbsoluteFileUrl(sharedPost.author.image) ?? undefined }} />
          ) : null}
          <Avatar.Fallback>{getInitials(authorName)}</Avatar.Fallback>
        </Avatar>
       <View style={{ marginLeft: 8, flex: 1 }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Text numberOfLines={1} style={styles.embedAuthorName}>
      {authorName}
    </Text>
    {sharedPost.author?.isVerified ? (
      <VerifiedBadge track={sharedPost.author.verificationTrack} size={12} />
    ) : null}
  </View>
  {!!sharedPost.community?.name && (
            <Text numberOfLines={1} style={styles.embedCommunityName}>
              {sharedPost.community.name}
            </Text>
          )}
        </View>
      </View>

      {!!sharedPost.title && <Text style={styles.embedTitle}>{sharedPost.title}</Text>}
      {!!previewText && (
        <Text numberOfLines={4} style={styles.embedContent}>
          {previewText}
        </Text>
      )}

      {sharedMedia.length > 0 ? (
        <View style={styles.embedMediaWrap}>
          <PostMediaCarousel media={sharedMedia} onPressMedia={onPressMedia} styles={styles} />
        </View>
      ) : null}
    </View>
  );
});

function CommunityPostCard({
  post,
  disableMediaPlayback = false,
  onPressLike,
  ownedCommunityIds,
  onPressDislike,
  onPressComment,
  onPressShare,
  onPressAuthor,
  onPressMedia,
  onPressPollOption,
  canDelete = false,
  isDeleting = false,
  canEdit = false,
  onEdit,
  onDelete,
  showCommunityHeader = false,
  onPressJoin,
}: CommunityPostCardProps) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();

  // FIX: styles were rebuilt (StyleSheet.create, ~60 style objects)
  // on every card instance via useMemo(() => createStyles(colors), [colors]).
  // `colors` is the same object for every card in the feed, so this ran
  // once per card instead of once per theme. getStyles() below caches
  // the result per `colors` reference so it's built exactly once.
  const styles = getStyles(colors);

  const authorName = getAuthorName(post.author);
  const authorImage = toAbsoluteFileUrl(post.author.image) ?? undefined;
  const hasMedia = Boolean(post.media?.length);
  const tagLabel = getPostTagLabel(post.tag);
  const isOwnerOfCommunity = Boolean(post.community?.id && ownedCommunityIds?.has(post.community.id));
  const isSharePost = post.type === "SHARE" && Boolean(post.sharedPost);
  const isLiveHighlightPost = Boolean(post.isLiveHighlight && post.highlightDiscussionId);

  const hasYouTubeEmbed =
    !hasMedia && post.linkType === "VIDEO" && post.linkProvider === "YOUTUBE" && Boolean(post.linkExternalId);

  const [expanded, setExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [joinCommunity, { isLoading: isJoining }] = useJoinCommunityMutation();
  const [leaveCommunity, { isLoading: isLeaving }] = useLeaveCommunityMutation();

  const liked = Boolean(post.isLikedByMe);
  const disliked = Boolean(post.isDislikedByMe);

  const plainText = useMemo(() => htmlToPlainText(post.content), [post.content]);
  const shouldCollapse = plainText.length > 220;

  const htmlSource = useMemo(() => {
    if (!post.content?.trim()) return null;
    return { html: `<div>${post.content}</div>` };
  }, [post.content]);

  const contentWidth = Math.max(width - 24, 220);

  const handleLike = useCallback(() => {
    onPressLike?.(post);
  }, [onPressLike, post]);

  const handleDislike = useCallback(() => {
    onPressDislike?.(post);
  }, [onPressDislike, post]);
  const handleOpenLiveHighlight = useCallback(() => {
  if (!post.highlightDiscussionId) return;

  router.push({
    pathname: "/discussions/[discussionId]/live",
    params: {
      slug: post.communityId,          // or post.community?.slug if your route reads a slug
      discussionId: post.highlightDiscussionId,
      communityId: post.communityId,   // send both in case your live screen reads communityId directly
    },
  });
}, [post]);

  const handleShare = useCallback(() => {
    onPressShare?.(post);
  }, [onPressShare, post]);

  const handleOpenLink = useCallback(async (_event: unknown, href?: string) => {
    if (!href) return;
    const finalUrl =
      /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href) ? href : `https://${href}`;
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
        defaultTextProps={{ selectable: false }}
        renderersProps={{ a: { onPress: handleOpenLink } }}
      />
    );
  };

  // ------------------------------------------------------------
  // JOIN / JOINED behaviour
  //
  // derivedJoined = "what the server currently says is true" for
  // this post's community, read fresh from props every render.
  //
  // isJoined = local optimistic copy, so a tap flips the button
  // instantly instead of waiting on the network round trip.
  //
  // FIX (previous bug): this used to only re-sync on [post.id],
  // so if the same post object later arrived with an updated
  // isJoinedByMe (e.g. after a refetch/cache patch), the card
  // never picked it up. Now it re-syncs whenever the actual
  // derived server value changes, not just when the post's id
  // changes — so stale/one-off mismatches self-heal.
  // ------------------------------------------------------------
 const communityId = post.community?.id || post.communityId;

  const derivedJoined =
    post.isJoinedByMe ??
    post.isCommunityFollowedByMe ??
    post.community?.isJoinedByMe ??
    post.community?.isMember ??
    post.community?.isCommunityFollowedByMe ??
    false;

  const [isJoined, setIsJoined] = useState(derivedJoined);
  const [showJoinPill, setShowJoinPill] = useState(!derivedJoined);

  // justJoined = true ONLY right after the user actually taps "Join"
  // in this session. This is what earns the flash-then-collapse
  // animation. Any other reason isJoined changes — FlashList
  // recycling this card into a different post, a background
  // refetch, a resync from fresh props — must NOT replay the
  // animation, or the button appears to flash/disappear randomly
  // while scrolling.
  const [justJoined, setJustJoined] = useState(false);

  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCommunityIdRef = useRef(communityId);

  // Silent resync: fires whenever this cell now represents a
  // different community (recycling) or the server value changed
  // under the same post (refetch/cache patch). No flash, no timer.
  useEffect(() => {
    prevCommunityIdRef.current = communityId;

    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setIsJoined(derivedJoined);
    setJustJoined(false);
    // already joined -> render nothing, same as the Community tab
    // not joined -> show "Join"
    setShowJoinPill(!derivedJoined);
  }, [communityId, derivedJoined]);

  // Only the "just tapped Join" flash gets the auto-collapse timer.
  useEffect(() => {
    if (!justJoined) return;

    collapseTimerRef.current = setTimeout(() => {
      setShowJoinPill(false);
    }, JOIN_PILL_COLLAPSE_DELAY_MS);

    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, [justJoined]);

  const performJoin = useCallback(async () => {
    if (!communityId) return;

    try {
      setIsJoined(true);
      setShowJoinPill(true);
      setJustJoined(true);
      await joinCommunity({ communityId }).unwrap();
    } catch (error) {
      setIsJoined(false);
      setJustJoined(false);
      setShowJoinPill(true);
      console.log("Join community failed:", error);
      Alert.alert("Could not join", "Something went wrong while joining this community.");
    }
  }, [communityId, joinCommunity]);

  const performLeave = useCallback(async () => {
    if (!communityId) return;

    try {
      setIsJoined(false);
      setJustJoined(false);
      setShowJoinPill(true);
      await leaveCommunity(communityId).unwrap();
    } catch (error) {
      setIsJoined(true);
      setShowJoinPill(true);
      console.log("Leave community failed:", error);
      Alert.alert("Could not leave", "Something went wrong while leaving this community.");
    }
  }, [communityId, leaveCommunity]);

  const handleJoinToggle = useCallback(() => {
    const communityName = post.community?.name ?? "this community";

    if (isJoined) {
      // still joined -> tapping opens the unjoin confirmation modal
      Alert.alert(
        "Leave community",
        `Are you sure you want to leave ${communityName}? You will lose access to its posts and content.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => void performLeave() },
        ],
      );
      return;
    }

    Alert.alert("Join community", `Do you want to join ${communityName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Join", onPress: () => void performJoin() },
    ]);
  }, [isJoined, post, performJoin, performLeave]);

  return (
    <Surface variant="default" style={styles.card}>
    <View style={styles.header}>
  {showCommunityHeader ? (
    <Pressable
      onPress={() => {
        const slug = post.community?.slug || post.communityId;
        router.push({ pathname: "/user/community/[slug]", params: { slug } });
      }}
      style={styles.authorRow}
    >
      <Avatar alt="" size="md" variant="soft" color="accent">
        {post.community?.avatarImage ? (
          <Avatar.Image source={{ uri: toAbsoluteFileUrl(post.community.avatarImage) ?? undefined }} />
        ) : null}
        <Avatar.Fallback>{getInitials(post.community?.name ?? "C")}</Avatar.Fallback>
      </Avatar>

      <View style={styles.authorMeta}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={styles.authorName}>
            {post.community?.name ?? "Community"}
          </Text>

          {post.community?.visibility === "PUBLIC" && (
            <View style={[styles.restrictedBadge, { borderColor: colors.success }]}>
              <Ionicons name="globe-outline" size={10} color={colors.success} />
              <Text style={[styles.restrictedBadgeText, { color: colors.success }]}>Public</Text>
            </View>
          )}

          {post.community?.visibility === "RESTRICTED" && (
            <View style={styles.restrictedBadge}>
              <Ionicons name="lock-closed-outline" size={10} color={colors.accent} />
              <Text style={styles.restrictedBadgeText}>Restricted</Text>
            </View>
          )}
        </View>

        <View style={styles.subMetaRow}>
          <Text style={styles.timeText}>{getPostTime(post)}</Text>
        </View>
      </View>
    </Pressable>
  ) : (
    <Pressable onPress={() => onPressAuthor?.(post.author.id)} style={styles.authorRow}>
      <Avatar alt="" size="md" variant="soft" color="accent">
        {authorImage ? <Avatar.Image source={{ uri: authorImage }} /> : null}
        <Avatar.Fallback>{getInitials(authorName)}</Avatar.Fallback>
      </Avatar>

      <View style={styles.authorMeta}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Text numberOfLines={1} style={styles.authorName}>
      {authorName}
    </Text>
    {post.author.isVerified ? (
      <VerifiedBadge track={post.author.verificationTrack} size={13} />
    ) : null}
  </View>
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
  )}

  {/* ------------------------------------------------------------
      Header right-side action slot.

      - showCommunityHeader (FOR_YOU feed) + owner of that community
        -> render nothing at all (no "Owner" badge anymore).
      - showCommunityHeader + not owner + showJoinPill
        -> Join / Joined pill (collapses on its own after a flash).
      - showCommunityHeader + not owner + pill collapsed
        -> render nothing (button has already done its job).
      - not showCommunityHeader (own profile / community feed) with
        edit/delete permission -> the "..." menu, same as before.
      - otherwise -> plain ellipsis placeholder, same as before.
     ------------------------------------------------------------ */}
  {showCommunityHeader ? (
    isOwnerOfCommunity ? null : showJoinPill ? (
      <Pressable
        onPress={handleJoinToggle}
        style={[styles.joinButton, isJoined && styles.joinedButton]}
        disabled={isJoining || isLeaving}
      >
        <Text style={styles.joinButtonText}>{isJoining || isLeaving ? "..." : isJoined ? "Joined" : "Join"}</Text>
      </Pressable>
    ) : null
  ) : canDelete || canEdit ? (
    <View style={styles.moreWrap}>
      <Menu>
        <Menu.Trigger asChild>
          <Pressable style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
          </Pressable>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Overlay />
          <Menu.Content
            presentation="popover"
            placement="bottom"
            align="end"
            width={190}
            className="rounded-2xl border border-border bg-surface"
          >
            {canEdit ? (
              <Menu.Item onPress={() => onEdit?.(post)} className="flex-row items-center gap-3">
                <Ionicons name="create-outline" size={18} color={colors.accent} />
                <Menu.ItemTitle>Edit post</Menu.ItemTitle>
              </Menu.Item>
            ) : null}

            {canDelete ? (
              <Menu.Item onPress={() => setIsDeleteDialogOpen(true)} variant="danger" className="flex-row items-center gap-3">
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Menu.ItemTitle>Delete post</Menu.ItemTitle>
              </Menu.Item>
            ) : null}
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </View>
  ) : (
    <Pressable style={styles.moreButton}>
      <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
    </Pressable>
  )}
</View>

{showCommunityHeader && post.community?.name ? (
  <View style={styles.communityTagRow}>
    <Text style={styles.communityTagText}>Post by</Text>
    <Pressable onPress={() => onPressAuthor?.(post.author.id)} hitSlop={6}>
      <Text style={styles.authorLinkText}>{post.author.name}</Text>
    </Pressable>
    {post.author.isVerified ? (
      <VerifiedBadge track={post.author.verificationTrack} size={12} />
    ) : null}
  </View>
) : null}

      {isSharePost ? (
        <View style={styles.tagWrap}>
          <View style={styles.shareBadgeChip}>
            <Ionicons name="repeat-outline" size={12} color={colors.accent} />
            <Text style={styles.postTagText}>Shared to feed</Text>
          </View>
        </View>
      ) : null}

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
    {!expanded ? (
      <Text
        style={styles.previewText}
        numberOfLines={shouldCollapse ? 4 : undefined}
        ellipsizeMode="tail"
      >
        {plainText}
      </Text>
    ) : (
      renderPostHtml()
    )}

    {shouldCollapse && (
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.seeMoreWrap}>
        <Text style={styles.seeMoreText}>{expanded ? "See less" : "See more"}</Text>
      </Pressable>
    )}
  </View>
) : null}

      {isSharePost && post.sharedPost ? (
        <SharedPostEmbed
          sharedPost={post.sharedPost}
          styles={styles}
          colors={colors}
          onPressMedia={onPressMedia}
        />
      ) : null}

   {isLiveHighlightPost ? (
  <Pressable onPress={handleOpenLiveHighlight} style={styles.linkCard}>
    <View style={styles.linkIconWrap}>
      <Ionicons name="radio-outline" size={18} color={colors.danger} />
    </View>

    <View style={styles.linkContent}>
      <Text numberOfLines={1} style={styles.linkTitle}>
        Live discussion ended
      </Text>

      <Text numberOfLines={2} style={styles.linkDescription}>
        {post.highlightParticipantCount ?? 0} watched · {post.highlightMessageCount ?? 0} messages
        {post.highlightDurationMinutes ? ` · ${post.highlightDurationMinutes} min` : ""}
      </Text>

      <Text numberOfLines={1} style={styles.linkText}>
        Tap to view the discussion
      </Text>
    </View>
  </Pressable>
) : hasYouTubeEmbed && post.linkExternalId ? (
  <YouTubeEmbedPlayer
    videoId={post.linkExternalId}
    thumbnailUrl={post.linkThumbnailUrl}
    title={post.linkTitle ?? post.title ?? "YouTube video"}
    sourceUrl={post.linkUrl}
    playbackDisabled={disableMediaPlayback}
  />
) : !!post.linkUrl && !hasMedia ? (
  <Pressable style={styles.linkCard} onPress={() => handleOpenLink(null, post.linkUrl ?? undefined)}>
    <View style={styles.linkIconWrap}>
      <Ionicons name="link-outline" size={18} color={colors.link} />
    </View>

    <View style={styles.linkContent}>
      <Text numberOfLines={1} style={styles.linkTitle}>
        {post.linkTitle?.trim() || "Shared link"}
      </Text>
      {!!post.linkDescription?.trim() && (
        <Text numberOfLines={2} style={styles.linkDescription}>
          {post.linkDescription}
        </Text>
      )}
      <Text numberOfLines={1} style={styles.linkText}>
        {post.linkUrl}
      </Text>
    </View>
  </Pressable>
) : null}

      {hasMedia ? <PostMediaCarousel media={post.media ?? []} onPressMedia={onPressMedia} styles={styles} /> : null}

      {post.poll ? <PollResultCard post={post} poll={post.poll} onPressOption={onPressPollOption} styles={styles} /> : null}

      <View style={styles.reactionsRow}>
        <View style={styles.voteGroup}>
          <ReactionButton
            compact
            iconFamily="material-community"
            icon={liked ? "thumb-up" : "thumb-up-outline"}
            label={formatCount(post.likeCount) || "Like"}
            accessibilityLabel={liked ? "Remove like" : "Like post"}
            active={liked}
            activeColor={colors.accent}
            onPress={handleLike}
            colors={colors}
            styles={styles}
          />

          <View style={styles.voteDivider} />

          <ReactionButton
            compact
            iconFamily="material-community"
            icon={disliked ? "thumb-down" : "thumb-down-outline"}
            label={formatCount(post.dislikeCount) || "Dislike"}
            accessibilityLabel={disliked ? "Remove dislike" : "Dislike post"}
            active={disliked}
            activeColor={colors.danger}
            onPress={handleDislike}
            colors={colors}
            styles={styles}
          />
        </View>

        <ReactionButton
          icon="chatbubble-outline"
          label={post.commentCount > 0 ? `${formatCount(post.commentCount)} reviews` : "reviews"}
          accessibilityLabel="Comment on post"
          onPress={() => onPressComment?.(post)}
          colors={colors}
          styles={styles}
        />

        <ReactionButton
          icon="share-social-outline"
          label={formatCount(post.shareCount) || "Share"}
          accessibilityLabel="Share post"
          onPress={handleShare}
          colors={colors}
          styles={styles}
        />
      </View>

      {/*
        FIX: Dialog was previously mounted unconditionally for every
        card. Portal-based overlay components typically register into
        a portal tree on mount even while closed. Most cards in a feed
        aren't deletable by the current viewer — only pay for this
        when it's actually possible to open it.
      */}
      {canDelete ? (
        <Dialog isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay />

            <Dialog.Content className="mx-5 rounded-[24px] bg-surface px-5 py-5">
              <View style={styles.dialogContent}>
                <Dialog.Title>Delete post</Dialog.Title>
                <Dialog.Description>
                  Are you sure you want to delete this post? This action cannot be undone.
                </Dialog.Description>

                <View style={styles.deleteWarningRow}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <View style={styles.deleteWarningTextWrap}>
                    <Text style={styles.deleteWarningTitle}>Permanent action</Text>
                    <Text style={styles.deleteWarningText}>
                      The post will be removed from your profile and community feed.
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
                    <Ionicons name="trash-outline" size={16} color={colors.dangerForeground} />
                    <Text style={styles.dialogDeleteText}>{isDeleting ? "Deleting..." : "Delete"}</Text>
                  </Pressable>
                </View>
              </View>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
      ) : null}
    </Surface>
  );
}

// FIX: wrap in memo so identical props (stable callbacks from the
// parent's useCallback + same post reference) skip re-render entirely.
export default memo(CommunityPostCard);

const stylesStatic = StyleSheet.create({
  tapLayer: {
    width: "100%",
    height: "100%",
  },
});

// ------------------------------------------------------------
// FIX: style cache keyed by the `colors` object reference.
// createStyles() used to run once per CARD via useMemo — now it
// runs once per THEME, shared by every card on screen.
// ------------------------------------------------------------
const styleCache = new WeakMap<AppColors, ReturnType<typeof createStyles>>();
function getStyles(colors: AppColors) {
  let cached = styleCache.get(colors);
  if (!cached) {
    cached = createStyles(colors);
    styleCache.set(colors, cached);
  }
  return cached;
}

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
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginRight: 10,
    },
    authorMeta: {
      flexShrink: 1,
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
    shareBadgeChip: {
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
      marginTop: 2,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    linkIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    linkContent: {
      flex: 1,
      gap: 2,
    },
    linkTitle: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_600SemiBold",
    },
    linkDescription: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },
    linkText: {
      color: colors.link,
      fontSize: 12,
      lineHeight: 18,
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
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingTop: 7,
      paddingHorizontal: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    voteGroup: {
      height: 40,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      overflow: "hidden",
    },
    voteDivider: {
      width: StyleSheet.hairlineWidth,
      height: 22,
      backgroundColor: colors.border,
    },
    reactionButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 12,
      paddingHorizontal: 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
    },
    compactReactionButton: {
      flex: 0,
      minWidth: 67,
      paddingHorizontal: 8,
      borderRadius: 0,
    },
    reactionButtonPressed: {
      backgroundColor: colors.segment,
    },
    reactionText: {
      flexShrink: 1,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
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
    authorLinkText:{
     color: colors.link,
     fontSize: 12,
     fontFamily: "Poppins_500Medium",
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
    joinButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    joinButtonText: {
      color: colors.accentForeground,
      fontSize: 13,
      fontFamily: "Poppins_600SemiBold",
    },
    communityTagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingTop: 2,
    },
    communityTagText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },
    restrictedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    restrictedBadgeText: {
      color: colors.accent,
      fontSize: 10,
      fontFamily: "Poppins_600SemiBold",
    },
    joinedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.success,
      alignSelf: "flex-start",
      marginLeft: 12,
    },
    joinedBadgeText: {
      color: colors.success,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },
    joinedButtonText: {
      color: colors.muted,
    },
    joinedButton: {
      backgroundColor: colors.accent,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    ownerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accent,
    },
    ownerBadgeText: {
      color: colors.accent,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    // shared post embed card
    embedCard: {
      marginHorizontal: 12,
      marginTop: 6,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      overflow: "hidden",
      padding: 10,
    },
    embedHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    embedAuthorName: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Poppins_600SemiBold",
    },
    embedCommunityName: {
      fontSize: 11,
      color: colors.muted,
      fontFamily: "Poppins_400Regular",
    },
    embedTitle: {
      marginTop: 6,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Poppins_700Bold",
    },
    embedContent: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
      color: colors.foreground,
      fontFamily: "Poppins_400Regular",
    },
    // wraps the reused PostMediaCarousel inside the embed card.
    // The carousel itself is full-bleed (screen-width) by design, so this
    // wrapper clips it to the embed card's rounded corners; adjust height
    // here if the carousel looks oversized inside the smaller embed box.
    embedMediaWrap: {
      marginTop: 8,
      marginHorizontal: -10, // cancel out embedCard's padding so media reaches the card edges
      borderRadius: 0,
      overflow: "hidden",
    },
    embedImage: {
      marginTop: 8,
      width: "100%",
      height: 160,
      borderRadius: 10,
      backgroundColor: colors.surface,
    },
    embedUnavailableText: {
      fontSize: 13,
      color: colors.muted,
      fontFamily: "Poppins_400Regular",
      fontStyle: "italic",
    },
  });
}