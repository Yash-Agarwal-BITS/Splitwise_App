const express = require("express");
const router = express.Router();
const { 
  createGroup, 
  addUserToGroup, 
  getGroupDetails,
  getUserGroups,
  removeUserFromGroup
} = require("../controllers/groupController");

// Create a new group
router.post("/", createGroup);

// Get all groups for a user
router.get("/user/:user_id?", getUserGroups);

// Add user to group
router.post("/:group_id/members", addUserToGroup);

// Remove user from group
router.delete("/:group_id/members/:user_id", removeUserFromGroup);

// Get group details with members
router.get("/:group_id", getGroupDetails);

module.exports = router;
