import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            isVerified: boolean;
        };
        apiToken?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        userId?: string;
        apiToken?: string;
    }
}