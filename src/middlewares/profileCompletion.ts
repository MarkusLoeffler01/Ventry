import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

// Paths reachable even with an incomplete profile: the completion flow
// itself, logging out, and API routes (needed for the wizard's own submit
// call and for sign-out; each API route enforces its own auth independently).
// Everything else in the app is blocked until the profile is complete.
const ALLOWED_PREFIXES = [
    "/complete-profile",
    "/logout",
    "/api",
];

function isAllowed(pathname: string) {
    return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Blocks navigation anywhere in the app until legalName/address (collected
// by RegisterWizard for email/password signups) is set. SSO signups skip
// that wizard entirely and land with a bare profile, so this closes that gap
// centrally instead of per-page.
const middleware = async (req: NextRequest) => {
    const { pathname, search } = req.nextUrl;
    if (isAllowed(pathname)) return NextResponse.next();

    const sessionToken =
        req.cookies.get("VENTRY.session_token")?.value ||
        req.cookies.get("__Secure-VENTRY.session_token")?.value;
    if (!sessionToken) return NextResponse.next();

    const session = await getSession(req.headers);
    if (!session?.user || session.user.legalName) return NextResponse.next();

    const url = new URL("/complete-profile", req.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
};

export { middleware };
