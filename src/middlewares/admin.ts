import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const middleware = async (req: NextRequest) => {
    const { pathname } = req.nextUrl;

    if(!pathname.startsWith("/admin")) return NextResponse.next();
    
    // Get the user data from the previous middleware
    const userId = req.headers.get("userId");
    const email = req.headers.get("email");
    if(!userId || !email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if the user is an admin in the database
    const user = await prisma.user.findUnique({
        // Not sure if we need to check for email
        // as well, but it's better to be safe
        where: { id: userId, email: email }
    });
    if(!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if(!user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
    
}

export { middleware };