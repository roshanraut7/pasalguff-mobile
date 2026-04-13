import { baseApi } from "./baseApi";

export type CategoryItem = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    status?: "ACTIVE" | "INACTIVE";
};

export type CommunityItem = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    avatarImage?: string | null;
    coverImage?: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    status: "ACTIVE" | "INACTIVE";
    categoryId?: string;
    adminId?: string;
    createdAt?: string;
    updatedAt?: string;
    category?: {
        id: string;
        name: string;
        slug: string;
    };
};

export type CreateCommunityPayload = {
    name: string;
    categoryId: string;
    description?: string;
    avatarImage?: string;
    coverImage?: string;
    visibility?: "PUBLIC" | "PRIVATE";
};

export const communityApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCategories: builder.query<CategoryItem[], void>({
            query: () => ({
                url: "/categories",
                method: "GET",
            }),
            providesTags: ["Category"],
            keepUnusedDataFor: 300,
        }),

        getMyCommunities: builder.query<CommunityItem[], void>({
            query: () => ({
                url: "/communities/my",
                method: "GET",
            }),
            providesTags: ["Community"],
        }),

        createCommunity: builder.mutation<CommunityItem, CreateCommunityPayload>({
            query: (body) => ({
                url: "/communities",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Community"],
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetMyCommunitiesQuery,
    useCreateCommunityMutation,
} = communityApi;