const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

/**
 * Returns the backend origin only.
 *
 * Why:
 * EXPO_PUBLIC_AUTH_URL can sometimes be something like:
 * http://localhost:3000/api/auth
 *
 * But uploaded files are served from:
 * http://localhost:3000/uploads/...
 *
 * So we remove /api/auth if it exists.
 */
function getApiOrigin() {
  const rawBase = RAW_API_BASE_URL.trim();

  if (!rawBase) return "";

  const cleanedBase = rawBase
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "");

  return cleanedBase.endsWith("/") ? cleanedBase.slice(0, -1) : cleanedBase;
}

/**
 * Converts backend file paths into absolute URLs for React Native Image/video.
 *
 * Backend may return:
 * - /uploads/post/image.png
 * - uploads/post/image.png
 * - http://localhost:3000/uploads/post/image.png
 *
 * React Native usually needs an absolute URL, so this helper converts relative
 * upload paths into:
 * http://localhost:3000/uploads/post/image.png
 */
export function toAbsoluteFileUrl(url?: string | null) {
  if (!url) return undefined;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return undefined;

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  const apiOrigin = getApiOrigin();
  if (!apiOrigin) {
    return trimmedUrl.startsWith("/") ? trimmedUrl : `/${trimmedUrl}`;
  }

  const normalizedPath = trimmedUrl.startsWith("/")
    ? trimmedUrl
    : `/${trimmedUrl}`;

  return `${apiOrigin}${normalizedPath}`;
}