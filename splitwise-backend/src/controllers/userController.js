const supabase = require("../utils/supabaseClient");
const bcrypt = require("bcrypt");

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
