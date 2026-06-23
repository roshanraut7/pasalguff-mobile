const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

function getApiOrigin() {
  const rawBase = RAW_API_BASE_URL.trim();

  if (!rawBase) return "";

  const cleanedBase = rawBase
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "");

  return cleanedBase.endsWith("/") ? cleanedBase.slice(0, -1) : cleanedBase;
}

export function toAbsoluteFileUrl(url?: string | null) {
  if (!url) return undefined;

  const trimmedUrl = url.trim();

  if (!trimmedUrl) return undefined;

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

  return encodeURI(`${apiOrigin}${normalizedPath}`);
}