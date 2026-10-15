BEGIN;

INSERT INTO public.restaurants (
  id,
  name,
  slug,
  description,
  logo_url,
  banner_url,
  facebook_url,
  instagram_url,
  tiktok_url,
  whatsapp_number
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'بيت الشاورما',
    'beit-al-shawarma',
    'شاورما مصرية وشامية أصيلة، ووجبات مشوية ومقبلات طازجة.',
    NULL, NULL, NULL, NULL, NULL, NULL
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'برجر هاوس',
    'burger-house',
    'برجر طازج وسندوتشات محضرة عند الطلب مع بطاطس ومقبلات.',
    NULL, NULL, NULL, NULL, NULL, NULL
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'ركن الفطار',
    'rokn-el-fetar',
    'فطار مصري طازج وأكلات بيتية محضرة كل يوم.',
    NULL, NULL, NULL, NULL, NULL, NULL
  )
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    banner_url = EXCLUDED.banner_url,
    facebook_url = EXCLUDED.facebook_url,
    instagram_url = EXCLUDED.instagram_url,
    tiktok_url = EXCLUDED.tiktok_url,
    whatsapp_number = EXCLUDED.whatsapp_number;

WITH category_seed (
  restaurant_order,
  restaurant_slug,
  name,
  display_order
) AS (
  VALUES
    (1, 'beit-al-shawarma', 'الشاورما', 1),
    (1, 'beit-al-shawarma', 'الوجبات', 2),
    (1, 'beit-al-shawarma', 'الساندوتشات', 3),
    (1, 'beit-al-shawarma', 'المقبلات والصوصات', 4),
    (2, 'burger-house', 'البرجر', 1),
    (2, 'burger-house', 'وجبات البرجر', 2),
    (2, 'burger-house', 'البطاطس والمقبلات', 3),
    (2, 'burger-house', 'المشروبات', 4),
    (3, 'rokn-el-fetar', 'الفطائر', 1),
    (3, 'rokn-el-fetar', 'الفول والطعمية', 2),
    (3, 'rokn-el-fetar', 'البيض والجبن', 3),
    (3, 'rokn-el-fetar', 'المشروبات الساخنة', 4)
), numbered_categories AS (
  SELECT
    category_seed.*,
    row_number() OVER (
      ORDER BY restaurant_order, display_order
    ) AS seed_number
  FROM category_seed
)
INSERT INTO public.categories (
  id,
  restaurant_id,
  name,
  image_url,
  display_order,
  is_active
)
SELECT
  (
    '10000000-0000-4000-8000-' ||
    lpad(numbered_categories.seed_number::text, 12, '0')
  )::uuid,
  restaurant.id,
  numbered_categories.name,
  NULL,
  numbered_categories.display_order,
  true
FROM numbered_categories
JOIN public.restaurants AS restaurant
  ON restaurant.slug = numbered_categories.restaurant_slug
ON CONFLICT (id) DO UPDATE
SET restaurant_id = EXCLUDED.restaurant_id,
    name = EXCLUDED.name,
    image_url = EXCLUDED.image_url,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

