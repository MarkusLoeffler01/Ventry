import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { Prisma } from "@/generated/prisma";
import { renderComponentToHTML } from "@/lib/helpers/html";
import RegistrationUpdateMail from "@/components/emails/RegistrationUpdateMail";
import { sendMail } from "@/lib/mail";

// PATCH /api/admin/registrations/[id] - Update registration details by admin
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await checkAdminAuth(req.headers);
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        const id = (await params).id;
        const body = await req.json();
        
        const { 
            status, 
            preferences, 
            customFieldData, 
            paymentStatus,
            paymentAmount,
            notes: changeReason
        } = body;

        // 1. Fetch current state for diffing
        const current = await prisma.registration.findUnique({
            where: { id },
            include: {
                payments: { orderBy: { createdAt: 'desc' }, take: 1 },
                event: { include: { products: true } }
            }
        });

        if (!current) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

        const changes: Array<{ label: string; old: string; new: string }> = [];

        // Helper to find product name
        const getProductName = (id?: string) => current.event.products.find(p => p.id === id)?.name || id || "None";

        // Diff Status
        if (status && status !== current.status) {
            changes.push({ label: "Registration Status", old: current.status, new: status });
        }

        // Diff Preferences (Badge/Hotel)
        const oldPref = current.preferences as Record<string, unknown>;
        if (preferences) {
            if (preferences.productId !== oldPref.productId) {
                changes.push({ label: "Badge Tier", old: getProductName(oldPref.productId as string), new: getProductName(preferences.productId) });
            }
            if (preferences.needsHotel !== oldPref.needsHotel) {
                changes.push({ label: "Hotel Room", old: oldPref.needsHotel ? "Yes" : "No", new: preferences.needsHotel ? "Yes" : "No" });
            }
            if (preferences.earlyArrival !== oldPref.earlyArrival) {
                changes.push({ label: "Early Arrival", old: oldPref.earlyArrival ? "Yes" : "No", new: preferences.earlyArrival ? "Yes" : "No" });
            }
            if (preferences.lateDeparture !== oldPref.lateDeparture) {
                changes.push({ label: "Late Departure", old: oldPref.lateDeparture ? "Yes" : "No", new: preferences.lateDeparture ? "Yes" : "No" });
            }
        }

        // Diff Payment
        const currentPayment = current.payments[0];
        if (paymentStatus && currentPayment && paymentStatus !== currentPayment.paymentStatus) {
            changes.push({ label: "Payment Status", old: currentPayment.paymentStatus, new: paymentStatus });
        }
        if (paymentAmount !== undefined && currentPayment && Number(paymentAmount) !== Number(currentPayment.amount)) {
            changes.push({ label: "Total Price", old: `${currentPayment.amount}€`, new: `${paymentAmount}€` });
        }

        // Diff Custom Fields
        if (customFieldData) {
            const oldData = current.customFieldData as Record<string, unknown>;
            for (const key in customFieldData) {
                if (JSON.stringify(customFieldData[key]) !== JSON.stringify(oldData[key])) {
                    changes.push({ label: `Field: ${key}`, old: String(oldData[key] || "Empty"), new: String(customFieldData[key]) });
                }
            }
        }

        // 2. Perform update in a transaction
        const registration = await prisma.$transaction(async (tx) => {
            // Find admin profile for current user
            const admin = await tx.admin.findUnique({
                where: { userId: authResult.user!.id }
            });

            const updatedReg = await tx.registration.update({
                where: { id },
                data: {
                    ...(status && { status }),
                    ...(preferences && { preferences: preferences as Prisma.InputJsonValue }),
                    ...(customFieldData && { customFieldData: customFieldData as Prisma.InputJsonValue }),
                    ...(changeReason !== undefined && { notes: changeReason }),
                },
                include: {
                    user: { select: { name: true, email: true } },
                    event: { select: { id: true, name: true } },
                    payments: { orderBy: { createdAt: 'desc' }, take: 1 }
                }
            });

            if (paymentStatus || paymentAmount !== undefined) {
                const latestPayment = updatedReg.payments[0];
                if (latestPayment) {
                    await tx.payment.update({
                        where: { id: latestPayment.id },
                        data: {
                            ...(paymentStatus && { paymentStatus }),
                            ...(paymentAmount !== undefined && { amount: Number(paymentAmount) })
                        }
                    });
                }
            }

            // Create history record
            if (changes.length > 0) {
                await tx.registrationHistory.create({
                    data: {
                        registrationId: id,
                        changedByAdminId: admin?.id || null,
                        action: "UPDATED",
                        changes: changes as Prisma.InputJsonValue,
                        notes: changeReason || null
                    }
                });
            }

            return updatedReg;
        });

        // 3. Send notification email with diff
        if (changes.length > 0) {
            try {
                const eventUrl = `${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "https://local.dev:3443"}/events/${registration.event.id}`;
                
                const emailHTML = await renderComponentToHTML(RegistrationUpdateMail, {
                    userName: registration.user.name || "Attendee",
                    eventName: registration.event.name,
                    status: registration.status,
                    adminNotes: changeReason,
                    eventUrl,
                    changes // Pass the detected changes
                });

                await sendMail(
                    registration.user.email,
                    `Registration Changes: ${registration.event.name}`,
                    emailHTML
                );
            } catch (mailError) {
                console.error("Failed to send registration update email:", mailError);
            }
        }

        return NextResponse.json({ message: "Registration updated successfully", registration }, { status: 200 });

    } catch (error) {
        console.error("Error updating admin registration:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
