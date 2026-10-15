"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Image as ImageIcon,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";
import { createClient } from "@/lib/supabase/client";
import { formatArabicDate, formatEgpPrice } from "@/lib/formatters";
import { getAuthorizedRestaurantId } from "@/features/categories/category-utils";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import {
  getOwnedProductImagePath,
  getProductErrorMessage,
  type ProductCategoryOption,
  type ProductRecord,
} from "./product-utils";

const pageSize = 10;

function readErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

export function ProductsPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<ProductRecord | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const authorizedRestaurantId =
          await getAuthorizedRestaurantId(supabase);
        if (cancelled) return;
        setRestaurantId(authorizedRestaurantId);

        const { data, error } = await supabase
          .from("categories")
          .select("id, name, is_active")
          .eq("restaurant_id", authorizedRestaurantId)
          .order("display_order", { ascending: true });

        if (error) throw error;
        if (!cancelled) setCategories((data ?? []) as ProductCategoryOption[]);
      } catch {
        if (!cancelled) {
          const message = "تعذر تحميل تصنيفات المطعم.";
          setLoadError(message);
          toast.error(message);
          setLoading(false);
        }
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      try {
        let query = supabase
          .from("products")
          .select(
            "id, restaurant_id, category_id, name, description, image_url, price, is_available, display_order, created_at, category:categories!products_restaurant_category_fkey(id, name)",
            { count: "exact" },
          )
          .eq("restaurant_id", restaurantId)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (debouncedSearch)
          query = query.ilike("name", `%${debouncedSearch}%`);
        if (categoryFilter) query = query.eq("category_id", categoryFilter);
        if (availabilityFilter !== "all") {
          query = query.eq("is_available", availabilityFilter === "available");
        }

        const from = (page - 1) * pageSize;
        const { data, error, count } = await query.range(
          from,
          from + pageSize - 1,
        );
        if (error) throw error;

        if (!cancelled) {
          setProducts((data ?? []) as unknown as ProductRecord[]);
          setTotalItems(count ?? 0);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            readErrorCode(error) === "42501"
              ? "ليست لديك صلاحية لعرض منتجات هذا المطعم."
              : "تعذر تحميل المنتجات. يرجى المحاولة مرة أخرى.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [
    availabilityFilter,
    categoryFilter,
    debouncedSearch,
    page,
    restaurantId,
    supabase,
  ]);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function deleteProduct() {
    if (!restaurantId || !pendingDelete) return;
    setDeleting(true);

    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", pendingDelete.id)
      .eq("restaurant_id", restaurantId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      toast.error(getProductErrorMessage(error, "delete"));
      setDeleting(false);
      setPendingDelete(null);
      return;
    }

    const removedProduct = pendingDelete;
    const newTotal = Math.max(0, totalItems - 1);
    setProducts((current) =>
      current.filter((product) => product.id !== data.id),
    );
    setTotalItems(newTotal);
    setPage((currentPage) =>
      Math.min(currentPage, Math.max(1, Math.ceil(newTotal / pageSize))),
    );
    setDeleting(false);
    setPendingDelete(null);
    toast.success("تم حذف المنتج بنجاح");

    const oldImagePath = getOwnedProductImagePath(
      removedProduct.image_url,
      getSupabasePublicConfig().url,
      restaurantId,
    );
    if (oldImagePath) {
      try {
        const { error: imageError } = await supabase.storage
          .from("product-images")
          .remove([oldImagePath]);
        if (imageError)
          toast.error("تم حذف المنتج، لكن تعذر حذف صورته القديمة.");
      } catch {
        toast.error("تم حذف المنتج، لكن تعذر حذف صورته القديمة.");
      }
    }
  }

  const columns: DataTableColumn<ProductRecord>[] = [
    {
      id: "image",
      header: "الصورة",
      className: "w-20",
      cell: (product) => (
        <span className="relative grid size-12 place-items-center overflow-hidden rounded-md border border-border bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={`صورة ${product.name}`}
              fill
              unoptimized
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <ImageIcon
              aria-hidden="true"
              size={19}
              className="text-muted-foreground"
            />
          )}
        </span>
      ),
    },
    {
      id: "name",
      header: "اسم المنتج",
      className: "min-w-48",
      cell: (product) => (
        <span className="block max-w-sm whitespace-normal break-words font-semibold">
          {product.name}
          {product.description && (
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {product.description}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "category",
      header: "التصنيف",
      className: "min-w-36",
      cell: (product) => (
        <span>{product.category?.name ?? "تصنيف غير متاح"}</span>
      ),
    },
    {
      id: "price",
      header: "السعر",
      className: "w-32",
      cell: (product) => (
        <span className="whitespace-nowrap font-semibold tabular-nums">
          {formatEgpPrice(product.price)}
        </span>
      ),
    },
    {
      id: "availability",
      header: "الحالة",
      className: "w-32",
      cell: (product) => (
        <span
          className={`ui-badge ${product.is_available ? "ui-badge-success" : "ui-badge-muted"}`}
        >
          {product.is_available ? "متاح" : "غير متاح"}
        </span>
      ),
    },
    {
      id: "created-at",
      header: "تاريخ الإضافة",
      className: "w-40",
      cell: (product) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatArabicDate(product.created_at)}
        </span>
      ),
    },
  ];

  const createHref = "/dashboard/products/new";

  return (
    <section className="grid gap-6" dir="rtl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            أدر منتجات مطعمك وأسعارها وحالة توفرها.
          </p>
        </div>
        <Link
          href={createHref}
          className="ui-button ui-button-primary min-h-11"
        >
          <Plus aria-hidden="true" size={18} />
          إضافة منتج
        </Link>
      </header>

      <div className="ui-card grid gap-4 rounded-lg p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_minmax(12rem,0.55fr)_minmax(11rem,0.45fr)]">
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            البحث عن منتج
            <span className="relative block">
              <Search
                aria-hidden="true"
                size={17}
                className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground"
              />
              <input
                type="search"
                className="ui-input h-11 ps-10 pe-3 text-sm font-normal text-foreground"
                placeholder="ابحث باسم المنتج..."
                value={search}
                onChange={(event) => updateSearch(event.currentTarget.value)}
              />
            </span>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            التصنيف
            <select
              className="ui-select h-11 px-3 text-sm font-normal text-foreground"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">كل التصنيفات</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            حالة التوفر
            <select
              className="ui-select h-11 px-3 text-sm font-normal text-foreground"
              value={availabilityFilter}
              onChange={(event) => {
                setAvailabilityFilter(
                  event.currentTarget.value as typeof availabilityFilter,
                );
                setPage(1);
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="available">متاح</option>
              <option value="unavailable">غير متاح</option>
            </select>
          </label>
        </div>

        {loadError && (
          <p className="ui-field-error" role="alert">
            {loadError}
          </p>
        )}
        <DataTable
          ariaLabel="جدول منتجات المطعم"
          columns={columns}
          rows={products}
          getRowKey={(product) => product.id}
          loading={loading}
          emptyMessage={
            search || categoryFilter || availabilityFilter !== "all"
              ? "لا توجد منتجات تطابق عوامل التصفية."
              : "لا توجد منتجات حتى الآن. أضف منتجك الأول للبدء."
          }
          renderActions={(product) => (
            <RowActionsMenu
              row={product}
              actions={[
                {
                  id: "edit",
                  label: "تعديل",
                  icon: PencilLine,
                  onSelect: (selected) =>
                    router.push(`/dashboard/products/${selected.id}/edit`),
                },
                {
                  id: "delete",
                  label: "حذف",
                  icon: Trash2,
                  destructive: true,
                  onSelect: setPendingDelete,
                },
              ]}
            />
          )}
        />

        {!loading && totalItems > 0 && (
          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="تأكيد حذف المنتج"
        description={
          pendingDelete
            ? `هل أنت متأكد من حذف المنتج «${pendingDelete.name}»؟`
            : undefined
        }
        loading={deleting}
        onConfirm={deleteProduct}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
