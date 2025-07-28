const express = require("express");
const router = express.Router();
const { 
  addFriend,
  removeFriend,
  getFriendsList,
  getUnifiedContactList
} = require("../controllers/contactController");

// Add friend directly by email (no requests needed)
router.post("/add", addFriend);

// Remove friend
router.delete("/remove/:friend_user_id", removeFriend);

// Get user's friends list
router.get("/friends/:user_id?", getFriendsList);

// Get unified contact list (friends + all group members) - Main contact list
router.get("/all/:user_id?", getUnifiedContactList);

module.exports = router;
