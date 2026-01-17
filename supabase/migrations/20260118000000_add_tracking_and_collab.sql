-- Add tracking and fulfillment to orders and merchandise
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Add fulfillment partnership flag to merchandise
ALTER TABLE public.merchandise ADD COLUMN IF NOT EXISTS fulfillment_by TEXT DEFAULT 'creator'; -- 'creator' or 'platform'

-- Add collaboration features to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS collaborators JSONB DEFAULT '[]'; -- Store array of creator IDs or usernames

-- Update platform_settings for fulfillment fees
INSERT INTO public.platform_settings (key, value, description, category) 
VALUES ('fulfillment_fee_percentage', '5', 'Additional fee for TribeYangu fulfillment services', 'fees')
ON CONFLICT (key) DO NOTHING;
