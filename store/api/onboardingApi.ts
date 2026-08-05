import { baseApi } from "./baseApi";

/**
 * The three account types available during onboarding.
 */
export type UserProfileType =
  | "BUSINESS"
  | "INSTITUTE"
  | "INDIVIDUAL";

export type OnboardingCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type UserInterest = {
  category: OnboardingCategory;
};

/**
 * Data returned by GET /onboarding/me.
 */
export type OnboardingProfile = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;

  image?: string | null;
  coverImage?: string | null;

  /**
   * Examples:
   * BUSINESS
   * INSTITUTE
   * INDIVIDUAL
   */
  profileType?: UserProfileType | null;

  /**
   * Examples:
   * Retailer
   * Manufacturer
   * Technical Institute
   * Technical Student
   * Technician
   * Content Creator
   *
   * This may also contain a custom value when
   * the user selects Other.
   */
  profileRole?: string | null;

  onboardingCompleted: boolean;

  role: "USER" | "ADMIN" | "SUPER_ADMIN";

  interests: UserInterest[];
};

/**
 * Information returned after joining communities
 * during onboarding.
 */
export type SelectedCommunityMemberships = {
  joined: number;

  communities: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

/**
 * PATCH /onboarding/me response.
 */
export type UpdateOnboardingResponse = OnboardingProfile & {
  selectedCommunityMemberships?: SelectedCommunityMemberships | null;
};

/**
 * PATCH /onboarding/me request body.
 */
export type UpdateOnboardingPayload = {
  image?: string | null;
  coverImage?: string | null;

  profileType?: UserProfileType;

  /**
   * Send the predefined role or the custom
   * text entered after selecting Other.
   */
  profileRole?: string | null;

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

  visibility:
    | "PUBLIC"
    | "PRIVATE"
    | "RESTRICTED";

  purpose:
    | "GENERAL"
    | "DISTRICT_OFFICIAL"
    | "BUSINESS";

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
    /**
     * GET /onboarding/me
     */
    getMyOnboarding: builder.query<
      OnboardingProfile,
      void
    >({
      query: () => ({
        url: "/onboarding/me",
        method: "GET",
      }),

      providesTags: ["Onboarding"],
    }),

    /**
     * GET /onboarding/categories
     */
    getOnboardingCategories: builder.query<
      OnboardingCategory[],
      void
    >({
      query: () => ({
        url: "/onboarding/categories",
        method: "GET",
      }),

      providesTags: [
        "OnboardingCategory",
      ],
    }),

    /**
     * PATCH /onboarding/me
     */
    updateMyOnboarding: builder.mutation<
      UpdateOnboardingResponse,
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

    /**
     * GET /onboarding/suggested-communities
     */
    getSuggestedCommunities: builder.query<
      SuggestedCommunity[],
      void
    >({
      query: () => ({
        url: "/onboarding/suggested-communities",
        method: "GET",
      }),

      providesTags: [
        "SuggestedCommunity",
      ],
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