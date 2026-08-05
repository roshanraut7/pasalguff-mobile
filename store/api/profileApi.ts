import { baseApi } from "./baseApi";

export type PrivacyAudience =
  | "PUBLIC"
  | "COMMUNITY"
  | "FOLLOWERS"
  | "PRIVATE";

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export type UserProfileType =
  | "BUSINESS"
  | "INSTITUTE"
  | "INDIVIDUAL";

export type VerificationTrack =
  | "BUSINESS"
  | "INDIVIDUAL"
  | "TRAINING";

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "SELF_EMPLOYED"
  | "FREELANCE"
  | "CONTRACT"
  | "INTERNSHIP"
  | "APPRENTICESHIP"
  | "VOLUNTEER"
  | "OTHER";

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

export type ProfileMissingField = {
  key: string;
  label: string;
};

export type ProfileCompletion = {
  completionPercent: number;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  missingFields: ProfileMissingField[];
};

export type ProfileInterest = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type SkillOption = {
  id: string;
  name: string;
  slug: string;
};

export type SkillSearchResponse =
  | SkillOption[]
  | {
      data: SkillOption[];
    };

export type UserSkillItem = {
  id: string;
  yearsExperience: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  skill: SkillOption;
};

export type UserEducationItem = {
  id: string;
  institutionName: string;
  qualification: string | null;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
  isCurrentlyStudying: boolean;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type UserExperienceItem = {
  id: string;
  title: string;
  organizationName: string;
  employmentType: EmploymentType | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type UserCertificationItem = {
  id: string;
  name: string;
  issuingOrganization: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileItem = {
  id: string;
  email: string;

  name: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName?: string;

  profileType: UserProfileType | null;
  profileRole: string | null;

  headline: string | null;
  bio: string | null;
  location: string | null;

  publicEmail: string | null;
  publicPhone: string | null;
  website: string | null;

  organizationName: string | null;
  organizationAddress: string | null;

  image: string | null;
  coverImage: string | null;

  role?: UserRole;

  isVerified: boolean;
  verificationTrack: VerificationTrack | null;
  verifiedAt: string | null;

  interests: ProfileInterest[];
  skills: UserSkillItem[];
  education: UserEducationItem[];
  experiences: UserExperienceItem[];
  certifications: UserCertificationItem[];

  completion: ProfileCompletion;
  privacy?: PrivacySettings;

  createdAt?: string;
  updatedAt?: string;

  // Temporary legacy fields
  businessName?: string | null;
  businessType?: string | null;
  businessEmail?: string | null;
  businessPhoneNo?: string | null;
  address?: string | null;
};

export type PublicProfilePermissions = {
  canViewProfile: boolean;
  canViewAbout: boolean;
  canViewPosts: boolean;
  canViewCommunities: boolean;
  canViewFollowers: boolean;
  canViewFollowing: boolean;
  canViewFriends: boolean;
  canMessage: boolean;
  canFollow: boolean;
  canUnfollow: boolean;
  canEditProfile: boolean;
};

export type PublicProfileFollow = {
  isFollowing: boolean;
  followsMe: boolean;
  isMutual: boolean;

  canMessage: boolean;
  canFollow: boolean;
  canUnfollow: boolean;

  buttonText:
    | "Follow"
    | "Follow Back"
    | "Following"
    | "Friends";

  followedAt: string | null;
};

export type PublicProfileAbout = {
  bio: string | null;
  location: string | null;

  publicEmail: string | null;
  publicPhone: string | null;
  website: string | null;

  organizationName: string | null;
  organizationAddress: string | null;

  interests: ProfileInterest[];
  skills: UserSkillItem[];
  education: UserEducationItem[];
  experiences: UserExperienceItem[];
  certifications: UserCertificationItem[];
};

export type SharedCommunityItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarImage: string | null;
  visibility: "PUBLIC" | "PRIVATE" | "RESTRICTED";
};

export type PublicProfileResponse = {
  id: string;

  name: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;

  image: string | null;
  coverImage: string | null;

  profileType: UserProfileType | null;
  profileRole: string | null;
  headline: string | null;

  organizationName: string | null;

  isVerified: boolean;
  verificationTrack: VerificationTrack | null;
  verifiedAt: string | null;

  createdAt: string;

  // Temporary legacy fields
  businessName?: string | null;
  businessType?: string | null;

  about: PublicProfileAbout | null;
  follow: PublicProfileFollow;

  stats: {
    followersCount: number;
    followingCount: number;
  };

  sharedCommunities: SharedCommunityItem[];
  permissions: PublicProfilePermissions;
};

export type UpdateProfilePayload = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;

  profileType?: UserProfileType | null;
  profileRole?: string | null;

  headline?: string | null;
  bio?: string | null;
  location?: string | null;

  publicEmail?: string | null;
  publicPhone?: string | null;
  website?: string | null;

  organizationName?: string | null;
  organizationAddress?: string | null;

  image?: string | null;
  coverImage?: string | null;

  // Temporary legacy fields
  businessName?: string | null;
  businessType?: string | null;
  address?: string | null;
  businessEmail?: string | null;
  businessPhoneNo?: string | null;
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

export type CreateEducationPayload = {
  institutionName: string;
  qualification?: string | null;
  fieldOfStudy?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  isCurrentlyStudying?: boolean;
  description?: string | null;
  sortOrder?: number;
};

export type UpdateEducationPayload = Partial<CreateEducationPayload>;

export type CreateUserSkillPayload = {
  skillId: string;
  yearsExperience?: number | null;
  sortOrder?: number;
};

export type UpdateUserSkillPayload = {
  yearsExperience?: number | null;
  sortOrder?: number;
};

export type CreateExperiencePayload = {
  title: string;
  organizationName: string;
  employmentType?: EmploymentType | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  sortOrder?: number;
};

export type UpdateExperiencePayload = Partial<CreateExperiencePayload>;

export type CreateCertificationPayload = {
  name: string;
  issuingOrganization?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
};

export type UpdateCertificationPayload =
  Partial<CreateCertificationPayload>;

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<ProfileItem, void>({
      query: () => ({
        url: "/profile",
        method: "GET",
      }),
      providesTags: [{ type: "Profile", id: "ME" }],
    }),

    getPublicProfile: builder.query<PublicProfileResponse, string>({
      query: (userId) => ({
        url: `/profile/${encodeURIComponent(userId)}/public`,
        method: "GET",
      }),
      providesTags: (_result, _error, userId) => [
        {
          type: "Profile",
          id: `PUBLIC-${userId}`,
        },
      ],
    }),

    updateMyProfile: builder.mutation<
      ProfileItem,
      UpdateProfilePayload
    >({
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

    getMyEducation: builder.query<UserEducationItem[], void>({
      query: () => ({
        url: "/profile/me/education",
        method: "GET",
      }),
      providesTags: [{ type: "Profile", id: "EDUCATION" }],
    }),

    createEducation: builder.mutation<
      UserEducationItem,
      CreateEducationPayload
    >({
      query: (body) => ({
        url: "/profile/me/education",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "EDUCATION" },
      ],
    }),

    updateEducation: builder.mutation<
      UserEducationItem,
      {
        educationId: string;
        body: UpdateEducationPayload;
      }
    >({
      query: ({ educationId, body }) => ({
        url: `/profile/me/education/${educationId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "EDUCATION" },
      ],
    }),

    deleteEducation: builder.mutation<{ message: string }, string>({
      query: (educationId) => ({
        url: `/profile/me/education/${educationId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "EDUCATION" },
      ],
    }),

    getAvailableSkills: builder.query<SkillOption[], string | void>({
      query: (search) => ({
        url: "/profile/available-skills",
        method: "GET",
        params: {
          ...(search?.trim()
            ? {
                search: search.trim(),
              }
            : {}),
          limit: 50,
        },
      }),
      transformResponse: (response: SkillSearchResponse) =>
        Array.isArray(response) ? response : response.data,
    }),

    getMySkills: builder.query<UserSkillItem[], void>({
      query: () => ({
        url: "/profile/me/skills",
        method: "GET",
      }),
      providesTags: [{ type: "Profile", id: "SKILLS" }],
    }),

    createUserSkill: builder.mutation<
      UserSkillItem,
      CreateUserSkillPayload
    >({
      query: (body) => ({
        url: "/profile/me/skills",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "SKILLS" },
      ],
    }),

    updateUserSkill: builder.mutation<
      UserSkillItem,
      {
        userSkillId: string;
        body: UpdateUserSkillPayload;
      }
    >({
      query: ({ userSkillId, body }) => ({
        url: `/profile/me/skills/${userSkillId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "SKILLS" },
      ],
    }),

    deleteUserSkill: builder.mutation<{ message: string }, string>({
      query: (userSkillId) => ({
        url: `/profile/me/skills/${userSkillId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "SKILLS" },
      ],
    }),

    getMyExperiences: builder.query<UserExperienceItem[], void>({
      query: () => ({
        url: "/profile/me/experiences",
        method: "GET",
      }),
      providesTags: [{ type: "Profile", id: "EXPERIENCES" }],
    }),

    createExperience: builder.mutation<
      UserExperienceItem,
      CreateExperiencePayload
    >({
      query: (body) => ({
        url: "/profile/me/experiences",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "EXPERIENCES" },
      ],
    }),

    updateExperience: builder.mutation<
      UserExperienceItem,
      {
        experienceId: string;
        body: UpdateExperiencePayload;
      }
    >({
      query: ({ experienceId, body }) => ({
        url: `/profile/me/experiences/${experienceId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "EXPERIENCES" },
      ],
    }),

    deleteExperience: builder.mutation<{ message: string }, string>({
      query: (experienceId) => ({
        url: `/profile/me/experiences/${experienceId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "EXPERIENCES" },
      ],
    }),

    getMyCertifications: builder.query<UserCertificationItem[], void>({
      query: () => ({
        url: "/profile/me/certifications",
        method: "GET",
      }),
      providesTags: [{ type: "Profile", id: "CERTIFICATIONS" }],
    }),

    createCertification: builder.mutation<
      UserCertificationItem,
      CreateCertificationPayload
    >({
      query: (body) => ({
        url: "/profile/me/certifications",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "CERTIFICATIONS" },
      ],
    }),

    updateCertification: builder.mutation<
      UserCertificationItem,
      {
        certificationId: string;
        body: UpdateCertificationPayload;
      }
    >({
      query: ({ certificationId, body }) => ({
        url: `/profile/me/certifications/${certificationId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "CERTIFICATIONS" },
      ],
    }),

    deleteCertification: builder.mutation<{ message: string }, string>({
      query: (certificationId) => ({
        url: `/profile/me/certifications/${certificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Profile", id: "ME" },
        { type: "Profile", id: "CERTIFICATIONS" },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetMyProfileQuery,
  useGetPublicProfileQuery,
  useUpdateMyProfileMutation,

  useGetMyPrivacySettingsQuery,
  useUpdateMyPrivacySettingsMutation,

  useGetMyEducationQuery,
  useCreateEducationMutation,
  useUpdateEducationMutation,
  useDeleteEducationMutation,

  useGetAvailableSkillsQuery,
  useGetMySkillsQuery,
  useCreateUserSkillMutation,
  useUpdateUserSkillMutation,
  useDeleteUserSkillMutation,

  useGetMyExperiencesQuery,
  useCreateExperienceMutation,
  useUpdateExperienceMutation,
  useDeleteExperienceMutation,

  useGetMyCertificationsQuery,
  useCreateCertificationMutation,
  useUpdateCertificationMutation,
  useDeleteCertificationMutation,
} = profileApi;