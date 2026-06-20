-- Add PIN column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS pin TEXT;

-- Set default PIN = birth year extracted from dob
UPDATE members
SET pin = EXTRACT(YEAR FROM dob::date)::TEXT
WHERE pin IS NULL AND dob IS NOT NULL;

-- Verify
SELECT full_name, mobile, dob, pin, role FROM members ORDER BY role, full_name;
