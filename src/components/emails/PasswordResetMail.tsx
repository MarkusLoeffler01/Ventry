interface PasswordResetMailProps {
    resetUrl: string;
    userName?: string;
    expiryHours?: number;
}

// Email template styles - defined outside component for better organization
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
    alternativeLink: {
        fontSize: '14px',
        color: '#666666',
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        wordBreak: 'break-all' as const,
    },
    link: {
        color: '#1976d2',
        textDecoration: 'none',
    },
    warningBox: {
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '32px',
    },
    warningText: {
        fontSize: '14px',
        color: '#856404',
        margin: '0',
        lineHeight: '1.5',
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
    divider: {
        height: '1px',
        backgroundColor: '#e0e0e0',
        margin: '32px 0',
        border: 'none',
    },
};

export default function PasswordResetMail({ 
    resetUrl, 
    userName, 
    expiryHours = 1 
}: PasswordResetMailProps) {

    return (
        <div style={emailStyles.container}>
            {/* Header */}
            <div style={emailStyles.header}>
                <div style={emailStyles.logo}>🔐 Ventry</div>
            </div>

            {/* Main Content */}
            <h1 style={emailStyles.title}>Reset Your Password</h1>
            
            <p style={emailStyles.text}>
                {userName ? `Hi ${userName},` : 'Hello,'}
            </p>

            <p style={emailStyles.text}>
                We received a request to reset your password for your Ventry account. 
                Click the button below to create a new password.
            </p>

            {/* CTA Button */}
            <div style={emailStyles.buttonContainer}>
                <a href={resetUrl} style={emailStyles.button}>
                    Reset Password
                </a>
            </div>

            <p style={emailStyles.text}>
                This link will expire in <strong>{expiryHours} {expiryHours === 1 ? 'hour' : 'hours'}</strong> for security reasons.
            </p>

            <hr style={emailStyles.divider} />

            {/* Alternative Link */}
            <p style={{ ...emailStyles.text, fontSize: '14px', marginBottom: '12px' }}>
                If the button above doesn&apos;t work, copy and paste this link into your browser:
            </p>
            <div style={emailStyles.alternativeLink}>
                <a href={resetUrl} style={emailStyles.link}>
                    {resetUrl}
                </a>
            </div>

            {/* Warning Box */}
            <div style={emailStyles.warningBox}>
                <p style={emailStyles.warningText}>
                    <strong>⚠️ Security Notice:</strong><br />
                    If you didn&apos;t request a password reset, you can safely ignore this email. 
                    Your password will remain unchanged.
                </p>
            </div>

            {/* Footer */}
            <div style={emailStyles.footer}>
                <p style={emailStyles.footerText}>
                    This is an automated message, please do not reply to this email.
                </p>
                <p style={emailStyles.footerText}>
                    © {new Date().getFullYear()} Ventry. All rights reserved.
                </p>
            </div>
        </div>
    );
}

export { PasswordResetMail }