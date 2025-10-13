import nodemailer from "nodemailer";

export const mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
    }
});


export async function sendMail(to: string, subject: string, html: string) {
    const sentMail = await mailTransport.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html
    });

    if(sentMail.messageId) console.log(`Mail sent to ${to}: ${sentMail.messageId}`);

    sentMail.rejected.forEach(r => {
        console.error(`Mail to ${r} was rejected`);
    });

    const error = sentMail.rejected.find(r => r === to);
    return { success: !error, error };
}