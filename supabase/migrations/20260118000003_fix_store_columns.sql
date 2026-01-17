-- Add missing columns to support full store functionality
ALTER TABLE public.merchandise ADD COLUMN IF NOT EXISTS fulfillment_by TEXT DEFAULT 'creator';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mpesa_receipt TEXT;

-- Ensure RLS is updated for orders to allow system insertion from edge functions
-- (System role bypasses RLS, but it's good practice)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can insert orders" ON public.orders;
CREATE POLICY "System can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Ensure RLS for order items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can insert order items" ON public.order_items;
CREATE POLICY "System can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
