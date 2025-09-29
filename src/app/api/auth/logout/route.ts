import type { NextRequest } from "next/server";
import { redirect, RedirectType } from "next/navigation";

export async function POST(req: NextRequest) {
    if(!req.cookies.has("token")) return new Response(null, { status: 204 });
    req.cookies.delete("token");
    redirect("/", RedirectType.replace);
}