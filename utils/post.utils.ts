import type {
  LocalLinkPreview,
  PostTag,
  PostVisibility,
  TagOptionMeta,
  VisibilityOptionMeta,
} from "@/components/post/Post.types";
import { POST_TAGS } from "@/schema/post.schema";

// ─── ID generator ────────────────────────────────────────────────────────────

let _idCounter = 0;

export function makeId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter}`;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_ATTACHMENTS = 6;
export const MAX_POLL_OPTIONS = 10;
export const FOOTER_RESERVED_SPACE = 150;

export const TAG_OPTIONS: TagOptionMeta[] = POST_TAGS.map((tag) => ({
  value: tag as PostTag,
  label: tag
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
}));

export const POST_VISIBILITY_OPTIONS: VisibilityOptionMeta[] = [
  { value: "PUBLIC",     label: "Everyone",  icon: "earth-outline"       },
  { value: "COMMUNITY",  label: "Community", icon: "people-outline"      },
  { value: "FOLLOWERS",  label: "Followers", icon: "person-add-outline"  },
  { value: "PRIVATE",    label: "Only me",   icon: "lock-closed-outline" },
];

// ─── Link parser ─────────────────────────────────────────────────────────────

export function parseLinkInput(value: string): LocalLinkPreview | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iframeSource = trimmed.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
  const candidate = (iframeSource ?? trimmed).replace(/&amp;/g, "&");

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v");
      if (
        url.pathname.startsWith("/embed/") ||
        url.pathname.startsWith("/shorts/") ||
        url.pathname.startsWith("/live/")
      ) {
        videoId = url.pathname.split("/")[2] ?? null;
      }
    }

    if (videoId) {
      const safeVideoId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (!safeVideoId) return null;
      return {
        kind: "YOUTUBE",
        cleanUrl: `https://www.youtube.com/watch?v=${safeVideoId}`,
        host: "youtube.com",
        videoId: safeVideoId,
        thumbnailUrl: `https://i.ytimg.com/vi/${safeVideoId}/hqdefault.jpg`,
      };
    }

    const cleanUrl = url.toString();

    if (/\.(png|jpg|jpeg|webp|gif)$/i.test(url.pathname)) {
      return { kind: "IMAGE", cleanUrl, host: url.hostname, thumbnailUrl: cleanUrl };
    }

    return { kind: "WEBSITE", cleanUrl, host: url.hostname };
  } catch {
    return null;
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function flattenErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "root");
    if (!next[key]) next[key] = issue.message;
  }
  return next;
}