import type { SignupFormValues } from "@/schema/singup.schema";

export function mapSignupValues(values: SignupFormValues) {
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();

  return {
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: values.email.trim().toLowerCase(),
    password: values.password,
  };
}