WITH product_seed (
  restaurant_order,
  restaurant_slug,
  category_order,
  category_name,
  name,
  description,
  price,
  is_available,
  display_order
) AS (
  VALUES
    (1, 'beit-al-shawarma', 1, 'الشاورما', 'شاورما فراخ', 'شرائح فراخ متبلة مع الثومية والمخلل.', 90.00, true, 1),
    (1, 'beit-al-shawarma', 1, 'الشاورما', 'شاورما لحمة', 'شرائح لحم متبلة تقدم مع صوص الطحينة.', 120.00, true, 2),
    (1, 'beit-al-shawarma', 1, 'الشاورما', 'شاورما فراخ بالجبنة', 'شاورما فراخ مع جبنة ذائبة وخبز طازج.', 115.00, true, 3),
    (1, 'beit-al-shawarma', 1, 'الشاورما', 'شاورما لحمة دبل', 'كمية مضاعفة من شاورما اللحمة مع الطحينة.', 160.00, true, 4),
    (1, 'beit-al-shawarma', 1, 'الشاورما', 'شاورما ميكس', 'مزيج من شاورما الفراخ واللحمة مع الخضار.', 135.00, false, 5),

    (1, 'beit-al-shawarma', 2, 'الوجبات', 'وجبة شاورما فراخ', 'شاورما فراخ مع أرز وبطاطس وثومية.', 150.00, true, 1),
    (1, 'beit-al-shawarma', 2, 'الوجبات', 'وجبة شاورما لحمة', 'شاورما لحمة مع أرز وبطاطس وطحينة.', 190.00, true, 2),
    (1, 'beit-al-shawarma', 2, 'الوجبات', 'وجبة شاورما عربي', 'شاورما ملفوفة ومقطعة مع بطاطس وصوص.', 180.00, true, 3),
    (1, 'beit-al-shawarma', 2, 'الوجبات', 'وجبة شاورما عائلية', 'تشكيلة شاورما مع أرز وخبز ومقبلات تكفي العائلة.', 360.00, true, 4),
    (1, 'beit-al-shawarma', 2, 'الوجبات', 'طبق شاورما مشوي', 'طبق شاورما فراخ مع خضار مشوي وأرز.', 170.00, false, 5),

    (1, 'beit-al-shawarma', 3, 'الساندوتشات', 'ساندوتش شاورما عربي', 'شاورما فراخ في خبز عربي مع الثومية والمخلل.', 110.00, true, 1),
    (1, 'beit-al-shawarma', 3, 'الساندوتشات', 'ساندوتش فراخ صاج', 'شاورما فراخ في خبز صاج محمص.', 95.00, true, 2),
    (1, 'beit-al-shawarma', 3, 'الساندوتشات', 'ساندوتش لحمة صاج', 'شاورما لحمة مع الطحينة داخل خبز صاج.', 125.00, true, 3),
    (1, 'beit-al-shawarma', 3, 'الساندوتشات', 'ساندوتش بطاطس', 'بطاطس محمرة مع صوص الثومية في خبز طازج.', 35.00, true, 4),
    (1, 'beit-al-shawarma', 3, 'الساندوتشات', 'ساندوتش كفتة', 'كفتة مشوية مع طحينة وخضار طازج.', 100.00, true, 5),

    (1, 'beit-al-shawarma', 4, 'المقبلات والصوصات', 'بطاطس محمرة', 'بطاطس ذهبية مقرمشة تقدم ساخنة.', 35.00, true, 1),
    (1, 'beit-al-shawarma', 4, 'المقبلات والصوصات', 'ثومية', 'صوص ثومية كريمي محضر طازجًا.', 15.00, true, 2),
    (1, 'beit-al-shawarma', 4, 'المقبلات والصوصات', 'مخلل مشكل', 'تشكيلة مخلل مقرمشة بطعم بيتي.', 10.00, true, 3),
    (1, 'beit-al-shawarma', 4, 'المقبلات والصوصات', 'كولسلو', 'سلطة ملفوف وجزر بصوص خفيف.', 25.00, true, 4),
    (1, 'beit-al-shawarma', 4, 'المقبلات والصوصات', 'خبز شامي', 'خبز شامي طازج يقدم دافئًا.', 12.00, false, 5),

    (2, 'burger-house', 1, 'البرجر', 'برجر كلاسيك', 'قطعة لحم مشوية مع الخس والطماطم وصوص المطعم.', 130.00, true, 1),
    (2, 'burger-house', 1, 'البرجر', 'تشيز برجر', 'برجر لحم مع شريحة جبنة ذائبة.', 150.00, true, 2),
    (2, 'burger-house', 1, 'البرجر', 'دبل برجر', 'قطعتا لحم مشويتان مع الجبنة وصوص خاص.', 200.00, true, 3),
    (2, 'burger-house', 1, 'البرجر', 'برجر مشروم', 'برجر لحم مع مشروم مشوح وصوص كريمي.', 175.00, true, 4),
    (2, 'burger-house', 1, 'البرجر', 'برجر باربكيو', 'برجر لحم مع صوص باربكيو وبصل محمر.', 165.00, false, 5),

    (2, 'burger-house', 2, 'وجبات البرجر', 'وجبة برجر كلاسيك', 'برجر كلاسيك مع بطاطس ومشروب.', 190.00, true, 1),
    (2, 'burger-house', 2, 'وجبات البرجر', 'وجبة تشيز برجر', 'تشيز برجر مع بطاطس ومشروب.', 210.00, true, 2),
    (2, 'burger-house', 2, 'وجبات البرجر', 'وجبة دبل برجر', 'دبل برجر مع بطاطس ومشروب.', 260.00, true, 3),
    (2, 'burger-house', 2, 'وجبات البرجر', 'وجبة برجر فراخ', 'برجر فراخ مقرمش مع بطاطس ومشروب.', 185.00, true, 4),
    (2, 'burger-house', 2, 'وجبات البرجر', 'وجبة برجر عائلية', 'أربعة برجر مع بطاطس كبيرة وأربع مشروبات.', 450.00, false, 5),

    (2, 'burger-house', 3, 'البطاطس والمقبلات', 'بطاطس مقلية', 'بطاطس مقرمشة متبلة بملح خفيف.', 40.00, true, 1),
    (2, 'burger-house', 3, 'البطاطس والمقبلات', 'حلقات بصل', 'حلقات بصل مغطاة بطبقة مقرمشة.', 55.00, true, 2),
    (2, 'burger-house', 3, 'البطاطس والمقبلات', 'أصابع موزاريلا', 'أصابع جبنة موزاريلا مقلية.', 70.00, true, 3),
    (2, 'burger-house', 3, 'البطاطس والمقبلات', 'بطاطس محملة', 'بطاطس مع جبنة ذائبة وصوص المطعم.', 95.00, true, 4),
    (2, 'burger-house', 3, 'البطاطس والمقبلات', 'ستربس فراخ', 'قطع فراخ مقرمشة تقدم مع صوص.', 105.00, true, 5),

    (2, 'burger-house', 4, 'المشروبات', 'كولا', 'مشروب غازي بارد.', 25.00, true, 1),
    (2, 'burger-house', 4, 'المشروبات', 'عصير برتقال', 'عصير برتقال منعش.', 35.00, true, 2),
    (2, 'burger-house', 4, 'المشروبات', 'مياه معدنية', 'زجاجة مياه معدنية.', 15.00, true, 3),
    (2, 'burger-house', 4, 'المشروبات', 'ليمون بالنعناع', 'ليمون طازج مع نعناع.', 40.00, true, 4),
    (2, 'burger-house', 4, 'المشروبات', 'ميلك شيك فانيليا', 'ميلك شيك بارد بطعم الفانيليا.', 60.00, false, 5),

    (3, 'rokn-el-fetar', 1, 'الفطائر', 'فطير بالجبنة', 'فطير مشلتت محشو بجبنة بيضاء.', 70.00, true, 1),
    (3, 'rokn-el-fetar', 1, 'الفطائر', 'فطير سادة', 'فطير مشلتت طازج يقدم ساخنًا.', 60.00, true, 2),
    (3, 'rokn-el-fetar', 1, 'الفطائر', 'فطير بالعسل والقشطة', 'فطير حلو مع عسل وقشطة.', 85.00, false, 3),
    (3, 'rokn-el-fetar', 1, 'الفطائر', 'فطير بالسجق', 'فطير محشو بالسجق والفلفل.', 90.00, true, 4),
    (3, 'rokn-el-fetar', 1, 'الفطائر', 'فطير بالبسطرمة والجبنة', 'فطير محشو بالبسطرمة والجبنة.', 100.00, true, 5),

    (3, 'rokn-el-fetar', 2, 'الفول والطعمية', 'فول بالزيت الحار', 'فول مدمس مع زيت حار وكمون.', 35.00, true, 1),
    (3, 'rokn-el-fetar', 2, 'الفول والطعمية', 'طبق طعمية', 'أقراص طعمية مقلية تقدم ساخنة.', 25.00, true, 2),
    (3, 'rokn-el-fetar', 2, 'الفول والطعمية', 'ساندوتش بطاطس', 'بطاطس محمرة في عيش بلدي طازج.', 30.00, true, 3),
    (3, 'rokn-el-fetar', 2, 'الفول والطعمية', 'ساندوتش فول', 'فول مدمس مع سلطة وطحينة في عيش بلدي.', 20.00, true, 4),
    (3, 'rokn-el-fetar', 2, 'الفول والطعمية', 'ساندوتش طعمية', 'طعمية مع سلطة وطحينة في عيش بلدي.', 25.00, false, 5),

    (3, 'rokn-el-fetar', 3, 'البيض والجبن', 'بيض بالبسطرمة', 'بيض طازج مع بسطرمة محمرة.', 80.00, true, 1),
    (3, 'rokn-el-fetar', 3, 'البيض والجبن', 'أومليت بالجبنة', 'بيض مخفوق مع جبنة وخضار.', 65.00, true, 2),
    (3, 'rokn-el-fetar', 3, 'البيض والجبن', 'ساندوتش بيض', 'بيض محضر طازجًا مع خيار في عيش بلدي.', 35.00, true, 3),
    (3, 'rokn-el-fetar', 3, 'البيض والجبن', 'طبق جبنة بيضاء', 'جبنة بيضاء مع طماطم وخيار.', 55.00, false, 4),
    (3, 'rokn-el-fetar', 3, 'البيض والجبن', 'بيض بالسجق', 'بيض مع سجق شرقي متبل.', 85.00, true, 5),

    (3, 'rokn-el-fetar', 4, 'المشروبات الساخنة', 'شاي', 'شاي مصري يقدم ساخنًا.', 15.00, true, 1),
    (3, 'rokn-el-fetar', 4, 'المشروبات الساخنة', 'شاي بالنعناع', 'شاي أسود مع نعناع طازج.', 18.00, true, 2),
    (3, 'rokn-el-fetar', 4, 'المشروبات الساخنة', 'قهوة تركي', 'قهوة تركي محضرة على الطريقة المصرية.', 25.00, true, 3),
    (3, 'rokn-el-fetar', 4, 'المشروبات الساخنة', 'يانسون', 'مشروب يانسون دافئ.', 18.00, true, 4),
    (3, 'rokn-el-fetar', 4, 'المشروبات الساخنة', 'سحلب', 'سحلب دافئ بالقرفة وجوز الهند.', 40.00, true, 5)
), numbered_products AS (
  SELECT
    product_seed.*,
    row_number() OVER (
      ORDER BY restaurant_order, category_order, display_order
    ) AS seed_number
  FROM product_seed
)
INSERT INTO public.products (
  id,
  restaurant_id,
  category_id,
  name,
  description,
  image_url,
  price,
  is_available,
  display_order
)
SELECT
  (
    '20000000-0000-4000-8000-' ||
    lpad(numbered_products.seed_number::text, 12, '0')
  )::uuid,
  restaurant.id,
  category.id,
  numbered_products.name,
  numbered_products.description,
  NULL,
  numbered_products.price,
  numbered_products.is_available,
  numbered_products.display_order
FROM numbered_products
JOIN public.restaurants AS restaurant
  ON restaurant.slug = numbered_products.restaurant_slug
JOIN public.categories AS category
  ON category.restaurant_id = restaurant.id
  AND category.name = numbered_products.category_name
  AND category.display_order = numbered_products.category_order
ON CONFLICT (id) DO UPDATE
SET restaurant_id = EXCLUDED.restaurant_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    price = EXCLUDED.price,
    is_available = EXCLUDED.is_available,
    display_order = EXCLUDED.display_order;

COMMIT;