import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IconButton, Menu } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { toAbsoluteFileUrl } from "@/lib/file-url";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { useAppTheme } from "@/hooks/useAppTheme";
import type {
  AdminPost,
  CommunityPostType,
  CommunityVisibility,
} from "@/types/post";

type AppColors = ReturnType<typeof useAppTheme>["colors"];

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * AdminPost media shape is:
 *
 * row.media.items
 *
 * not:
 *
 * row.media
 */
function getFirstImageUrl(row: AdminPost) {
  const firstImage = row.media?.items?.find((item) => item.type === "IMAGE");

  return toAbsoluteFileUrl(firstImage?.url);
}

function hasVideoMedia(row: AdminPost) {
  return row.media?.items?.some((item) => item.type === "VIDEO") ?? false;
}

/**
 * Converts rich-text editor HTML content into clean plain text.
 *
 * Example:
 * <p>Hello world</p>        -> Hello world
 * <p>#Offer new phone</p>   -> Offer new phone
 * &nbsp;                    -> space
 */
function toPlainPostText(value?: string | null) {
  if (!value) return "No text content";

  const text = value
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/#/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return text || "No text content";
}

function getPostIcon(type: CommunityPostType) {
  if (type === "MEDIA") return "image-outline";
  if (type === "LINK") return "link-outline";
  return "document-text-outline";
}

function VisibilityBadge({
  visibility,
  colors,
}: {
  visibility: CommunityVisibility;
  colors: AppColors;
}) {
  const isPrivate = visibility === "PRIVATE";

  return (
    <View
      style={[
        styles.visibilityBadge,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.visibilityText,
          {
            color: isPrivate ? "#d97706" : colors.accent,
          },
        ]}
      >
        {isPrivate ? "Private" : "Public"}
      </Text>
    </View>
  );
}

/**
 * Shows:
 * - first image thumbnail if post has image media
 * - video icon if post has video but no image
 * - normal post type icon if no media
 */
function PostThumbnail({
  row,
  colors,
}: {
  row: AdminPost;
  colors: AppColors;
}) {
  const imageUrl = getFirstImageUrl(row);
  const hasVideo = hasVideoMedia(row);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        resizeMode="cover"
        style={[
          styles.postImage,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      />
    );
  }

  return (
    <View
  style={[
    styles.postIconWrap,
    {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.border,
    },
  ]}
>
  <Ionicons
    name={hasVideo ? "videocam-outline" : getPostIcon(row.post.type)}
    size={17}
    color={colors.accent}
  />
</View>
  );
}

function PostCell({ row, colors }: { row: AdminPost; colors: AppColors }) {
  const plainText = toPlainPostText(row.post.content ?? row.table.postPreview);

  return (
    <View style={styles.postCell}>
      <PostThumbnail row={row} colors={colors} />

      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={[styles.postText, { color: colors.foreground }]}
      >
        {plainText}
      </Text>
    </View>
  );
}

function CommunityCell({
  row,
  colors,
}: {
  row: AdminPost;
  colors: AppColors;
}) {
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[styles.mainText, { color: colors.foreground }]}
    >
      {row.community.name}
    </Text>
  );
}

function AuthorCell({ row, colors }: { row: AdminPost; colors: AppColors }) {
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[styles.mainText, { color: colors.foreground }]}
    >
      {row.author.displayName || row.author.name}
    </Text>
  );
}

function NumberCell({
  value,
  colors,
}: {
  value: number;
  colors: AppColors;
}) {
  return (
    <Text style={[styles.numberText, { color: colors.foreground }]}>
      {value}
    </Text>
  );
}

function PostActionsMenu({
  row,
  colors,
  onViewPost,
  onViewCommunity,
  onViewAuthor,
}: {
  row: AdminPost;
  colors: AppColors;
  onViewPost?: (row: AdminPost) => void;
  onViewCommunity?: (row: AdminPost) => void;
  onViewAuthor?: (row: AdminPost) => void;
}) {
  const [visible, setVisible] = useState(false);

  const closeMenu = () => setVisible(false);

  const openLink = async () => {
    closeMenu();

    const url = row.post.linkUrl?.trim();

    if (!url) {
      Alert.alert("No link", "This post does not have a link.");
      return;
    }

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert("Cannot open link", "This link cannot be opened.");
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      contentStyle={{
        backgroundColor: colors.surface,
        borderRadius: 16,
      }}
      anchor={
        <IconButton
          icon="dots-vertical"
          size={20}
          iconColor={colors.foreground}
          style={styles.menuButton}
          onPress={() => setVisible(true)}
        />
      }
    >
      <Menu.Item
        onPress={() => {
          closeMenu();
          onViewPost?.(row);
        }}
        title="View post"
      />

      <Menu.Item
        onPress={() => {
          closeMenu();
          onViewCommunity?.(row);
        }}
        title="View community"
      />

      <Menu.Item
        onPress={() => {
          closeMenu();
          onViewAuthor?.(row);
        }}
        title="View author"
      />

      {row.post.linkUrl ? (
        <Menu.Item onPress={openLink} title="Open link" />
      ) : null}
    </Menu>
  );
}

