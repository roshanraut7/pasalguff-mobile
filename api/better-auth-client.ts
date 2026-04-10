// import { createAuthClient } from "better-auth/client";
// import { inferAdditionalFields } from "better-auth/client/plugins";

// export const authClient = createAuthClient({
//     baseURL: process.env.EXPO_PUBLIC_AUTH_URL,
//     plugins: [
//         inferAdditionalFields({
//             user: {
//                 firstName: { type: "string" },
//                 lastName: { type: "string" },
//                 businessName: { type: "string" },
//                 businessType: { type: "string" },
//                 panNo: { type: "string" },
//                 registrationNo: { type: "string" },
//                 address: { type: "string" },
//             },
//         }),
//     ],
// });