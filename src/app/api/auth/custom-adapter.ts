import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Adapter } from "next-auth/adapters";
import type { User } from "@/generated/prisma";

export function CustomPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma);
  
  return {
    ...baseAdapter,
    
    // Override user creation to map fields correctly
    async createUser(user) {
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        // Map NextAuth fields to your schema
        profilePicture: user.image, // image -> profilePicture
        isVerified: Boolean(user.emailVerified), // emailVerified -> isVerified
        isAdmin: false,
      };

      const createdUser = await prisma.user.create({
        data: userData
      });

      // Return in NextAuth format
      return {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        image: createdUser.profilePicture,
        emailVerified: createdUser.isVerified ? new Date() : null,
      };
    },

    // Override user retrieval to map back to NextAuth format
    async getUser(id) {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.profilePicture,
        emailVerified: user.isVerified ? new Date() : null,
      };
    },

    // Override user update
    async updateUser({ id, ...data }) {
      const updateData: Partial<User> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.image !== undefined) updateData.profilePicture = data.image;
      if (data.emailVerified !== undefined) updateData.isVerified = Boolean(data.emailVerified);

      const user = await prisma.user.update({
        where: { id },
        data: updateData
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.profilePicture,
        emailVerified: user.isVerified ? new Date() : null,
      };
    },

    // Override getUserByEmail
    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.profilePicture,
        emailVerified: user.isVerified ? new Date() : null,
      };
    },
  };
}