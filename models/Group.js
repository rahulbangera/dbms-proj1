const mongoose = require("mongoose")
const crypto = require("crypto")

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    unique: true,
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  expenses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Generate a unique group code before saving
groupSchema.pre("save", function (next) {
  if (this.isNew) {
    // Generate a 6-character alphanumeric code
    this.code = crypto.randomBytes(3).toString("hex").toUpperCase()
  }
  next()
})

module.exports = mongoose.model("Group", groupSchema)
