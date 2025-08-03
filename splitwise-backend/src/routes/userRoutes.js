const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMyProfile,
} = require("../controllers/userController");

// User registration
router.post("/register", registerUser);

// User login
router.post("/login", loginUser);

// Protect all routes below this line
router.use(authenticateToken);

// Get current user's profile
router.get("/me", getMyProfile);

// Get all users
router.get("/", getAllUsers);

// Get a specific user by ID
router.get("/:user_id", getUserById);

// Update user info
router.put("/:user_id", updateUser);

// Delete user
router.delete("/:user_id", deleteUser);

module.exports = router;
