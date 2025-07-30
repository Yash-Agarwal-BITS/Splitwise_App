const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Use service role key for backend operations to bypass RLS
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

console.log("🔑 Supabase client configuration:", {
  url: process.env.SUPABASE_URL,
  hasServiceRoleKey: !!serviceRoleKey,
  hasAnonKey: !!anonKey,
  usingKey: serviceRoleKey ? "SERVICE_ROLE" : "ANON",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  serviceRoleKey || anonKey
);

module.exports = supabase;
