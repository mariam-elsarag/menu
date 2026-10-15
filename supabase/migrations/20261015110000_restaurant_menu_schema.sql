CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE SEQUENCE private.order_number_seq AS bigint;
REVOKE ALL ON SEQUENCE private.order_number_seq FROM PUBLIC, anon, authenticated;

CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  slug text NOT NULL UNIQUE CHECK (length(btrim(slug)) > 0),
  description text,
  logo_url text,
  banner_url text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  whatsapp_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_users_restaurant_user_key UNIQUE (restaurant_id, user_id)
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_restaurant_id_id_key UNIQUE (restaurant_id, id)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  image_url text,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_available boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_restaurant_category_fkey
    FOREIGN KEY (restaurant_id, category_id)
    REFERENCES public.categories(restaurant_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  table_number text NOT NULL CHECK (
    length(btrim(table_number)) BETWEEN 1 AND 40
  ),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'completed', 'cancelled')),
  total_amount numeric(10, 2) NOT NULL DEFAULT 0
    CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_restaurant_order_number_key UNIQUE (restaurant_id, order_number)
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL
    REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL
    REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL CHECK (length(btrim(product_name)) > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(10, 2) NOT NULL CHECK (
    subtotal >= 0 AND subtotal = round(unit_price * quantity, 2)
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX restaurant_users_user_id_restaurant_id_idx
  ON public.restaurant_users (user_id, restaurant_id);
CREATE INDEX categories_restaurant_active_order_idx
  ON public.categories (restaurant_id, is_active, display_order);
CREATE INDEX products_restaurant_category_available_order_idx
  ON public.products (restaurant_id, category_id, is_available, display_order);
CREATE INDEX products_category_id_idx
  ON public.products (category_id);
CREATE INDEX orders_restaurant_status_created_at_idx
  ON public.orders (restaurant_id, status, created_at DESC);
CREATE INDEX orders_restaurant_created_at_idx
  ON public.orders (restaurant_id, created_at DESC);
CREATE INDEX order_items_order_id_idx
  ON public.order_items (order_id);
CREATE INDEX order_items_product_id_idx
  ON public.order_items (product_id);

CREATE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER restaurants_set_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE FUNCTION private.is_restaurant_member(
  p_restaurant_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_users AS restaurant_user
    WHERE restaurant_user.restaurant_id = p_restaurant_id
      AND restaurant_user.user_id = (SELECT auth.uid())
      AND restaurant_user.role = ANY (p_roles)
  );
$$;

REVOKE ALL ON FUNCTION private.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.set_updated_at() TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.is_restaurant_member(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_restaurant_member(uuid, text[])
  TO anon, authenticated;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY restaurants_public_read
  ON public.restaurants FOR SELECT TO anon
  USING (true);
CREATE POLICY restaurants_member_read
  ON public.restaurants FOR SELECT TO authenticated
  USING (
    (SELECT private.is_restaurant_member(id, ARRAY['owner', 'staff']::text[]))
  );
CREATE POLICY restaurants_owner_update
  ON public.restaurants FOR UPDATE TO authenticated
  USING ((SELECT private.is_restaurant_member(id, ARRAY['owner']::text[])))
  WITH CHECK ((SELECT private.is_restaurant_member(id, ARRAY['owner']::text[])));

CREATE POLICY restaurant_users_read
  ON public.restaurant_users FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner']::text[]))
  );
CREATE POLICY restaurant_users_owner_insert
  ON public.restaurant_users FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner']::text[]))
  );
CREATE POLICY restaurant_users_owner_update
  ON public.restaurant_users FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner']::text[]))
  )
  WITH CHECK (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner']::text[]))
  );
CREATE POLICY restaurant_users_owner_delete
  ON public.restaurant_users FOR DELETE TO authenticated
  USING (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner']::text[]))
  );

