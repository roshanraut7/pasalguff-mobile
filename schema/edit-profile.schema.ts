import { z } from "zod";

const optionalUrlField = z
  .union([z.string().url("Enter a valid image URL"), z.literal("")])
  .transform((value) => (value === "" ? undefined : value));

export const editProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  businessName: z.string().trim().min(1, "Business name is required").max(120),
  businessType: z.string().trim().min(1, "Business type is required").max(120),
  address: z.string().trim().min(1, "Address is required").max(255),
  image: optionalUrlField,
  coverImage: optionalUrlField,
});

export type EditProfileFormInput = z.input<typeof editProfileSchema>;
export type EditProfileFormValues = z.output<typeof editProfileSchema>;