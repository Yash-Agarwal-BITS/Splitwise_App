const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const { 
  addFriend,
  removeFriend,
  getFriends,
  searchUsers,
  getFriendDetails
} = require("../controllers/contactController");

// Protect all contact routes
router.use(authenticateToken);

// Add friend directly by email (no requests needed)
router.post("/add", addFriend);

// Remove friend
router.delete("/remove/:friend_user_id", removeFriend);

// Get user's friends list
router.get("/friends", getFriends);

// Search for users to add as friends
router.get("/search", searchUsers);

// Get friend details
router.get("/friend/:friend_user_id", getFriendDetails);

module.exports = router;