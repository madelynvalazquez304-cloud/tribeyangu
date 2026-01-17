-- Allow creators and users to read withdrawal and fee settings for transparency
CREATE POLICY "Anyone can read withdrawal settings" ON public.platform_settings FOR SELECT USING (category = 'withdrawals');
CREATE POLICY "Anyone can read fee settings" ON public.platform_settings FOR SELECT USING (category = 'fees');
