import { z } from "zod";

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.email().trim().min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  districtName: z.string().trim().min(1, "Please select your district"),

  address: z.string().trim().optional(),

  acceptedTerms: z.boolean().refine((value) => value === true, {
    message: "You must accept the terms and conditions",
  }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;