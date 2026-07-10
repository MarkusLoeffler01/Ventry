import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { AdminType } from "@/generated/prisma";
import { requiredCountryCodeSchema } from "@/types/schemas/country";

const schema = z
  .object({
    legalName: z.string().trim().min(2),
    addressLine1: z.string().trim().min(2),
    addressLine2: z.string().trim().optional().nullable(),
    addressCity: z.string().trim().min(2),
    addressState: z.string().trim().optional().nullable(),
    addressPostalCode: z.string().trim().min(2),
    addressCountry: requiredCountryCodeSchema,
    path: z.enum(["ATTENDEE", "ORGANIZER"]),
    organizerType: z.enum(["INDIVIDUAL", "ORGANIZATION"]).optional(),
    orgName: z.string().trim().min(2).max(100).optional(),
    orgSlug: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    orgDescription: z.string().trim().max(500).optional().nullable(),
  })
  .refine((d) => d.path !== "ORGANIZER" || !!d.organizerType, {
    message: "Organizer type is required",
  })
  .refine(
    (d) => d.organizerType !== "ORGANIZATION" || (d.orgName && d.orgSlug),
    { message: "Organization name and slug are required for organization accounts" },
  );

// POST: Complete the profile for an already-authenticated user (e.g. after
// signing up via SSO), collecting the same data RegisterWizard collects for
// email/password signups: legal/address details, attendee vs organizer path,
// and organization details.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const userId = session.user.id;

  if (data.organizerType === "ORGANIZATION" && data.orgSlug) {
    const slugTaken = await prisma.adminOrganization.findUnique({
      where: { slug: data.orgSlug },
      select: { id: true },
    });
    if (slugTaken) {
      return NextResponse.json({ error: "Organization slug already taken" }, { status: 409 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        legalName: data.legalName,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 ?? null,
        addressCity: data.addressCity,
        addressState: data.addressState ?? null,
        addressPostalCode: data.addressPostalCode,
        addressCountry: data.addressCountry,
      },
    });

    if (data.path === "ORGANIZER") {
      const existingAdmin = await tx.admin.findUnique({ where: { userId } });

      await tx.user.update({ where: { id: userId }, data: { isAdmin: true } });

      const admin =
        existingAdmin ??
        (await tx.admin.create({
          data: {
            userId,
            type: data.organizerType === "INDIVIDUAL" ? AdminType.INDIVIDUAL : AdminType.ORGANIZATION,
          },
        }));

      if (data.organizerType === "ORGANIZATION" && data.orgName && data.orgSlug) {
        await tx.adminOrganization.create({
          data: {
            name: data.orgName,
            slug: data.orgSlug,
            description: data.orgDescription ?? null,
            ownerId: admin.id,
            members: {
              create: { adminId: admin.id, permissions: [] },
            },
          },
        });
      }
    }
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
