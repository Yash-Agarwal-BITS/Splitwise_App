const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const {
  createGroup,
  addUserToGroup,
  getGroupDetails,
  getUserGroups,
  removeUserFromGroup,
  updateGroup,
  deleteGroup,
} = require("../controllers/groupController");

// Protect all group routes
router.use(authenticateToken);

// Create a new group
router.post("/", createGroup);

// Get all groups for a user
router.get("/user/:user_id", getUserGroups);

// Get group details with members (move this before specific group operations)
router.get("/:group_id", getGroupDetails);

// Add user to group
router.post("/:group_id/members", addUserToGroup);

// Remove user from group
router.delete("/:group_id/members/:user_id", removeUserFromGroup);

// Update group details
router.put("/:group_id", updateGroup);

// Delete group entirely
router.delete("/:group_id", deleteGroup);

module.exports = router;
