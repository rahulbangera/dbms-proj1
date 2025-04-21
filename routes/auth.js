const express = require("express")
const router = express.Router()
const User = require("../models/User")

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
    await newUser.save()

    req.flash("success", "Registration successful! Please log in.")
    res.redirect("/login")
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred during registration")
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
