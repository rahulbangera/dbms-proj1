const express = require("express")
const router = express.Router()
const Group = require("../models/Group")
const User = require("../models/User")
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
    const group = await Group.findById(req.params.id)

    if (!group) {
      req.flash("error", "Group not found")
      return res.redirect("/dashboard")
    }

    if (!group.members.includes(req.session.user.id)) {
      req.flash("error", "You are not a member of this group")
      return res.redirect("/dashboard")
    }

    next()
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred")
    res.redirect("/dashboard")
  }
}

// Group details
router.get("/:id", isLoggedIn, isGroupMember, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "username email")
      .populate({
        path: "expenses",
        populate: {
          path: "paidBy",
          select: "username",
        },
      })

    // Calculate balances
    const balances = calculateBalances(group, req.session.user.id)

    res.render("groups/show", { group, balances })
  } catch (error) {
    console.error(error)
    req.flash("error", "An error occurred while loading the group")
    res.redirect("/dashboard")
  }
})

// Calculate balances for the group
function calculateBalances(group, currentUserId) {
  const members = group.members
  const expenses = group.expenses

  // Initialize balances for each member
  const balances = {}
  members.forEach((member) => {
    balances[member._id.toString()] = {
      user: member,
      balance: 0, // Positive means they are owed money, negative means they owe money
    }
  })

  // Calculate balances based on expenses
  expenses.forEach((expense) => {
    const paidById = expense.paidBy._id.toString()
    const splitAmount = expense.amount / expense.splitAmong.length

    // Add the full amount to the person who paid
    balances[paidById].balance += expense.amount

    // Subtract the split amount from each person who owes
    expense.splitAmong.forEach((userId) => {
      const id = userId.toString()
      balances[id].balance -= splitAmount
    })
  })

  // Calculate what the current user owes to or is owed by each other member
  const currentUserBalance = balances[currentUserId].balance
  const owes = []
  const isOwed = []

  Object.keys(balances).forEach((memberId) => {
    if (memberId === currentUserId) return

    const memberBalance = balances[memberId].balance
    const member = balances[memberId].user

    if (currentUserBalance < 0 && memberBalance > 0) {
      // Current user owes money to this member
      const amount = Math.min(Math.abs(currentUserBalance), memberBalance)
      if (amount > 0) {
        owes.push({
          user: member,
          amount: amount.toFixed(2),
        })
      }
    } else if (currentUserBalance > 0 && memberBalance < 0) {
      // This member owes money to the current user
      const amount = Math.min(currentUserBalance, Math.abs(memberBalance))
      if (amount > 0) {
        isOwed.push({
          user: member,
          amount: amount.toFixed(2),
        })
      }
    }
  })

  return { owes, isOwed }
}

module.exports = router
