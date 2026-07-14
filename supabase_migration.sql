-- Add created_by tracking columns to contacts table
-- Run this in the Supabase SQL Editor

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by_user_id TEXT DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by_user_name TEXT DEFAULT '';
