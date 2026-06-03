export type PostMediaType = "IMAGE";
export type PostVisibility = "PUBLIC" | "COMMUNITY" | "FOLLOWERS" | "PRIVATE";
export type PostTag =
  | "GENERAL"
  | "ANNOUNCEMENT"
  | "QUESTION"
  | "OFFER"
  | "EVENT"
  | "NEWS"
  | "HELP";
export type PostTab = "text" | "media" | "link" | "poll";

export type CommunityPostMedia = {
  id?: string;
  type: PostMediaType;
  url: string;
  sortOrder?: number;
};

export type CommunityPostPollOption = {
  id?: string;
  text: string;
  sortOrder?: number;
};

export type CommunityPostPoll = {
  id?: string;
  question: string;
  closesAt?: string | null;
  options: CommunityPostPollOption[];
};

export type CommunityPost = {
  id: string;
  communityId: string;
  title: string | null;
  tag: PostTag;
  visibility?: PostVisibility;
  content: string | null;
  linkUrl: string | null;
  media: CommunityPostMedia[];
  poll?: CommunityPostPoll | null;
};

export type ComposerAttachment = {
  id: string;
  source: "local" | "remote";
  uri: string;
  mediaType: PostMediaType;
  name?: string;
  mimeType?: string;
};

export type UploadPostMediaItem = {
  url: string;
  filename?: string;
  mimetype?: string;
  size?: number;
};

export type UploadPostMediaResponse = {
  total: number;
  items: UploadPostMediaItem[];
};

export type PostPollPayload = {
  question: string;
  options: string[];
  closesAt?: string | null;
};

export type TagOptionMeta = {
  value: PostTag;
  label: string;
};

export type VisibilityOptionMeta = {
  value: PostVisibility;
  label: string;
  icon: string;
};

export type LocalLinkPreview =
  | {
      kind: "YOUTUBE";
      cleanUrl: string;
      host: string;
      videoId: string;
      thumbnailUrl: string;
    }
  | {
      kind: "IMAGE";
      cleanUrl: string;
      host: string;
      thumbnailUrl: string;
    }
  | {
      kind: "WEBSITE";
      cleanUrl: string;
      host: string;
    };