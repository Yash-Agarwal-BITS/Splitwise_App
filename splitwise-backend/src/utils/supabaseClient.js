const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Use service role key for backend operations (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
