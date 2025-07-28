const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const { 
  addFriend,
  removeFriend,
  getFriendsList,
  getUnifiedContactList
} = require("../controllers/contactController");

// Add friend directly by email (no requests needed)
router.post("/add", authenticateToken, addFriend);

// Remove friend
router.delete("/remove/:friend_user_id", authenticateToken, removeFriend);

// Get user's friends list
router.get("/friends/:user_id?", authenticateToken, getFriendsList);

// Get unified contact list (friends + all group members) - Main contact list
router.get("/all/:user_id?", authenticateToken, getUnifiedContactList);

module.exports = router;