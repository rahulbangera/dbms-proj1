const express = require("express")
const router = express.Router()
const User = require("../models/User")
const { sendVerificationEmail } = require("../utils/emailService")

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  req.flash("error", "You must be logged in to view this page")
  res.redirect("/login")
}

// Middleware to check if user is logged out
const isLoggedOut = (req, res, next) => {
  if (!req.session.user) {
    return next()
  }
  res.redirect("/dashboard")
}

// Register form
router.get("/register", isLoggedOut, (req, res) => {
  res.render("auth/register")
})

// Register logic
router.post("/register", isLoggedOut, async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body

    // Validate input
    if (!username || !email || !password) {
      req.flash("error", "All fields are required")
      return res.redirect("/register")
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match")
      return res.redirect("/register")
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      req.flash("error", "User with that email or username already exists")
      return res.redirect("/register")
    }

    // Create new user
    const newUser = new User({ username, email, password })

    // Generate OTP
    const otp = newUser.generateOTP()
    await newUser.save()

    // Send verification email
    await sendVerificationEmail(email, otp)

    req.flash("success", "Registration successful! Please check your email for verification OTP.")
    res.redirect("/verify-email?email=" + encodeURIComponent(email))
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred during registration")
    res.redirect("/register")
  }
})

// Email verification form
router.get("/verify-email", isLoggedOut, (req, res) => {
  const email = req.query.email || ""
  res.render("auth/verify-email", { email })
})

// Email verification logic
router.post("/verify-email", isLoggedOut, async (req, res) => {
  try {
    const { email, otp } = req.body

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error", "User not found")
      return res.redirect("/register")
    }

    // Verify OTP
    if (user.verifyOTP(otp)) {
      await user.save()
      req.flash("success", "Email verified successfully! Please log in.")
      return res.redirect("/login")
    } else {
      req.flash("error", "Invalid or expired OTP")
      return res.redirect("/verify-email?email=" + encodeURIComponent(email))
    }
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred during verification")
    res.redirect("/register")
  }
})

// Resend OTP
router.post("/resend-otp", isLoggedOut, async (req, res) => {
  try {
    const { email } = req.body

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error", "User not found")
      return res.redirect("/register")
    }

    // Generate new OTP
    const otp = user.generateOTP()
    await user.save()

    // Send verification email
    await sendVerificationEmail(email, otp)

    req.flash("success", "New OTP sent to your email")
    res.redirect("/verify-email?email=" + encodeURIComponent(email))
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while resending OTP")
    res.redirect("/register")
  }
})

// Login form
router.get("/login", isLoggedOut, (req, res) => {
  res.render("auth/login")
})

// Login logic
router.post("/login", isLoggedOut, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error", "Invalid email or password")
      return res.redirect("/login")
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Generate new OTP for unverified user
      const otp = user.generateOTP()
      await user.save()

      // Send verification email
      await sendVerificationEmail(email, otp)

      req.flash("error", "Please verify your email first. A new OTP has been sent to your email.")
      return res.redirect("/verify-email?email=" + encodeURIComponent(email))
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      req.flash("error", "Invalid email or password")
      return res.redirect("/login")
    }

    // Set user session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
    }

    req.flash("success", "Welcome back, " + user.username + "!")
    res.redirect("/dashboard")
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred during login")
    res.redirect("/login")
  }
})

// Logout
router.get("/logout", isLoggedIn, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err)
    }
    res.redirect("/login")
  })
})

module.exports = router
