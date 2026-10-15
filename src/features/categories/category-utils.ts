import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from "@/lib/constants";

export { MAX_IMAGE_SIZE_MB };

export const imageFileSchema = z
  .custom<File | null>(
    (value) =>
      value === null || (typeof File !== "undefined" && value instanceof File),
    "ملف الصورة غير صالح",
  )
  .superRefine((file, context) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "صيغة الصورة غير مدعومة. استخدم JPEG أو PNG أو WebP.",
      });
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `يجب ألا يتجاوز حجم الصورة ${MAX_IMAGE_SIZE_MB} ميجابايت.`,
      });
    }
  });

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم التصنيف مطلوب")
    .max(
      MAX_CATEGORY_NAME_LENGTH,
      `يجب ألا يتجاوز اسم التصنيف ${MAX_CATEGORY_NAME_LENGTH} حرفًا.`,
    ),
  displayOrder: z
    .number({ invalid_type_error: "ترتيب العرض مطلوب" })
    .int("ترتيب العرض يجب أن يكون عددًا صحيحًا")
    .min(0, "ترتيب العرض يجب ألا يقل عن صفر"),
  imageFile: imageFileSchema,
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export interface CategoryRecord {
  id: string;
  restaurant_id: string;
  name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAuthorizedRestaurantId(
  supabase: SupabaseClient,
): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("يرجى تسجيل الدخول للوصول إلى تصنيفات المطعم.");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: true })
    .limit(2);

  if (membershipError) {
    throw new Error("تعذر التحقق من صلاحية الوصول إلى المطعم.");
  }
  if (!memberships?.length) {
    throw new Error("لا يوجد مطعم مرتبط بهذا الحساب.");
  }
  if (memberships.length > 1) {
    throw new Error("هذا الحساب مرتبط بأكثر من مطعم. يرجى تحديد المطعم أولاً.");
  }

  return memberships[0].restaurant_id;
}

export function getCategoryErrorMessage(error: { code?: string } | null) {
  if (error?.code === "23503") {
    return "لا يمكن حذف هذا التصنيف لأنه يحتوي على منتجات. انقل المنتجات إلى تصنيف آخر أو احذفها أولاً.";
  }
  if (error?.code === "42501") {
    return "ليست لديك صلاحية لتنفيذ هذا الإجراء.";
  }
  return "تعذر حفظ بيانات التصنيف. يرجى المحاولة مرة أخرى.";
}

export function getOwnedCategoryImagePath(
  imageUrl: string | null | undefined,
  supabaseUrl: string,
  restaurantId: string,
) {
  if (!imageUrl) return null;

  try {
    const image = new URL(imageUrl);
    const project = new URL(supabaseUrl);
    const objectPrefix = "/storage/v1/object/public/category-images/";

    if (
      image.origin !== project.origin ||
      !image.pathname.includes(objectPrefix)
    ) {
      return null;
    }

    const path = decodeURIComponent(
      image.pathname.split(objectPrefix)[1] ?? "",
    );
    if (!path.startsWith(`${restaurantId}/categories/`)) return null;
    if (path.split("/").some((segment) => segment === "..")) return null;

    return path;
  } catch {
    return null;
  }
}
