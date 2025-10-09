import nodemailer from "nodemailer";


export const mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Just until Let's Encrypt distributes their fucking root cert widely enough
    }
});


export async function sendMail(to: string, subject: string, html: string) {
    const x = await mailTransport.sendMail({
        from: "Ventry-noreply <ventry@m-loeffler.de>",
        to,
        subject,
        html
    });

    if (x.messageId) {
        console.log(`Email sent to ${to}: ${x.messageId}`);
    }

    x.rejected.forEach(r => {
        console.error(`Email to "${r}" was rejected!`);
    });

    const error = x.rejected.length > 0 ? x.rejected[0] : null;
    return { success: x.rejected.length === 0, error };
}