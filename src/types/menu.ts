export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "website"
  | "whatsapp";

export interface RestaurantProfile {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  logoImageUrl?: string | null;
  socialLinks?: {
    platform: SocialPlatform;
    url: string;
  }[];
}

export interface MenuCategory {
  id: string;
  name: string;
  imageUrl?: string | null;
  displayOrder: number;
}

export interface MenuProduct {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  available: boolean;
  displayOrder: number;
}

export interface PublicRestaurantMenu {
  restaurant: RestaurantProfile;
  categories: MenuCategory[];
  products: MenuProduct[];
}

export interface CartLine {
  product: MenuProduct;
  quantity: number;
}
