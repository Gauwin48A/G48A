const normalize = (value) => String(value || '').trim();

const hasSendGridTransport = () => Boolean(normalize(process.env.SENDGRID_API_KEY));
const hasSmtpTransport = () => Boolean(normalize(process.env.SMTP_HOST));

const isEmailTransportConfigured = () => hasSendGridTransport() || hasSmtpTransport();

const getProviderPreference = () => normalize(process.env.EMAIL_PROVIDER).toLowerCase();

const buildPasswordResetTemplate = ({ resetLink, otp, expiresInMinutes }) => {
    const appName = normalize(process.env.APP_NAME) || 'MHub';
    const minutes = Number.parseInt(expiresInMinutes, 10) || 15;
    const subject = `${appName} password reset instructions`;
    const text = [
        `We received a password reset request for your ${appName} account.`,
        '',
        `Reset link: ${resetLink}`,
        '',
        `If needed, your reset OTP is: ${otp}`,
        `This expires in ${minutes} minutes.`,
        '',
        'If you did not request this, you can safely ignore this email.'
    ].join('\n');

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

const sendViaSendGrid = async ({ to, subject, text, html, from }) => {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const response = await sgMail.send({
        to,
        from,
        subject,
        text,
        html
    });

    return {
        success: true,
        provider: 'sendgrid',
        providerMessageId: response?.[0]?.headers?.['x-message-id'] || null
    };
};

const sendViaSmtp = async ({ to, subject, text, html, from }) => {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
        secure: normalize(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const result = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
    });

    return {
        success: true,
        provider: 'smtp',
        providerMessageId: result?.messageId || null
    };
};

const sendEmail = async ({ to, subject, text, html }) => {
    const recipient = normalize(to);
    if (!recipient) {
        throw new Error('Recipient email is required');
    }

    const finalSubject = normalize(subject) || 'MHub Notification';
    const finalText = normalize(text);
    const finalHtml = normalize(html);
    const fromAddress =
        normalize(process.env.EMAIL_FROM)
        || normalize(process.env.SENDGRID_FROM)
        || normalize(process.env.SMTP_FROM)
        || normalize(process.env.SMTP_USER)
        || 'noreply@mhub.app';

    const providerPreference = getProviderPreference();
    const preferSendGrid = providerPreference === 'sendgrid';
    const preferSmtp = providerPreference === 'smtp';

    const providers = [];
    if (preferSendGrid) {
        if (hasSendGridTransport()) providers.push('sendgrid');
        if (hasSmtpTransport()) providers.push('smtp');
    } else if (preferSmtp) {
        if (hasSmtpTransport()) providers.push('smtp');
        if (hasSendGridTransport()) providers.push('sendgrid');
    } else {
        if (hasSendGridTransport()) providers.push('sendgrid');
        if (hasSmtpTransport()) providers.push('smtp');
    }

    for (const provider of providers) {
        try {
            if (provider === 'sendgrid') {
                return await sendViaSendGrid({
                    to: recipient,
                    subject: finalSubject,
                    text: finalText,
                    html: finalHtml,
                    from: fromAddress
                });
            }
            if (provider === 'smtp') {
                return await sendViaSmtp({
                    to: recipient,
                    subject: finalSubject,
                    text: finalText,
                    html: finalHtml,
                    from: fromAddress
                });
            }
        } catch (error) {
            console.error(`[EMAIL] ${provider} delivery failed:`, error.message);
        }
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('No email transport available for production delivery');
    }

    // Mock fallback for local/dev usage.
    console.log('\n[MOCK EMAIL] ========================================');
    console.log(`[MOCK EMAIL] To: ${recipient}`);
    console.log(`[MOCK EMAIL] Subject: ${finalSubject}`);
    if (finalText) {
        console.log(`[MOCK EMAIL] Text: ${finalText.substring(0, 300)}`);
    }
    console.log('[MOCK EMAIL] ========================================\n');

    return {
        success: true,
        provider: 'mock',
        mock: true,
        providerMessageId: null
    };
};

const sendPasswordResetEmail = async ({ email, resetLink, otp, expiresInMinutes = 15 }) => {
    const template = buildPasswordResetTemplate({
        resetLink,
        otp,
        expiresInMinutes
    });

    return sendEmail({
        to: email,
        subject: template.subject,
        text: template.text,
        html: template.html
    });
};

const sendEmailOTP = async (email, otp) => {
    return sendEmail({
        to: email,
        subject: 'Your MHub verification code',
        text: `Your verification code is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`
    });
};

module.exports = {
    sendEmailOTP,
    sendEmail,
    sendPasswordResetEmail,
    isEmailTransportConfigured
};
