import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            image?: string | null;
            emailVerified?: Date | null;
        };
        // Removed apiToken - NextAuth JWT handles all token management
    }

    interface User {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
        emailVerified?: Date | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        userId?: string;
        name?: string | null;
        image?: string | null;
        // Removed apiToken - NextAuth handles internal token management
    }
}