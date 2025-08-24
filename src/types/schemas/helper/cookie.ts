

export function generateAuthCookie(token: string) {
    return {
        name: "token",
        value: token,
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    } as const;
}