import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type {
  DataTableColumn,
  DataTableFilterConfig,
} from "@/components/common/data-table";
import type { CommunityPostTableItem } from "@/types/post";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useAppTheme } from "@/hooks/useAppTheme";

type AppColors = ReturnType<typeof useAppTheme>["colors"];

export type CommunityPostAction = "view" | "hide" | "remove" | "restore";

type CreateCommunityPostColumnsParams = {
  colors: AppColors;
  canManagePosts: boolean;
  onActionPress: (post: CommunityPostTableItem) => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getShortContent(content?: string | null) {
  const text = content?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  if (!text) return "No content";

  return text;
}

function getStatusColors(
  status: CommunityPostTableItem["status"],
  colors: AppColors,
) {
  if (status === "PUBLISHED") {
    return {
      text: colors.success,
      background: "rgba(34, 197, 94, 0.10)",
      border: "rgba(34, 197, 94, 0.22)",
    };
  }

  if (status === "HIDDEN") {
    return {
      text: colors.warning,
      background: "rgba(245, 158, 11, 0.10)",
      border: "rgba(245, 158, 11, 0.22)",
    };
  }

  if (status === "REMOVED") {
    return {
      text: colors.danger,
      background: "rgba(220, 38, 38, 0.10)",
      border: "rgba(220, 38, 38, 0.22)",
    };
  }

  return {
    text: colors.muted,
    background: colors.surfaceSecondary,
    border: colors.border,
  };
}

function PostCell({
  row,
  colors,
}: {
  row: CommunityPostTableItem;
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);
  const firstMedia = row.media?.[0];
  const mediaUrl = toAbsoluteFileUrl(firstMedia?.url) ?? null;

  return (
    <View style={styles.postCell}>
      <View style={styles.thumbnail}>
        {mediaUrl ? (
          <Image
            source={{ uri: mediaUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name={
              row.type === "LINK"
                ? "link-outline"
                : row.type === "MEDIA"
                  ? "image-outline"
                  : "document-text-outline"
            }
            size={20}
            color={colors.accent}
          />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={styles.postTitle}>
          {getShortContent(row.content)}
        </Text>

        <Text numberOfLines={1} style={styles.postSubText}>
          {row.type}
          {row.tag ? ` • ${row.tag}` : ""}
        </Text>
      </View>
    </View>
  );
}

function AuthorCell({
  row,
  colors,
}: {
  row: CommunityPostTableItem;
  colors: AppColors;
}) {
  return (
    <Text
      numberOfLines={1}
      style={{
        color: colors.foreground,
        fontSize: 13,
        fontFamily: "Poppins_500Medium",
      }}
    >
      {row.author?.name ?? "Unknown"}
    </Text>
  );
}

function NumberCell({
  value,
  icon,
  colors,
}: {
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  colors: AppColors;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name={icon} size={15} color={colors.muted} />

      <Text
        style={{
          color: colors.foreground,
          fontSize: 13,
          fontFamily: "Poppins_600SemiBold",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusCell({
  status,
  colors,
}: {
  status: CommunityPostTableItem["status"];
  colors: AppColors;
}) {
  const styles = createColumnStyles(colors);
  const statusColors = getStatusColors(status, colors);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: statusColors.background,
          borderColor: statusColors.border,
        },
      ]}
    >
      <Text style={[styles.statusText, { color: statusColors.text }]}>
        {status}
      </Text>
    </View>
  );
}

function ActionCell({
  row,
  colors,
  onActionPress,
}: {
  row: CommunityPostTableItem;
  colors: AppColors;
  onActionPress: (post: CommunityPostTableItem) => void;
}) {
  const styles = createColumnStyles(colors);

  return (
    <Pressable
      onPress={() => onActionPress(row)}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Ionicons name="ellipsis-vertical" size={20} color={colors.foreground} />
    </Pressable>
  );
}

export function createCommunityPostColumns({
  colors,
  canManagePosts,
  onActionPress,
}: CreateCommunityPostColumnsParams): DataTableColumn<CommunityPostTableItem>[] {
  const columns: DataTableColumn<CommunityPostTableItem>[] = [
    {
      key: "post",
      label: "Post",
      width: 290,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.content ?? "",
      render: (row) => <PostCell row={row} colors={colors} />,
    },
    {
      key: "author",
      label: "Author",
      width: 150,
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.author?.name ?? "",
      render: (row) => <AuthorCell row={row} colors={colors} />,
    },
    {
      key: "likes",
      label: "Likes",
      width: 95,
      align: "center",
      render: (row) => (
        <NumberCell
          value={row.likeCount}
          icon="heart-outline"
          colors={colors}
        />
      ),
    },
    {
      key: "comments",
      label: "Comments",
      width: 120,
      align: "center",
      render: (row) => (
        <NumberCell
          value={row.commentCount}
          icon="chatbubble-outline"
          colors={colors}
        />
      ),
    },
    {
      key: "shares",
      label: "Shares",
      width: 100,
      align: "center",
      render: (row) => (
        <NumberCell
          value={row.shareCount}
          icon="share-social-outline"
          colors={colors}
        />
      ),
    },
    {
      key: "status",
      label: "Status",
      width: 130,
      align: "center",
      searchable: true,
      sortable: false,
      getSearchValue: (row) => row.status,
      render: (row) => <StatusCell status={row.status} colors={colors} />,
    },
    {
      key: "createdAt",
      label: "Created",
      width: 140,
      render: (row) => (
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontFamily: "Poppins_400Regular",
          }}
        >
          {formatDate(row.createdAt)}
        </Text>
      ),
    },
  ];

  if (canManagePosts) {
    columns.push({
      key: "actions",
      label: "Action",
      width: 95,
      align: "right",
      render: (row) => (
        <ActionCell
          row={row}
          colors={colors}
          onActionPress={onActionPress}
        />
      ),
    });
  }

  return columns;
}

export function createCommunityPostFilters(): DataTableFilterConfig<CommunityPostTableItem>[] {
  return [
    {
      key: "status",
      label: "Status",
      defaultValue: "PUBLISHED",
      options: [
        { label: "Published", value: "PUBLISHED" },
        { label: "Hidden", value: "HIDDEN" },
        { label: "Removed", value: "REMOVED" },
      ],
      predicate: () => true,
    },
    {
      key: "type",
      label: "Type",
      defaultValue: "",
      options: [
        { label: "All", value: "" },
        { label: "Text", value: "TEXT" },
        { label: "Media", value: "MEDIA" },
        { label: "Link", value: "LINK" },
      ],
      predicate: () => true,
    },
  ];
}

function createColumnStyles(colors: AppColors) {
  return StyleSheet.create({
    postCell: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    thumbnail: {
      width: 44,
      height: 44,
      borderRadius: 14,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    postTitle: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_600SemiBold",
    },

    postSubText: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    statusBadge: {
      alignSelf: "center",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },

    statusText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    actionButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}