import { z } from "zod";

export const PHONE_REGEX = /^\d{10}$/;

export const businessProfileSchema = z
  .object({
    isTrainingProfession: z.boolean(),
    businessName: z.string().optional(),
    address: z.string().optional(),
    businessEmail: z
      .email("Please enter a valid email address"),
    businessPhoneNo: z
      .string()
      .trim()
      .regex(PHONE_REGEX, "Phone number must be exactly 10 digits"),
  })
  .superRefine((data, ctx) => {
    if (!data.isTrainingProfession) {
      if (!data.businessName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["businessName"],
          message: "Business name is required",
        });
      }
      if (!data.address?.trim()) {
        ctx.addIssue({
         code: "custom",
          path: ["address"],
          message: "Address is required",
        });
      }
    }
  });

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;