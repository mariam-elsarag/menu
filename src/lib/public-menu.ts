import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  MenuCategory,
  MenuProduct,
  PublicRestaurantMenu,
  RestaurantProfile,
} from "@/types/menu";

const restaurantRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logo_url: z.string().nullable(),
  banner_url: z.string().nullable(),
  facebook_url: z.string().nullable(),
  instagram_url: z.string().nullable(),
  tiktok_url: z.string().nullable(),
  whatsapp_number: z.string().nullable(),
});

const categoryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
  display_order: z.number().int(),
});

const productRowSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  price: z
    .union([z.number(), z.string()])
    .transform(Number)
    .pipe(z.number().finite()),
  is_available: z.boolean(),
  display_order: z.number().int(),
});

export type PublicMenuResult =
  | { status: "found"; menu: PublicRestaurantMenu }
  | { status: "not-found" }
  | { status: "error" };

function getSocialLinks(
  restaurant: z.infer<typeof restaurantRowSchema>,
): NonNullable<RestaurantProfile["socialLinks"]> {
  const links: NonNullable<RestaurantProfile["socialLinks"]> = [];
  if (restaurant.facebook_url) {
    links.push({ platform: "facebook", url: restaurant.facebook_url });
  }
  if (restaurant.instagram_url) {
    links.push({ platform: "instagram", url: restaurant.instagram_url });
  }
  if (restaurant.tiktok_url) {
    links.push({ platform: "tiktok", url: restaurant.tiktok_url });
  }

  const whatsappNumber = restaurant.whatsapp_number?.replace(/\D/g, "");
  if (whatsappNumber) {
    links.push({
      platform: "whatsapp",
      url: `https://wa.me/${whatsappNumber}`,
    });
  }

  return links;
}

export async function getPublicMenuBySlug(
  slug: string,
): Promise<PublicMenuResult> {
  try {
    const supabase = await createClient();
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, description, logo_url, banner_url, facebook_url, instagram_url, tiktok_url, whatsapp_number, is_published",
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (restaurantError) return { status: "error" };
    if (!restaurantData) return { status: "not-found" };

    const restaurantResult = restaurantRowSchema.safeParse(restaurantData);
    if (!restaurantResult.success) return { status: "error" };
    const restaurant = restaurantResult.data;

    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, image_url, display_order")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (categoryError) return { status: "error" };
    const categoryResult = z.array(categoryRowSchema).safeParse(categoryData);
    if (!categoryResult.success) return { status: "error" };
    const categories: MenuCategory[] = categoryResult.data.map((category) => ({
      id: category.id,
      name: category.name,
      imageUrl: category.image_url,
      displayOrder: category.display_order,
    }));

    let products: MenuProduct[] = [];
    if (categories.length > 0) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(
          "id, category_id, name, description, image_url, price, is_available, display_order",
        )
        .eq("restaurant_id", restaurant.id)
        .in(
          "category_id",
          categories.map((category) => category.id),
        )
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });

      if (productError) return { status: "error" };
      const productResult = z.array(productRowSchema).safeParse(productData);
      if (!productResult.success) return { status: "error" };
      products = productResult.data.map((product) => ({
        id: product.id,
        categoryId: product.category_id,
        name: product.name,
        description: product.description,
        imageUrl: product.image_url,
        price: product.price,
        available: product.is_available,
        displayOrder: product.display_order,
      }));
    }

    return {
      status: "found",
      menu: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          description: restaurant.description,
          logoImageUrl: restaurant.logo_url,
          bannerImageUrl: restaurant.banner_url,
          socialLinks: getSocialLinks(restaurant),
        },
        categories,
        products,
      },
    };
  } catch {
    return { status: "error" };
  }
}
