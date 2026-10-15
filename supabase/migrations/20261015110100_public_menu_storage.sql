INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES
  ('restaurant-logos', 'restaurant-logos', true, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('restaurant-banners', 'restaurant-banners', true, 10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('category-images', 'category-images', true, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('product-images', 'product-images', true, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION private.storage_restaurant_id(p_object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN pg_catalog.split_part(p_object_name, '/', 2) <> ''
      AND pg_catalog.split_part(p_object_name, '/', 1)
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN pg_catalog.split_part(p_object_name, '/', 1)::uuid
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION private.storage_restaurant_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.storage_restaurant_id(text) TO authenticated;

CREATE POLICY public_menu_images_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id IN (
      'restaurant-logos',
      'restaurant-banners',
      'category-images',
      'product-images'
    )
  );

CREATE POLICY restaurant_members_upload_menu_images
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN (
      'restaurant-logos',
      'restaurant-banners',
      'category-images',
      'product-images'
    )
    AND (
      SELECT private.is_restaurant_member(
        private.storage_restaurant_id(name),
        ARRAY['owner', 'staff']::text[]
      )
    )
  );

CREATE POLICY restaurant_members_update_menu_images
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN (
      'restaurant-logos',
      'restaurant-banners',
      'category-images',
      'product-images'
    )
    AND (
      SELECT private.is_restaurant_member(
        private.storage_restaurant_id(name),
        ARRAY['owner', 'staff']::text[]
      )
    )
  )
  WITH CHECK (
    bucket_id IN (
      'restaurant-logos',
      'restaurant-banners',
      'category-images',
      'product-images'
    )
    AND (
      SELECT private.is_restaurant_member(
        private.storage_restaurant_id(name),
        ARRAY['owner', 'staff']::text[]
      )
    )
  );

CREATE POLICY restaurant_members_delete_menu_images
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN (
      'restaurant-logos',
      'restaurant-banners',
      'category-images',
      'product-images'
    )
    AND (
      SELECT private.is_restaurant_member(
        private.storage_restaurant_id(name),
        ARRAY['owner', 'staff']::text[]
      )
    )
  );