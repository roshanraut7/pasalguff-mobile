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

export type UploadMediaFilePayload = {
  uri: string;
  name?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

export type UploadPostMediaPayload = {
  files: UploadMediaFilePayload[];
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

export type UploadCatalogImagesPayload = {
  files: UploadMediaFilePayload[];
};

export type UploadCatalogImageItem = {
  index: number;
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  originalSize: number;
};

export type UploadCatalogImagesResponse = {
  message: string;
  total: number;
  pictures: string[];
  items: UploadCatalogImageItem[];
};

type UploadFilePayload = {
  uri: string;
  fileName?: string | null;
  name?: string | null;
  mimeType?: string | null;
};

function buildSingleFileFormData(
  payload: UploadFilePayload,
  fallbackPrefix: string,
) {
  const formData = new FormData();

  formData.append(
    "file",
    {
      uri: payload.uri,

      name:
        payload.fileName ??
        payload.name ??
        `${fallbackPrefix}-${Date.now()}.jpg`,

      type:
        payload.mimeType ??
        "image/jpeg",
    } as any,
  );

  return formData;
}

function buildMultipleImageFormData(
  files: UploadMediaFilePayload[],
  fallbackPrefix: string,
) {
  const formData = new FormData();

  files.forEach((file, index) => {
    formData.append(
      "files",
      {
        uri: file.uri,

        name:
          file.fileName ??
          file.name ??
          `${fallbackPrefix}-${Date.now()}-${index}.jpg`,

        type:
          file.mimeType ??
          "image/jpeg",
      } as any,
    );
  });

  return formData;
}

export const uploadApi =
  baseApi.injectEndpoints({
    overrideExisting: true,

    endpoints: (builder) => ({
      uploadProfileAvatar:
        builder.mutation<
          UploadResponse,
          UploadFilePayload
        >({
          query: (payload) => ({
            url:
              "/uploads/profile/avatar",

            method:
              "POST",

            body:
              buildSingleFileFormData(
                payload,
                "profile-avatar",
              ),
          }),

          invalidatesTags: [
            "Profile",
            "Onboarding",
          ],
        }),

      uploadProfileCover:
        builder.mutation<
          UploadResponse,
          UploadFilePayload
        >({
          query: (payload) => ({
            url:
              "/uploads/profile/cover",

            method:
              "POST",

            body:
              buildSingleFileFormData(
                payload,
                "profile-cover",
              ),
          }),

          invalidatesTags: [
            "Profile",
            "Onboarding",
          ],
        }),

      uploadCommunityAvatar:
        builder.mutation<
          UploadResponse,
          UploadFilePayload
        >({
          query: (payload) => ({
            url:
              "/uploads/community/avatar",

            method:
              "POST",

            body:
              buildSingleFileFormData(
                payload,
                "community-avatar",
              ),
          }),

          invalidatesTags: [
            "Community",
            "AdminCommunities",
          ],
        }),

      uploadCommunityCover:
        builder.mutation<
          UploadResponse,
          UploadFilePayload
        >({
          query: (payload) => ({
            url:
              "/uploads/community/cover",

            method:
              "POST",

            body:
              buildSingleFileFormData(
                payload,
                "community-cover",
              ),
          }),

          invalidatesTags: [
            "Community",
            "AdminCommunities",
          ],
        }),

      uploadVerificationDocument:
        builder.mutation<
          UploadedFileResponse,
          UploadVerificationDocumentArgs
        >({
          query: ({
            uri,
            fileName,
            mimeType,
            side,
          }) => {
            const formData =
              new FormData();

            formData.append(
              "file",
              {
                uri,

                name:
                  fileName ??
                  `verification-${side}-${Date.now()}.jpg`,

                type:
                  mimeType ??
                  "image/jpeg",
              } as any,
            );

            return {
              url:
                `/uploads/verification?side=${side}`,

              method:
                "POST",

              body:
                formData,
            };
          },
        }),

      uploadPostMedia:
        builder.mutation<
          UploadPostMediaResponse,
          UploadPostMediaPayload
        >({
          query: ({ files }) => ({
            url:
              "/uploads/post",

            method:
              "POST",

            body:
              buildMultipleImageFormData(
                files,
                "post-image",
              ),
          }),

          invalidatesTags: [
            "Post",
            "DraftPost",
          ],
        }),

      /**
       * Upload real catalogue image files.
       *
       * Backend route:
       * POST /uploads/catalog
       *
       * Multipart field:
       * files
       */
      uploadCatalogImages:
        builder.mutation<
          UploadCatalogImagesResponse,
          UploadCatalogImagesPayload
        >({
          query: ({ files }) => ({
            url:
              "/uploads/catalog",

            method:
              "POST",

            body:
              buildMultipleImageFormData(
                files,
                "catalog-image",
              ),
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
  useUploadVerificationDocumentMutation,
  useUploadCatalogImagesMutation,
} = uploadApi;