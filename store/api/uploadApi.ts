import { baseApi } from "./baseApi";

export type UploadResponse = {
  url: string;
  filename: string;
  originalName?: string;
  mimetype: string;
  size: number;
  originalSize?: number;
};
export type UploadedFileResponse = {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  originalSize: number;
};
 
export type UploadVerificationDocumentArgs = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  side: "front" | "back";
};

export type UploadPostMediaItem = {
  index: number;
  url: string;
  filename: string;
  originalName?: string;
  mimetype: string;
  size: number;
  originalSize?: number;
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
};

export type UploadPostMediaPayload = {
  files: UploadPostMediaFilePayload[];
};

function buildFormData(payload: UploadFilePayload, fallbackPrefix: string) {
  const form = new FormData();

  form.append("file", {
    uri: payload.uri,
    name:
      payload.fileName ??
      payload.name ??
      `${fallbackPrefix}-${Date.now()}.jpg`,
    type: payload.mimeType ?? "image/jpeg",
  } as any);

  return form;
}

function buildPostImageFormData(payload: UploadPostMediaPayload) {
  const form = new FormData();

  payload.files.forEach((file, index) => {
    form.append("files", {
      uri: file.uri,
      name:
        file.fileName ??
        file.name ??
        `post-image-${Date.now()}-${index}.jpg`,
      type: file.mimeType ?? "image/jpeg",
    } as any);
  });

  return form;
}

export const uploadApi = baseApi.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    uploadProfileAvatar: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/profile/avatar",
        method: "POST",
        body: buildFormData(payload, "profile-avatar"),
      }),
      invalidatesTags: ["Profile", "Onboarding"],
    }),

    uploadProfileCover: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/profile/cover",
        method: "POST",
        body: buildFormData(payload, "profile-cover"),
      }),
      invalidatesTags: ["Profile", "Onboarding"],
    }),

    uploadCommunityAvatar: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/community/avatar",
        method: "POST",
        body: buildFormData(payload, "community-avatar"),
      }),
      invalidatesTags: ["Community", "AdminCommunities"],
    }),

    uploadCommunityCover: builder.mutation<UploadResponse, UploadFilePayload>({
      query: (payload) => ({
        url: "/uploads/community/cover",
        method: "POST",
        body: buildFormData(payload, "community-cover"),
      }),
      invalidatesTags: ["Community", "AdminCommunities"],
    }),
    uploadVerificationDocument: builder.mutation<
  UploadedFileResponse,
  UploadVerificationDocumentArgs
>({
  query: ({ uri, fileName, mimeType, side }) => {
    const formData = new FormData();
 
    formData.append("file", {
      uri,
      name: fileName ?? `verification-${side}-${Date.now()}.jpg`,
      type: mimeType ?? "image/jpeg",
    } as any);
 
    return {
      url: `/uploads/verification?side=${side}`,
      method: "POST",
      body: formData,
    };
  },
}),

    uploadPostMedia: builder.mutation<
      UploadPostMediaResponse,
      UploadPostMediaPayload
    >({
      query: (payload) => ({
        url: "/uploads/post",
        method: "POST",
        body: buildPostImageFormData(payload),
      }),
      invalidatesTags: ["Post", "DraftPost"],
    }),
  }),
});

export const {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
  useUploadCommunityAvatarMutation,
  useUploadCommunityCoverMutation,
  useUploadPostMediaMutation,
  useUploadVerificationDocumentMutation 
} = uploadApi;