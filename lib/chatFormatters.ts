import dayjs from "dayjs";

export function formatActiveStatus(
  user?: {
    isOnline?: boolean;
    lastSeenAt?: string | null;
  } | null,
  _tick?: number,
) {
  if (!user) return "Direct message";

  if (user.isOnline) return "Online";

  if (!user.lastSeenAt) return "Offline";

  const lastSeen = dayjs(user.lastSeenAt);

  if (!lastSeen.isValid()) return "Offline";

  const now = dayjs();

  const diffMinutes = now.diff(lastSeen, "minute");
  const diffHours = now.diff(lastSeen, "hour");
  const diffDays = now.diff(lastSeen, "day");

  if (diffMinutes < 1) return "Active just now";
  if (diffMinutes === 1) return "Active 1m ago";
  if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;

  if (diffHours === 1) return "Active 1h ago";
  if (diffHours < 24) return `Active ${diffHours}h ago`;

  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 7) return `Active ${diffDays}d ago`;

  return "Offline";
}

export function formatFileSize(size?: number | null) {
  if (!size) return "";

  if (size < 1024) return `${size} B`;

  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function formatDateLabel(timestamp: string) {
  const date = dayjs(timestamp);
  const today = dayjs();

  if (date.isSame(today, "day")) return "Today";
  if (date.isSame(today.subtract(1, "day"), "day")) return "Yesterday";

  return date.format("D MMM");
}

export function formatMessageTime(timestamp: string) {
  return dayjs(timestamp).format("hh:mm A");
}

export function formatChatTime(value: string) {
  const date = dayjs(value);
  const now = dayjs();

  if (date.isSame(now, "day")) {
    return date.format("hh:mm A");
  }

  if (date.isSame(now.subtract(1, "day"), "day")) {
    return "Yesterday";
  }

  return date.format("D MMM");
}