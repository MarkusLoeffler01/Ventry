import { Suspense } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import { AttachMoney, TrendingUp, Cancel, HourglassEmpty } from "@mui/icons-material";
import StatCard from "@/components/admin/StatCard/StatCard";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";
import { redirect } from "next/navigation";

const fmt = (amount: number) =>
    `€\u202f${amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusColor: Record<string, "success" | "warning" | "error" | "default"> = {
    COMPLETED: "success",
    PENDING: "warning",
    FAILED: "error",
    REFUNDED: "default",
};

async function getBillingData() {
    const [byStatus, recentPayments, revenueByEvent] = await Promise.all([
        prisma.payment.groupBy({
            by: ["paymentStatus"],
            _sum: { amount: true },
            _count: { _all: true },
        }),
        prisma.payment.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
                user: { select: { name: true, email: true } },
                registration: { include: { event: { select: { name: true } } } },
            },
        }),
        prisma.payment.groupBy({
            by: ["registrationId"],
            where: { paymentStatus: "COMPLETED" },
            _sum: { amount: true },
        }),
    ]);

    const statusMap = Object.fromEntries(
        byStatus.map((s) => [s.paymentStatus, { sum: s._sum.amount ?? 0, count: s._count._all }])
    );

    const completed = statusMap.COMPLETED ?? { sum: 0, count: 0 };
    const pending = statusMap.PENDING ?? { sum: 0, count: 0 };
    const failed = statusMap.FAILED ?? { sum: 0, count: 0 };
    const refunded = statusMap.REFUNDED ?? { sum: 0, count: 0 };

    // Approximate Stripe fee: 1.5% + €0.25 per completed transaction
    const stripeFees = completed.count * 0.25 + completed.sum * 0.015;
    const netRevenue = completed.sum - stripeFees;

    return { completed, pending, failed, refunded, stripeFees, netRevenue, recentPayments, revenueByEvent };
}

async function BillingContent() {
    const data = await getBillingData();

    return (
        <>
            {/* Summary cards */}
            <Grid size={12}>
                <Typography variant="h6" fontWeight={600} color="text.secondary">Overview</Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    label="Gross Revenue"
                    value={fmt(data.completed.sum)}
                    sub={`${data.completed.count} completed payments`}
                    Icon={TrendingUp}
                    color="success.main"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    label="Est. Stripe Fees"
                    value={fmt(data.stripeFees)}
                    sub="1.5% + €0.25 / txn (approx.)"
                    Icon={AttachMoney}
                    color="warning.main"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    label="Net Revenue"
                    value={fmt(data.netRevenue)}
                    sub="After estimated fees"
                    Icon={AttachMoney}
                    color="primary.main"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    label="Pending"
                    value={fmt(data.pending.sum)}
                    sub={`${data.pending.count} payments`}
                    Icon={HourglassEmpty}
                    color="info.main"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    label="Failed"
                    value={fmt(data.failed.sum)}
                    sub={`${data.failed.count} payments`}
                    Icon={Cancel}
                    color="error.main"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    label="Refunded"
                    value={fmt(data.refunded.sum)}
                    sub={`${data.refunded.count} payments`}
                    Icon={Cancel}
                    color="text.secondary"
                />
            </Grid>

            {/* Recent payments table */}
            <Grid size={12}>
                <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mt: 2 }}>
                    Recent Payments
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>
            <Grid size={12}>
                <Paper variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Event</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell>Currency</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Provider</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.recentPayments.map((p) => (
                                <TableRow key={p.id} hover>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        {new Date(p.createdAt).toLocaleDateString("de-DE")}
                                    </TableCell>
                                    <TableCell>{p.user.name ?? p.user.email}</TableCell>
                                    <TableCell>{p.registration.event.name}</TableCell>
                                    <TableCell align="right">{fmt(p.amount)}</TableCell>
                                    <TableCell>{p.currency.toUpperCase()}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={p.paymentStatus}
                                            color={statusColor[p.paymentStatus] ?? "default"}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{p.paymentProvider ?? "—"}</TableCell>
                                </TableRow>
                            ))}
                            {data.recentPayments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        No payments yet
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Grid>
        </>
    );
}

export default async function AdminBillingPage() {
    const auth = await checkAdminAuth();
    if (!auth.authorized) redirect("/login");

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Billing
            </Typography>
            <Grid container spacing={2} alignItems="stretch">
                <Suspense
                    fallback={
                        <>
                            {Array.from({ length: 6 }).map((_, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Skeleton variant="rounded" height={110} />
                                </Grid>
                            ))}
                        </>
                    }
                >
                    <BillingContent />
                </Suspense>
            </Grid>
        </Box>
    );
}
