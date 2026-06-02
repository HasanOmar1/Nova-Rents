
const nodemailer = require("nodemailer");
const generateOTP = require("../utils/generateOTP");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (email, otp) => {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verification Code",
    html: `<h1>${otp}</h1>`,
  });
};

const handleEmailVerification = async (email) => {
  const otp = generateOTP();
  await sendOTPEmail(email, otp);

  return otp;
};

module.exports = { sendOTPEmail, handleEmailVerification };