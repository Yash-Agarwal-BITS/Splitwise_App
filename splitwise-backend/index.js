const express = require("express");
const app = express();
require("dotenv").config();

app.use(express.json());
app.use(require("cors")());

// Routes
const userRoutes = require("./src/routes/userRoutes");
const groupRoutes = require("./src/routes/groupRoutes");
const expenseRoutes = require("./src/routes/expenseRoutes");
const contactRoutes = require("./src/routes/contactRoutes");

app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/contacts", contactRoutes);

app.get("/", (req, res) => {
  res.send("Backend is working!");
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
