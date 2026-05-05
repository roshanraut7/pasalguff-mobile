import { baseApi } from "@/store/api/baseApi";

import type {
  AdminPost,
  CommunityPost,
  CreateCommentReplyArgs,
  CreateCommunityPostArgs,
  CreatePostCommentArgs,
  CursorResponse,
  DeleteCommentArgs,
  DeleteCommentResponse,
  DeletePostResponse,
  GetAdminPostsArgs,
  GetCommentRepliesArgs,
  GetCommunityPostArgs,
  GetCommunityPostsArgs,
  GetMyPostsArgs,
  GetPostCommentsArgs,
  LikePostResponse,
  PageResponse,
  PostActionArgs,
  PostComment,
  SharePostArgs,
  SharePostResponse,
  UpdateCommentArgs,
  UpdateCommunityPostArgs,
} from "@/types/post";

/* =========================================================
   POST API
   ========================================================= */

export const postApi = baseApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    /* =========================================================
       ADMIN POST APIs
       ========================================================= */

    getAdminPosts: builder.query<
      PageResponse<AdminPost>,
      GetAdminPostsArgs | void
    >({
      query: (args) => ({
        url: "/admin/posts",
        method: "GET",
        params: {
          page: args?.page ?? 1,
          limit: args?.limit ?? 20,
          ...(args?.search ? { search: args.search } : {}),
          ...(args?.communityId ? { communityId: args.communityId } : {}),
          ...(args?.authorId ? { authorId: args.authorId } : {}),
          ...(args?.visibility ? { visibility: args.visibility } : {}),
          ...(args?.tag ? { tag: args.tag } : {}),
          ...(args?.type ? { type: args.type } : {}),
          ...(args?.sortBy ? { sortBy: args.sortBy } : {}),
        },
      }),

      providesTags: (result) =>
        result
          ? [
              ...result.data.map((post) => ({
                type: "AdminPosts" as const,
                id: post.id,
              })),
              { type: "AdminPosts" as const, id: "LIST" },
            ]
          : [{ type: "AdminPosts" as const, id: "LIST" }],
    }),

    getAdminPostDetail: builder.query<AdminPost, string>({
      query: (postId) => ({
        url: `/admin/posts/${postId}`,
        method: "GET",
      }),

      providesTags: (_result, _error, postId) => [
        { type: "AdminPosts" as const, id: postId },
      ],
    }),

    /* =========================================================
       CREATE POST / DRAFT
       ========================================================= */

    createPublishedPost: builder.mutation<
      CommunityPost,
      CreateCommunityPostArgs
    >({
      query: ({ communityId, body }) => ({
        url: `/communities/${communityId}/posts`,
        method: "POST",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: "LIST" },
        { type: "Post" as const, id: `COMMUNITY-${arg.communityId}` },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    createDraftPost: builder.mutation<CommunityPost, CreateCommunityPostArgs>({
      query: ({ communityId, body }) => ({
        url: `/communities/${communityId}/posts/drafts`,
        method: "POST",
        body,
      }),

      invalidatesTags: [{ type: "DraftPost" as const, id: "LIST" }],
    }),

    /* =========================================================
       COMMUNITY POSTS
       ========================================================= */

    getCommunityPosts: builder.query<
      CursorResponse<CommunityPost>,
      GetCommunityPostsArgs
    >({
      query: ({
        communityId,
        limit = 20,
        cursor,
        search,
        tag,
        type,
        sortBy,
      }) => ({
        url: `/communities/${communityId}/posts`,
        method: "GET",
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(search ? { search } : {}),
          ...(tag ? { tag } : {}),
          ...(type ? { type } : {}),
          ...(sortBy ? { sortBy } : {}),
        },
      }),

      providesTags: (result, _error, arg) =>
        result
          ? [
              ...result.data.map((post) => ({
                type: "Post" as const,
                id: post.id,
              })),
              { type: "Post" as const, id: "LIST" },
              { type: "Post" as const, id: `COMMUNITY-${arg.communityId}` },
            ]
          : [
              { type: "Post" as const, id: "LIST" },
              { type: "Post" as const, id: `COMMUNITY-${arg.communityId}` },
            ],
    }),

    getCommunityPost: builder.query<CommunityPost, GetCommunityPostArgs>({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}`,
        method: "GET",
      }),

      providesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
      ],
    }),

    updatePost: builder.mutation<CommunityPost, UpdateCommunityPostArgs>({
      query: ({ communityId, postId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "Post" as const, id: "LIST" },
        { type: "Post" as const, id: `COMMUNITY-${arg.communityId}` },
        { type: "DraftPost" as const, id: "LIST" },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    publishDraft: builder.mutation<CommunityPost, PostActionArgs>({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}/publish`,
        method: "PATCH",
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "Post" as const, id: "LIST" },
        { type: "Post" as const, id: `COMMUNITY-${arg.communityId}` },
        { type: "DraftPost" as const, id: "LIST" },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    deletePost: builder.mutation<DeletePostResponse, PostActionArgs>({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "Post" as const, id: "LIST" },
        { type: "Post" as const, id: `COMMUNITY-${arg.communityId}` },
        { type: "DraftPost" as const, id: "LIST" },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    /* =========================================================
       MY POSTS / MY DRAFTS
       ========================================================= */

    getMyPosts: builder.query<
      CursorResponse<CommunityPost>,
      GetMyPostsArgs | void
    >({
      query: (args) => ({
        url: "/users/me/posts",
        method: "GET",
        params: {
          ...(args?.limit ? { limit: args.limit } : {}),
          ...(args?.cursor ? { cursor: args.cursor } : {}),
          ...(args?.communityId ? { communityId: args.communityId } : {}),
          ...(args?.search ? { search: args.search } : {}),
          ...(args?.sortBy ? { sortBy: args.sortBy } : {}),
        },
      }),

      providesTags: (result) =>
        result
          ? [
              ...result.data.map((post) => ({
                type: "Post" as const,
                id: post.id,
              })),
              { type: "Post" as const, id: "MY_POSTS" },
            ]
          : [{ type: "Post" as const, id: "MY_POSTS" }],
    }),

    getMyDrafts: builder.query<
      CursorResponse<CommunityPost>,
      GetMyPostsArgs | void
    >({
      query: (args) => ({
        url: "/users/me/posts/drafts",
        method: "GET",
        params: {
          ...(args?.limit ? { limit: args.limit } : {}),
          ...(args?.cursor ? { cursor: args.cursor } : {}),
          ...(args?.communityId ? { communityId: args.communityId } : {}),
          ...(args?.search ? { search: args.search } : {}),
          ...(args?.sortBy ? { sortBy: args.sortBy } : {}),
        },
      }),

      providesTags: (result) =>
        result
          ? [
              ...result.data.map((post) => ({
                type: "DraftPost" as const,
                id: post.id,
              })),
              { type: "DraftPost" as const, id: "LIST" },
            ]
          : [{ type: "DraftPost" as const, id: "LIST" }],
    }),

    /* =========================================================
       LIKE / UNLIKE / SHARE
       ========================================================= */

    likePost: builder.mutation<LikePostResponse, PostActionArgs>({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}/likes`,
        method: "POST",
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "PostLike" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    unlikePost: builder.mutation<LikePostResponse, PostActionArgs>({
      query: ({ communityId, postId }) => ({
        url: `/communities/${communityId}/posts/${postId}/likes/me`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "PostLike" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    sharePost: builder.mutation<SharePostResponse, SharePostArgs>({
      query: ({ communityId, postId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/shares`,
        method: "POST",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "PostShare" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    /* =========================================================
       COMMENTS
       ========================================================= */

    getPostComments: builder.query<
      CursorResponse<PostComment>,
      GetPostCommentsArgs
    >({
      query: ({ communityId, postId, limit = 20, cursor }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments`,
        method: "GET",
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
        },
      }),

      providesTags: (result, _error, arg) =>
        result
          ? [
              ...result.data.map((comment) => ({
                type: "PostComment" as const,
                id: comment.id,
              })),
              { type: "PostComment" as const, id: `POST-${arg.postId}` },
            ]
          : [{ type: "PostComment" as const, id: `POST-${arg.postId}` }],
    }),

    createPostComment: builder.mutation<PostComment, CreatePostCommentArgs>({
      query: ({ communityId, postId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments`,
        method: "POST",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "PostComment" as const, id: `POST-${arg.postId}` },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    getCommentReplies: builder.query<
      CursorResponse<PostComment>,
      GetCommentRepliesArgs
    >({
      query: ({ communityId, postId, commentId, limit = 10, cursor }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}/replies`,
        method: "GET",
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
        },
      }),

      providesTags: (result, _error, arg) =>
        result
          ? [
              ...result.data.map((reply) => ({
                type: "PostReply" as const,
                id: reply.id,
              })),
              { type: "PostReply" as const, id: `COMMENT-${arg.commentId}` },
            ]
          : [{ type: "PostReply" as const, id: `COMMENT-${arg.commentId}` }],
    }),

    createCommentReply: builder.mutation<PostComment, CreateCommentReplyArgs>({
      query: ({ communityId, postId, commentId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}/replies`,
        method: "POST",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "PostComment" as const, id: `POST-${arg.postId}` },
        { type: "PostReply" as const, id: `COMMENT-${arg.commentId}` },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),

    updateComment: builder.mutation<PostComment, UpdateCommentArgs>({
      query: ({ communityId, postId, commentId, body }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "PostComment" as const, id: arg.commentId },
        { type: "PostComment" as const, id: `POST-${arg.postId}` },
        { type: "PostReply" as const, id: `COMMENT-${arg.commentId}` },
      ],
    }),

    deleteComment: builder.mutation<DeleteCommentResponse, DeleteCommentArgs>({
      query: ({ communityId, postId, commentId }) => ({
        url: `/communities/${communityId}/posts/${postId}/comments/${commentId}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Post" as const, id: arg.postId },
        { type: "PostComment" as const, id: arg.commentId },
        { type: "PostComment" as const, id: `POST-${arg.postId}` },
        { type: "PostReply" as const, id: `COMMENT-${arg.commentId}` },
        { type: "AdminPosts" as const, id: arg.postId },
        { type: "AdminPosts" as const, id: "LIST" },
      ],
    }),
  }),
});

/* =========================================================
   HOOK EXPORTS
   ========================================================= */

export const {
  /**
   * Admin posts
   */
  useGetAdminPostsQuery,
  useGetAdminPostDetailQuery,

  /**
   * Create / draft
   */
  useCreatePublishedPostMutation,
  useCreateDraftPostMutation,

  /**
   * Community posts
   */
  useGetCommunityPostsQuery,
  useGetCommunityPostQuery,
  useUpdatePostMutation,
  usePublishDraftMutation,
  useDeletePostMutation,

  /**
   * My posts / drafts
   */
  useGetMyPostsQuery,
  useGetMyDraftsQuery,

  /**
   * Engagement
   */
  useLikePostMutation,
  useUnlikePostMutation,
  useSharePostMutation,

  /**
   * Comments / replies
   */
  useGetPostCommentsQuery,
  useCreatePostCommentMutation,
  useGetCommentRepliesQuery,
  useCreateCommentReplyMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = postApi;