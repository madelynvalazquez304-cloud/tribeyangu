-- Migration: create creator_analytics table
-- Generated: 2026-01-18

CREATE TABLE
IF NOT EXISTS public.creator_analytics
(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid
(),
  creator_id uuid NOT NULL REFERENCES public.creators
(id) ON
DELETE CASCADE,
  day date
NOT NULL,
  views integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  donations_count integer NOT NULL DEFAULT 0,
  donations_amount numeric
(12,2) NOT NULL DEFAULT 0,
  top_sources jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now
(),
  updated_at timestamptz NOT NULL DEFAULT now
(),
  CONSTRAINT creator_analytics_unique_creator_day UNIQUE
(creator_id, day)
);

-- Index for fast creator lookups
CREATE INDEX
IF NOT EXISTS idx_creator_analytics_creator_id ON public.creator_analytics
(creator_id);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.update_updated_at_column
()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now
();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- If a previous run created the trigger, remove it first so the migration is idempotent
DROP TRIGGER IF EXISTS trg_update_creator_analytics_updated_at
ON public.creator_analytics;

CREATE TRIGGER trg_update_creator_analytics_updated_at
BEFORE
UPDATE ON public.creator_analytics
FOR EACH ROW
EXECUTE
PROCEDURE public.update_updated_at_column
();
