-- Make withdrawal settings public so creators can see limits
UPDATE public.platform_settings 
SET category = 'public' 
WHERE key IN ('min_withdrawal', 'max_withdrawal', 'withdrawal_fee');
