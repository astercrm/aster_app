-- ================================================================
-- ASTER: Create incomes & expenses tables
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ================================================================

-- ── INCOMES TABLE ──
CREATE TABLE IF NOT EXISTS incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT,
  staff_name TEXT,
  staff_role TEXT,
  service_charges TEXT,
  payment_status TEXT,
  receive_amount TEXT,
  transaction_id TEXT,
  receive_date TEXT,
  screenshot_image TEXT,
  bank_transaction_id TEXT,
  employee_transaction_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS so the server can read/write freely
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service_role" ON incomes FOR ALL USING (true) WITH CHECK (true);

-- ── EXPENSES TABLE ──
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT,
  product_name TEXT,
  quantity INT DEFAULT 1,
  amount TEXT,
  transaction_id TEXT,
  bill_screenshot TEXT,
  product_screenshot TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS so the server can read/write freely
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service_role" ON expenses FOR ALL USING (true) WITH CHECK (true);
