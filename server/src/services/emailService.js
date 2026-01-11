// MOCK EMAIL SERVICE
// In a real app, use Nodemailer/SendGrid here.

exports.sendEmailOTP = async (email, otp) => {
    console.log(`\n[EMAIL SERVICE] 📧 Sending OTP to ${email}: ${otp}\n`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
};
