import { z } from "zod";

const optionalUrlField = z
    .union([z.url("Enter a valid image URL"), z.literal("")])
    .transform((value) => (value === "" ? undefined : value));

const optionalTextField = z
    .union([z.string(), z.literal("")])
    .transform((value) => (value.trim() === "" ? undefined : value.trim()));

export const createCommunitySchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Community name must be at least 2 characters")
        .max(100, "Community name must be under 100 characters"),
    categoryId: z.string().min(1, "Please select a category"),
    description: optionalTextField.refine(
        (value) => !value || value.length <= 1000,
        "Description must be under 1000 characters",
    ),
    avatarImage: optionalUrlField,
    coverImage: optionalUrlField,
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
});

export type CreateCommunityFormInput = z.input<typeof createCommunitySchema>;
export type CreateCommunityFormValues = z.output<typeof createCommunitySchema>;