declare namespace NodeJS {
    interface ProcessEnv {
        JWT_PRIVATE_KEY: string;
        JWT_PUBLIC_KEY: string;
        JWT_AUDIENCE: string;
        JWT_ISSUER: string;
    }
}