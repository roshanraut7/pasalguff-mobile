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
        businessName: values.businessName.trim(),
        businessType: values.businessType.trim(),
        panNo: values.panNo.trim(),
        registrationNo: values.registrationNo.trim(),
        address: values.address.trim(),
    };
}