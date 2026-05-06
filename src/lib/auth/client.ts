import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { lastLoginMethodClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/app/api/auth/auth";

const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL,
    plugins: [
        passkeyClient(),
        lastLoginMethodClient(),
        inferAdditionalFields<typeof auth>(),
    ]
});

export default authClient;
export const {
    signUp,
    signIn,
    getSession,
    useSession,
    signOut,
    isLastUsedLoginMethod
} = authClient;
