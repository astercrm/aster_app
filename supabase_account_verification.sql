-- ============================================================================
-- ACCOUNT VERIFICATION COLUMNS — Run in Supabase SQL Editor
-- Adds bank_txn_id, account_notes, contact_verification_status to contacts
-- ============================================================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bank_txn_id TEXT DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_notes TEXT DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_verification_status TEXT DEFAULT '';
