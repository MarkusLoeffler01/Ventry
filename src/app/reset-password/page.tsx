import { Container, Box, Typography, Alert } from "@mui/material";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default async function Page({
    searchParams
}: { searchParams: { token?: string, identifier?: string } }) {

    const { token, identifier } = await searchParams;

    if(!token || !identifier) {
        return (
            <Container maxWidth="sm">
                <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Alert severity="error" sx={{ width: "100%" }}>
                        <Typography variant="h6" gutterBottom>
                            Invalid Password Reset Link
                        </Typography>
                        <Typography variant="body2">
                            The password reset link is invalid or has expired. Please request a new one.
                        </Typography>
                    </Alert>
                </Box>
            </Container>
        );
    }

    const handlePasswordReset = async (_password: string) => {
        "use server";
        // TODO: Implement password reset logic here

        const bcrypt = (await import('bcrypt')).default;
        const prisma = (await import('@/lib/prisma/prisma')).prisma;

        const x = await prisma.user.findUnique({
            where: { 
                id: identifier,
                PasswordReset: {
                    token: token,
                    userId: identifier
                }
            }
        });

        if(!x) return { success: false, error: "Invalid token or identifier." };

        const hashedPassword = await bcrypt.hash(_password, 10);

        try {
            await prisma.user.update({
            where: { id: identifier },
            data: { password: hashedPassword }
            });
            return { success: true };
        } catch {
            return { success: false, error: "Failed to reset password. Please try again." };
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", py: 4 }}>
                <ResetPasswordForm 
                    token={token} 
                    identifier={identifier} 
                    onSubmit={handlePasswordReset}
                />
            </Box>
        </Container>
    );
}