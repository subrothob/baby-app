-- ================================================================
-- B.A.B.Y WOD Table
-- Run ONCE in Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS wods (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT,
  type            TEXT NOT NULL DEFAULT 'AMRAP',
  warmup          TEXT,
  strength        TEXT,
  conditioning    TEXT,
  cooldown        TEXT,
  scaling         TEXT,
  scheduled_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  posted_by       TEXT,
  posted_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wods DISABLE ROW LEVEL SECURITY;

-- Seed today's WOD so Home tab shows something immediately
INSERT INTO wods (name, type, warmup, strength, conditioning, cooldown, scaling, scheduled_date)
VALUES (
  'The Grind',
  'AMRAP',
  '3 rounds: 10 Air Squats · 10 Push-ups · 200m Easy Run',
  'Back Squat 5×5 @ 75% — build to a heavy set of 5',
  'AMRAP 20 mins:
5 Pull-ups
10 Push-ups
15 Air Squats',
  '5 min walk · Hip flexor stretch · Child''s pose',
  'Scale Pull-ups → Ring Rows. Scale Push-ups → Knee Push-ups.',
  CURRENT_DATE
)
ON CONFLICT DO NOTHING;

-- Verify
SELECT scheduled_date, type, name, LEFT(conditioning,60) AS conditioning_preview
FROM wods
ORDER BY scheduled_date DESC
LIMIT 5;
