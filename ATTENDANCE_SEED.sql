-- ================================================================
-- B.A.B.Y Attendance Seed Data
-- Seeds workout_logs for 4 members over past 30 days
-- Generates realistic streaks so Home tab shows 🔥 counters
-- Run this in Supabase SQL Editor
-- ================================================================

-- First, make sure workout_logs has RLS disabled (run if needed):
-- ALTER TABLE workout_logs DISABLE ROW LEVEL SECURITY;

-- ── Priyanka: 5x/week consistent → ~20 sessions, current streak ~7 ────────────
INSERT INTO workout_logs (member_id, member_name, wod_name, workout_type, logged_at)
SELECT m.id, m.full_name, wod, 'CrossFit', day::date
FROM members m,
(VALUES
  ('Fran',          '2026-05-12'),
  ('Back Squat',    '2026-05-13'),
  ('Row Cal',       '2026-05-14'),
  ('Deadlift',      '2026-05-15'),
  ('Cindy',         '2026-05-17'),
  ('Clean',         '2026-05-18'),
  ('KB Swing',      '2026-05-19'),
  ('Grace',         '2026-05-20'),
  ('Push Press',    '2026-05-21'),
  ('Box Jump',      '2026-05-24'),
  ('Thruster',      '2026-05-25'),
  ('Double Unders', '2026-05-26'),
  ('Snatch',        '2026-05-27'),
  ('Annie',         '2026-05-28'),
  ('Front Squat',   '2026-06-02'),
  ('Helen',         '2026-06-03'),
  ('Pull-ups',      '2026-06-04'),
  ('Overhead Press','2026-06-05'),
  ('Deadlift',      '2026-06-06'),
  ('Back Squat',    '2026-06-07'),
  ('Fran',          '2026-06-08'),
  ('Check-in',      '2026-06-09')
) AS t(wod, day)
WHERE m.full_name ILIKE '%Priyanka%'
ON CONFLICT DO NOTHING;

-- ── Balan: 4-5x/week → current streak ~10 ────────────────────────────────────
INSERT INTO workout_logs (member_id, member_name, wod_name, workout_type, logged_at)
SELECT m.id, m.full_name, wod, 'CrossFit', day::date
FROM members m,
(VALUES
  ('Murph',         '2026-05-11'),
  ('Back Squat',    '2026-05-12'),
  ('Thruster',      '2026-05-13'),
  ('Fran',          '2026-05-14'),
  ('5km Run',       '2026-05-16'),
  ('Clean & Jerk',  '2026-05-18'),
  ('Deadlift',      '2026-05-19'),
  ('Grace',         '2026-05-21'),
  ('Snatch',        '2026-05-23'),
  ('Box Jump',      '2026-05-25'),
  ('KB Swing',      '2026-05-26'),
  ('Helen',         '2026-05-27'),
  ('DT',            '2026-05-28'),
  ('Pull-ups',      '2026-05-30'),
  ('Push Press',    '2026-06-01'),
  ('Back Squat',    '2026-06-02'),
  ('Overhead Press','2026-06-03'),
  ('Check-in',      '2026-06-04'),
  ('Fran',          '2026-06-05'),
  ('Deadlift',      '2026-06-06'),
  ('Front Squat',   '2026-06-07'),
  ('Clean',         '2026-06-08'),
  ('Back Squat',    '2026-06-09')
) AS t(wod, day)
WHERE m.full_name ILIKE '%Balan%'
ON CONFLICT DO NOTHING;

-- ── Sher / Shree: 3-4x/week → streak ~5 ─────────────────────────────────────
INSERT INTO workout_logs (member_id, member_name, wod_name, workout_type, logged_at)
SELECT m.id, m.full_name, wod, 'CrossFit', day::date
FROM members m,
(VALUES
  ('Fran',          '2026-05-13'),
  ('Back Squat',    '2026-05-15'),
  ('Double Unders', '2026-05-17'),
  ('Grace',         '2026-05-19'),
  ('Deadlift',      '2026-05-22'),
  ('KB Swing',      '2026-05-24'),
  ('Thruster',      '2026-05-26'),
  ('Helen',         '2026-05-28'),
  ('Snatch',        '2026-05-30'),
  ('Pull-ups',      '2026-06-01'),
  ('Box Jump',      '2026-06-03'),
  ('Fran',          '2026-06-05'),
  ('Back Squat',    '2026-06-06'),
  ('Clean',         '2026-06-07'),
  ('Deadlift',      '2026-06-08'),
  ('Check-in',      '2026-06-09')
) AS t(wod, day)
WHERE m.full_name ILIKE '%Sher%'
ON CONFLICT DO NOTHING;

-- ── Sarfraz / Sarfaraz: 4x/week → streak ~6 ─────────────────────────────────
INSERT INTO workout_logs (member_id, member_name, wod_name, workout_type, logged_at)
SELECT m.id, m.full_name, wod, 'CrossFit', day::date
FROM members m,
(VALUES
  ('Back Squat',    '2026-05-11'),
  ('Fran',          '2026-05-12'),
  ('Deadlift',      '2026-05-14'),
  ('Grace',         '2026-05-16'),
  ('Clean',         '2026-05-18'),
  ('KB Swing',      '2026-05-20'),
  ('Thruster',      '2026-05-22'),
  ('Annie',         '2026-05-25'),
  ('5km Run',       '2026-05-26'),
  ('Overhead Press','2026-05-27'),
  ('Helen',         '2026-05-29'),
  ('DT',            '2026-06-01'),
  ('Back Squat',    '2026-06-02'),
  ('Fran',          '2026-06-03'),
  ('Check-in',      '2026-06-04'),
  ('Deadlift',      '2026-06-05'),
  ('Pull-ups',      '2026-06-06'),
  ('Clean & Jerk',  '2026-06-07'),
  ('Grace',         '2026-06-08'),
  ('Front Squat',   '2026-06-09')
) AS t(wod, day)
WHERE m.full_name ILIKE '%Sarf%'
ON CONFLICT DO NOTHING;

-- ── Verify ──────────────────────────────────────────────────────────────────
SELECT m.full_name, COUNT(*) as sessions,
       MAX(w.logged_at) as last_session,
       MIN(w.logged_at) as first_session
FROM workout_logs w
JOIN members m ON m.id = w.member_id
WHERE w.logged_at >= '2026-05-01'
GROUP BY m.full_name
ORDER BY sessions DESC;
