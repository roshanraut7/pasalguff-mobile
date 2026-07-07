import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { getDistrictKey } from "@/constants/nepalDistricts";

const BASE_URL = process.env.EXPO_PUBLIC_AUTH_URL!;

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  disableDefaultFetchPlugins: true,
  plugins: [
    inferAdditionalFields({
      user: {
        firstName: {
          type: "string",
          required: true,
        },
        lastName: {
          type: "string",
          required: true,
        },

        // These fields will be updated later from profile edit
        businessName: {
          type: "string",
          required: false,
        },
        businessType: {
          type: "string",
          required: false,
        },
        panNo: {
          type: "string",
          required: false,
        },
        registrationNo: {
          type: "string",
          required: false,
        },
        address: {
          type: "string",
          required: true,
        },
        districtKey:{
         type: "string",
         required: true,
        },
        districtName:{
          type: "string",
          required: true,
        },
        coverImage: {
          type: "string",
          required: false,
        },
         onboardingCompleted: {
          type: "boolean",
          required: false,
        },

        role: {
          type: ["USER", "ADMIN", "SUPER_ADMIN"],
          required: false,
          input: false,
        },
      },
    }),
   expoClient({
  scheme: "kamkuro",
  storagePrefix: "kamkuro",
  storage: SecureStore,
}),
  ],
});

export const useSession = authClient.useSession;

export async function signInWithEmail(data: {
  email: string;
  password: string;
}) {
  const { data: result, error } = await authClient.signIn.email({
    email: data.email,
    password: data.password,
  });

  if (error) throw new Error(error.message || "Login failed");
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
  const districtName = data.districtName.trim();
  const districtKey = getDistrictKey(districtName);

  const { data: result, error } = await authClient.signUp.email({
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    email: data.email.trim().toLowerCase(),
    password: data.password,

    districtKey,
    districtName,

    address: data.address?.trim() || "",
  });

  if (error) throw new Error(error.message || "Signup failed");
  return result;
}

export async function signOut() {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message || "Logout failed");
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
    throw new Error(error.message || "Password change failed");
  }

  return result;
}