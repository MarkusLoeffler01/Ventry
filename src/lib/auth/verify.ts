"use server";
import prisma from "../prisma/prisma";
import * as bcrypt from "@/lib/bcrypt";
import type { User } from "@/generated/prisma";

export async function verifyUser(email: string, password: string): Promise<VerifyResult> {

    const user = await prisma.user.findFirst({
        where:{
            email: {
                equals: email,
                mode: "insensitive"
            } 
        }
    });


    if(!user?.password) return [null, "Invalid credentials"];


    const isValid = await bcrypt.comparePassword(password, user.password);
    if(!isValid) return [null, "Invalid credentials"];

    if(!user.isVerified) return [null, "Email not verified"];

    return [{ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }, null];
}

type VerifyUser = Pick<User, "id" | "email" | "name" | "isAdmin">;

type VerifyError = "Invalid credentials" | "Email not verified";

type VerifyResult = [VerifyUser, null] | [null, VerifyError];