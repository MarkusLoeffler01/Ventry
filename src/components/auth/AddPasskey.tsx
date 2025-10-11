"use client";

import authClient from "@/lib/auth/client";
import Button from "@mui/material/Button";
import { Paper } from "@mui/material";

export function AddPasskeyButton() {
    const handleAddPasskey = async () => {
        try {
            await authClient.signIn.passkey();
        } catch (error) {
            console.error("Failed to add passkey:", error);
        }
    };

    return (
        <Paper>
            <Button
                type="button"
                variant="outlined"
                onClick={() => void handleAddPasskey()}
            >
                Register new Passkey
            </Button>
        </Paper>
    );
}