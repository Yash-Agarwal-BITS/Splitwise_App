// import supabase for postgres database
// import bcrypt for password hashing

const supabase = require("../utils/supabaseClient");
const bcrypt = require("bcrypt");

/*
  @desc Create a new user
  @route POST /api/users
  @access Public
  creates a function that works asynchronously
  takes in the username, email, and password from the request body which is a JSON object sent from the frontend
  hashes the password
  inserts the user into the database
  returns the user data
*/
exports.createUser = async (req, res) => {
  const { username, email, password } = req.body;

  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert([{ username, email, password_hash }])
    .select();

  if (error) return res.status(400).json({ error });
  res.status(201).json(data[0]);
};

exports.loginUser = async (req, res) => {
  try {
    // 1. Get user by email
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !userData) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 2. Compare password
    const valid = await bcrypt.compare(password, userData.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: userData.id, email: userData.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ message: "Login successful", token });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
