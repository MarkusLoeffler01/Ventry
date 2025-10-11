"use client";

// Better-auth doesn't require a SessionProvider wrapper
// Sessions are handled internally by better-auth client
export function Providers({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
