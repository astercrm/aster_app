-- ─────────────────────────────────────────────────────────────────────────────
-- Dropdown Options table — stores admin-managed dropdown lists permanently
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dropdown_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,        -- e.g. 'serviceTypes', 'statuses', 'teleCallingStaff', etc.
  label TEXT NOT NULL,           -- the option value itself
  sort_order INT DEFAULT 0,     -- optional ordering
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate entries per category
CREATE UNIQUE INDEX IF NOT EXISTS idx_dropdown_options_category_label
  ON dropdown_options (category, label);

-- Seed initial data (skip if already exists)
-- Service Types
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('serviceTypes', 'F31 Advance', 1),
  ('serviceTypes', 'UAN Activation', 2),
  ('serviceTypes', 'KYC Bank Add', 3),
  ('serviceTypes', 'Bank add', 4),
  ('serviceTypes', 'Uan Find & Activation', 5),
  ('serviceTypes', 'Other', 6),
  ('serviceTypes', 'Online JD', 7),
  ('serviceTypes', 'F13_File Transfor', 8),
  ('serviceTypes', 'E_Nominee Add', 9),
  ('serviceTypes', '10C_Pension withdrown', 10),
  ('serviceTypes', 'F19_Final Settelment', 11),
  ('serviceTypes', 'PF Withdrawal', 12),
  ('serviceTypes', 'Pension Claim', 13),
  ('serviceTypes', 'Death Claim', 14),
  ('serviceTypes', 'Transfer Claim', 15)
ON CONFLICT (category, label) DO NOTHING;

-- Statuses
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('statuses', 'New', 1),
  ('statuses', 'Completed', 2),
  ('statuses', 'Complete', 3),
  ('statuses', 'Pending', 4)
ON CONFLICT (category, label) DO NOTHING;

-- Tele Calling Staff
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('teleCallingStaff', 'Jaya', 1),
  ('teleCallingStaff', 'Kowsalya', 2),
  ('teleCallingStaff', 'Revathi', 3),
  ('teleCallingStaff', 'Poornima', 4),
  ('teleCallingStaff', 'Anusakthiya', 5),
  ('teleCallingStaff', 'Shobana', 6),
  ('teleCallingStaff', 'Deepa', 7),
  ('teleCallingStaff', 'Ramya', 8)
ON CONFLICT (category, label) DO NOTHING;

-- Technical Staff
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('technicalStaff', 'Jaya', 1),
  ('technicalStaff', 'Kowsalya', 2),
  ('technicalStaff', 'Revathi', 3),
  ('technicalStaff', 'Poornima', 4),
  ('technicalStaff', 'Anusakthiya', 5),
  ('technicalStaff', 'Shobana', 6),
  ('technicalStaff', 'Deepa', 7),
  ('technicalStaff', 'Ramya', 8)
ON CONFLICT (category, label) DO NOTHING;

-- Branches
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('branches', 'ERD_Kowsalya', 1),
  ('branches', 'SLM_Shobana', 2),
  ('branches', 'CBE_Deepa', 3),
  ('branches', 'TRY_Ramya', 4),
  ('branches', 'NKL_Poornima', 5),
  ('branches', 'MDU_Anusakthiya', 6)
ON CONFLICT (category, label) DO NOTHING;

-- Payment Statuses
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('paymentStatuses', 'Full Paid', 1),
  ('paymentStatuses', 'Partially Paid', 2)
ON CONFLICT (category, label) DO NOTHING;
