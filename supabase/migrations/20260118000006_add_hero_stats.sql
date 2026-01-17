
-- Insert default hero stats into platform_settings
INSERT INTO public.platform_settings (key, value, description, category)
VALUES 
  ('hero_stats', '{"creators": "7,000+", "earned": "KSh 50M+", "supporters": "100K+"}', 'Statistics displayed on the home page hero section', 'general')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, description = EXCLUDED.description, category = EXCLUDED.category;
