// src/validations/category.validation.ts

import * as z from "zod/v4";

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters.")
    .max(100, "Category name must not be more than 100 characters."),

  description: z
    .string()
    .trim()
    .max(500, "Description must not be more than 500 characters.")
    .optional(),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;

export type CreateCategoryFormErrors = Partial<
  Record<keyof CreateCategoryFormValues | "root", string>
>;