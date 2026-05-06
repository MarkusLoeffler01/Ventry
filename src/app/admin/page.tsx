import { Suspense } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Divider from "@mui/material/Divider";
import {
    People,
    VerifiedUser,
    ConfirmationNumber,
    SupportAgent,
    Event,
    AttachMoney,
} from "@mui/icons-material";
import StatCard from "@/components/admin/StatCard/StatCard";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";
import { redirect } from "next/navigation";

async function getDashboardStats() {
    const [
        totalUsers,
        verifiedUsers,
        totalTickets,
        openTickets,
        eventsByStatus,
        revenue,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { emailVerified: true } }),
        prisma.supportTicket.count(),
        prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.event.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.payment.aggregate({
            _sum: { amount: true },
            where: { paymentStatus: "COMPLETED" },
        }),
    ]);

    const eventCounts = Object.fromEntries(
        eventsByStatus.map((e) => [e.status, e._count._all])
    ) as Record<string, number>;

    return {
        totalUsers,
        verifiedUsers,
        totalTickets,
        openTickets,
        draftEvents: eventCounts.DRAFT ?? 0,
        publishedEvents: eventCounts.PUBLISHED ?? 0,
        cancelledEvents: eventCounts.CANCELLED ?? 0,
        totalRevenue: revenue._sum.amount ?? 0,
    };
}

function StatSkeleton() {
    return (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Skeleton variant="rounded" height={110} />
        </Grid>
    );
}

async function DashboardStats() {
    const stats = await getDashboardStats();
    const verifiedPct = stats.totalUsers
        ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100)
        : 0;

    return (
        <>
            {/* Users */}
            <Grid size={12}>
                <Typography variant="h6" fontWeight={600} color="text.secondary">Users</Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard label="Total Users" value={stats.totalUsers} Icon={People} color="primary.main" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard
                    label="Verified Users"
                    value={stats.verifiedUsers}
                    sub={`${verifiedPct}% of all users`}
                    Icon={VerifiedUser}
                    color="success.main"
                />
            </Grid>

            {/* Support Tickets */}
            <Grid size={12}>
                <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 2 }}>Support Tickets</Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard label="Total Tickets" value={stats.totalTickets} Icon={ConfirmationNumber} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard
                    label="Open / In Progress"
                    value={stats.openTickets}
                    Icon={SupportAgent}
                    color={stats.openTickets > 0 ? "warning.main" : "success.main"}
                />
            </Grid>

            {/* Events */}
            <Grid size={12}>
                <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 2 }}>Events</Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard label="Draft" value={stats.draftEvents} Icon={Event} color="text.secondary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard label="Published" value={stats.publishedEvents} Icon={Event} color="primary.main" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard label="Cancelled" value={stats.cancelledEvents} Icon={Event} color="error.main" />
            </Grid>

            {/* Revenue */}
            <Grid size={12}>
                <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 2 }}>Revenue</Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <StatCard
                    label="Total Revenue (completed)"
                    value={`€\u202f${stats.totalRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    Icon={AttachMoney}
                    color="success.main"
                    sub="See Billing for full breakdown"
                />
            </Grid>
        </>
    );
}

export default async function AdminDashboardPage() {
    const auth = await checkAdminAuth();
    if (!auth.authorized) redirect("/login");

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Dashboard
            </Typography>
            <Grid container spacing={2} alignItems="stretch">
                <Suspense
                    fallback={
                        <>
                            {Array.from({ length: 7 }).map((_, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                                <StatSkeleton key={i} />
                            ))}
                        </>
                    }
                >
                    <DashboardStats />
                </Suspense>
            </Grid>
        </Box>
    );
}