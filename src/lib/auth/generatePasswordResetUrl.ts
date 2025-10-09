import bcrypt from "bcrypt";
import crypto from "crypto";

type ResetLinkResult = {
    url: string;
    token: string;
    tokenHash: string;
    expiresAt: Date;
}


export async function createPasswortResetLink(
    identifier: string,
    expiresInMinutes: number = 60,
    baseUrl: string = process.env.NEXTAUTH_URL || "https://local.dev:3443"
): Promise<ResetLinkResult> {

    const token = crypto.randomBytes(32).toString('hex');

    const tokenHash = await bcrypt.hash(token, 10);

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&identifier=${encodeURIComponent(identifier)}`;

    return { url, token, tokenHash, expiresAt };
}