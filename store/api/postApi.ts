import { baseApi } from "./baseApi";

export type PostType = "TEXT" | "MEDIA" | "LINK";
export type PostTag =
  | "GENERAL"
  | "ANNOUNCEMENT"
  | "QUESTION"
  | "OFFER"
  | "EVENT"
  | "NEWS"
  | "HELP";

export type PostMediaType = "IMAGE" | "VIDEO";

export type UploadableMedia = {
  uri: string;
  name?: string;
  mimeType?: string;
  mediaType: PostMediaType;
};

export type UploadedMediaResponse = {
  total: number;
  items: Array<{
    index: number;
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  }>;
};

// export type CommunitySummary = {
//   id: string;
//   name: string;
//   slug: string;
//   memberRole?: string | null;
// };

export type CommunityPostMedia = {
  id?: string;
  type: PostMediaType;
  url: string;
  sortOrder?: number;
};

export type CommunityPost = {
  id: string;
  communityId: string;
  authorId: string;
  type: PostType;
  tag: PostTag;
  status: "DRAFT" | "PUBLISHED" | "DELETED";
  content: string | null;
  linkUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  community: {
    id: string;
    name: string;
    slug: string;
    visibility: "PUBLIC" | "PRIVATE";
  };
  author: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    image?: string | null;
    businessName?: string | null;
  };
  media: CommunityPostMedia[];
};

export type SavePostBody = {
  tag: PostTag;
  content?: string | null;
  linkUrl?: string | null;
  media?: CommunityPostMedia[];
};

export const postApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // getMyCommunities: builder.query<CommunitySummary[], void>({
    //   query: () => ({
    //     url: "communities/my",
    //     method: "GET",
    //   }),
    //   providesTags: ["MyCommunity"],
    // }),

    uploadPostMedia: builder.mutation<
      UploadedMediaResponse,
      { files: UploadableMedia[] }
    >({
      query: ({ files }) => {
        const formData = new FormData();

        files.forEach((file, index) => {
          formData.append("files", {
            uri: file.uri,
            name: file.name ?? `upload-${Date.now()}-${index}`,
            type:
              file.mimeType ??
              (file.mediaType === "VIDEO" ? "video/mp4" : "image/jpeg"),
          } as any);
        });

        return {
          url: "uploads/post",
          method: "POST",
          body: formData,
        };
      },
    }),

    createCommunityPost: builder.mutation<
      CommunityPost,
      { communityId: string; body: SavePostBody }
    >({
      query: ({ communityId, body }) => ({
        url: `communities/${communityId}/posts`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Post", "DraftPost"],
    }),

    createCommunityDraft: builder.mutation<
      CommunityPost,
      { communityId: string; body: SavePostBody }
    >({
      query: ({ communityId, body }) => ({
        url: `communities/${communityId}/posts/drafts`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["DraftPost"],
    }),

    updateCommunityPost: builder.mutation<
      CommunityPost,
      { communityId: string; postId: string; body: Partial<SavePostBody> }
    >({
      query: ({ communityId, postId, body }) => ({
        url: `communities/${communityId}/posts/${postId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Post", "DraftPost"],
    }),

    publishCommunityDraft: builder.mutation<
      CommunityPost,
      { communityId: string; postId: string }
    >({
      query: ({ communityId, postId }) => ({
        url: `communities/${communityId}/posts/${postId}/publish`,
        method: "PATCH",
      }),
      invalidatesTags: ["Post", "DraftPost"],
    }),

    deleteCommunityPost: builder.mutation<
      CommunityPost,
      { communityId: string; postId: string }
    >({
      query: ({ communityId, postId }) => ({
        url: `communities/${communityId}/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Post", "DraftPost"],
    }),

    getCommunityPosts: builder.query<CommunityPost[], { communityId: string }>({
      query: ({ communityId }) => ({
        url: `communities/${communityId}/posts`,
        method: "GET",
      }),
      providesTags: ["Post"],
    }),

    getMyPosts: builder.query<CommunityPost[], void>({
      query: () => ({
        url: "users/me/posts",
        method: "GET",
      }),
      providesTags: ["Post"],
    }),

    getMyDrafts: builder.query<CommunityPost[], void>({
      query: () => ({
        url: "users/me/posts/drafts",
        method: "GET",
      }),
      providesTags: ["DraftPost"],
    }),
  }),
});

export const {
  useUploadPostMediaMutation,
  useCreateCommunityPostMutation,
  useCreateCommunityDraftMutation,
  useUpdateCommunityPostMutation,
  usePublishCommunityDraftMutation,
  useDeleteCommunityPostMutation,
  useGetCommunityPostsQuery,
  useGetMyPostsQuery,
  useGetMyDraftsQuery,
} = postApi;