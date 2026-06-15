interface RegistrationUpdateMailProps {
    userName: string;
    eventName: string;
    status: string;
    adminNotes?: string | null;
    eventUrl: string;
    changes?: Array<{ label: string; old: string; new: string }>;
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
    changeList: {
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #eeeeee',
    },
    changeItem: {
        marginBottom: '12px',
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '8px',
    },
    oldValue: {
        color: '#d32f2f',
        textDecoration: 'line-through',
        marginRight: '8px',
    },
    newValue: {
        color: '#2e7d32',
        fontWeight: 'bold' as const,
    },
    statusBox: {
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #e0e0e0',
    },
    statusLabel: {
        fontSize: '14px',
        color: '#666666',
        textTransform: 'uppercase' as const,
        fontWeight: 'bold' as const,
        marginBottom: '4px',
    },
    statusValue: {
        fontSize: '18px',
        color: '#1976d2',
        fontWeight: 'bold' as const,
    },
    notesBox: {
        borderLeft: '4px solid #1976d2',
        padding: '12px 20px',
        backgroundColor: '#f0f7ff',
        marginBottom: '24px',
        fontStyle: 'italic',
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

export default function RegistrationUpdateMail({ 
    userName, 
    eventName, 
    status, 
    adminNotes, 
    eventUrl,
    changes
}: RegistrationUpdateMailProps) {
    return (
        <div style={emailStyles.container}>
            {/* Header */}
            <div style={emailStyles.header}>
                <div style={emailStyles.logo}>Ventry</div>
            </div>

            {/* Main Content */}
            <h1 style={emailStyles.title}>Registration Updated</h1>
            
            <p style={emailStyles.text}>
                Hi {userName},
            </p>

            <p style={emailStyles.text}>
                Your registration for <strong>{eventName}</strong> has been updated by the organizing team.
            </p>

            {/* Diff Section */}
            {changes && changes.length > 0 && (
                <div style={emailStyles.changeList}>
                    <p style={{ ...emailStyles.text, fontWeight: 'bold', marginBottom: '16px' }}>What changed:</p>
                    {changes.map((change) => (
                        <div key={`${change.label}:${change.old}:${change.new}`} style={emailStyles.changeItem}>
                            <div style={{ fontSize: '14px', color: '#666666', marginBottom: '4px' }}>{change.label}</div>
                            <div>
                                <span style={emailStyles.oldValue}>{change.old}</span>
                                <span style={{ marginRight: '8px' }}>→</span>
                                <span style={emailStyles.newValue}>{change.new}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Status Highlight */}
            {!changes && (
                <div style={emailStyles.statusBox}>
                    <div style={emailStyles.statusLabel}>Current Status</div>
                    <div style={emailStyles.statusValue}>{status}</div>
                </div>
            )}

            {/* Admin Notes */}
            {adminNotes && (
                <div>
                    <p style={emailStyles.text}>Message from the organizer:</p>
                    <div style={emailStyles.notesBox}>
                        &quot;{adminNotes}&quot;
                    </div>
                </div>
            )}

            <p style={emailStyles.text}>
                You can view the full details of your registration and any outstanding actions on the event page.
            </p>

            {/* CTA Button */}
            <div style={emailStyles.buttonContainer}>
                <a href={eventUrl} style={emailStyles.button}>
                    View Registration
                </a>
            </div>

            {/* Footer */}
            <div style={emailStyles.footer}>
                <p style={emailStyles.footerText}>
                    Best regards,<br />
                    Your {eventName} Team
                </p>
                <p style={emailStyles.footerText}>
                    © {new Date().getFullYear()} Ventry. All rights reserved.
                </p>
            </div>
        </div>
    );
}

export { RegistrationUpdateMail };
export type { RegistrationUpdateMailProps };
