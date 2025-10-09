import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma/prisma";
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
        isVerified: Boolean(user.emailVerified), // emailVerified -> isVerified
        isAdmin: false,
      };

      const createdUser = await prisma.user.create({
        data: {...userData, profilePictures: undefined}
      });

      // Return in NextAuth format
      return {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        image: undefined,
        emailVerified: createdUser.isVerified ? new Date() : null,
      };
    },

    // Override user retrieval to map back to NextAuth format
    async getUser(id) {
      console.log("CustomAdapter.getUser called for ID:", id);
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          profilePictures: {
            where: { isPrimary: true },
            take: 1
          }
        }
      });

      if (!user) return null;

      const primaryPicture = user.profilePictures[0];

      const adaptedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: primaryPicture?.signedUrl || null,
        emailVerified: user.isVerified ? new Date() : null,
      };

      console.log("CustomAdapter.getUser returning:", adaptedUser);
      return adaptedUser;
    },

    // Override user update
    async updateUser({ id, ...data }) {
      const updateData: Partial<User> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.emailVerified !== undefined) updateData.isVerified = Boolean(data.emailVerified);

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          profilePictures: {
            where: { isPrimary: true },
            take: 1
          }
        }
      });

      const primaryPicture = user.profilePictures[0];

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: primaryPicture?.signedUrl || null,
        emailVerified: user.isVerified ? new Date() : null,
      };
    },

    // Override getUserByEmail
    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          profilePictures: {
            where: { isPrimary: true },
            take: 1
          }
        }
      });

      if (!user) return null;

      const primaryPicture = user.profilePictures[0];

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: primaryPicture?.signedUrl || null,
        emailVerified: user.isVerified ? new Date() : null,
      };
    },
  };
}