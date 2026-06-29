import { prisma } from "@/lib/prisma/prisma";
import type { NotificationType } from "@/generated/prisma";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string,
) {
  return prisma.notification.create({
    data: { userId, type, title, body: body ?? null, link: link ?? null },
  });
}
