import nodemailer from "nodemailer";
import { SMTP_CONFIG, BREVO_API_KEY } from "../../config.js";


export const sendNotification = async ({ email, subject, htmlContent, attachments }) => {
  try {
    const transporter = nodemailer.createTransport({ 
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: false,
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass,
      },
    });

    const mailOptions = {
      from: '"Plateforme CSO" <csoplateform@gmail.com>',
      to: email,
      subject,
      html: htmlContent,
      attachments: attachments || [],
    };

    await transporter.sendMail(mailOptions);
    // console.log(`✅ SMTP email sent to ${email}`);
  } catch (error) {
    console.error(`❌ SMTP Error for ${email}:`, error);
    throw error;
  }
};


export const sendNotificationAPI = async ({ email, subject, htmlContent, attachments = [] }) => {
  try {
    const emailData = {
      sender: { name: "Plateforme CSO", email: "csoplateform@gmail.com" },
      to: [{ email }],
      subject,
      htmlContent
    };

    // Only add attachment field if there are actual attachments
    if (attachments && attachments.length > 0) {
      emailData.attachment = attachments.map(att => ({
        name: att.filename || att.name,
        content: att.content
      }));
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        // Keep default error message
      }
      
      throw new Error(`API request failed: ${errorMessage}`);
    }

    const result = await response.json();
    // console.log(`✅ API email sent to ${email}`);
    return { success: true, messageId: result.messageId, method: 'API' };
  } catch (error) {
    console.error(`❌ API Error for ${email}:`, error);
    throw error;
  }
};