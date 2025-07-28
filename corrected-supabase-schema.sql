-- Updated SQL Schema to match your JavaScript code
-- Run these commands in Supabase SQL Editor

-- 1. Drop existing tables (if they exist)
DROP TABLE IF EXISTS expense_participants CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_contacts CASCADE;

-- 2. Create users table
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create groups table
CREATE TABLE groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create group_members table
CREATE TABLE group_members (
  group_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id) -- Prevent duplicate memberships
);

-- 5. Create expenses table (for future use)
CREATE TABLE expenses (
  expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE, -- NULL for personal expenses
  paid_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_type VARCHAR(20) DEFAULT 'group' CHECK (expense_type IN ('group', 'personal')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create friends/contacts table (simplified - no friend requests)
CREATE TABLE user_contacts (
  contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  friend_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_user_id), -- Prevent duplicate friend entries
  CHECK (user_id != friend_user_id) -- Prevent self-friending
);

-- 7. Create expense_participants table (for future use)
CREATE TABLE expense_participants (
  participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(expense_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  share NUMERIC NOT NULL,
  UNIQUE(expense_id, user_id) -- Prevent duplicate participants
);

-- 8. Create indexes for better performance
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX idx_expense_participants_user_id ON expense_participants(user_id);
CREATE INDEX idx_user_contacts_user_id ON user_contacts(user_id);
CREATE INDEX idx_user_contacts_friend_user_id ON user_contacts(friend_user_id);
