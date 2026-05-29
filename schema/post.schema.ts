import { z } from "zod";
import type {
  CommunityPostMediaType,
  CommunityPostTag,
  CommunityPostType,
  PostVisibility,
} from "@/types/post";

export const POST_TYPES = ["TEXT", "MEDIA", "LINK"] as const;

export const POST_TAGS = [
  "GENERAL",
  "ANNOUNCEMENT",
  "QUESTION",
  "OFFER",
  "EVENT",
  "NEWS",
  "HELP",
] as const;

export const POST_MEDIA_TYPES = ["IMAGE", "VIDEO"] as const;

export const POST_VISIBILITIES = [
  "PUBLIC",
  "COMMUNITY",
  "FOLLOWERS",
  "PRIVATE",
] as const;

export const stripHtml = (html?: string | null) =>
  (html ?? "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const derivePostType = ({
  linkUrl,
  mediaCount,
}: {
  linkUrl?: string | null;
  mediaCount: number;
}): CommunityPostType => {
  if (mediaCount > 0) return "MEDIA";
  if ((linkUrl ?? "").trim().length > 0) return "LINK";
  return "TEXT";
};

export const postMediaSchema = z.object({
  type: z.enum(POST_MEDIA_TYPES),
  url: z.string().min(1, "Media URL is required"),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const postPollSchema = z.object({
  question: z.string().trim().min(1, "Poll question is required"),
  options: z
    .array(z.string().trim().min(1, "Poll option cannot be empty"))
    .min(2, "Poll must have at least 2 options")
    .max(10, "Poll can have maximum 10 options"),
  closesAt: z.string().trim().optional().nullable(),
});

const visibilitySchema = z.enum(POST_VISIBILITIES);

export const draftPostSchema = z.object({
  communityId: z.string().min(1, "Please choose a community"),

  title: z.string().trim().optional().default(""),

  tag: z.enum(POST_TAGS).default("GENERAL"),

  visibility: visibilitySchema.default("PUBLIC"),

  html: z.string().default(""),

  plainText: z.string().default(""),

  linkUrl: z.string().trim().optional().default(""),

  media: z.array(postMediaSchema).max(20).default([]),

  poll: postPollSchema.optional(),
});

export const publishPostSchema = draftPostSchema.superRefine((value, ctx) => {
  const type = derivePostType({
    linkUrl: value.linkUrl,
    mediaCount: value.media.length,
  });

  const hasTitle = value.title.trim().length > 0;
  const hasText = value.plainText.trim().length > 0;
  const hasLink = value.linkUrl.trim().length > 0;
  const hasMedia = value.media.length > 0;
  const hasPoll = Boolean(value.poll);

  if (!hasTitle) {
    ctx.addIssue({
      code: "custom",
      path: ["title"],
      message: "Title is required",
    });
  }

  /**
   * Important:
   * Poll-only post should be allowed.
   * So we check text/link/media/poll together.
   */
  if (!hasText && !hasLink && !hasMedia && !hasPoll) {
    ctx.addIssue({
      code: "custom",
      path: ["html"],
      message: "Add text, media, link, or poll before publishing",
    });
  }

  if (type === "LINK" && !hasLink) {
    ctx.addIssue({
      code: "custom",
      path: ["linkUrl"],
      message: "Add a link before publishing a link post",
    });
  }

  if (type === "MEDIA" && !hasMedia) {
    ctx.addIssue({
      code: "custom",
      path: ["media"],
      message: "Add at least one image or video before publishing",
    });
  }

  if (value.poll) {
    const uniqueOptions = new Set(
      value.poll.options.map((option) => option.trim().toLowerCase()),
    );

    if (uniqueOptions.size !== value.poll.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["poll"],
        message: "Poll options must be unique",
      });
    }

    if (value.poll.closesAt) {
      const parsedDate = new Date(value.poll.closesAt);

      if (Number.isNaN(parsedDate.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["poll"],
          message: "Poll close date must be valid",
        });
      }
    }
  }
});

export type DraftPostInput = z.infer<typeof draftPostSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;

export type UiPostTag = CommunityPostTag;
export type UiPostMediaType = CommunityPostMediaType;
export type UiPostType = CommunityPostType;
export type UiPostVisibility = PostVisibility;