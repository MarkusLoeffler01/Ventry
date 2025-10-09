import { sendMail } from "@/lib/mail";
import { NextResponse } from "next/server";
import PasswordResetMail from "@/components/PasswordResetMail";
import z from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { createPasswortResetLink } from "@/lib/auth/generatePasswordResetUrl";


export async function renderEmailHTML(name: string, resetUrl: string, expiryHours: number) {
  
    const ReactDOMServer = (await import('react-dom/server')).default;
  
    const html = ReactDOMServer.renderToStaticMarkup(PasswordResetMail({
    userName: name,
    resetUrl: resetUrl,
    expiryHours: expiryHours || 1
  }));
  return `<!DOCTYPE html>${html}`; // wichtig für korrekte Darstellung in E-Mail-Clients
}

const PasswordResetRequestSchema = z.object({
    email: z.email()
})

export async function POST(req: Request) {

    const body = await req.json();

    const result = PasswordResetRequestSchema.safeParse(body);
    if (!result.success) {
        return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { email: result.data.email }
    });

    if (!user) {
        // To prevent user enumeration, we return a success response even if the user doesn't exist
        return NextResponse.json({ message: "If an account with that email exists, a password reset email has been sent." });
    }

    const userName = user.name ?? user.email;

    const resetUrl = await createPasswortResetLink(user.id);

    const html = await renderEmailHTML(userName, resetUrl.url, 1);

    const mail = await sendMail(
        result.data.email,
        "Password Reset Request",
        html
    );


    if(!mail.success) return NextResponse.json({ error: `Failed to send email to ${mail.error}` }, { status: 500 });


    await prisma.passwordReset.deleteMany({
        where: {
            userId: user.id
        }
    });


    await prisma.passwordReset.create({
        data: {
            userId: user.id,
            token: resetUrl.token,
            expiresAt: resetUrl.expiresAt
        }
    });

    return NextResponse.json({ message: "Password reset email sent" });
}