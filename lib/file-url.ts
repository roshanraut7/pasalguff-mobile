const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

export function toAbsoluteFileUrl(url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const normalizedBase = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;

  return `${normalizedBase}${normalizedPath}`;
}