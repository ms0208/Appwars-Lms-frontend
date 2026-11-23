import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, "").trim();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",

  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export const verifySMTP = async () => {
  try {
    await transporter.verify();
    console.log("Gmail SMTP connection successful!");
    return true;
  } catch (error) {
    console.error("Gmail SMTP authentication failed:", error.message);
    return false;
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP_USER or SMTP_PASS is missing in .env");
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || smtpUser,
    to,
    subject,
    text,
    html,
  });
};

export default sendEmail;