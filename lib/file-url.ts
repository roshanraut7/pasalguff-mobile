const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

/**
 * Returns the backend origin only.
 *
 * EXPO_PUBLIC_AUTH_URL can be:
 * http://localhost:3000/api/auth
 *
 * But uploaded files are served from:
 * http://localhost:3000/uploads/...
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
 */
export function toAbsoluteFileUrl(url?: string | null) {
  if (!url) return undefined;

  const trimmedUrl = url.trim();

  if (!trimmedUrl) return undefined;

  /**
   * Already usable by React Native.
   */
  if (/^(https?:\/\/|file:\/\/|data:|blob:)/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  const apiOrigin = getApiOrigin();

  const normalizedPath = trimmedUrl.startsWith("/")
    ? trimmedUrl
    : `/${trimmedUrl}`;

  if (!apiOrigin) {
    return normalizedPath;
  }

  return `${apiOrigin}${normalizedPath}`;
}