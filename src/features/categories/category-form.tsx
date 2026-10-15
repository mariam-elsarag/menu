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
import {
  categoryFormSchema,
  getAuthorizedRestaurantId,
  getCategoryErrorMessage,
  getOwnedCategoryImagePath,
  type CategoryFormValues,
  type CategoryRecord,
} from "./category-utils";

interface CategoryFormProps {
  mode: "create" | "edit";
  categoryId?: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return getCategoryErrorMessage({ code: error.code });
  }
  return getCategoryErrorMessage(null);
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

export function CategoryForm({ mode, categoryId }: CategoryFormProps) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryRecord | null>(null);
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
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: "", displayOrder: 0, imageFile: null },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      try {
        const authorizedRestaurantId =
          await getAuthorizedRestaurantId(supabase);
        if (cancelled) return;
        setRestaurantId(authorizedRestaurantId);

        if (mode === "edit") {
          if (!categoryId) throw new Error("التصنيف المطلوب غير موجود.");

          const { data, error } = await supabase
            .from("categories")
            .select(
              "id, restaurant_id, name, image_url, display_order, is_active, created_at, updated_at",
            )
            .eq("id", categoryId)
            .eq("restaurant_id", authorizedRestaurantId)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            setCategory(null);
            return;
          }

          const existing = data as CategoryRecord;
          setCategory(existing);
          reset({
            name: existing.name,
            displayOrder: existing.display_order,
            imageFile: null,
          });
        } else {
          const { data, error } = await supabase
            .from("categories")
            .select("display_order")
            .eq("restaurant_id", authorizedRestaurantId)
            .order("display_order", { ascending: false })
            .limit(1);

          if (error) throw error;
          const nextOrder = (data?.[0]?.display_order ?? 0) + 1;
          reset({ name: "", displayOrder: nextOrder, imageFile: null });
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
  }, [categoryId, mode, reset, supabase]);

  async function onSubmit(values: CategoryFormValues) {
    if (!restaurantId) return;

    const { data: categoriesWithOrder, error: orderCheckError } = await supabase
      .from("categories")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("display_order", values.displayOrder)
      .limit(2);

    if (orderCheckError) {
      toast.error("تعذر التحقق من ترتيب التصنيف. يرجى المحاولة مرة أخرى.");
      return;
    }

    if (categoriesWithOrder?.some((existing) => existing.id !== categoryId)) {
      setError(
        "displayOrder",
        {
          type: "validate",
          message: "يوجد تصنيف آخر بهذا الترتيب. اختر ترتيبًا مختلفًا.",
        },
        { shouldFocus: true },
      );
      return;
    }

    const { url: supabaseUrl } = getSupabasePublicConfig();
    const previousImagePath = getOwnedCategoryImagePath(
      category?.image_url,
      supabaseUrl,
      restaurantId,
    );
    let uploadedImagePath: string | null = null;
    let nextImageUrl = category?.image_url ?? null;

    if (values.imageFile) {
      setSavePhase("uploading");
      try {
        const extension = imageExtension(values.imageFile);
        uploadedImagePath = `${restaurantId}/categories/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("category-images")
          .upload(uploadedImagePath, values.imageFile, {
            cacheControl: "3600",
            contentType: values.imageFile.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error("تعذر رفع الصورة. يرجى المحاولة مرة أخرى.");
        }

        nextImageUrl = supabase.storage
          .from("category-images")
          .getPublicUrl(uploadedImagePath).data.publicUrl;
      } catch (error) {
        if (uploadedImagePath) {
          try {
            await supabase.storage
              .from("category-images")
              .remove([uploadedImagePath]);
          } catch {
            // No category row references an upload that failed before saving.
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
    const categoryValues = {
      name: values.name,
      image_url: nextImageUrl,
      display_order: values.displayOrder,
    };

    try {
      if (mode === "create") {
        const { error } = await supabase.from("categories").insert({
          restaurant_id: restaurantId,
          ...categoryValues,
          is_active: true,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("categories")
          .update(categoryValues)
          .eq("id", categoryId ?? "")
          .eq("restaurant_id", restaurantId)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("لم يتم العثور على التصنيف المطلوب.");
      }
    } catch (error) {
      if (uploadedImagePath) {
        try {
          await supabase.storage
            .from("category-images")
            .remove([uploadedImagePath]);
        } catch {
          // Do not replace the database error with a cleanup failure.
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
          .from("category-images")
          .remove([previousImagePath]);
        oldImageCleanupFailed = Boolean(error);
      } catch {
        oldImageCleanupFailed = true;
      }
    }

    toast.success(
      mode === "create" ? "تم حفظ التصنيف بنجاح" : "تم تحديث التصنيف بنجاح",
    );
    if (oldImageCleanupFailed) {
      toast.error("تم حفظ التصنيف، لكن تعذر حذف الصورة القديمة.");
    }
    router.replace("/dashboard/categories");
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

  if (loadError || !restaurantId || (mode === "edit" && !category)) {
    return (
      <section className="ui-empty-state grid gap-3" role="alert">
        <h1 className="text-lg font-bold">
          {mode === "edit" && !category
            ? "التصنيف غير موجود"
            : "تعذر فتح نموذج التصنيف"}
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          {loadError ??
            (!restaurantId
              ? "لا يوجد مطعم مرتبط بهذا الحساب."
              : "تعذر العثور على التصنيف المطلوب.")}
        </p>
        <Link
          href="/dashboard/categories"
          className="ui-button ui-button-secondary mx-auto"
        >
          العودة إلى التصنيفات
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6" dir="rtl">
      <header>
        <Link
          href="/dashboard/categories"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight aria-hidden="true" size={17} />
          التصنيفات
        </Link>
        <h1 className="mt-3 text-2xl font-bold">
          {mode === "create" ? "إضافة تصنيف" : "تعديل التصنيف"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أضف اسمًا وترتيبًا واضحين ليسهل الوصول إلى منتجات التصنيف.
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
                صورة التصنيف (اختياري)
              </legend>
              <ImagePicker
                currentImageUrl={category?.image_url}
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
            htmlFor="category-name"
            className="mb-2 block text-sm font-semibold"
          >
            اسم التصنيف
          </label>
          <input
            {...register("name")}
            id="category-name"
            type="text"
            maxLength={80}
            autoComplete="off"
            className="ui-input h-12 px-4"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "category-name-error" : undefined}
          />
          {errors.name?.message && (
            <p
              id="category-name-error"
              className="ui-field-error mt-1.5"
              role="alert"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="category-order"
            className="mb-2 block text-sm font-semibold"
          >
            ترتيب العرض
          </label>
          <input
            {...register("displayOrder", { valueAsNumber: true })}
            id="category-order"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="ui-input h-12 px-4"
            aria-invalid={Boolean(errors.displayOrder)}
            aria-describedby="category-order-hint category-order-error"
          />
          <p
            id="category-order-hint"
            className="mt-1.5 text-xs text-muted-foreground"
          >
            تظهر التصنيفات ذات الرقم الأقل أولاً.
          </p>
          {errors.displayOrder?.message && (
            <p
              id="category-order-error"
              className="ui-field-error mt-1.5"
              role="alert"
            >
              {errors.displayOrder.message}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-start">
          <Link
            href="/dashboard/categories"
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
                حفظ التصنيف
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
