import type { MessageType } from "@/store/api/chatApi";

export function guessMimeTypeFromName(fileName?: string | null) {
  const name = fileName?.toLowerCase() || "";

  if (name.endsWith(".pdf")) return "application/pdf";

  if (name.endsWith(".doc")) return "application/msword";

  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (name.endsWith(".xls")) return "application/vnd.ms-excel";

  if (name.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (name.endsWith(".ppt")) return "application/vnd.ms-powerpoint";

  if (name.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".csv")) return "text/csv";

  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";

  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";

  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".m4a")) return "audio/mp4";
  if (name.endsWith(".aac")) return "audio/aac";
  if (name.endsWith(".ogg")) return "audio/ogg";
  if (name.endsWith(".opus")) return "audio/opus";
  if (name.endsWith(".amr")) return "audio/amr";

  return "application/octet-stream";
}

export function guessMessageType(mimeType?: string | null): MessageType {
  const type = mimeType?.toLowerCase() || "";

  if (type.startsWith("image/")) return "IMAGE";
  if (type.startsWith("video/")) return "VIDEO";
  if (type.startsWith("audio/")) return "AUDIO";

  return "FILE";
}

export function isImageMimeType(mimeType?: string | null) {
  return Boolean(mimeType?.toLowerCase().startsWith("image/"));
}

export function isVideoMimeType(mimeType?: string | null) {
  return Boolean(mimeType?.toLowerCase().startsWith("video/"));
}

export function isAudioMimeType(mimeType?: string | null) {
  return Boolean(mimeType?.toLowerCase().startsWith("audio/"));
}

export function isFileMimeType(mimeType?: string | null) {
  return (
    !isImageMimeType(mimeType) &&
    !isVideoMimeType(mimeType) &&
    !isAudioMimeType(mimeType)
  );
}