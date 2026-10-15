import { z } from "zod";
import { imageFileSchema } from "@/features/categories/category-utils";

export const PRODUCT_NAME_MAX_LENGTH = 120;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم المنتج مطلوب")
    .max(
      PRODUCT_NAME_MAX_LENGTH,
      `يجب ألا يتجاوز اسم المنتج ${PRODUCT_NAME_MAX_LENGTH} حرفًا.`,
    ),
  description: z
    .string()
    .trim()
    .max(
      PRODUCT_DESCRIPTION_MAX_LENGTH,
      `يجب ألا يتجاوز وصف المنتج ${PRODUCT_DESCRIPTION_MAX_LENGTH} حرفًا.`,
    ),
  categoryId: z.string().min(1, "يرجى اختيار تصنيف"),
  price: z
    .number({ invalid_type_error: "السعر مطلوب" })
    .finite("أدخل سعرًا صحيحًا")
    .min(0, "يجب ألا يكون السعر أقل من صفر")
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      "السعر يقبل منزلتين عشريتين كحد أقصى",
    ),
  isAvailable: z.boolean(),
  displayOrder: z
    .number({ invalid_type_error: "ترتيب العرض مطلوب" })
    .int("ترتيب العرض يجب أن يكون عددًا صحيحًا")
    .min(0, "ترتيب العرض يجب ألا يقل عن صفر"),
  imageFile: imageFileSchema,
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export interface ProductCategoryOption {
  id: string;
  name: string;
  is_active: boolean;
}

export interface ProductRecord {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_available: boolean;
  display_order: number;
  created_at: string;
  category: { id: string; name: string } | null;
}

export function getProductErrorMessage(
  error: { code?: string } | null,
  operation: "save" | "delete" = "save",
) {
  if (error?.code === "23503" && operation === "delete") {
    return "لا يمكن حذف المنتج لأنه مرتبط بطلب سابق. يمكنك إيقاف إتاحته بدلاً من ذلك.";
  }
  if (error?.code === "23503") {
    return "التصنيف المختار غير متاح لهذا المطعم.";
  }
  if (error?.code === "42501") {
    return "ليست لديك صلاحية لتنفيذ هذا الإجراء.";
  }
  return operation === "delete"
    ? "تعذر حذف المنتج. يرجى المحاولة مرة أخرى."
    : "تعذر حفظ بيانات المنتج. يرجى المحاولة مرة أخرى.";
}

export function getOwnedProductImagePath(
  imageUrl: string | null | undefined,
  supabaseUrl: string,
  restaurantId: string,
) {
  if (!imageUrl) return null;

  try {
    const image = new URL(imageUrl);
    const project = new URL(supabaseUrl);
    const objectPrefix = "/storage/v1/object/public/product-images/";

    if (
      image.origin !== project.origin ||
      !image.pathname.includes(objectPrefix)
    ) {
      return null;
    }

    const path = decodeURIComponent(
      image.pathname.split(objectPrefix)[1] ?? "",
    );
    if (!path.startsWith(`${restaurantId}/products/`)) return null;
    if (path.split("/").some((segment) => segment === "..")) return null;
    return path;
  } catch {
    return null;
  }
}
