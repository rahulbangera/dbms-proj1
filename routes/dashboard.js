const express = require("express")
const router = express.Router()
const User = require("../models/User")
const Group = require("../models/Group")
const { sendGroupJoinNotification } = require("../utils/emailService")

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  req.flash("error", "You must be logged in to view this page")
  res.redirect("/login")
}

// Dashboard
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).populate("groups")
    res.render("dashboard/index", { user })
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while loading the dashboard")
    res.redirect("/")
  }
})

// Create group form
router.get("/create-group", isLoggedIn, (req, res) => {
  res.render("dashboard/create-group")
})

// Create group logic
router.post("/create-group", isLoggedIn, async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      req.flash("error", "Group name is required")
      return res.redirect("/dashboard/create-group")
    }

    const generateCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const code = generateCode();

    let uniqueCode = false;
    let finalCode;

    while (!uniqueCode) {
      finalCode = generateCode();
      const existingGroup = await Group.findOne({ code: finalCode });
      if (!existingGroup) {
      uniqueCode = true;
      }
    }

    const newGroup = new Group({
      name,
      creator: req.session.user.id,
      members: [req.session.user.id],
      code: finalCode,
    })

    await newGroup.save()

    // Add group to user's groups
    await User.findByIdAndUpdate(req.session.user.id, { $push: { groups: newGroup._id } })

    req.flash("success", "Group created successfully! Your group code is: " + newGroup.code)
    res.redirect("/groups/" + newGroup._id)
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while creating the group")
    res.redirect("/dashboard/create-group")
  }
})

// Join group form
router.get("/join-group", isLoggedIn, (req, res) => {
  res.render("dashboard/join-group")
})

// Join group logic
router.post("/join-group", isLoggedIn, async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      req.flash("error", "Group code is required")
      return res.redirect("/dashboard/join-group")
    }

    // Find group by code
    const group = await Group.findOne({ code: code.toUpperCase() })
    if (!group) {
      req.flash("error", "Group not found with that code")
      return res.redirect("/dashboard/join-group")
    }

    // Check if user is already a member
    if (group.members.includes(req.session.user.id)) {
      req.flash("error", "You are already a member of this group")
      return res.redirect("/groups/" + group._id)
    }

    // Get current user details
    const currentUser = await User.findById(req.session.user.id)

    // Add user to group members
    await Group.findByIdAndUpdate(group._id, { $push: { members: req.session.user.id } })

    // Add group to user's groups
    await User.findByIdAndUpdate(req.session.user.id, { $push: { groups: group._id } })

    // Get all group members except the current user
    const groupMembers = await User.find({
      _id: { $in: group.members, $ne: req.session.user.id },
    })

    // Send email notification to all group members
    if (groupMembers.length > 0) {
      const memberEmails = groupMembers.map((member) => member.email)
      await sendGroupJoinNotification(group.name, currentUser.username, memberEmails)
    }

    req.flash("success", "Successfully joined the group: " + group.name)
    res.redirect("/groups/" + group._id)
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while joining the group")
    res.redirect("/dashboard/join-group")
  }
})

module.exports = router
