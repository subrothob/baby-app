-- ================================================================
-- B.A.B.Y Body Stats Table
-- Run ONCE in Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS member_body_stats (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id    UUID NOT NULL,
  member_name  TEXT,
  logged_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg    NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  waist_cm     NUMERIC(5,1),
  chest_cm     NUMERIC(5,1),
  arm_cm       NUMERIC(5,1),
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, logged_date)   -- one entry per member per day
);

ALTER TABLE member_body_stats DISABLE ROW LEVEL SECURITY;

-- Optional: seed sample data for Balan & Priyanka so chart shows immediately
-- 12 weekly entries going back ~3 months
INSERT INTO member_body_stats (member_id, member_name, logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, arm_cm)
SELECT m.id, m.full_name, day::date, wt, bf, wa, ch, ar
FROM members m,
(VALUES
  ('2026-03-16', 87.2, 22.1, 92.0, 100.0, 35.0),
  ('2026-03-23', 86.5, 21.8, 91.0, 100.0, 35.2),
  ('2026-03-30', 86.0, 21.5, 90.5, 99.5,  35.3),
  ('2026-04-06', 85.4, 21.2, 90.0, 99.5,  35.5),
  ('2026-04-13', 84.8, 20.9, 89.5, 99.0,  35.6),
  ('2026-04-20', 84.3, 20.6, 89.0, 99.0,  35.8),
  ('2026-04-27', 83.9, 20.3, 88.5, 98.5,  36.0),
  ('2026-05-04', 83.2, 20.0, 88.0, 98.5,  36.1),
  ('2026-05-11', 82.8, 19.7, 87.5, 98.0,  36.3),
  ('2026-05-18', 82.4, 19.4, 87.0, 98.0,  36.4),
  ('2026-05-25', 82.0, 19.1, 86.5, 97.5,  36.6),
  ('2026-06-01', 81.6, 18.8, 86.0, 97.5,  36.8),
  ('2026-06-08', 81.2, 18.5, 85.5, 97.0,  37.0)
) AS t(day, wt, bf, wa, ch, ar)
WHERE m.full_name ILIKE '%Balan%'
ON CONFLICT DO NOTHING;

INSERT INTO member_body_stats (member_id, member_name, logged_date, weight_kg, body_fat_pct, waist_cm, chest_cm, arm_cm)
SELECT m.id, m.full_name, day::date, wt, bf, wa, ch, ar
FROM members m,
(VALUES
  ('2026-03-16', 62.0, 24.5, 74.0, 88.0, 28.0),
  ('2026-03-23', 61.5, 24.2, 73.5, 88.0, 28.1),
  ('2026-03-30', 61.2, 23.9, 73.0, 87.5, 28.2),
  ('2026-04-06', 60.8, 23.6, 72.5, 87.5, 28.3),
  ('2026-04-13', 60.5, 23.3, 72.0, 87.0, 28.5),
  ('2026-04-20', 60.2, 23.0, 71.5, 87.0, 28.6),
  ('2026-04-27', 59.9, 22.7, 71.0, 86.5, 28.7),
  ('2026-05-04', 59.6, 22.4, 70.5, 86.5, 28.9),
  ('2026-05-11', 59.4, 22.1, 70.0, 86.0, 29.0),
  ('2026-05-18', 59.1, 21.8, 69.5, 86.0, 29.1),
  ('2026-05-25', 58.9, 21.5, 69.0, 85.5, 29.3),
  ('2026-06-01', 58.6, 21.2, 68.5, 85.5, 29.4),
  ('2026-06-08', 58.3, 20.9, 68.0, 85.0, 29.6)
) AS t(day, wt, bf, wa, ch, ar)
WHERE m.full_name ILIKE '%Priyanka%'
ON CONFLICT DO NOTHING;

-- Verify
SELECT m.full_name, COUNT(*) as entries,
       MIN(bs.logged_date) as first_log,
       MAX(bs.logged_date) as latest_log,
       MIN(bs.weight_kg) as lowest_weight,
       MAX(bs.weight_kg) as starting_weight
FROM member_body_stats bs
JOIN members m ON m.id = bs.member_id
GROUP BY m.full_name;
