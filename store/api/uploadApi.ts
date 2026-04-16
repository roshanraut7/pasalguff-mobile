import { baseApi } from "./baseApi";

export type UploadResponse = {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};

type UploadFilePayload = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function buildFormData(payload: UploadFilePayload, fallbackPrefix: string) {
  const form = new FormData();

  form.append("file", {
    uri: payload.uri,
    name: payload.fileName ?? `${fallbackPrefix}-${Date.now()}.jpg`,
    type: payload.mimeType ?? "image/jpeg",
  } as any);

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
  }),
});

export const {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
  useUploadCommunityAvatarMutation,
  useUploadCommunityCoverMutation,
} = uploadApi;