CREATE POLICY categories_public_read
  ON public.categories FOR SELECT TO anon
  USING (
    is_active
    OR (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  );
CREATE POLICY categories_staff_manage
  ON public.categories FOR ALL TO authenticated
  USING (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  )
  WITH CHECK (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  );

CREATE POLICY products_public_read
  ON public.products FOR SELECT TO anon
  USING (
    (
      is_available
      AND EXISTS (
        SELECT 1
        FROM public.categories AS category
        WHERE category.id = products.category_id
          AND category.restaurant_id = products.restaurant_id
          AND category.is_active
      )
    )
    OR (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  );
CREATE POLICY products_staff_manage
  ON public.products FOR ALL TO authenticated
  USING (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  )
  WITH CHECK (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  );

CREATE POLICY orders_staff_read
  ON public.orders FOR SELECT TO authenticated
  USING (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  );
CREATE POLICY orders_staff_update
  ON public.orders FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  )
  WITH CHECK (
    (SELECT private.is_restaurant_member(restaurant_id, ARRAY['owner', 'staff']::text[]))
  );

CREATE POLICY order_items_staff_read
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders AS customer_order
      WHERE customer_order.id = order_id
    )
  );

REVOKE ALL ON TABLE
  public.restaurants,
  public.restaurant_users,
  public.categories,
  public.products,
  public.orders,
  public.order_items
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.restaurants, public.categories, public.products
  TO anon, authenticated;
GRANT SELECT ON public.restaurant_users, public.orders, public.order_items
  TO authenticated;

GRANT UPDATE (
  name, slug, description, logo_url, banner_url,
  facebook_url, instagram_url, tiktok_url, whatsapp_number
) ON public.restaurants TO authenticated;

GRANT INSERT (restaurant_id, user_id, role), UPDATE (role), DELETE
  ON public.restaurant_users TO authenticated;

GRANT INSERT (restaurant_id, name, image_url, display_order, is_active),
  UPDATE (name, image_url, display_order, is_active), DELETE
  ON public.categories TO authenticated;
GRANT INSERT (
  restaurant_id, category_id, name, description, image_url,
  price, is_available, display_order
), UPDATE (
  category_id, name, description, image_url,
  price, is_available, display_order
), DELETE ON public.products TO authenticated;

GRANT UPDATE (status) ON public.orders TO authenticated;

