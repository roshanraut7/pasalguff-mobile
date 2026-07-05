// src/components/ProfileImageViewer.tsx (adjust path as needed)

import React from "react";
import PostMediaViewer from "../post/PostMediaViewer"; // Adjust import path
import type { PostMedia } from "@/types/post";

type ProfileImageViewerProps = {
  visible: boolean;
  imageUrl?: string | null;
  onClose: () => void;
  type?: "avatar" | "cover";
};

export default function ProfileImageViewer({
  visible,
  imageUrl,
  onClose,
  type = "avatar",
}: ProfileImageViewerProps) {
  if (!visible || !imageUrl) return null;

  const absoluteUrl = imageUrl; // Already converted in parent

  const media: PostMedia[] = [
    {
      id: `profile-${type}-${Date.now()}`,
      type: "IMAGE" as const,
      url: absoluteUrl,
      sortOrder: 0,
    },
  ];

  return (
    <PostMediaViewer
      visible={visible}
      media={media}
      initialIndex={0}
      onClose={onClose}
    />
  );
}