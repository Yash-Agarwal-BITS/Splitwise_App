const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const {
  createExpense,
  getUserExpenses,
  getGroupExpenses,
  getFriendExpenses,
  getExpenseDetails,
  calculateUserBalances,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

// Protect all expense routes
router.use(authenticateToken);

// Create a new expense (personal or group)
router.post("/", createExpense);

// Get expenses for the authenticated user
router.get("/all", getUserExpenses);

// Calculate balances for the authenticated user
router.get("/balances", calculateUserBalances);

// Get expenses for a specific group
router.get("/group/:group_id", getGroupExpenses);

// Get expenses between friends
router.get("/friend/:friend_id", getFriendExpenses);

// Get expense details by ID
router.get("/:expense_id", getExpenseDetails);

// Update an expense
router.put("/:expense_id", updateExpense);

// Delete an expense
router.delete("/:expense_id", deleteExpense);

module.exports = router;
