
-- Create storage buckets for avatars and products if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for avatars
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND auth.uid() = owner
);

-- Set up storage policies for products
CREATE POLICY "Public Access Products"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

CREATE POLICY "Authenticated users can upload products"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'products'
    AND auth.uid() = owner
);
