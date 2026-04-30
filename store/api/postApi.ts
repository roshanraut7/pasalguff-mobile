import { baseApi } from "./baseApi";
import type {
  CreateCommunityPostPayload,
  UpdateCommunityPostPayload,
  CreatePostCommentPayload,
  UpdatePostCommentPayload,
  SharePostPayload,
  CursorResponse,
  CommunityPost,
  PostComment,
} from "@/types/post";

type GetCommunityPostsArgs = {
  communityId: string;
  limit?: number;
  cursor?: string | null;
  search?: string;
  tag?: string;
  type?: "TEXT" | "MEDIA" | "LINK";
  sortBy?: "newest" | "oldest";
};

type GetMyPostsArgs = {
  limit?: number;
  cursor?: string | null;
  communityId?: string;
  search?: string;
  sortBy?: "newest" | "oldest";
};

type PostIdArgs = {
  communityId: string;
  postId: string;
};

type GetCommentsArgs = {
  communityId: string;
  postId: string;
  limit?: number;
  cursor?: string | null;
};

type GetRepliesArgs = {
  communityId: string;
  postId: string;
  commentId: string;
  limit?: number;
  cursor?: string | null;
};

export const postApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createPublishedPost: builder.mutation<
      CommunityPost,
      {
        communityId: string;
        body: CreateCommunityPostPayload;
      }
    >({
      query: ({ communityId, body }) => ({
        url: `/communities/${communityId}/posts`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId }) => [
        { type: "Post", id: `COMMUNITY-${communityId}` },
      ],
    }),

    createDraftPost: builder.mutation<
      CommunityPost,
      {
        communityId: string;
        body: CreateCommunityPostPayload;
      }
    >({
      query: ({ communityId, body }) => ({
        url: `/communities/${communityId}/posts/drafts`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["DraftPost"],
    }),

    /**
     * Infinite scroll community posts.
     *
     * First call:
     * useGetCommunityPostsQuery({ communityId, limit: 20 })
     *
     * Next call:
     * useGetCommunityPostsQuery({ communityId, limit: 20, cursor: nextCursor })
     */
    getCommunityPosts: builder.query<
      CursorResponse<CommunityPost>,
      GetCommunityPostsArgs
    >({
      query: ({ communityId, limit = 20, cursor, search, tag, type, sortBy }) => ({
        url: `/communities/${communityId}/posts`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(search ? { search } : {}),
          ...(tag ? { tag } : {}),
          ...(type ? { type } : {}),
          ...(sortBy ? { sortBy } : {}),
        },
      }),
      providesTags: (_result, _error, { communityId }) => [
        { type: "Post", id: `COMMUNITY-${communityId}` },
      ],
    }),

    getCommunityPost: builder.query<CommunityPost, PostIdArgs>({
      query: ({ communityId, postId }) =>
        `/communities/${communityId}/posts/${postId}`,
      providesTags: (_result, _error, { postId }) => [
        { type: "Post", id: postId },
      ],
    }),

    updatePost: builder.mutation<
      CommunityPost,
      {
        communityId: string;
        postId: string;
        body: UpdateCommunityPostPayload;
      }
    >({
      query: ({ communityId, postId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId, postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        "DraftPost",
      ],
    }),

    publishDraft: builder.mutation<CommunityPost, PostIdArgs>({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}/publish`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, { communityId, postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        "DraftPost",
      ],
    }),

    deletePost: builder.mutation<
      { message: string; post: CommunityPost },
      PostIdArgs
    >({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId, postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        "DraftPost",
      ],
    }),

    getMyPosts: builder.query<CursorResponse<CommunityPost>, GetMyPostsArgs>({
      query: ({ limit = 20, cursor, communityId, search, sortBy }) => ({
        url: `/users/me/posts`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(communityId ? { communityId } : {}),
          ...(search ? { search } : {}),
          ...(sortBy ? { sortBy } : {}),
        },
      }),
      providesTags: ["Post"],
    }),

    getMyDrafts: builder.query<CursorResponse<CommunityPost>, GetMyPostsArgs>({
      query: ({ limit = 20, cursor, communityId, search, sortBy }) => ({
        url: `/users/me/posts/drafts`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(communityId ? { communityId } : {}),
          ...(search ? { search } : {}),
          ...(sortBy ? { sortBy } : {}),
        },
      }),
      providesTags: ["DraftPost"],
    }),

    likePost: builder.mutation<
      { message: string; liked: true; likeCount: number },
      PostIdArgs
    >({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}/likes`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { communityId, postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        "PostLike",
      ],
    }),

    unlikePost: builder.mutation<
      { message: string; liked: false; likeCount: number },
      PostIdArgs
    >({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}/likes/me`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId, postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        "PostLike",
      ],
    }),

    sharePost: builder.mutation<
      { message: string; shareCount: number },
      PostIdArgs & {
        body?: SharePostPayload;
      }
    >({
      query: ({ communityId, postId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/shares`,
        method: "POST",
        body: body ?? {},
      }),
      invalidatesTags: (_result, _error, { communityId, postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        "PostShare",
      ],
    }),

    getPostComments: builder.query<
      CursorResponse<PostComment>,
      GetCommentsArgs
    >({
      query: ({ communityId, postId, limit = 20, cursor }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
        },
      }),
      providesTags: (_result, _error, { postId }) => [
        { type: "PostComment", id: postId },
      ],
    }),

    createPostComment: builder.mutation<
      PostComment,
      PostIdArgs & {
        body: CreatePostCommentPayload;
      }
    >({
      query: ({ communityId, postId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId, postId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        { type: "PostComment", id: postId },
      ],
    }),

    getCommentReplies: builder.query<CursorResponse<PostComment>, GetRepliesArgs>({
      query: ({ communityId, postId, commentId, limit = 10, cursor }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}/replies`,
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
        },
      }),
      providesTags: (_result, _error, { commentId }) => [
        { type: "PostReply", id: commentId },
      ],
    }),

    createCommentReply: builder.mutation<
      PostComment,
      {
        communityId: string;
        postId: string;
        commentId: string;
        body: CreatePostCommentPayload;
      }
    >({
      query: ({ communityId, postId, commentId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}/replies`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { communityId, postId, commentId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        { type: "PostComment", id: postId },
        { type: "PostReply", id: commentId },
      ],
    }),

    updateComment: builder.mutation<
      PostComment,
      {
        communityId: string;
        postId: string;
        commentId: string;
        body: UpdatePostCommentPayload;
      }
    >({
      query: ({ communityId, postId, commentId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { postId, commentId }) => [
        { type: "PostComment", id: postId },
        { type: "PostReply", id: commentId },
      ],
    }),

    deleteComment: builder.mutation<
      { message: string; comment: PostComment },
      {
        communityId: string;
        postId: string;
        commentId: string;
      }
    >({
      query: ({ communityId, postId, commentId }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { communityId, postId, commentId }) => [
        { type: "Post", id: postId },
        { type: "Post", id: `COMMUNITY-${communityId}` },
        { type: "PostComment", id: postId },
        { type: "PostReply", id: commentId },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useCreatePublishedPostMutation,
  useCreateDraftPostMutation,
  useGetCommunityPostsQuery,
  useGetCommunityPostQuery,
  useUpdatePostMutation,
  usePublishDraftMutation,
  useDeletePostMutation,
  useGetMyPostsQuery,
  useGetMyDraftsQuery,

  useLikePostMutation,
  useUnlikePostMutation,
  useSharePostMutation,

  useGetPostCommentsQuery,
  useCreatePostCommentMutation,
  useGetCommentRepliesQuery,
  useCreateCommentReplyMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = postApi;