import prisma from "../prisma";
import * as bcrypt from "@/lib/bcrypt";


export async function verifyUser(email: string, password: string) {

    const user = await prisma.user.findFirst({
        where:{
            email: {
                equals: email,
                mode: "insensitive"
            } 
        }
    });


    if(!user?.password) return null;


    const isValid = await bcrypt.comparePassword(password, user.password);
    if(!isValid) return null;

    return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
}