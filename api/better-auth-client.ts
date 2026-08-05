import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import {
  emailOTPClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

import { getDistrictKey } from "@/constants/nepalDistricts";

const BASE_URL = process.env.EXPO_PUBLIC_AUTH_URL;

if (!BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_AUTH_URL is missing. Add it to your Expo environment variables.",
  );
}

export const authClient = createAuthClient({
  baseURL: BASE_URL,

  plugins: [
    /*
     * Put expoClient first so it can manage cookies and authenticated
     * requests for all following plugins.
     */
    expoClient({
      scheme: "kamkuro",
      storagePrefix: "kamkuro",
      storage: SecureStore,
    }),

    emailOTPClient(),

    inferAdditionalFields({
      user: {
        firstName: {
          type: "string",
          required: true,
          input: true,
        },

        lastName: {
          type: "string",
          required: true,
          input: true,
        },

        businessName: {
          type: "string",
          required: false,
          input: false,
        },

        businessType: {
          type: "string",
          required: false,
          input: false,
        },

        panNo: {
          type: "string",
          required: false,
          input: false,
        },

        registrationNo: {
          type: "string",
          required: false,
          input: false,
        },

        businessEmail: {
          type: "string",
          required: false,
          input: false,
        },

        businessPhoneNo: {
          type: "string",
          required: false,
          input: false,
        },

        address: {
          type: "string",
          required: false,
          input: true,
        },

        districtKey: {
          type: "string",
          required: true,
          input: true,
        },

        districtName: {
          type: "string",
          required: true,
          input: true,
        },

        coverImage: {
          type: "string",
          required: false,
          input: false,
        },

        onboardingCompleted: {
          type: "boolean",
          required: false,
          input: false,
        },

        role: {
          type: ["USER", "ADMIN", "SUPER_ADMIN"],
          required: false,
          input: false,
        },
      },
    }),
  ],
});

export const useSession = authClient.useSession;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getErrorMessage(
  error: { message?: string } | null | undefined,
  fallback: string,
): string {
  return error?.message?.trim() || fallback;
}

export async function signInWithEmail(data: {
  email: string;
  password: string;
}) {
  const email = normalizeEmail(data.email);

  const { data: result, error } = await authClient.signIn.email({
    email,
    password: data.password,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Login failed"));
  }

  return result;
}
export async function signUpWithEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  districtName: string;
  address?: string;
}) {
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const districtName = data.districtName.trim();
  const address = data.address?.trim() || "";

  const districtKey = getDistrictKey(districtName);

  if (!districtKey) {
    throw new Error("Please select a valid district");
  }

  /*
   * Step 1: Create account.
   */
  const { data: signupResult, error: signupError } =
    await authClient.signUp.email({
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      password: data.password,
      districtKey,
      districtName,
      address,
    });

  if (signupError) {
    throw new Error(
      signupError.message || "Account creation failed",
    );
  }

  /*
   * Step 2: Try sending the first OTP.
   *
   * Do not throw if this fails because the account
   * has already been created successfully.
   */
  const { error: otpError } =
    await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });

  if (otpError) {
    console.error(
      "[Signup] Account created, but OTP sending failed:",
      otpError,
    );
  }

  return {
    user: signupResult,
    accountCreated: true,
    otpSent: !otpError,
    otpErrorMessage:
      otpError?.message ||
      (otpError
        ? "The verification code could not be sent."
        : undefined),
  };
}

export async function signOut() {
  const { error } = await authClient.signOut();

  if (error) {
    throw new Error(getErrorMessage(error, "Logout failed"));
  }

  return true;
}

export async function getAuthCookie() {
  return authClient.getCookie();
}

export async function changeMyPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data: result, error } = await authClient.changePassword({
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
    revokeOtherSessions: true,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Password change failed"));
  }

  return result;
}

export async function sendSignupOTP(rawEmail: string) {
  const email = normalizeEmail(rawEmail);

  if (!email) {
    throw new Error("Email address is missing");
  }

  const { data, error } =
    await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });

  if (error) {
    throw new Error(
      getErrorMessage(error, "Failed to send verification code"),
    );
  }

  return data;
}

export async function verifySignupOTP(
  rawEmail: string,
  rawOtp: string,
) {
  const email = normalizeEmail(rawEmail);
  const otp = rawOtp.trim();

  if (!email) {
    throw new Error("Email address is missing");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new Error("Enter a valid 6-digit code");
  }

  const { data, error } = await authClient.emailOtp.verifyEmail({
    email,
    otp,
  });

  if (error) {
    throw new Error(
      getErrorMessage(error, "Invalid or expired verification code"),
    );
  }

  return data;
}

export async function sendForgotPasswordOTP(rawEmail: string) {
  const email = normalizeEmail(rawEmail);

  if (!email) {
    throw new Error("Email address is required");
  }

  /*
   * Use the dedicated current password-reset endpoint.
   */
  const { data, error } =
    await authClient.emailOtp.requestPasswordReset({
      email,
    });

  if (error) {
    throw new Error(
      getErrorMessage(error, "Failed to send password reset code"),
    );
  }

  return data;
}

export async function resetPasswordWithOTP(input: {
  email: string;
  otp: string;
  newPassword: string;
}) {
  const email = normalizeEmail(input.email);
  const otp = input.otp.trim();

  if (!/^\d{6}$/.test(otp)) {
    throw new Error("Enter a valid 6-digit code");
  }

  const { data, error } =
    await authClient.emailOtp.resetPassword({
      email,
      otp,
      password: input.newPassword,
    });

  if (error) {
    throw new Error(
      getErrorMessage(error, "Password reset failed"),
    );
  }

  return data;
}