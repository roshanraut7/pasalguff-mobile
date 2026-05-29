import { z } from "zod";

export const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters"),

  email: z.email({
    message: "Enter a valid email",
  }),

  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
      address: z
    .string()
    .trim()
    .min(1, "Please select your district"),

     acceptedTerms: z.boolean().refine((value) => value === true, {
    message: "You must agree to the Terms and Conditions",
  }),
});




export type SignupFormValues = z.infer<typeof signupSchema>;