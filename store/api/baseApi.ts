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

  const authCookie = await getAuthCookie();
  if (authCookie) {
    headers.set("Cookie", authCookie);
  }

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
  tagTypes: ["Category", "Community", "Profile"],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});