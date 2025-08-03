const supabase = require("../utils/supabaseClient");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Helper functions for consistent responses
const errorResponse = (res, status, message) => {
  return res.status(status).json({ error: message });
};

const successResponse = (res, message, data = null) => {
  const response = { message };
  if (data) response.data = data;
  return res.status(200).json(response);
};

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation helper
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return errorResponse(res, 400, "Username, email, and password are required");
    }

    // Validate username
    if (username.trim().length < 3) {
      return errorResponse(res, 400, "Username must be at least 3 characters long");
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return errorResponse(res, 400, "Password must be at least 6 characters long");
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email, username")
      .or(`email.eq.${email.toLowerCase()},username.eq.${username.trim()}`)
      .single();

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return errorResponse(res, 409, "Email is already registered");
      } else {
        return errorResponse(res, 409, "Username is already taken");
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12); // Increased salt rounds

    // Create user
    const { data, error } = await supabase
      .from("users")
      .insert([{ 
        username: username.trim(), 
        email: email.toLowerCase(), 
        password_hash 
      }])
      .select("user_id, username, email, created_at");

    if (error) {
      return errorResponse(res, 400, error.message);
    }

    res.status(201).json({
      message: "User registered successfully",
      user: data[0],
    });
  } catch (error) {
    console.error("Register user error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required");
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    // Find user by email (case insensitive)
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, email, password_hash, created_at")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return errorResponse(res, 401, "Invalid email or password");
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
      token,
    });
  } catch (error) {
    console.error("Login user error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get all users (for user search and adding to groups)
exports.getAllUsers = async (req, res) => {
  try {
    // Optional: Add search functionality
    const { search } = req.query;
    let query = supabase
      .from("users")
      .select("user_id, username, email, created_at");

    // Add search functionality
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query
      .order("created_at", { ascending: false })
      .limit(50); // Limit results for performance

    if (error) {
      return errorResponse(res, 400, error.message);
    }

    res.status(200).json({
      message: "Users retrieved successfully",
      users: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return errorResponse(res, 500, "Internal server error");
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
      return errorResponse(res, 404, "User not found");
    }

    res.status(200).json({ 
      message: "User retrieved successfully",
      user 
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get current user profile (for authenticated user)
exports.getMyProfile = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;

    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, email, created_at, updated_at")
      .eq("user_id", user_id)
      .single();

    if (error || !user) {
      return errorResponse(res, 404, "User not found");
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      user
    });
  } catch (error) {
    console.error("Get my profile error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Update user info (users can only update their own info)
exports.updateUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { username, email, password } = req.body;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    // Users can only update their own profile
    if (req.user.user_id !== user_id) {
      return errorResponse(res, 403, "You can only update your own profile");
    }

    const updateData = {};

    // Validate and set username
    if (username) {
      if (username.trim().length < 3) {
        return errorResponse(res, 400, "Username must be at least 3 characters long");
      }
      
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from("users")
        .select("user_id")
        .eq("username", username.trim())
        .neq("user_id", user_id)
        .single();

      if (existingUser) {
        return errorResponse(res, 409, "Username is already taken");
      }

      updateData.username = username.trim();
    }

    // Validate and set email
    if (email) {
      if (!isValidEmail(email)) {
        return errorResponse(res, 400, "Please provide a valid email address");
      }

      // Check if email is already taken
      const { data: existingUser } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", email.toLowerCase())
        .neq("user_id", user_id)
        .single();

      if (existingUser) {
        return errorResponse(res, 409, "Email is already registered");
      }

      updateData.email = email.toLowerCase();
    }

    // Validate and set password
    if (password) {
      if (!isValidPassword(password)) {
        return errorResponse(res, 400, "Password must be at least 6 characters long");
      }
      updateData.password_hash = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(res, 400, "No valid data provided for update");
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("user_id", user_id)
      .select("user_id, username, email, created_at, updated_at");

    if (error || !data || data.length === 0) {
      return errorResponse(res, 404, "User not found or update failed");
    }

    res.status(200).json({ 
      message: "User updated successfully", 
      user: data[0] 
    });
  } catch (error) {
    console.error("Update user error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Delete user (users can only delete their own account)
exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    // Users can only delete their own account
    if (req.user.user_id !== user_id) {
      return errorResponse(res, 403, "You can only delete your own account");
    }

    // Optional: Check if user has pending expenses/groups
    const { data: userExpenses } = await supabase
      .from("expenses")
      .select("expense_id")
      .eq("paid_by", user_id)
      .limit(1);

    if (userExpenses && userExpenses.length > 0) {
      return errorResponse(res, 400, "Cannot delete account with existing expenses. Please settle all expenses first.");
    }

    // Delete related data first
    // Remove from group memberships
    await supabase.from("group_members").delete().eq("user_id", user_id);
    
    // Remove expense participations
    await supabase.from("expense_participants").delete().eq("user_id", user_id);

    // Delete the user
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", user_id);

    if (error) {
      return errorResponse(res, 404, "User not found or delete failed");
    }

    res.status(200).json({ 
      message: "User account deleted successfully" 
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};
