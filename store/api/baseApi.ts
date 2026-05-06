import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { getAuthCookie } from "@/api/better-auth-client";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL!;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,

  /**
   * We manually attach the Better Auth cookie below.
   *
   * In React Native/Expo, browser-style cookie handling is not the same as web,
   * so credentials: "omit" is okay here because we manually set the Cookie header.
   */
  credentials: "omit",

  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const normalizedArgs: FetchArgs =
    typeof args === "string" ? { url: args } : { ...args };

  const headers = new Headers(normalizedArgs.headers as HeadersInit | undefined);

  /**
   * Better Auth session cookie.
   *
   * Backend AuthGuard reads session from headers, so every protected API request
   * must include this cookie.
   */
  const authCookie = await getAuthCookie();

  if (authCookie) {
    headers.set("Cookie", authCookie);
  }

  /**
   * Do not set Content-Type manually for FormData.
   *
   * React Native/fetch needs to set multipart boundary automatically.
   */
  const isFormData =
    typeof FormData !== "undefined" && normalizedArgs.body instanceof FormData;

  if (normalizedArgs.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  normalizedArgs.headers = headers;

  return rawBaseQuery(normalizedArgs, api, extraOptions);
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    "Category",

    "Community",
    "MyCommunity",
    "CommunityMembers",
    "CommunityAccess",
    "CommunityJoinRequests",

    "Profile",
    "AdminCommunities",

    /**
     * Post feed / post detail / my posts.
     */
    "Post",
    "DraftPost",
     "AdminUsers",
       "AdminPosts",
         "Friend",

    /**
     * New engagement tags.
     *
     * These help RTK Query refresh only the affected data after:
     * - like/unlike
     * - comment/reply create/update/delete
     * - share
     */
    "PostLike",
    "PostShare",
    "PostComment",
    "PostReply",
  ],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});