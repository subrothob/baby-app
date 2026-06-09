-- ================================================================
-- B.A.B.Y REAL CLASS SCHEDULE
-- Replaces demo data with the actual gym timetable
--
-- DAILY (Mon–Fri):
--   6:00 AM  Muscle Up       (Gymnastics)
--   7:00 AM  Functional Training  [varies by day]
--   8:00 AM  Muscle Up       (Gymnastics)
--   5:00 PM  Muscle Up       (Gymnastics)
--   6:00 PM  Functional Training  [varies by day]
--   7:00 PM  Muscle Lab      (Strength)
--   8:00 PM  Muscle Lab      (Strength)
--
-- Functional Training by day:
--   Mon = Strength & Conditioning
--   Tue = Gymnastics
--   Wed = Olympic Lifting
--   Thu = Strength & Mobility
--   Fri = High Intensity
--
-- SATURDAY:
--   7:30 AM  NSS — No Strings Saturday  (Community workout)
--   9:00 AM  Project B.A.B.Y            (Coaches workout)
--
-- SUNDAY: Closed (rest day)
--
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Remove old demo class slots (keeps any real ones you've added)
DELETE FROM class_slots
WHERE class_name IN (
  'CrossFit', 'Barbell Club', 'Run Club', 'Hyrox Prep',
  'Partner WOD', 'Open Gym', 'Long run — 8km'
);

-- Step 2: Insert real schedule for next 4 weeks using a loop
DO $$
DECLARE
  d            DATE;
  dow          INT;
  func_name    TEXT;
  func_type    TEXT;
  coach_rec    RECORD;
BEGIN
  SELECT id, full_name INTO coach_rec FROM members WHERE role = 'coach' LIMIT 1;

  FOR d IN
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '27 days', INTERVAL '1 day')::DATE
  LOOP
    dow := EXTRACT(DOW FROM d);  -- 0=Sun, 1=Mon, 2=Tue ... 6=Sat

    -- ── WEEKDAYS (Mon–Fri) ─────────────────────────────────────────
    IF dow BETWEEN 1 AND 5 THEN

      -- Determine functional training theme for today
      func_name := CASE dow
        WHEN 1 THEN 'Strength & Conditioning'
        WHEN 2 THEN 'Gymnastics'
        WHEN 3 THEN 'Olympic Lifting'
        WHEN 4 THEN 'Strength & Mobility'
        WHEN 5 THEN 'High Intensity'
      END;
      func_type := CASE dow
        WHEN 1 THEN 'Strength'
        WHEN 2 THEN 'Gymnastics'
        WHEN 3 THEN 'Olympic'
        WHEN 4 THEN 'Strength'
        WHEN 5 THEN 'CrossFit'
      END;

      -- Morning block
      INSERT INTO class_slots (coach_id, coach_name, date, start_time, duration_mins, class_type, class_name, max_capacity, location, notes)
      VALUES
        (coach_rec.id, coach_rec.full_name, d, '06:00', 60, 'Gymnastics', 'Muscle Up', 15, 'Main Box', 'Calisthenics & gymnastics skill work'),
        (coach_rec.id, coach_rec.full_name, d, '07:00', 60, func_type,    func_name,   20, 'Main Box', NULL),
        (coach_rec.id, coach_rec.full_name, d, '08:00', 60, 'Gymnastics', 'Muscle Up', 15, 'Main Box', 'Calisthenics & gymnastics skill work');

      -- Evening block
      INSERT INTO class_slots (coach_id, coach_name, date, start_time, duration_mins, class_type, class_name, max_capacity, location, notes)
      VALUES
        (coach_rec.id, coach_rec.full_name, d, '17:00', 60, 'Gymnastics', 'Muscle Up',  15, 'Main Box', 'Calisthenics & gymnastics skill work'),
        (coach_rec.id, coach_rec.full_name, d, '18:00', 60, func_type,    func_name,    20, 'Main Box', NULL),
        (coach_rec.id, coach_rec.full_name, d, '19:00', 60, 'Strength',   'Muscle Lab', 15, 'Main Box', 'Hypertrophy & muscle building'),
        (coach_rec.id, coach_rec.full_name, d, '20:00', 60, 'Strength',   'Muscle Lab', 15, 'Main Box', 'Hypertrophy & muscle building');

    -- ── SATURDAY ───────────────────────────────────────────────────
    ELSIF dow = 6 THEN

      INSERT INTO class_slots (coach_id, coach_name, date, start_time, duration_mins, class_type, class_name, max_capacity, location, notes)
      VALUES
        (coach_rec.id, coach_rec.full_name, d, '07:30', 90, 'Community', 'NSS — No Strings Saturday',
         50, 'Main Box', 'Community group workout — all levels welcome! Bring a friend 🎉'),
        (coach_rec.id, coach_rec.full_name, d, '09:00', 60, 'CrossFit', 'Project B.A.B.Y',
         12, 'Main Box', 'Coaches workout — Build A Better You 💪');

    END IF;
    -- Sunday (dow=0): closed, no classes inserted

  END LOOP;
END $$;

-- ── Verify: summary of what was inserted ────────────────────────
SELECT
  TO_CHAR(date, 'Dy DD Mon') AS day,
  start_time,
  class_type,
  class_name,
  max_capacity
FROM class_slots
WHERE date >= CURRENT_DATE
ORDER BY date, start_time
LIMIT 40;
