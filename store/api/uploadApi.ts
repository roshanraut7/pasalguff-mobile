import { baseApi } from "./baseApi";

export type UploadResponse = {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};

export type UploadPostMediaItem = {
  index: number;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};

export type UploadPostMediaResponse = {
  total: number;
  items: UploadPostMediaItem[];
};

type UploadFilePayload = {
  uri: string;
  fileName?: string | null;
  name?: string | null;
  mimeType?: string | null;
};

export type UploadPostMediaFilePayload = {
  uri: string;
  name?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  mediaType?: "IMAGE" | "VIDEO";
};

export type UploadPostMediaPayload = {
  files: UploadPostMediaFilePayload[];
};

function buildFormData(payload: UploadFilePayload, fallbackPrefix: string) {
  const form = new FormData();

  form.append("file", {
    uri: payload.uri,
    name: payload.fileName ?? payload.name ?? `${fallbackPrefix}-${Date.now()}.jpg`,
    type: payload.mimeType ?? "image/jpeg",
  } as any);

  return form;
}

function getPostFileName(
  file: UploadPostMediaFilePayload,
  index: number,
): string {
  if (file.fileName) return file.fileName;
  if (file.name) return file.name;

  const isVideo =
    file.mediaType === "VIDEO" || file.mimeType?.startsWith("video/");

  return `post-media-${Date.now()}-${index}.${isVideo ? "mp4" : "jpg"}`;
}

function getPostMimeType(file: UploadPostMediaFilePayload): string {
  if (file.mimeType) return file.mimeType;

  if (file.mediaType === "VIDEO") {
    return "video/mp4";
  }

  return "image/jpeg";
}

function buildPostMediaFormData(payload: UploadPostMediaPayload) {
  const form = new FormData();

  payload.files.forEach((file, index) => {
    /**
     * Backend uses:
     * FilesInterceptor("files", 10)
     *
     * So the field name MUST be "files".
     */
    form.append("files", {
      uri: file.uri,
      name: getPostFileName(file, index),
      type: getPostMimeType(file),
    } as any);
  });

  return form;
}

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadProfileAvatar: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/profile/avatar",
        method: "POST",
        body: buildFormData(payload, "profile-avatar"),
      }),
    }),

    uploadProfileCover: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/profile/cover",
        method: "POST",
        body: buildFormData(payload, "profile-cover"),
      }),
    }),

    uploadCommunityAvatar: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/community/avatar",
        method: "POST",
        body: buildFormData(payload, "community-avatar"),
      }),
    }),

    uploadCommunityCover: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/community/cover",
        method: "POST",
        body: buildFormData(payload, "community-cover"),
      }),
    }),

    /**
     * Backend:
     * POST /uploads/post
     *
     * Field name:
     * files
     *
     * Response:
     * {
     *   total: number,
     *   items: [{ index, url, filename, mimetype, size }]
     * }
     */
    uploadPostMedia: builder.mutation<
      UploadPostMediaResponse,
      UploadPostMediaPayload
    >({
      query: (payload) => ({
        url: "/uploads/post",
        method: "POST",
        body: buildPostMediaFormData(payload),
      }),
    }),
  }),
});

export const {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
  useUploadCommunityAvatarMutation,
  useUploadCommunityCoverMutation,
  useUploadPostMediaMutation,
} = uploadApi;