export function createAdminPostColumns({
  colors,
  onViewPost,
  onViewCommunity,
  onViewAuthor,
}: {
  colors: AppColors;
  onViewPost?: (row: AdminPost) => void;
  onViewCommunity?: (row: AdminPost) => void;
  onViewAuthor?: (row: AdminPost) => void;
}): DataTableColumn<AdminPost>[] {
  return [
    {
      key: "post",
      label: "Post",
      width: 310,
      searchable: true,
      render: (row) => <PostCell row={row} colors={colors} />,
      getSearchValue: (row) =>
        [
          toPlainPostText(row.post.content),
          row.post.linkUrl,
          row.community.name,
          row.author.displayName,
          row.author.name,
        ]
          .filter(Boolean)
          .join(" "),
    },
    {
      key: "community",
      label: "Community",
      width: 180,
      searchable: true,
      render: (row) => <CommunityCell row={row} colors={colors} />,
      getSearchValue: (row) => row.community.name,
    },
    {
      key: "author",
      label: "Author",
      width: 170,
      searchable: true,
      render: (row) => <AuthorCell row={row} colors={colors} />,
      getSearchValue: (row) => `${row.author.displayName} ${row.author.name}`,
    },
    {
      key: "visibility",
      label: "Visibility",
      width: 120,
      align: "center",
      render: (row) => (
        <VisibilityBadge visibility={row.community.visibility} colors={colors} />
      ),
    },
    {
      key: "likes",
      label: "Likes",
      width: 90,
      align: "center",
      sortable: true,
      getSortValue: (row) => row.engagement.likeCount,
      render: (row) => (
        <NumberCell value={row.engagement.likeCount} colors={colors} />
      ),
    },
    {
      key: "comments",
      label: "Comments",
      width: 110,
      align: "center",
      sortable: true,
      getSortValue: (row) => row.engagement.commentCount,
      render: (row) => (
        <NumberCell value={row.engagement.commentCount} colors={colors} />
      ),
    },
    {
      key: "shares",
      label: "Shares",
      width: 90,
      align: "center",
      sortable: true,
      getSortValue: (row) => row.engagement.shareCount,
      render: (row) => (
        <NumberCell value={row.engagement.shareCount} colors={colors} />
      ),
    },
    {
      key: "publishedAt",
      label: "Published",
      width: 135,
      sortable: true,
      getSortValue: (row) => new Date(row.table.publishedAt).getTime(),
      render: (row) => (
        <Text style={[styles.mainText, { color: colors.foreground }]}>
          {formatDate(row.table.publishedAt)}
        </Text>
      ),
    },
    {
      key: "actions",
      label: "Action",
      width: 90,
      align: "center",
      render: (row) => (
        <PostActionsMenu
          row={row}
          colors={colors}
          onViewPost={onViewPost}
          onViewCommunity={onViewCommunity}
          onViewAuthor={onViewAuthor}
        />
      ),
    },
  ];
}

export function createAdminPostFilters(): DataTableFilterConfig<AdminPost>[] {
  return [
    {
      key: "visibility",
      label: "Visibility",
      defaultValue: "ALL",
      options: [
        { label: "All", value: "ALL" },
        { label: "Public", value: "PUBLIC" },
        { label: "Private", value: "PRIVATE" },
      ],
      predicate: () => true,
    },
  ];
}

const styles = StyleSheet.create({
  postCell: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  postImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },

  postIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  postIconPlain: {
  width: 58,
  height: 58,
  alignItems: "center",
  justifyContent: "center",
},

  postText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  mainText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
  },

  numberText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },

  visibilityBadge: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  visibilityText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  menuButton: {
    margin: 0,
  },
});