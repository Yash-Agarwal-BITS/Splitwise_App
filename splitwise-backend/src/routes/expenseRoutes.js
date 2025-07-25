const express = require("express");
const router = express.Router();
const { 
  createExpense,
  getUserExpenses,
  getGroupExpenses,
  getExpenseDetails,
  calculateUserBalances
} = require("../controllers/expenseController");

// Create a new expense (personal or group)
router.post("/", createExpense);

// Get expenses for a user
// Query params: ?expense_type=personal|group&group_id=uuid
router.get("/user/:user_id?", getUserExpenses);

// Get expenses for a specific group
router.get("/group/:group_id", getGroupExpenses);

// Get expense details by ID
router.get("/:expense_id", getExpenseDetails);

// Calculate balances for a user
// Query params: ?balance_type=personal|group&group_id=uuid
router.get("/balances/:user_id?", calculateUserBalances);

module.exports = router;
