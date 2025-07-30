
-- Complete cleanup script with better security for custom JWT setup
-- Run this in Supabase SQL Editor

-- 1. Drop the function if it exists
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS public.get_current_user_id();

-- 2. Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view other users for app functionality" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members for their groups" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups or be removed by creators" ON group_members;
DROP POLICY IF EXISTS "Users can view their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Expense creators can add participants" ON expense_participants;
DROP POLICY IF EXISTS "Expense creators can update participants" ON expense_participants;
DROP POLICY IF EXISTS "Expense creators can delete participants" ON expense_participants;
DROP POLICY IF EXISTS "Users can view their contacts" ON user_contacts;
DROP POLICY IF EXISTS "Users can add contacts" ON user_contacts;
DROP POLICY IF EXISTS "Users can remove contacts" ON user_contacts;
DROP POLICY IF EXISTS "Allow backend access" ON users;
DROP POLICY IF EXISTS "Allow backend access" ON groups;
DROP POLICY IF EXISTS "Allow backend access" ON group_members;
DROP POLICY IF EXISTS "Allow backend access" ON expenses;
DROP POLICY IF EXISTS "Allow backend access" ON expense_participants;
DROP POLICY IF EXISTS "Allow backend access" ON user_contacts;

-- 3. Enable RLS to stop the main security warnings
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;

-- 4. Create restrictive policies that work only with your backend service key
-- These block direct client access but allow your backend to work

-- Only allow backend service (using service role key) to access data
CREATE POLICY "Backend service only" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Backend service only" ON groups FOR ALL TO service_role USING (true);
CREATE POLICY "Backend service only" ON group_members FOR ALL TO service_role USING (true);
CREATE POLICY "Backend service only" ON expenses FOR ALL TO service_role USING (true);
CREATE POLICY "Backend service only" ON expense_participants FOR ALL TO service_role USING (true);
CREATE POLICY "Backend service only" ON user_contacts FOR ALL TO service_role USING (true);

-- Block direct client access (anon users get no access)
CREATE POLICY "Block direct client access" ON users FOR ALL TO anon USING (false);
CREATE POLICY "Block direct client access" ON groups FOR ALL TO anon USING (false);
CREATE POLICY "Block direct client access" ON group_members FOR ALL TO anon USING (false);
CREATE POLICY "Block direct client access" ON expenses FOR ALL TO anon USING (false);
CREATE POLICY "Block direct client access" ON expense_participants FOR ALL TO anon USING (false);
CREATE POLICY "Block direct client access" ON user_contacts FOR ALL TO anon USING (false);

-- 5. Grant permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
