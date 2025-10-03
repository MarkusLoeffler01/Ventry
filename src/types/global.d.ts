declare namespace NodeJS {
    interface ProcessEnv {
        JWT_PRIVATE_KEY: string;
        JWT_PUBLIC_KEY: string;
        JWT_AUDIENCE: string;
        JWT_ISSUER: string;


        GOOGLE_CLIENT_ID: string;
        GOOGLE_CLIENT_SECRET: string;

        GITHUB_CLIENT_ID: string;
        GITHUB_CLIENT_SECRET: string;

        SUPABASE_API_KEY: string;
        SUPABASE_PUBLISHABLE_KEY: string;
        SUPABASE_URL: string;
        SUPABASE_BUCKET_ID: string;
    }
}