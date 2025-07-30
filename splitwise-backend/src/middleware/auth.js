const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Ensure JWT_SECRET is set
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Please set it in your .env file.");
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user; // Attach user info to request
    next();
  });
}

module.exports = authenticateToken;