const express = require("express");
const router = express.Router();
const { createUser } = require("../controllers/userController");
const { loginUser } = require("../controllers/userController");
router.post("/", createUser);
router.post("/login", loginUser);
module.exports = router;
