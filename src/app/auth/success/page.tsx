import { auth } from "@/app/api/auth/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface SuccessPageProps {
    searchParams: {
        provider?: string;
    };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
    // Get the current session
    const session = await auth();
    
    // If no user is authenticated, redirect to login
    if (!session?.user) {
        redirect("/login");
    }

    const provider = searchParams.provider as "google" | "github" | undefined;
    const providerString = provider === "google" ? "Google" : provider === "github" ? "GitHub" : "Unknown Provider";
    
    const user = session.user;


    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
                <div className="mb-6 text-center">
                    {user.image && (
                        <Image 
                            src={user.image} 
                            alt="Profile" 
                            width={64}
                            height={64}
                            className="mx-auto mb-4 h-16 w-16 rounded-full"
                        />
                    )}
                    <h1 className="mb-2 text-2xl font-bold text-green-600">
                        Welcome, {user.name || user.email}!
                    </h1>
                    <p className="mb-4 text-sm text-gray-600">
                        Successfully authenticated with {providerString}
                    </p>
                </div>

                <div className="mb-6 space-y-2 text-sm text-gray-700">
                    <p><strong>Email:</strong> {user.email}</p>
                    {user.name && user.name !== user.email && (
                        <p><strong>Name:</strong> {user.name}</p>
                    )}
                    <p><strong>Provider:</strong> {providerString}</p>
                    <p><strong>User ID:</strong> {user.id}</p>
                </div>

                <div className="space-y-3">
                    <Link 
                        href="/" 
                        className="inline-block w-full rounded-lg bg-green-600 px-4 py-2 text-center text-white hover:bg-green-700"
                    >
                        Go to Dashboard
                    </Link>
                    <Link 
                        href="/dummy" 
                        className="inline-block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                    >
                        Try Passkey Registration
                    </Link>
                </div>
            </div>
        </div>
    );
}