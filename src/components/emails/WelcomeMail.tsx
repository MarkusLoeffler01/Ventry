interface WelcomeMailProps {
    userName: string;
    loginUrl: string;
}

const emailStyles = {
    container: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px',
        backgroundColor: '#ffffff',
    },
    header: {
        textAlign: 'center' as const,
        marginBottom: '40px',
    },
    logo: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1976d2',
        marginBottom: '8px',
    },
    title: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: '16px',
        marginTop: '0',
    },
    text: {
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#4a4a4a',
        marginBottom: '24px',
    },
    buttonContainer: {
        textAlign: 'center' as const,
        margin: '32px 0',
    },
    button: {
        backgroundColor: '#1976d2',
        color: '#ffffff',
        padding: '14px 32px',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        display: 'inline-block',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    footer: {
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center' as const,
    },
    footerText: {
        fontSize: '14px',
        color: '#999999',
        margin: '8px 0',
    },
};

export default function WelcomeMail({ userName, loginUrl }: WelcomeMailProps) {
    return (
        <div style={emailStyles.container}>
            {/* Header */}
            <div style={emailStyles.header}>
                <div style={emailStyles.logo}>🎉 Ventry</div>
            </div>

            {/* Main Content */}
            <h1 style={emailStyles.title}>Welcome to Ventry!</h1>
            
            <p style={emailStyles.text}>
                Hi {userName},
            </p>

            <p style={emailStyles.text}>
                Welcome to Ventry! Your registration was successful and your account is now ready to use.
            </p>

            <p style={emailStyles.text}>
                You can now log in and start exploring all the features we have to offer.
            </p>

            {/* CTA Button */}
            <div style={emailStyles.buttonContainer}>
                <a href={loginUrl} style={emailStyles.button}>
                    Get Started
                </a>
            </div>

            {/* Footer */}
            <div style={emailStyles.footer}>
                <p style={emailStyles.footerText}>
                    Best regards,<br />
                    Your Ventry Team
                </p>
                <p style={emailStyles.footerText}>
                    © {new Date().getFullYear()} Ventry. All rights reserved.
                </p>
            </div>
        </div>
    );
}

export { WelcomeMail };
export type { WelcomeMailProps };