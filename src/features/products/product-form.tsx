"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { ImagePicker } from "@/components/shared/ImagePicker";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getAuthorizedRestaurantId } from "@/features/categories/category-utils";
import {
  getOwnedProductImagePath,
  getProductErrorMessage,
  productFormSchema,
  type ProductCategoryOption,
  type ProductFormValues,
  type ProductRecord,
} from "./product-utils";
import { formatEgpPrice } from "@/lib/formatters";

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return getProductErrorMessage({ code: error.code });
  }
  return getProductErrorMessage(null);
}

function imageExtension(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("صيغة الصورة غير مدعومة. استخدم JPEG أو PNG أو WebP.");
  }
}

export function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentImageRemoved, setCurrentImageRemoved] = useState(false);
  const [savePhase, setSavePhase] = useState<"idle" | "uploading" | "saving">(
    "idle",
  );
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      price: 0,
      isAvailable: true,
      displayOrder: 0,
      imageFile: null,
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const authorizedRestaurantId =
          await getAuthorizedRestaurantId(supabase);
        if (cancelled) return;
        setRestaurantId(authorizedRestaurantId);

        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name, is_active")
          .eq("restaurant_id", authorizedRestaurantId)
          .order("display_order", { ascending: true });

        if (categoryError) throw categoryError;
        const categoryOptions = (categoryData ?? []) as ProductCategoryOption[];
        setCategories(categoryOptions);

        if (mode === "edit") {
          if (!productId) throw new Error("المنتج المطلوب غير موجود.");

          const { data, error } = await supabase
            .from("products")
            .select(
              "id, restaurant_id, category_id, name, description, image_url, price, is_available, display_order, created_at",
            )
            .eq("id", productId)
            .eq("restaurant_id", authorizedRestaurantId)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            setProduct(null);
            return;
          }

          const existing = data as ProductRecord;
          setProduct(existing);
          reset({
            name: existing.name,
            description: existing.description ?? "",
            categoryId: existing.category_id,
            price: Number(existing.price),
            isAvailable: existing.is_available,
            displayOrder: existing.display_order,
            imageFile: null,
          });
        } else {
          const { data: orderData, error: orderError } = await supabase
            .from("products")
            .select("display_order")
            .eq("restaurant_id", authorizedRestaurantId)
            .order("display_order", { ascending: false })
            .limit(1);

          if (orderError) throw orderError;
          const nextOrder = (orderData?.[0]?.display_order ?? 0) + 1;
          reset({
            name: "",
            description: "",
            categoryId: categoryOptions[0]?.id ?? "",
            price: 0,
            isAvailable: true,
            displayOrder: nextOrder,
            imageFile: null,
          });
        }
      } catch (error) {
        if (!cancelled) setLoadError(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    }

    void loadFormData();
    return () => {
      cancelled = true;
    };
  }, [mode, productId, reset, supabase]);

  async function onSubmit(values: ProductFormValues) {
    if (!restaurantId) return;

    const { data: validCategory, error: categoryCheckError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", values.categoryId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (categoryCheckError || !validCategory) {
      setError("categoryId", {
        type: "validate",
        message: "التصنيف المحدد غير متاح لهذا المطعم. اختر تصنيفًا آخر.",
      });
      return;
    }

    const { url: supabaseUrl } = getSupabasePublicConfig();
    const previousImagePath = getOwnedProductImagePath(
      product?.image_url,
      supabaseUrl,
      restaurantId,
    );
    let uploadedImagePath: string | null = null;
    let nextImageUrl = product?.image_url ?? null;

    if (values.imageFile) {
      setSavePhase("uploading");
      try {
        const extension = imageExtension(values.imageFile);
        uploadedImagePath = `${restaurantId}/products/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(uploadedImagePath, values.imageFile, {
            cacheControl: "3600",
            contentType: values.imageFile.type,
            upsert: false,
          });
        if (error) throw error;

        nextImageUrl = supabase.storage
          .from("product-images")
          .getPublicUrl(uploadedImagePath).data.publicUrl;
      } catch (error) {
        if (uploadedImagePath) {
          try {
            await supabase.storage
              .from("product-images")
              .remove([uploadedImagePath]);
          } catch {
            // Ignore cleanup failures when the product row was never saved.
          }
        }
        toast.error(getErrorMessage(error));
        setSavePhase("idle");
        return;
      }
    } else if (currentImageRemoved) {
      nextImageUrl = null;
    }

    setSavePhase("saving");
    const productValues = {
      category_id: values.categoryId,
      name: values.name,
      description: values.description || null,
      image_url: nextImageUrl,
      price: values.price,
      is_available: values.isAvailable,
      display_order: values.displayOrder,
    };

    try {
      if (mode === "create") {
        const { error } = await supabase.from("products").insert({
          restaurant_id: restaurantId,
          ...productValues,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .update(productValues)
          .eq("id", productId ?? "")
          .eq("restaurant_id", restaurantId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("لم يتم العثور على المنتج المطلوب.");
      }
    } catch (error) {
      if (uploadedImagePath) {
        try {
          await supabase.storage
            .from("product-images")
            .remove([uploadedImagePath]);
        } catch {
          // Preserve the database error when cleanup also fails.
        }
      }
      toast.error(getErrorMessage(error));
      setSavePhase("idle");
      return;
    }

    const shouldRemoveOldImage =
      Boolean(previousImagePath) &&
      previousImagePath !== uploadedImagePath &&
      Boolean(values.imageFile || currentImageRemoved);
    let oldImageCleanupFailed = false;
    if (shouldRemoveOldImage && previousImagePath) {
      try {
        const { error } = await supabase.storage
          .from("product-images")
          .remove([previousImagePath]);
        oldImageCleanupFailed = Boolean(error);
      } catch {
        oldImageCleanupFailed = true;
      }
    }

    toast.success(
      mode === "create" ? "تم حفظ المنتج بنجاح" : "تم تحديث المنتج بنجاح",
    );
    if (oldImageCleanupFailed) {
      toast.error("تم حفظ المنتج، لكن تعذر حذف الصورة القديمة.");
    }
    router.replace("/dashboard/products");
    router.refresh();
  }

  if (loadingRecord) {
    return (
      <section className="ui-card grid gap-5 rounded-lg p-6" aria-busy="true">
        <span className="ui-skeleton h-7 w-40" />
        <span className="ui-skeleton h-44 w-full" />
        <span className="ui-skeleton h-12 w-full" />
        <span className="ui-skeleton h-12 w-full" />
      </section>
    );
  }

  if (loadError || !restaurantId || (mode === "edit" && !product)) {
    return (
      <section className="ui-empty-state grid gap-3" role="alert">
        <h1 className="text-lg font-bold">
          {mode === "edit" && !product
            ? "المنتج غير موجود"
            : "تعذر فتح نموذج المنتج"}
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          {loadError ??
            (!restaurantId
              ? "لا يوجد مطعم مرتبط بهذا الحساب."
              : "تعذر العثور على المنتج المطلوب.")}
        </p>
        <Link
          href="/dashboard/products"
          className="ui-button ui-button-secondary mx-auto"
        >
          العودة إلى المنتجات
        </Link>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="ui-empty-state grid gap-3" role="status">
        <h1 className="text-lg font-bold">لا توجد تصنيفات</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          أضف تصنيفًا أولاً قبل إضافة منتجات المطعم.
        </p>
        <Link
          href="/dashboard/categories/new"
          className="ui-button ui-button-primary mx-auto"
        >
          إضافة تصنيف
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6" dir="rtl">
      <header>
        <Link
          href="/dashboard/products"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight aria-hidden="true" size={17} />
          المنتجات
        </Link>
        <h1 className="mt-3 text-2xl font-bold">
          {mode === "create" ? "إضافة منتج" : "تعديل المنتج"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أدخل تفاصيل المنتج وسعره وحالة توفره في قائمة المطعم.
        </p>
      </header>

      <form
        className="ui-card grid gap-6 rounded-lg p-5 sm:p-7"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        aria-busy={isSubmitting}
      >
        <Controller
          control={control}
          name="imageFile"
          render={({ field, fieldState }) => (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-semibold">
                صورة المنتج (اختياري)
              </legend>
              <ImagePicker
                currentImageUrl={product?.image_url}
                selectedFile={field.value}
                currentImageRemoved={currentImageRemoved}
                onFileChange={(file) => {
                  field.onChange(file);
                  if (file) setCurrentImageRemoved(false);
                }}
                onRemoveCurrent={() => setCurrentImageRemoved(true)}
                onRestoreCurrent={() => setCurrentImageRemoved(false)}
                error={fieldState.error?.message}
              />
            </fieldset>
          )}
        />

        <div>
          <label
            htmlFor="product-name"
            className="mb-2 block text-sm font-semibold"
          >
            اسم المنتج
          </label>
          <input
            {...register("name")}
            id="product-name"
            maxLength={120}
            autoComplete="off"
            className="ui-input h-12 px-4"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "product-name-error" : undefined}
          />
          {errors.name?.message && (
            <p
              id="product-name-error"
              className="ui-field-error mt-1.5"
              role="alert"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="product-description"
            className="mb-2 block text-sm font-semibold"
          >
            وصف المنتج
          </label>
          <textarea
            {...register("description")}
            id="product-description"
            maxLength={500}
            rows={4}
            className="ui-textarea px-4 py-3"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "product-description-error" : undefined
            }
          />
          {errors.description?.message && (
            <p
              id="product-description-error"
              className="ui-field-error mt-1.5"
              role="alert"
            >
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="product-category"
            className="mb-2 block text-sm font-semibold"
          >
            التصنيف
          </label>
          <select
            {...register("categoryId")}
            id="product-category"
            className="ui-select h-12 px-4"
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={
              errors.categoryId ? "product-category-error" : undefined
            }
          >
            <option value="">اختر تصنيفًا</option>
            {categories.map((categoryOption) => (
              <option key={categoryOption.id} value={categoryOption.id}>
                {categoryOption.name}
                {categoryOption.is_active ? "" : " (غير نشط)"}
              </option>
            ))}
          </select>
          {errors.categoryId?.message && (
            <p
              id="product-category-error"
              className="ui-field-error mt-1.5"
              role="alert"
            >
              {errors.categoryId.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="product-price"
              className="mb-2 block text-sm font-semibold"
            >
              السعر
            </label>
            <div className="relative">
              <input
                {...register("price", { valueAsNumber: true })}
                id="product-price"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="ui-input h-12 ps-4 pe-16"
                aria-invalid={Boolean(errors.price)}
                aria-describedby={
                  errors.price
                    ? "product-price-error"
                    : "product-price-currency"
                }
              />
              <span
                id="product-price-currency"
                className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm text-muted-foreground"
              >
                ج.م
              </span>
            </div>
            {errors.price?.message && (
              <p
                id="product-price-error"
                className="ui-field-error mt-1.5"
                role="alert"
              >
                {errors.price.message}
              </p>
            )}
            {product && !errors.price && (
              <p className="mt-1 text-xs text-muted-foreground">
                السعر الحالي: {formatEgpPrice(product.price)}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="product-order"
              className="mb-2 block text-sm font-semibold"
            >
              ترتيب العرض
            </label>
            <input
              {...register("displayOrder", { valueAsNumber: true })}
              id="product-order"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="ui-input h-12 px-4"
              aria-invalid={Boolean(errors.displayOrder)}
              aria-describedby={
                errors.displayOrder
                  ? "product-order-error"
                  : "product-order-hint"
              }
            />
            <p
              id="product-order-hint"
              className="mt-1.5 text-xs text-muted-foreground"
            >
              تظهر المنتجات ذات الرقم الأقل أولاً.
            </p>
            {errors.displayOrder?.message && (
              <p
                id="product-order-error"
                className="ui-field-error mt-1.5"
                role="alert"
              >
                {errors.displayOrder.message}
              </p>
            )}
          </div>
        </div>

        <Controller
          control={control}
          name="isAvailable"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-semibold">حالة المنتج</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {field.value ? "المنتج متاح للطلب" : "المنتج غير متاح مؤقتًا"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                aria-label="إتاحة المنتج للطلب"
                className="ui-switch"
                data-state={field.value ? "checked" : "unchecked"}
                onClick={() => field.onChange(!field.value)}
              >
                <span className="ui-switch-thumb" />
              </button>
            </div>
          )}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-start">
          <Link
            href="/dashboard/products"
            className="ui-button ui-button-secondary min-h-11 min-w-28"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            className="ui-button ui-button-primary min-h-11 min-w-36"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle
                  className="animate-spin"
                  aria-hidden="true"
                  size={17}
                />
                {savePhase === "uploading"
                  ? "جارٍ رفع الصورة..."
                  : "جارٍ الحفظ..."}
              </>
            ) : (
              <>
                <Save aria-hidden="true" size={17} />
                حفظ المنتج
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
