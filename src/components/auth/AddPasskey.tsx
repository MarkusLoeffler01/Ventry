"use client";

import { signIn } from "next-auth/webauthn";
import { useSession } from "next-auth/react";
import Button from "@mui/material/Button";
import { Paper } from "@mui/material";

export function AddPasskeyButton() {
    const { status } = useSession();
    const canRegister = status === "authenticated";

    return (
        <Paper>
            { status === "authenticated" ? "You are logged in" : "Please log in to add a passkey" }
        
            <Button
                type="button"
                variant="outlined"
                onClick={() => void signIn("passkey", { action: "register" })}
                disabled={!canRegister}
            >
                Register new Passkey
            </Button>
        </Paper>
    );
}