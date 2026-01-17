-- Create gifts table for admin to manage
CREATE TABLE IF NOT EXISTS public.gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create received_gifts table to track gifting transactions
CREATE TABLE IF NOT EXISTS public.received_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_id UUID REFERENCES public.gifts(id),
    creator_id UUID REFERENCES public.creators(id) NOT NULL,
    sender_name TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    payment_reference TEXT, -- STK Push CheckoutRequestID
    mpesa_receipt TEXT,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    creator_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_gifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gifts
CREATE POLICY "Anyone can view active gifts" ON public.gifts
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage gifts" ON public.gifts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for received_gifts
CREATE POLICY "Creators can view their received gifts" ON public.received_gifts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creators
            WHERE id = received_gifts.creator_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view completed gifts for a creator" ON public.received_gifts
    FOR SELECT USING (status = 'completed');

CREATE POLICY "System can manage received gifts" ON public.received_gifts
    FOR ALL USING (true); -- Usually restricted to service role in practice

-- Insert some default gifts
INSERT INTO public.gifts (name, price, icon_url) VALUES
('Rose', 10.00, '🌹'),
('Coffee', 50.00, '☕'),
('Trophy', 100.00, '🏆'),
('Pizza', 500.00, '🍕'),
('Crown', 1000.00, '👑'),
('Spaceship', 5000.00, '🚀')
ON CONFLICT DO NOTHING;
