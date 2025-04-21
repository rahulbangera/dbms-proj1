const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationOTP: {
    type: String,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  groups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Method to generate OTP
userSchema.methods.generateOTP = function () {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  this.verificationOTP = otp
  // OTP expires in 10 minutes
  this.otpExpires = Date.now() + 10 * 60 * 1000
  return otp
}

// Method to verify OTP
userSchema.methods.verifyOTP = function (otp) {
  if (this.verificationOTP === otp && this.otpExpires > Date.now()) {
    this.isVerified = true
    this.verificationOTP = null
    this.otpExpires = null
    return true
  }
  return false
}

module.exports = mongoose.model("User", userSchema)
