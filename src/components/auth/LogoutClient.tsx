"use client";

import { Button } from "@mui/material";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function LogoutClient() {
    useEffect(() => {
        signOut({ redirect: false });
    }, []);

    return (
        <>
            <h1 className="text-2xl font-bold mb-4">You have been logged out.</h1>
            <p className="text-gray-600">Thank you for using our service!</p>
            <Link href="/" className="text-blue-500 hover:underline">
                <Button variant="contained" color="primary" className="mt-4">
                    Go back to homepage
                </Button>
            </Link>
        </>
    );
}