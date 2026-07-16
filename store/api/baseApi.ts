import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { getAuthCookie } from "@/api/better-auth-client";

const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

function getApiBaseUrl() {
  const raw = RAW_API_BASE_URL.trim();

  if (!raw) {
    console.log("API base URL is missing. Check your .env file.");
    return "";
  }

  const cleaned = raw
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "");

  return cleaned.endsWith("/") ? cleaned.slice(0, -1) : cleaned;
}

const API_BASE_URL = getApiBaseUrl();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "omit",
  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

function isFormDataBody(body: unknown) {
  return (
    typeof FormData !== "undefined" &&
    (body instanceof FormData ||
      Object.prototype.toString.call(body) === "[object FormData]" ||
      Boolean((body as any)?._parts))
  );
}

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const normalizedArgs: FetchArgs =
    typeof args === "string" ? { url: args } : { ...args };

  const headers = new Headers(normalizedArgs.headers as HeadersInit | undefined);

  const authCookie = await getAuthCookie();

  if (authCookie) {
    headers.set("Cookie", authCookie);
  }

  const isFormData = isFormDataBody(normalizedArgs.body);

  if (normalizedArgs.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  normalizedArgs.headers = headers;

let result = await rawBaseQuery(normalizedArgs, api, extraOptions);

  // First multipart/network request after app launch can fail with
  // FETCH_ERROR on RN even though the server never received it — retry once.
  if (result.error && (result.error as any).status === "FETCH_ERROR") {
    console.log("Network request failed — retrying once:", normalizedArgs.url);
    result = await rawBaseQuery(normalizedArgs, api, extraOptions);
  }

  return result;
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
    "CommunityDiscussion",

    "Profile",
    "AdminCommunities",
    "Notifications",
    "CommunityGuidelines",

    "Onboarding",
    "OnboardingCategory",
    "SuggestedCommunity",

    "Post",
    "DraftPost",
    "AdminUsers",
    "AdminPosts",

    "Friend",
    "Follow",
    "Follower",
    "Following",

    "CommunityModerators",

    "Chat",
    "Message",

    "PostLike",
    "PostShare",
    "PostComment",
    "PostReply",

    "PostAnalytics",

    "CommunityDiscussionAnswer",
    "CommunityDiscussionLive",
    "CommunityDiscussionLiveMessage",
   "Verification"
  ],

  refetchOnFocus: true,
  refetchOnReconnect: true,

  endpoints: () => ({}),
});