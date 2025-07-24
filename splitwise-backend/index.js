const express = require("express");
const app = express();
require("dotenv").config();

app.use(express.json());
app.use(require("cors")());
const userRoutes = require("./src/routes/userRoutes");
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Backend is working!");
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
