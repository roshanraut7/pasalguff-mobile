const BASE_URL = process.env.EXPO_PUBLIC_AUTH_URL!;

export async function signInWithEmail(data: {
    email: string;
    password: string;
}) {
    const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result?.message || "Login failed");
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
    const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result?.message || "Signup failed");
    }

    return result;
}