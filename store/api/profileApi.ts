import { baseApi } from "./baseApi";

export type ProfileItem = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  address: string;
  image?: string | null;
  coverImage?: string | null;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
};

export type UpdateProfilePayload = {
  name?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  businessType?: string;
  address?: string;
  image?: string | null;
  coverImage?: string | null;
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
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} = profileApi;