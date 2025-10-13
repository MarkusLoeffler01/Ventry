import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Paper, Box, Typography } from "@mui/material";
import { Key, GitHub, Google } from "@mui/icons-material";
import { prisma } from "@/lib/prisma/prisma";

interface SuccessPageProps {
    searchParams: Promise<{
        provider?: string;
    }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
    // Get the current session
    const session = await getSession();
    
    // If no user is authenticated, redirect to login
    if (!session?.user) {
        redirect("/login");
    }

    // Await searchParams to fix Next.js dynamic API warning
    const params = await searchParams;
    const provider = params.provider as "google" | "github" | undefined;
    const providerString = provider === "google" ? "Google" : provider === "github" ? "GitHub" : "Unknown Provider";
    
    const user = session.user;

    // Get local user profile picture and provider account info
    const dbUserData = user.id ? await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            profilePictures: {
                orderBy: [
                    { order: 'asc' },
                    { isPrimary: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 1
            },
            accounts: {
                where: {
                    providerId: provider || 'unknown'  // Changed from 'provider' for better-auth
                },
                select: {
                    providerId: true  // Changed from 'provider' for better-auth
                }
            }
        }
    }) : null;

    const localProfilePicture = dbUserData?.profilePictures[0]?.signedUrl;
    const providerProfilePicture = user.image; // This comes from the OAuth provider

    console.log("Local profile picture:", localProfilePicture);
    console.log("Provider profile picture:", providerProfilePicture);

    const ProviderIcon = provider === "github" ? GitHub : provider === "google" ? Google : Key;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
            <Paper 
                elevation={8} 
                sx={{ 
                    width: '100%', 
                    maxWidth: 500, 
                    p: 4, 
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Background decoration */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        pointerEvents: 'none'
                    }}
                />

                {/* Animation Container */}
                <Box sx={{ position: 'relative', height: 200, mb: 4 }}>
                    {/* User Profile Circle - Left */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            animation: 'slideInLeft 1.5s ease-out',
                            '@keyframes slideInLeft': {
                                '0%': { transform: 'translateX(-100px) translateY(-50%)', opacity: 0 },
                                '70%': { transform: 'translateX(10px) translateY(-50%)', opacity: 1 },
                                '100%': { transform: 'translateX(0) translateY(-50%)', opacity: 1 }
                            }
                        }}
                    >
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '4px solid white',
                                overflow: 'hidden'
                            }}
                        >
                            {localProfilePicture ? (
                                <Image 
                                    src={localProfilePicture} 
                                    alt="Your Profile" 
                                    width={72}
                                    height={72}
                                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                                />
                            ) : (
                                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {(user.name || user.email)?.[0]?.toUpperCase()}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Center Key Icon */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            animation: 'centerPulse 2s ease-in-out infinite, rotateKey 3s ease-in-out infinite',
                            '@keyframes centerPulse': {
                                '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
                                '50%': { transform: 'translate(-50%, -50%) scale(1.1)' }
                            },
                            '@keyframes rotateKey': {
                                '0%, 100%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
                                '25%': { transform: 'translate(-50%, -50%) rotate(-10deg)' },
                                '75%': { transform: 'translate(-50%, -50%) rotate(10deg)' }
                            }
                        }}
                    >
                        <Box
                            sx={{
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '6px solid white',
                                boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                            }}
                        >
                            <Key sx={{ fontSize: 50, color: 'white' }} />
                        </Box>
                    </Box>

                    {/* User's Provider Profile Picture - Right */}
                    <Box
                        sx={{
                            position: 'absolute',
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            animation: 'slideInRight 1.5s ease-out 0.3s both',
                            '@keyframes slideInRight': {
                                '0%': { transform: 'translateX(100px) translateY(-50%)', opacity: 0 },
                                '70%': { transform: 'translateX(-10px) translateY(-50%)', opacity: 1 },
                                '100%': { transform: 'translateX(0) translateY(-50%)', opacity: 1 }
                            }
                        }}
                    >
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '4px solid white',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {providerProfilePicture ? (
                                <>
                                    <Image 
                                        src={providerProfilePicture} 
                                        alt={`${providerString} Profile`}
                                        width={72}
                                        height={72}
                                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                    {/* Provider Badge in bottom right corner */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: -2,
                                            right: -2,
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '2px solid white',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                            zIndex: 10
                                        }}
                                    >
                                        {provider === 'github' ? (
                                            <Box
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    background: '#333',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <GitHub sx={{ fontSize: 12, color: 'white' }} />
                                            </Box>
                                        ) : provider === 'google' ? (
                                            <Box
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(45deg, #4285f4, #34a853)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Google sx={{ fontSize: 12, color: 'white' }} />
                                            </Box>
                                        ) : (
                                            <ProviderIcon sx={{ fontSize: 12, color: '#666' }} />
                                        )}
                                    </Box>
                                </>
                            ) : (
                                <>
                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                        {(user.name || user.email)?.[0]?.toUpperCase()}
                                    </Typography>
                                    {/* Provider Badge for fallback */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: -2,
                                            right: -2,
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '2px solid white',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                            zIndex: 10
                                        }}
                                    >
                                        <ProviderIcon sx={{ fontSize: 12, color: '#666' }} />
                                    </Box>
                                </>
                            )}
                        </Box>
                    </Box>

                    {/* Animated Connection Lines */}
                    {/* Left to Center Line */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 80,
                            top: '50%',
                            width: 'calc(50% - 130px)',
                            height: 4,
                            transform: 'translateY(-50%)',
                            background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 10px, transparent 10px, transparent 20px)',
                            animation: 'flowLeft 2s linear infinite',
                            '@keyframes flowLeft': {
                                '0%': { backgroundPosition: '0 0' },
                                '100%': { backgroundPosition: '20px 0' }
                            }
                        }}
                    />
                    
                    {/* Center to Right Line */}
                    <Box
                        sx={{
                            position: 'absolute',
                            right: 80,
                            top: '50%',
                            width: 'calc(50% - 130px)',
                            height: 4,
                            transform: 'translateY(-50%)',
                            background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 10px, transparent 10px, transparent 20px)',
                            animation: 'flowRight 2s linear infinite',
                            '@keyframes flowRight': {
                                '0%': { backgroundPosition: '0 0' },
                                '100%': { backgroundPosition: '-20px 0' }
                            }
                        }}
                    />
                </Box>

                {/* Success Content */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold' }}>
                        🎉 Connection Secured!
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                        Welcome, {user.name || user.email}!
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8 }}>
                        Successfully linked with {providerString}
                    </Typography>
                </Box>

                {/* User Details */}
                <Box sx={{ mb: 4, p: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Email:</strong> {user.email}
                    </Typography>
                    {user.name && user.name !== user.email && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Name:</strong> {user.name}
                        </Typography>
                    )}
                    <Typography variant="body2">
                        <strong>Provider:</strong> {providerString}
                    </Typography>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <Box
                            sx={{
                                width: '100%',
                                p: 2,
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: 2,
                                textAlign: 'center',
                                border: '2px solid rgba(255,255,255,0.3)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: 'rgba(255,255,255,0.3)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                                }
                            }}
                        >
                            <Typography variant="button" sx={{ color: 'white', fontWeight: 'bold' }}>
                                🏠 Go to Dashboard
                            </Typography>
                        </Box>
                    </Link>
                    
                    <Link href="/dummy" style={{ textDecoration: 'none' }}>
                        <Box
                            sx={{
                                width: '100%',
                                p: 2,
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 2,
                                textAlign: 'center',
                                border: '2px solid rgba(255,255,255,0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: 'rgba(255,255,255,0.2)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                                }
                            }}
                        >
                            <Typography variant="button" sx={{ color: 'white', fontWeight: 'bold' }}>
                                🔑 Try Passkey Registration
                            </Typography>
                        </Box>
                    </Link>
                </Box>
            </Paper>
        </div>
    );
}