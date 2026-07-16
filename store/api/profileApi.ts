import { baseApi } from "./baseApi";

export type PrivacyAudience =
  | "PUBLIC"
  | "COMMUNITY"
  | "FOLLOWERS"
  | "PRIVATE";

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export type PrivacySettings = {
  id: string;
  userId: string;

  profileViewAudience: PrivacyAudience;
  aboutAudience: PrivacyAudience;
  postsAudience: PrivacyAudience;
  communitiesAudience: PrivacyAudience;
  followersAudience: PrivacyAudience;
  followingAudience: PrivacyAudience;
  messageAudience: PrivacyAudience;

  createdAt: string;
  updatedAt: string;
};

export type ProfileItem = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  businessType: string | null;
  businessEmail?: string | null;
businessPhoneNo?: string | null;
  address: string | null;
  image?: string | null;
  coverImage?: string | null;
  role?: UserRole;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;

  /**
   * Your backend getMyProfile() now returns privacy also.
   */
  privacy?: PrivacySettings;
};
export type UpdateProfilePayload = {
  name?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string | null;
  businessType?: string | null;
  address?: string | null;
  businessEmail?: string | null;
  businessPhoneNo?: string | null;
  image?: string | null;
  coverImage?: string | null;
};

export type UpdatePrivacySettingsPayload = Partial<{
  profileViewAudience: PrivacyAudience;
  aboutAudience: PrivacyAudience;
  postsAudience: PrivacyAudience;
  communitiesAudience: PrivacyAudience;
  followersAudience: PrivacyAudience;
  followingAudience: PrivacyAudience;
  messageAudience: PrivacyAudience;
}>;

export type UpdatePrivacySettingsResponse = {
  message: string;
  privacy: PrivacySettings;
};

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<ProfileItem, void>({
      query: () => ({
        url: "/profile",
        method: "GET",
      }),
      providesTags: [{ type: "Profile", id: "ME" }],
    }),

    updateMyProfile: builder.mutation<ProfileItem, UpdateProfilePayload>({
      query: (body) => ({
        url: "/profile",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Profile", id: "ME" }],
    }),

    getMyPrivacySettings: builder.query<PrivacySettings, void>({
      query: () => ({
        url: "/profile/me/privacy",
        method: "GET",
      }),
      providesTags: [{ type: "Profile", id: "PRIVACY" }],
    }),

    updateMyPrivacySettings: builder.mutation<
      UpdatePrivacySettingsResponse,
      UpdatePrivacySettingsPayload
    >({
      query: (body) => ({
        url: "/profile/me/privacy",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "PRIVACY" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useGetMyPrivacySettingsQuery,
  useUpdateMyPrivacySettingsMutation,
} = profileApi;