CREATE FUNCTION public.submit_public_order(
  p_restaurant_id uuid,
  p_table_number text,
  p_items jsonb
)
RETURNS TABLE (created_order_id uuid, created_order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order_id uuid := pg_catalog.gen_random_uuid();
  v_order_number text;
  v_total numeric;
  v_requested_count bigint;
  v_matched_count bigint;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A restaurant is required.';
  END IF;

  IF p_table_number IS NULL
    OR pg_catalog.length(pg_catalog.btrim(p_table_number)) NOT BETWEEN 1 AND 40
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid table number is required.';
  END IF;

  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Order items must be a non-empty array.';
  END IF;

  IF pg_catalog.jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Order item count is invalid.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    WHERE pg_catalog.jsonb_typeof(item.value) IS DISTINCT FROM 'object'
      OR pg_catalog.jsonb_typeof(item.value -> 'product_id') IS DISTINCT FROM 'string'
      OR COALESCE(item.value ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR COALESCE(item.value ->> 'quantity', '') !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'One or more order items are invalid.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    WHERE (item.value ->> 'quantity')::numeric < 1
      OR (item.value ->> 'quantity')::numeric > 2147483647
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Order quantities are invalid.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants AS restaurant
    WHERE restaurant.id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The restaurant is unavailable.';
  END IF;

  PERFORM product.id
  FROM (
    SELECT
      (item.value ->> 'product_id')::uuid AS product_id,
      pg_catalog.sum((item.value ->> 'quantity')::numeric) AS quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    GROUP BY (item.value ->> 'product_id')::uuid
  ) AS requested
  JOIN public.products AS product ON product.id = requested.product_id
  JOIN public.categories AS category
    ON category.id = product.category_id
    AND category.restaurant_id = product.restaurant_id
  WHERE product.restaurant_id = p_restaurant_id
  ORDER BY product.id
  FOR SHARE OF product, category;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT pg_catalog.sum((item.value ->> 'quantity')::numeric) AS quantity
      FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
      GROUP BY (item.value ->> 'product_id')::uuid
    ) AS requested
    WHERE requested.quantity > 2147483647
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Order quantities are invalid.';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_requested_count
  FROM (
    SELECT (item.value ->> 'product_id')::uuid AS product_id
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    GROUP BY (item.value ->> 'product_id')::uuid
  ) AS requested;

  SELECT pg_catalog.count(*)
  INTO v_matched_count
  FROM (
    SELECT
      (item.value ->> 'product_id')::uuid AS product_id,
      pg_catalog.sum((item.value ->> 'quantity')::numeric) AS quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    GROUP BY (item.value ->> 'product_id')::uuid
  ) AS requested
  JOIN public.products AS product
    ON product.id = requested.product_id
    AND product.restaurant_id = p_restaurant_id
    AND product.is_available
  JOIN public.categories AS category
    ON category.id = product.category_id
    AND category.restaurant_id = product.restaurant_id
    AND category.is_active;

  IF v_requested_count <> v_matched_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'One or more products are unavailable.';
  END IF;

  SELECT pg_catalog.sum(product.price * requested.quantity)
  INTO v_total
  FROM (
    SELECT
      (item.value ->> 'product_id')::uuid AS product_id,
      pg_catalog.sum((item.value ->> 'quantity')::numeric) AS quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    GROUP BY (item.value ->> 'product_id')::uuid
  ) AS requested
  JOIN public.products AS product
    ON product.id = requested.product_id
    AND product.restaurant_id = p_restaurant_id
  JOIN public.categories AS category
    ON category.id = product.category_id
    AND category.restaurant_id = product.restaurant_id
    AND category.is_active
  WHERE product.is_available;

  IF v_total IS NULL OR v_total > 99999999.99 THEN
    RAISE EXCEPTION USING ERRCODE = '22003', MESSAGE = 'The order total is out of range.';
  END IF;

  v_order_number := pg_catalog.nextval('private.order_number_seq'::regclass)::text;

  INSERT INTO public.orders (
    id, restaurant_id, order_number, table_number, status, total_amount
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    v_order_number,
    pg_catalog.btrim(p_table_number),
    'pending',
    v_total
  );

  INSERT INTO public.order_items (
    order_id, product_id, product_name, quantity, unit_price, subtotal
  )
  SELECT
    v_order_id,
    product.id,
    product.name,
    requested.quantity::integer,
    product.price,
    (product.price * requested.quantity)::numeric(10, 2)
  FROM (
    SELECT
      (item.value ->> 'product_id')::uuid AS product_id,
      pg_catalog.sum((item.value ->> 'quantity')::numeric) AS quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    GROUP BY (item.value ->> 'product_id')::uuid
  ) AS requested
  JOIN public.products AS product
    ON product.id = requested.product_id
    AND product.restaurant_id = p_restaurant_id
    AND product.is_available
  JOIN public.categories AS category
    ON category.id = product.category_id
    AND category.restaurant_id = product.restaurant_id
    AND category.is_active;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_order(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_order(uuid, text, jsonb)
  TO anon, authenticated;

COMMENT ON FUNCTION public.submit_public_order(uuid, text, jsonb) IS
  'Validates a public menu order and stores server-calculated price snapshots atomically.';
COMMENT ON TABLE public.order_items IS
  'Order-time product name and price snapshots preserve historical receipts.';
COMMENT ON TABLE public.restaurant_users IS
  'The first owner membership must be provisioned by a trusted server-side admin; clients cannot self-assign.';