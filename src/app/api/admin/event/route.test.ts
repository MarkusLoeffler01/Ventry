import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

vi.mock("@/types/schemas/event/admin", () => ({
    adminCreateEventSchema: {
        parse: vi.fn()
    }
}));

vi.mock("@/lib/prisma/prisma", () => ({
    prisma: {
        event: {
            findMany: vi.fn(),
            create: vi.fn()
        }
    }
}));

vi.mock("@/lib/auth/admin", () => ({
    checkAdminAuth: vi.fn(),
    forbiddenResponse: vi.fn((error?: string) =>
        new Response(JSON.stringify({ error: error ?? "Forbidden" }), {
            status: 403,
            headers: {
                "content-type": "application/json"
            }
        })
    )
}));

import * as adminRoute from "@/app/api/admin/event/route";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { adminCreateEventSchema } from "@/types/schemas/event/admin";

const mockedCheckAdminAuth = checkAdminAuth as unknown as ReturnType<typeof vi.fn>;
const mockedForbiddenResponse = forbiddenResponse as unknown as ReturnType<typeof vi.fn>;
const mockedCreate = prisma.event.create as unknown as ReturnType<typeof vi.fn>;
const mockedCreateParse = adminCreateEventSchema.parse as unknown as ReturnType<typeof vi.fn>;

function postRequest(url: string, body: unknown) {
    return new NextRequest(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    });
}

describe("App Router: /api/admin/event", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedCheckAdminAuth.mockResolvedValue({ authorized: true, adminId: "admin-1" });
    });

    it("returns 403 for unauthorized admins", async () => {
        mockedCheckAdminAuth.mockResolvedValue({ authorized: false, error: "Forbidden" });

        const response = await adminRoute.POST(postRequest("http://localhost/api/admin/event", {}));

        expect(response.status).toBe(403);
        expect(mockedForbiddenResponse).toHaveBeenCalledWith("Forbidden");
    });

    it("creates an event and preserves mixed product types", async () => {
        const input = {
            name: "Updated Event",
            description: "Desc",
            startDate: "2026-05-01T10:00:00.000Z",
            endDate: "2026-05-02T10:00:00.000Z",
            stayPolicy: {},
            customFields: [],
            schedule: [],
            status: "DRAFT",
            requireApproval: false,
            location: {
                name: "Venue",
                address: "Street 1",
                city: "Town",
                state: "State",
                country: "Germany",
                postalCode: "12345"
            },
            products: [
                {
                    id: "ticket-basic",
                    name: "Basic",
                    description: "Basic ticket",
                    price: 100,
                    type: "TICKET",
                    capacity: 50
                },
                {
                    id: "shirt",
                    name: "T-Shirt",
                    description: "Merch addon",
                    price: 25,
                    type: "ADDON",
                    capacity: 100
                },
                {
                    id: "room-standard",
                    name: "Standard Room",
                    description: "Hotel room",
                    price: 199,
                    type: "ACCOMMODATION",
                    capacity: 20
                }
            ]
        };

        mockedCreateParse.mockReturnValue(input);
        mockedCreate.mockResolvedValue({ id: 7, name: "Updated Event" });

        const response = await adminRoute.POST(
            postRequest("http://localhost/api/admin/event", input)
        );

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({
            message: "Event created successfully",
            event: { id: 7, name: "Updated Event" }
        });
        expect(mockedCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    ownerId: "admin-1",
                    products: {
                        create: [
                            {
                                id: "ticket-basic",
                                name: "Basic",
                                description: "Basic ticket",
                                price: 100,
                                type: "TICKET",
                                capacity: 50
                            },
                            {
                                id: "shirt",
                                name: "T-Shirt",
                                description: "Merch addon",
                                price: 25,
                                type: "ADDON",
                                capacity: 100
                            },
                            {
                                id: "room-standard",
                                name: "Standard Room",
                                description: "Hotel room",
                                price: 199,
                                type: "ACCOMMODATION",
                                capacity: 20
                            }
                        ]
                    }
                })
            })
        );
    });

    it("returns 422 for schema errors", async () => {
        const zerr = new z.ZodError([
            {
                code: "invalid_type",
                expected: "string",
                path: ["name"],
                message: "Required",
                input: undefined
            }
        ]);
        mockedCreateParse.mockImplementation(() => {
            throw zerr;
        });

        const response = await adminRoute.POST(postRequest("http://localhost/api/admin/event", {}));

        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ error: zerr.issues });
        expect(mockedCreate).not.toHaveBeenCalled();
    });
});
