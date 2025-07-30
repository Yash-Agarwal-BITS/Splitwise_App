const supabase = require("../utils/supabaseClient");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email, and password are required",
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email, username")
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: "User with this email or username already exists",
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    console.log("🔧 Attempting to create user with Supabase...");
    console.log("📝 User data:", {
      username,
      email,
      hasPassword: !!password_hash,
    });

    // Create user
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, email, password_hash }])
      .select("user_id, username, email, created_at");

    console.log("📊 Supabase response:", { data, error });

    if (error) {
      console.error("❌ Supabase error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return res.status(400).json({
        error: error.message,
        details: error.details,
        hint: error.hint,
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: data[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, email, password_hash, created_at")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Remove password_hash from response
    const { password_hash, ...userResponse } = user;

    // Generate JWT
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      user: userResponse,
      token, // send token to client
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("user_id, username, email, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      message: "Users retrieved successfully",
      users: users,
      count: users.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific user by ID
exports.getUserById = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, email, created_at")
      .eq("user_id", user_id)
      .single();
    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user info
exports.updateUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { username, email, password } = req.body;
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      const bcrypt = require("bcrypt");
      updateData.password_hash = await bcrypt.hash(password, 10);
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No data provided for update" });
    }
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("user_id", user_id)
      .select("user_id, username, email, created_at");
    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "User not found or update failed" });
    }
    res
      .status(200)
      .json({ message: "User updated successfully", user: data[0] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", user_id);
    if (error) {
      return res.status(404).json({ error: "User not found or delete failed" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
