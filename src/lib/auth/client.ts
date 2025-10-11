import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL,
    plugins: [
        passkeyClient(),

    ]
});

export default authClient;
export const {
    signUp,
    signIn,
    getSession,
    useSession,
    signOut
} = authClient;