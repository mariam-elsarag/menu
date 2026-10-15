ALTER TABLE public.restaurants
  ADD COLUMN is_published boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.restaurants.is_published IS
  'Whether this restaurant menu is visible to public customers.';

REVOKE SELECT ON public.restaurants FROM anon;
GRANT SELECT (
  id, name, slug, description, logo_url, banner_url,
  facebook_url, instagram_url, tiktok_url, whatsapp_number, is_published
) ON public.restaurants TO anon;
GRANT UPDATE (is_published) ON public.restaurants TO authenticated;

REVOKE SELECT ON public.categories, public.products FROM anon;
GRANT SELECT (
  id, restaurant_id, name, image_url, display_order, is_active
) ON public.categories TO anon;
GRANT SELECT (
  id, restaurant_id, category_id, name, description, image_url,
  price, is_available, display_order
) ON public.products TO anon;

DROP POLICY IF EXISTS restaurants_public_read ON public.restaurants;
CREATE POLICY restaurants_public_read
  ON public.restaurants FOR SELECT TO anon, authenticated
  USING (is_published);

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read
  ON public.categories FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id = categories.restaurant_id
        AND restaurant.is_published
    )
  );

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      JOIN public.categories AS category
        ON category.restaurant_id = restaurant.id
      WHERE restaurant.id = products.restaurant_id
        AND category.id = products.category_id
        AND category.is_active
        AND restaurant.is_published
    )
  );