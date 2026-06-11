-- Coach architecture — Phase 1 (Postgres / Neon)
-- Standard in wolf-ai: raw SQL via pg Pool in src/api/postgresStore.ts init().
-- Run manually for existing deployments or fold into PostgresStore.init() migrations.

-- ─── Coach (users.role = 'coach') ───────────────────────────────────────────
-- Table `users` already exists. Coaches are rows with role IN ('coach', 'super_admin').

-- ─── Athlete profiles (coach roster + PRs) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_athlete_profiles (
  id              TEXT PRIMARY KEY,
  coach_id        TEXT NOT NULL,
  name            TEXT NOT NULL,
  level           TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  bodyweight      NUMERIC,
  one_rm          JSONB NOT NULL,
  fatigue_score   INT NOT NULL DEFAULT 40,
  readiness_score INT NOT NULL DEFAULT 70,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wl_athlete_profiles_coach_id_idx
  ON wl_athlete_profiles (coach_id);

-- Optional FK (safe once seed users exist):
-- ALTER TABLE wl_athlete_profiles
--   ADD CONSTRAINT wl_athlete_profiles_coach_fk
--   FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE;

-- ─── Program templates (immutable coach library) ──────────────────────────
CREATE TABLE IF NOT EXISTS coach_wl_templates (
  id                    TEXT PRIMARY KEY,
  coach_id              TEXT NOT NULL,
  name                  TEXT NOT NULL,
  program               JSONB NOT NULL,
  source_assignment_id  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_wl_templates_coach_id_idx
  ON coach_wl_templates (coach_id);

-- ALTER TABLE coach_wl_templates
--   ADD CONSTRAINT coach_wl_templates_coach_fk
--   FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE;

-- ─── Active assignments (cloned program per athlete) ────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id                  TEXT PRIMARY KEY,
  coach_id            TEXT NOT NULL,
  athlete_user_id     TEXT,
  athlete_profile_id  TEXT NOT NULL,
  source_template_id  TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  version             INTEGER NOT NULL DEFAULT 1,
  version_history     JSONB NOT NULL DEFAULT '[]'::jsonb,
  program             JSONB NOT NULL,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active plan per athlete (current product rule).
CREATE UNIQUE INDEX IF NOT EXISTS assignments_active_athlete_idx
  ON assignments (athlete_profile_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS assignments_coach_id_idx
  ON assignments (coach_id);

CREATE INDEX IF NOT EXISTS assignments_source_template_idx
  ON assignments (source_template_id)
  WHERE source_template_id IS NOT NULL;

-- Phase 1 migration helpers for databases created before this schema:
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS source_template_id TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Link assignment → athlete profile (coach roster integrity).
-- ALTER TABLE assignments
--   ADD CONSTRAINT assignments_athlete_profile_fk
--   FOREIGN KEY (athlete_profile_id) REFERENCES wl_athlete_profiles(id) ON DELETE RESTRICT;

-- ALTER TABLE assignments
--   ADD CONSTRAINT assignments_coach_fk
--   FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE;

-- ALTER TABLE assignments
--   ADD CONSTRAINT assignments_source_template_fk
--   FOREIGN KEY (source_template_id) REFERENCES coach_wl_templates(id) ON DELETE SET NULL;

-- ─── Athlete progress (unchanged; tied to assignment instance) ──────────────
CREATE TABLE IF NOT EXISTS workout_completions (
  id              TEXT PRIMARY KEY,
  assignment_id   TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  week_number     INTEGER NOT NULL,
  day_number      INTEGER NOT NULL,
  exercise_index  INTEGER,
  completed_at    TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS workout_completions_slot_idx
  ON workout_completions (assignment_id, week_number, day_number, COALESCE(exercise_index, -1));

CREATE TABLE IF NOT EXISTS workout_set_logs (
  id                    TEXT PRIMARY KEY,
  assignment_id         TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  week_number           INTEGER NOT NULL,
  day_number            INTEGER NOT NULL,
  exercise_index        INTEGER NOT NULL,
  scheme_index          INTEGER NOT NULL,
  set_instance          INTEGER NOT NULL,
  actual_kg             REAL,
  actual_reps           INTEGER,
  actual_segment_reps   JSONB,
  completed_at          TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS workout_set_logs_slot_idx
  ON workout_set_logs (
    assignment_id, week_number, day_number, exercise_index, scheme_index, set_instance
  );
