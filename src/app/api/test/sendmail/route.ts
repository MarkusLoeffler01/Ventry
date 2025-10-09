import { sendMail } from "@/lib/mail";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { to, subject, html } = await request.json();
    await sendMail(to, subject, html);
    return NextResponse.json({ success: true });
}

export async function GET() {
    return NextResponse.json({ message: "Send mail endpoint" });
}