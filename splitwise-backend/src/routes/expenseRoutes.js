const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const {
  createExpense,
  getUserExpenses,
  getGroupExpenses,
  getExpenseDetails,
  calculateUserBalances,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

// Protect all expense routes
router.use(authenticateToken);

// Create a new expense (personal or group)
router.post("/", createExpense);

// Get expenses for a user
// Query params: ?expense_type=personal|group&group_id=uuid
router.get("/user/:user_id", getUserExpenses);

// Get expenses for a specific group
router.get("/group/:group_id", getGroupExpenses);

// Get expense details by ID
router.get("/:expense_id", getExpenseDetails);

// Update an expense
router.put("/:expense_id", updateExpense);

// Delete an expense
router.delete("/:expense_id", deleteExpense);

// Calculate balances for a user
// Query params: ?balance_type=personal|group&group_id=uuid
router.get("/balances/:user_id", calculateUserBalances);

module.exports = router;
