import { baseApi } from "@/store/api/baseApi";

export type SearchableType = "users" | "posts" | "communities";

export type SearchHit = {
  id: string;
  score: number;
  [key: string]: any;
};


export type SearchResultGroup = {
  type: SearchableType;
  hits: SearchHit[];
};

export type SearchQuery = {
  q: string;
  types?: SearchableType[];
};

export const searchApi = baseApi.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    globalSearch: builder.query<SearchResultGroup[], SearchQuery>({
      query: ({ q, types }) => ({
        url: "/search",
        method: "GET",
        params: {
          q,
          ...(types?.length ? { types: types.join(",") } : {}),
        },
      }),
    }),
  }),
});

export const { useLazyGlobalSearchQuery } = searchApi;