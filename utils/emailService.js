const nodemailer = require("nodemailer")

// Create a transporter object
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services or SMTP settings
  auth: {
    user: "instabiller@gmail.com",
    pass: "qyjyukvtsshdsbgm",
  },
})

// Function to send verification email with OTP
const sendVerificationEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: email,
      subject: "EasySplit - Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Welcome to EasySplit!</h2>
          <p>Thank you for registering. To complete your registration, please verify your email address using the OTP below:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 24px; letter-spacing: 5px;">${otp}</h3>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p>Best regards,<br>The EasySplit Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Verification email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending verification email:", error)
    return false
  }
}

// Function to send notification when a user joins a group
const sendGroupJoinNotification = async (groupName, newMemberName, memberEmails) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: memberEmails,
      subject: `EasySplit - New Member in ${groupName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5;">New Member Alert!</h2>
          <p><strong>${newMemberName}</strong> has joined your group <strong>${groupName}</strong> on EasySplit.</p>
          <p>Log in to EasySplit to see updated expense calculations and manage your group expenses.</p>
          <div style="margin: 20px 0;">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/login" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Log in to EasySplit</a>
          </div>
          <p>Best regards,<br>The EasySplit Team</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Group join notification sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending group join notification:", error)
    return false
  }
}

module.exports = {
  sendVerificationEmail,
  sendGroupJoinNotification,
}
