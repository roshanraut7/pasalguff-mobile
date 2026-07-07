// lib/post-share-utils.ts

import type { CommunityPost } from "@/types/post";

type ShareableCommunityPost = CommunityPost & {
  content?: string | null;
  linkUrl?: string | null;
  shareUrl?: string | null;
  publicUrl?: string | null;
  slug?: string | null;
};

export function stripHtmlToText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeShareUrl(value?: string | null) {
  if (!value?.trim()) return null;

  const cleanUrl = value.trim();

  if (/^(https?:|mailto:|tel:|kamkuro:)/i.test(cleanUrl)) {
    return cleanUrl;
  }

  return `https://${cleanUrl}`;
}

export function getWebBaseUrl() {
  const rawBaseUrl =
    process.env.EXPO_PUBLIC_APP_WEB_URL ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    process.env.EXPO_PUBLIC_SITE_URL ??
    "";

  const cleanBaseUrl = rawBaseUrl.trim().replace(/\/$/, "");

  return cleanBaseUrl || null;
}

export function getPostPublicLink(post: CommunityPost) {
  const shareablePost = post as ShareableCommunityPost;

  const existingPublicLink = normalizeShareUrl(
    shareablePost.shareUrl ?? shareablePost.publicUrl ?? null,
  );

  if (existingPublicLink) {
    return existingPublicLink;
  }

 const webBaseUrl = getWebBaseUrl();

return `${webBaseUrl ?? "https://kamkuro.com"}/posts/${post.id}`;
}

export function getPostShareMessage(post: CommunityPost) {
  const shareablePost = post as ShareableCommunityPost;

  const content = stripHtmlToText(shareablePost.content);
  const postPublicLink = getPostPublicLink(post);
  const attachedLink = normalizeShareUrl(shareablePost.linkUrl);

  const parts = [
    content || "Check out this post",
    attachedLink ? `Link: ${attachedLink}` : null,
    `Post: ${postPublicLink}`,
  ].filter(Boolean);

  return parts.join("\n\n");
}