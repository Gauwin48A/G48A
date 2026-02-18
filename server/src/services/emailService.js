// MOCK EMAIL SERVICE
// In a real app, use Nodemailer/SendGrid here.

/**
 * Email Service
 * Currently in MOCK mode — logs to console
 * Ready for Twilio SendGrid / AWS SES / Nodemailer swap
 */

// Provider configuration (swap this for production)
const PROVIDER = process.env.EMAIL_PROVIDER || 'mock'; // 'mock', 'sendgrid', 'ses'

exports.sendEmailOTP = async (email, otp) => {
    console.log(`\n[MOCK EMAIL] ========================================`);
    console.log(`[MOCK EMAIL] To: ${email}`);
    console.log(`[MOCK EMAIL] Subject: Your MHub Verification Code`);
    console.log(`[MOCK EMAIL] OTP: ${otp}`);
    console.log(`[MOCK EMAIL] Provider: ${PROVIDER}`);
    console.log(`[MOCK EMAIL] ========================================\n`);

    // FUTURE: Replace with actual provider calls
    // if (PROVIDER === 'sendgrid') {
    //   const sgMail = require('@sendgrid/mail');
    //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    //   return sgMail.send({ to: email, from: 'noreply@mhub.app', subject: 'Your MHub Code', text: `Your code: ${otp}` });
    // }

    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
};

exports.sendEmail = async (to, subject, body) => {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${body.substring(0, 100)}...`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
};
