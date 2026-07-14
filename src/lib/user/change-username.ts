import { prisma } from "@/lib/prisma/prisma";

const USERNAME_RESERVATION_DAYS = 90;

/**
 * Changes a user's username, reserving the old one for 90 days (via
 * UsernameHistory) so it can't be immediately claimed by someone else and
 * used to impersonate the previous owner. /profile/[username] consults this
 * table to redirect old handles to the new one during the reservation window.
 * No-ops if the username is unchanged.
 */
export async function changeUsername(userId: string, newUsername: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const current = await tx.user.findUnique({ where: { id: userId }, select: { username: true } });
        if (current?.username && current.username !== newUsername) {
            await tx.usernameHistory.create({
                data: {
                    username: current.username,
                    userId,
                    expiresAt: new Date(Date.now() + USERNAME_RESERVATION_DAYS * 24 * 60 * 60 * 1000),
                },
            });
        }
        await tx.user.update({ where: { id: userId }, data: { username: newUsername } });
    });
}
