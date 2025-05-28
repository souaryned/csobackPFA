import nodemailer from "nodemailer";

export const sendNotification = async ({
  email,
  subject,
  htmlContent,
  attachments,
}) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: "587",
      auth: {
        user: "azizhasnaoui000@gmail.com",
        pass: "etpdmcjoxdecskrf",
      }
      ,
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: "azizhasnaoui000@gmail.com",
      to: email,
      subject: subject,
      html: htmlContent,
      attachments: attachments || [],
    };

    await transporter.sendMail(mailOptions);

    // console.log(`Notification sent to ${email}`);
  } catch (error) {
    console.error(`Error sending notification to ${email}:`, error);
  }
};
