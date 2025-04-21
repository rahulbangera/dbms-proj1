const express = require("express")
const router = express.Router()
const Group = require("../models/Group")
const Expense = require("../models/Expense")

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  req.flash("error", "You must be logged in to view this page")
  res.redirect("/login")
}

// Middleware to check if user is a member of the group
const isGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.body.groupId
    const group = await Group.findById(groupId)

    if (!group) {
      req.flash("error", "Group not found")
      return res.redirect("/dashboard")
    }

    if (!group.members.includes(req.session.user.id)) {
      req.flash("error", "You are not a member of this group")
      return res.redirect("/dashboard")
    }

    req.group = group
    next()
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred")
    res.redirect("/dashboard")
  }
}

// Add expense form
router.get("/new/:groupId", isLoggedIn, isGroupMember, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate("members", "username")

    res.render("expenses/new", { group })
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while loading the form")
    res.redirect("/groups/" + req.params.groupId)
  }
})

// Add expense logic
router.post("/", isLoggedIn, isGroupMember, async (req, res) => {
  try {
    const { description, amount, date, groupId, splitAmong } = req.body

    // Validate input
    if (!description || !amount || !date) {
      req.flash("error", "All fields are required")
      return res.redirect("/expenses/new/" + groupId)
    }

    // Create array of members to split among
    let membersToSplit = []
    if (Array.isArray(splitAmong)) {
      membersToSplit = splitAmong
    } else if (splitAmong) {
      membersToSplit = [splitAmong]
    }

    // If no members selected, split among all group members
    if (membersToSplit.length === 0) {
      membersToSplit = req.group.members.map((member) => member.toString())
    }

    // Create new expense
    const newExpense = new Expense({
      description,
      amount: Number.parseFloat(amount),
      date,
      paidBy: req.session.user.id,
      group: groupId,
      splitAmong: membersToSplit,
    })

    await newExpense.save()

    // Add expense to group
    await Group.findByIdAndUpdate(groupId, { $push: { expenses: newExpense._id } })

    req.flash("success", "Expense added successfully")
    res.redirect("/groups/" + groupId)
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while adding the expense")
    res.redirect("/groups/" + req.body.groupId)
  }
})

// Delete expense
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)

    if (!expense) {
      req.flash("error", "Expense not found")
      return res.redirect("/dashboard")
    }

    // Check if user is the one who paid the expense
    if (expense.paidBy.toString() !== req.session.user.id) {
      req.flash("error", "You can only delete expenses you added")
      return res.redirect("/groups/" + expense.group)
    }

    // Remove expense from group
    await Group.findByIdAndUpdate(expense.group, { $pull: { expenses: expense._id } })

    // Delete expense
    await Expense.findByIdAndDelete(req.params.id)

    req.flash("success", "Expense deleted successfully")
    res.redirect("/groups/" + expense.group)
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while deleting the expense")
    res.redirect("/dashboard")
  }
})

module.exports = router
