-- Migration: add donation_bracket to donations
-- Generated: 2026-01-18

-- Adds a categorical bracket for donations so campaigns can aggregate by bracket
-- Bracket rules (change as needed):
--  - bronze: amount < 100
--  - silver: 100 <= amount < 500
--  - gold: 500 <= amount < 1000
--  - platinum: amount >= 1000

ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS donation_bracket TEXT DEFAULT 'bronze';

-- Function to set bracket based on amount
CREATE OR REPLACE FUNCTION public.set_donation_bracket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount IS NULL THEN
    NEW.donation_bracket = 'bronze';
  ELSIF NEW.amount < 100 THEN
    NEW.donation_bracket = 'bronze';
  ELSIF NEW.amount >= 100 AND NEW.amount < 500 THEN
    NEW.donation_bracket = 'silver';
  ELSIF NEW.amount >= 500 AND NEW.amount < 1000 THEN
    NEW.donation_bracket = 'gold';
  ELSE
    NEW.donation_bracket = 'platinum';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set bracket on insert or update of donations
DROP TRIGGER IF EXISTS trg_set_donation_bracket ON public.donations;
CREATE TRIGGER trg_set_donation_bracket
BEFORE INSERT OR UPDATE OF amount ON public.donations
FOR EACH ROW
EXECUTE PROCEDURE public.set_donation_bracket();

-- Index to speed up bracketed queries
CREATE INDEX IF NOT EXISTS idx_donations_bracket ON public.donations (donation_bracket);
