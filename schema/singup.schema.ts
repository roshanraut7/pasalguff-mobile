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
    email: z
        .email({
            message: "Enter a valid email"
        }),
    password: z
        .string()
        .min(1, "Password is required")
        .min(8, "Password must be at least 8 characters"),
    businessName: z
        .string()
        .min(1, "Business name is required"),
    businessType: z
        .string()
        .min(1, "Business type is required"),
    panNo: z
        .string()
        .min(1, "PAN number is required"),
    registrationNo: z
        .string()
        .min(1, "Registration number is required"),
    address: z
        .string()
        .min(1, "Address is required"),
});

export type SignupFormValues = z.infer<typeof signupSchema>;