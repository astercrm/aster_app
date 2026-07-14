-- ── SALARY RULES TABLE ──────────────────────────────────────────────────────
-- Stores the default salary percentage for each staff member (per role type)
-- Admin can override percentages per salary period in the UI (stored as temp overrides)
CREATE TABLE IF NOT EXISTS staff_salary_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL CHECK (staff_role IN ('TeleCalling', 'Technical')),
  percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_name, staff_role)
);

-- Optional: disable RLS so admin can read/write without issues
ALTER TABLE staff_salary_rules DISABLE ROW LEVEL SECURITY;
