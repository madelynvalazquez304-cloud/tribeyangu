
-- Create campaigns table for crowdfunding
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  image_url TEXT,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- active, completed, ended
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add campaign_id to donations to track crowdfunding contributions
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Add featured_section to creators
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS featured_section TEXT DEFAULT 'donations';

-- Enable RLS for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Creators can manage own campaigns" ON public.campaigns FOR ALL USING (
  creator_id = (SELECT id FROM public.creators WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage all campaigns" ON public.campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Function to update campaign progress on donation
CREATE OR REPLACE FUNCTION public.update_campaign_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.campaign_id IS NOT NULL THEN
    UPDATE public.campaigns
    SET 
      current_amount = current_amount + NEW.creator_amount,
      updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for campaign progress
CREATE TRIGGER on_campaign_donation_completed
  AFTER UPDATE ON public.donations
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.campaign_id IS NOT NULL)
  EXECUTE FUNCTION public.update_campaign_progress();
