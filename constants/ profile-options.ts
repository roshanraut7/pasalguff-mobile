import type { UserProfileType } from "@/store/api/profileApi";

export const PROFILE_TYPES: Array<{
  value: UserProfileType;
  label: string;
  description: string;
}> = [
  {
    value: "BUSINESS",
    label: "Business",
    description:
      "Retailer, manufacturer, wholesaler, supplier or service centre.",
  },
  {
    value: "INSTITUTE",
    label: "Institute",
    description:
      "Technical institute, training centre, college or academy.",
  },
  {
    value: "INDIVIDUAL",
    label: "Individual",
    description:
      "Student, technician, creator, trainer, freelancer or enthusiast.",
  },
];

export const PROFILE_ROLES: Record<
  UserProfileType,
  string[]
> = {
  BUSINESS: [
    "Retailer",
    "Manufacturer",
    "Wholesaler",
    "Distributor",
    "Importer",
    "Supplier",
    "Service Centre",
    "Other",
  ],

  INSTITUTE: [
    "Technical Institute",
    "Training Centre",
    "Technical College",
    "Academy",
    "Vocational Centre",
    "Other",
  ],

  INDIVIDUAL: [
    "Technical Student",
    "Technician",
    "Content Creator",
    "Trainer",
    "Freelancer",
    "Job Seeker",
    "Tech Enthusiast",
    "Other",
  ],
};