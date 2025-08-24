import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type JwtPayload from "@/types/jwt";
import { getPrivateKey } from "@/types/schemas/helper/env";

const middleware = async (req: NextRequest) => {
    const { pathname } = req.nextUrl;
    if(!pathname.startsWith("/api/admin")) return NextResponse.next();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if(!token) throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const decoded = jwt.verify(token, getPrivateKey()) as JwtPayload;
        if(!("userId" in decoded)) throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if(!("email" in decoded)) throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });


        // Get the user data from the previous middleware
        const userId = decoded.userId;
        const email = decoded.email;

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

    } catch (_error) {
        throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    
    
    
    
    return NextResponse.next();
    
}

export { middleware };