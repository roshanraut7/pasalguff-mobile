import { baseApi } from "./baseApi";

export type OnboardingCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type UserInterest = {
  category: OnboardingCategory;
};
export type OnboardingProfile = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  image?: string | null;
  coverImage?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  panNo?: string | null;
  registrationNo?: string | null;
  address?: string | null;
  businessEmail?: string | null;
  businessPhoneNo?: string | null;
  onboardingCompleted: boolean;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  interests?: UserInterest[];
};

export type UpdateOnboardingPayload = {
  image?: string | null;
  coverImage?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  panNo?: string | null;
  registrationNo?: string | null;
  address?: string | null;
  businessEmail?: string | null;
  businessPhoneNo?: string | null;
  categoryIds?: string[];
  communityIds?: string[];
  onboardingCompleted?: boolean;
};

export type SuggestedCommunity = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarImage?: string | null;
  coverImage?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  purpose?: "GENERAL" | "DISTRICT_OFFICIAL";
  districtKey?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count?: {
    members: number;
    posts: number;
  };
};

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyOnboarding: builder.query<OnboardingProfile, void>({
      query: () => ({
        url: "/onboarding/me",
        method: "GET",
      }),
      providesTags: ["Onboarding"],
    }),

    getOnboardingCategories: builder.query<OnboardingCategory[], void>({
      query: () => ({
        url: "/onboarding/categories",
        method: "GET",
      }),
      providesTags: ["OnboardingCategory"],
    }),

    updateMyOnboarding: builder.mutation<
      OnboardingProfile,
      UpdateOnboardingPayload
    >({
      query: (body) => ({
        url: "/onboarding/me",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "Onboarding",
        "SuggestedCommunity",
        "Profile",
        "MyCommunity",
        "Community",
      ],
    }),

    getSuggestedCommunities: builder.query<SuggestedCommunity[], void>({
      query: () => ({
        url: "/onboarding/suggested-communities",
        method: "GET",
      }),
      providesTags: ["SuggestedCommunity"],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetMyOnboardingQuery,
  useGetOnboardingCategoriesQuery,
  useUpdateMyOnboardingMutation,
  useGetSuggestedCommunitiesQuery,
} = onboardingApi;