import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { Box, Typography, Paper, Divider } from "@mui/material";
import StripeEmbeddedConnect from "@/components/admin/settings/StripeEmbeddedConnect";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
    const authResult = await checkAdminAuth();
    if (!authResult.authorized || !authResult.user) {
        if (authResult.error === "Not authenticated") {
            redirect("/login?callbackUrl=/admin/settings");
        }
        return <div style={{ color: 'red' }}>Access Denied</div>;
    }

    const user = await prisma.user.findUnique({
        where: { id: authResult.user.id },
        select: { 
            adminProfile: {
                select: { stripeConnectId: true }
            }
        }
    });

    let isConnected = false;
    const stripeConnectId = user?.adminProfile?.stripeConnectId;
    if (stripeConnectId) {
        try {
            const account = await stripe.accounts.retrieve(stripeConnectId);
            isConnected = account.details_submitted;
        } catch (error) {
            console.error("Failed to retrieve Stripe account status:", error);
            // Treat as not connected if retrieval fails (e.g. account deleted)
            isConnected = false;
        }
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Admin Settings</Typography>
            
            <Paper sx={{ p: 4, mt: 3, maxWidth: 600 }}>
                <Typography variant="h6" gutterBottom>Payout Settings</Typography>
                <Divider sx={{ mb: 3 }} />
                
                <StripeEmbeddedConnect isConnected={isConnected} />
            </Paper>
        </Box>
    );
}
