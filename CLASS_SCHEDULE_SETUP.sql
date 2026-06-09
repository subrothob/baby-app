-- ================================================================
-- B.A.B.Y Class Schedule & Booking Tables
-- Run this ONCE in Supabase SQL Editor
-- ================================================================

-- ── class_slots: coaches post available classes ──────────────────
CREATE TABLE IF NOT EXISTS class_slots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        UUID,
  coach_name      TEXT,
  date            DATE NOT NULL,
  start_time      TEXT NOT NULL,        -- e.g. '06:00', '09:00', '19:00'
  duration_mins   INT  DEFAULT 60,
  class_type      TEXT NOT NULL,        -- 'CrossFit', 'Strength', 'Open Gym', 'Running', 'Hyrox'
  class_name      TEXT,                 -- optional: 'Hero WOD', 'Barbell Club' etc
  max_capacity    INT  DEFAULT 15,
  location        TEXT DEFAULT 'Main Box',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── class_bookings: members book slots ──────────────────────────
CREATE TABLE IF NOT EXISTS class_bookings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id     UUID REFERENCES class_slots(id) ON DELETE CASCADE,
  member_id   UUID,
  member_name TEXT,
  booked_at   TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT DEFAULT 'confirmed',   -- 'confirmed' | 'cancelled'
  UNIQUE(slot_id, member_id)
);

-- Disable RLS so anon key can read/write (custom auth, no Supabase Auth)
ALTER TABLE class_slots    DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings DISABLE ROW LEVEL SECURITY;

-- ── Demo classes: seed 7 days of classes from today ─────────────
-- Today = 2026-06-09 (adjust dates if running later)
-- Get coach id dynamically
DO $$
DECLARE
  coach_rec RECORD;
BEGIN
  SELECT id, full_name INTO coach_rec FROM members WHERE role = 'coach' LIMIT 1;

  INSERT INTO class_slots (coach_id, coach_name, date, start_time, duration_mins, class_type, class_name, max_capacity, notes)
  VALUES
    -- Mon June 9
    (coach_rec.id, coach_rec.full_name, '2026-06-09', '06:00', 60, 'CrossFit',  'CrossFit',      15, 'Strength + MetCon'),
    (coach_rec.id, coach_rec.full_name, '2026-06-09', '09:00', 60, 'Open Gym',  'Open Gym',      20, 'All levels welcome'),
    (coach_rec.id, coach_rec.full_name, '2026-06-09', '19:00', 60, 'CrossFit',  'CrossFit',      15, 'Evening session'),
    -- Tue June 10
    (coach_rec.id, coach_rec.full_name, '2026-06-10', '06:00', 60, 'Strength',  'Barbell Club',  12, 'Back Squat + Deadlift'),
    (coach_rec.id, coach_rec.full_name, '2026-06-10', '09:00', 60, 'CrossFit',  'CrossFit',      15, 'Classic MetCon'),
    (coach_rec.id, coach_rec.full_name, '2026-06-10', '19:00', 60, 'CrossFit',  'CrossFit',      15, NULL),
    -- Wed June 11
    (coach_rec.id, coach_rec.full_name, '2026-06-11', '06:00', 60, 'CrossFit',  'CrossFit',      15, 'Olympic lifting focus'),
    (coach_rec.id, coach_rec.full_name, '2026-06-11', '09:00', 60, 'Running',   'Run Club',      25, '5km time trial'),
    (coach_rec.id, coach_rec.full_name, '2026-06-11', '19:00', 60, 'Hyrox',     'Hyrox Prep',    10, 'Race simulation'),
    -- Thu June 12
    (coach_rec.id, coach_rec.full_name, '2026-06-12', '06:00', 60, 'CrossFit',  'CrossFit',      15, NULL),
    (coach_rec.id, coach_rec.full_name, '2026-06-12', '09:00', 60, 'Open Gym',  'Open Gym',      20, NULL),
    (coach_rec.id, coach_rec.full_name, '2026-06-12', '19:00', 60, 'Strength',  'Barbell Club',  12, 'Clean & Jerk session'),
    -- Fri June 13
    (coach_rec.id, coach_rec.full_name, '2026-06-13', '06:00', 60, 'CrossFit',  'CrossFit',      15, 'Friday Funday WOD'),
    (coach_rec.id, coach_rec.full_name, '2026-06-13', '09:00', 60, 'CrossFit',  'CrossFit',      15, NULL),
    -- Sat June 14 (partner/team WOD)
    (coach_rec.id, coach_rec.full_name, '2026-06-14', '08:00', 90, 'CrossFit',  'Partner WOD',   20, 'Bring a friend! Team of 2'),
    (coach_rec.id, coach_rec.full_name, '2026-06-14', '10:00', 60, 'Running',   'Run Club',      25, 'Long run — 8km'),
    -- Sun June 15
    (coach_rec.id, coach_rec.full_name, '2026-06-15', '09:00', 90, 'Open Gym',  'Open Gym',      20, 'Active recovery / skill work');
END $$;

-- ── Verify ──────────────────────────────────────────────────────
SELECT date, start_time, class_type, class_name, max_capacity
FROM class_slots
ORDER BY date, start_time;
