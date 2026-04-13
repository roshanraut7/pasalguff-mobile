import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

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
                businessName: {
                    type: "string",
                    required: true,
                },
                businessType: {
                    type: "string",
                    required: true,
                },
                panNo: {
                    type: "string",
                    required: true,
                },
                registrationNo: {
                    type: "string",
                    required: true,
                },
                address: {
                    type: "string",
                    required: true,
                },
                role: {
                    type: ["USER", "ADMIN", "SUPER_ADMIN"],
                    required: false,
                    input: false,
                },
            },
        }),
        expoClient({
            scheme: "myapp",
            storagePrefix: "myapp",
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

    if (error) {
        throw new Error(error.message || "Login failed");
    }

    return result;
}

export async function signUpWithEmail(data: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    businessName: string;
    businessType: string;
    panNo: string;
    registrationNo: string;
    address: string;
}) {
    const { data: result, error } = await authClient.signUp.email({
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        businessName: data.businessName,
        businessType: data.businessType,
        panNo: data.panNo,
        registrationNo: data.registrationNo,
        address: data.address,
    });

    if (error) {
        throw new Error(error.message || "Signup failed");
    }

    return result;
}

export async function signOut() {
    const { error } = await authClient.signOut();

    if (error) {
        throw new Error(error.message || "Logout failed");
    }

    return true;
}

export async function getAuthCookie() {
    return authClient.getCookie();
}