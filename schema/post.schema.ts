import { z } from "zod";
import type { PostMediaType, PostTag, PostType } from "@/store/api/postApi";

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
}): PostType => {
  if (mediaCount > 0) return "MEDIA";
  if ((linkUrl ?? "").trim().length > 0) return "LINK";
  return "TEXT";
};

export const postMediaSchema = z.object({
  type: z.enum(POST_MEDIA_TYPES),
  url: z.string().min(1),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const draftPostSchema = z.object({
  communityId: z.string().min(1, "Please choose a community"),
  tag: z.enum(POST_TAGS).default("GENERAL"),
  html: z.string().default(""),
  plainText: z.string().default(""),
  linkUrl: z.string().trim().optional().default(""),
  media: z.array(postMediaSchema).max(20).default([]),
});

export const publishPostSchema = draftPostSchema.superRefine((value, ctx) => {
  const type = derivePostType({
    linkUrl: value.linkUrl,
    mediaCount: value.media.length,
  });

  if (type === "TEXT" && value.plainText.trim().length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["html"],
      message: "Write something in the editor before publishing",
    });
  }

  if (type === "LINK" && value.linkUrl.trim().length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["linkUrl"],
      message: "Add a link before publishing a link post",
    });
  }

  if (type === "MEDIA" && value.media.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["media"],
      message: "Add at least one image or video before publishing",
    });
  }
});

export type DraftPostInput = z.infer<typeof draftPostSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;
export type UiPostTag = PostTag;
export type UiPostMediaType = PostMediaType;