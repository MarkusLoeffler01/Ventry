import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    payment: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
    },
    adminOrganizationMembership: {
        findMany: vi.fn(),
    },
}));

vi.mock("@/lib/prisma/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/app/api/auth/auth", () => ({
    auth: { api: { getSession: vi.fn() } },
}));

vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { getBillingData } from "./billing-data";

function mockPaymentQueries(overrides: {
    groupBy?: unknown[];
    findMany?: unknown[];
} = {}) {
    prismaMock.payment.groupBy.mockResolvedValue(overrides.groupBy ?? []);
    prismaMock.payment.findMany.mockResolvedValue(overrides.findMany ?? []);
}

describe("getBillingData — event scoping", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.adminOrganizationMembership.findMany.mockResolvedValue([]);
        mockPaymentQueries();
    });

    it("individual admin: all payment queries scoped to their events via registration.event filter", async () => {
        prismaMock.adminOrganizationMembership.findMany.mockResolvedValue([]);

        await getBillingData("admin-individual");

        const expectedFilter = {
            registration: { event: { OR: [{ ownerId: "admin-individual" }] } },
        };

        // groupBy (summary stats) uses the filter
        expect(prismaMock.payment.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({ where: expectedFilter }),
        );
        // findMany (recent payments) uses the filter
        expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expectedFilter }),
        );
    });

    it("org admin: queries scoped to org events via organizationId filter", async () => {
        prismaMock.adminOrganizationMembership.findMany.mockResolvedValue([
            { organizationId: "org-1" },
        ]);

        await getBillingData("admin-org");

        const expectedFilter = {
            registration: {
                event: {
                    OR: [
                        { ownerId: "admin-org" },
                        { organizationId: { in: ["org-1"] } },
                    ],
                },
            },
        };

        expect(prismaMock.payment.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({ where: expectedFilter }),
        );
        expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expectedFilter }),
        );
    });

    it("org admin with no payments returns zero revenue", async () => {
        prismaMock.adminOrganizationMembership.findMany.mockResolvedValue([
            { organizationId: "org-1" },
        ]);
        prismaMock.payment.groupBy.mockResolvedValue([]);
        prismaMock.payment.findMany.mockResolvedValue([]);

        const data = await getBillingData("admin-org");

        expect(data.completed).toEqual({ sum: 0, count: 0 });
        expect(data.netRevenue).toBe(0);
        expect(data.recentPayments).toEqual([]);
    });

    it("individual admin with payments sees correct totals", async () => {
        prismaMock.adminOrganizationMembership.findMany.mockResolvedValue([]);
        prismaMock.payment.groupBy.mockResolvedValue([
            { paymentStatus: "COMPLETED", _sum: { amount: 1000 }, _count: { _all: 4 } },
            { paymentStatus: "PENDING", _sum: { amount: 200 }, _count: { _all: 2 } },
        ]);
        prismaMock.payment.findMany.mockResolvedValue([]);

        const data = await getBillingData("admin-individual");

        expect(data.completed).toEqual({ sum: 1000, count: 4 });
        expect(data.pending).toEqual({ sum: 200, count: 2 });
        // stripeFees = 4 * 0.25 + 1000 * 0.015 = 1 + 15 = 16
        expect(data.stripeFees).toBeCloseTo(16);
        expect(data.netRevenue).toBeCloseTo(984);
    });

    it("completed payment query includes paymentStatus filter alongside event scope", async () => {
        prismaMock.adminOrganizationMembership.findMany.mockResolvedValue([]);

        await getBillingData("admin-individual");

        // The third groupBy call (revenueByEvent) filters COMPLETED + event scope
        const groupByCalls = prismaMock.payment.groupBy.mock.calls;
        const revenueByEventCall = groupByCalls.find(
            (call) => call[0]?.where?.paymentStatus === "COMPLETED",
        );
        expect(revenueByEventCall).toBeDefined();
        expect(revenueByEventCall?.[0].where).toEqual(
            expect.objectContaining({
                paymentStatus: "COMPLETED",
                registration: expect.objectContaining({ event: expect.any(Object) }),
            }),
        );
    });
});
