const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

// User registration
router.post("/register", registerUser);

// User login
router.post("/login", loginUser);

// Get all users
router.get("/", getAllUsers);

// Get a specific user by ID
router.get("/:user_id", getUserById);

// Update user info
router.put("/:user_id", updateUser);

// Delete user
router.delete("/:user_id", deleteUser);

module.exports = router;
