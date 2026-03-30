/**
 * Email Service
 *
 * Unified email delivery with SendGrid and SMTP transports,
 * configurable provider preference, and mock fallback for
 * non-production environments.
 */

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Normalize a value to a trimmed string.
 * @param {*} value
 * @returns {string}
 */
const normalize = (value) => String(value || "").trim();

/**
 * Check if SendGrid credentials are configured.
 * @returns {boolean}
 */
const hasSendGridTransport = () => Boolean(normalize(process.env.SENDGRID_API_KEY));

/**
 * Check if SMTP credentials are configured.
 * @returns {boolean}
 */
const hasSmtpTransport = () => Boolean(normalize(process.env.SMTP_HOST));

/**
 * Check if any email transport is configured.
 * @returns {boolean}
 */
const isEmailTransportConfigured = () => hasSendGridTransport() || hasSmtpTransport();

/**
 * Return the preferred email provider from environment config.
 * @returns {string}
 */
const getProviderPreference = () => normalize(process.env.EMAIL_PROVIDER).toLowerCase();

/* ------------------------------------------------------------------ */
/*  Templates                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build subject, text, and HTML for a password-reset email.
 * @param {object} params
 * @param {string} params.resetLink
 * @param {string} params.otp
 * @param {number} [params.expiresInMinutes=15]
 * @returns {{ subject: string, text: string, html: string }}
 */
const buildPasswordResetTemplate = ({ resetLink, otp, expiresInMinutes }) => {
  const appName = normalize(process.env.APP_NAME) || "MHub";
  const minutes = Number.parseInt(expiresInMinutes, 10) || 15;

  const subject = `${appName} password reset instructions`;

  const text = [
    `We received a password reset request for your ${appName} account.`,
    "",
    `Reset link: ${resetLink}`,
    "",
    `If needed, your reset OTP is: ${otp}`,
    `This expires in ${minutes} minutes.`,
    "",
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="margin-bottom:8px">${appName} Password Reset</h2>
      <p style="margin:0 0 12px">We received a password reset request for your account.</p>
      <p style="margin:0 0 12px">
        <a href="${resetLink}" style="display:inline-block;padding:10px 14px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px">
          Reset Password
        </a>
      </p>
      <p style="margin:0 0 4px">Or use this link:</p>
      <p style="margin:0 0 12px"><a href="${resetLink}">${resetLink}</a></p>
      <p style="margin:0 0 4px">Reset OTP: <strong style="letter-spacing:2px">${otp}</strong></p>
      <p style="margin:0 0 12px">This expires in ${minutes} minutes.</p>
      <p style="margin:0;color:#475569">If you did not request this, you can safely ignore this email.</p>
    </div>
  `.trim();

  return { subject, text, html };
};

/* ------------------------------------------------------------------ */
/*  Transport implementations                                        */
/* ------------------------------------------------------------------ */

/**
 * Send an email via SendGrid.
 * @param {object} params
 * @returns {Promise<{ success: boolean, provider: string, providerMessageId: string|null }>}
 */
const sendViaSendGrid = async ({ to, subject, text, html, from }) => {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const response = await sgMail.send({ to, from, subject, text, html });

  return {
    success: true,
    provider: "sendgrid",
    providerMessageId: response?.[0]?.headers?.["x-message-id"] || null,
  };
};

/**
 * Send an email via SMTP (nodemailer).
 * @param {object} params
 * @returns {Promise<{ success: boolean, provider: string, providerMessageId: string|null }>}
 */
const sendViaSmtp = async ({ to, subject, text, html, from }) => {
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: normalize(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const result = await transporter.sendMail({ from, to, subject, text, html });

  return {
    success: true,
    provider: "smtp",
    providerMessageId: result?.messageId || null,
  };
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Send an email using the configured transport(s).
 * Falls back to mock output in non-production environments.
 * @param {object} params
 * @param {string} params.to - Recipient email address.
 * @param {string} [params.subject]
 * @param {string} [params.text]
 * @param {string} [params.html]
 * @returns {Promise<{ success: boolean, provider: string, providerMessageId: string|null, mock?: boolean }>}
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const recipient = normalize(to);
  if (!recipient) {
    throw new Error("Recipient email is required");
  }

  const finalSubject = normalize(subject) || "MHub Notification";
  const finalText = normalize(text);
  const finalHtml = normalize(html);

  const fromAddress =
    normalize(process.env.EMAIL_FROM) ||
    normalize(process.env.SENDGRID_FROM) ||
    normalize(process.env.SMTP_FROM) ||
    normalize(process.env.SMTP_USER) ||
    "noreply@mhub.app";

  const providerPreference = getProviderPreference();
  const preferSendGrid = providerPreference === "sendgrid";
  const preferSmtp = providerPreference === "smtp";

  const providers = [];
  if (preferSendGrid) {
    if (hasSendGridTransport()) providers.push("sendgrid");
    if (hasSmtpTransport()) providers.push("smtp");
  } else if (preferSmtp) {
    if (hasSmtpTransport()) providers.push("smtp");
    if (hasSendGridTransport()) providers.push("sendgrid");
  } else {
    if (hasSendGridTransport()) providers.push("sendgrid");
    if (hasSmtpTransport()) providers.push("smtp");
  }

  for (const provider of providers) {
    try {
      if (provider === "sendgrid") {
        return await sendViaSendGrid({
          to: recipient,
          subject: finalSubject,
          text: finalText,
          html: finalHtml,
          from: fromAddress,
        });
      }
      if (provider === "smtp") {
        return await sendViaSmtp({
          to: recipient,
          subject: finalSubject,
          text: finalText,
          html: finalHtml,
          from: fromAddress,
        });
      }
    } catch (error) {
      console.error(`[EMAIL] ${provider} delivery failed:`, error.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("No email transport available for production delivery");
  }

  console.log("\n[MOCK EMAIL] ========================================");
  console.log(`[MOCK EMAIL] To: ${recipient}`);
  console.log(`[MOCK EMAIL] Subject: ${finalSubject}`);
  if (finalText) {
    console.log(`[MOCK EMAIL] Text: ${finalText.substring(0, 300)}`);
  }
  console.log("[MOCK EMAIL] ========================================\n");

  return { success: true, provider: "mock", mock: true, providerMessageId: null };
};

/**
 * Send a password-reset email with a reset link and OTP.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.resetLink
 * @param {string} params.otp
 * @param {number} [params.expiresInMinutes=15]
 * @returns {Promise<object>}
 */
const sendPasswordResetEmail = async ({
  email,
  resetLink,
  otp,
  expiresInMinutes = 15,
}) => {
  const template = buildPasswordResetTemplate({ resetLink, otp, expiresInMinutes });
  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
};

/**
 * Send an OTP verification email.
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<object>}
 */
const sendEmailOTP = async (email, otp) =>
  sendEmail({
    to: email,
    subject: "Your MHub verification code",
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  });

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

module.exports = {
  sendEmailOTP,
  sendEmail,
  sendPasswordResetEmail,
  isEmailTransportConfigured,
};
