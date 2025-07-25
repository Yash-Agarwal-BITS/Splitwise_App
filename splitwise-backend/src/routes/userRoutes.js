const express = require("express");
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getAllUsers 
} = require("../controllers/userController");

// User registration
router.post("/register", registerUser);

// User login
router.post("/login", loginUser);

// Get all users
router.get("/", getAllUsers);

module.exports = router;
