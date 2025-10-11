import prisma from "../prisma";
import * as bcrypt from "@/lib/bcrypt";


export async function verifyPassword({hash, password}: {hash: string, password: string}) {
    return await bcrypt.comparePassword(password, hash);
}

export async function verifyUser(email: string, password: string) {

    const user = await prisma.user.findFirst({
        where:{
            email: {
                equals: email,
                mode: "insensitive"
            } 
        },
        include: {
            accounts: {
                where: {
                    providerId: 'credential'
                }
            }
        }
    });

    if (!user) return null;

    // Get the credential account (password is stored there)
    const credentialAccount = user.accounts?.find(acc => acc.providerId === 'credential');

    if(!credentialAccount?.password) return null;

    const isValid = await bcrypt.comparePassword(password, credentialAccount.password);
    if(!isValid) return null;

    return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
}