-- Add image array columns to the contacts table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Extra images for the "Screenshot & Extra Images" section (salary/payment section)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS extra_images TEXT[] DEFAULT '{}';

-- Separate images for the "Notes Screenshots" section (after Details & Notes field)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS notes_images TEXT[] DEFAULT '{}';

-- Separate images for the "Remarks Screenshots" section (after Remarks field)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS remarks_images TEXT[] DEFAULT '{}';

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'contacts'
  AND column_name IN ('screenshot_image', 'extra_images', 'notes_images', 'remarks_images')
ORDER BY column_name;
