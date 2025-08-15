import nodemailer from "nodemailer";
import { SMTP_CONFIG } from "../../config.js";

export const sendNotification = async ({ email, subject, htmlContent, attachments }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: false, // false for STARTTLS
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass,
      },
      tls: { rejectUnauthorized: false }, // optional
    });

    const mailOptions = {
      from: SMTP_CONFIG.user,
      to: email,
      subject,
      html: htmlContent,
      attachments: attachments || [],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification sent to ${email}`);
  } catch (error) {
    console.error(`Error sending notification to ${email}:`, error);
  }
};
