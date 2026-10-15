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
import {
  type CategoryRecord,
  getAuthorizedRestaurantId,
  getCategoryErrorMessage,
  getOwnedCategoryImagePath,
} from "./category-utils";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const pageSize = 10;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}

function errorMessage(error: unknown) {
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

export function CategoriesPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<CategoryRecord | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

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
          .select(
            "id, restaurant_id, name, image_url, display_order, is_active, created_at, updated_at",
          )
          .eq("restaurant_id", authorizedRestaurantId)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!cancelled) {
          setCategories((data ?? []) as CategoryRecord[]);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = errorMessage(error);
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filteredCategories = categories.filter((category) =>
    category.name
      .toLocaleLowerCase("ar")
      .includes(search.trim().toLocaleLowerCase("ar")),
  );
  const totalPages = Math.ceil(filteredCategories.length / pageSize);
  const visibleCategories = filteredCategories.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const columns: DataTableColumn<CategoryRecord>[] = [
    {
      id: "image",
      header: "الصورة",
      className: "w-20",
      cell: (category) => (
        <span className="relative grid size-12 place-items-center overflow-hidden rounded-md border border-border bg-muted">
          {category.image_url ? (
            <Image
              src={category.image_url}
              alt={`صورة ${category.name}`}
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
      header: "اسم التصنيف",
      className: "min-w-48",
      cell: (category) => (
        <span className="block max-w-sm whitespace-normal break-words font-semibold">
          {category.name}
        </span>
      ),
    },
    {
      id: "display-order",
      header: "ترتيب العرض",
      className: "w-36",
      cell: (category) => (
        <span className="tabular-nums">
          {new Intl.NumberFormat("ar-EG").format(category.display_order)}
        </span>
      ),
    },
    {
      id: "created-at",
      header: "تاريخ الإنشاء",
      className: "w-44",
      cell: (category) => (
        <span className="text-muted-foreground">
          {formatDate(category.created_at)}
        </span>
      ),
    },
  ];

  async function deleteCategory() {
    if (!restaurantId || !pendingDelete) return;
    setDeleting(true);

    const { count, error: productsError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("category_id", pendingDelete.id);

    if (productsError) {
      toast.error(getCategoryErrorMessage(productsError));
      setDeleting(false);
      return;
    }

    if ((count ?? 0) > 0) {
      toast.error(
        "لا يمكن حذف هذا التصنيف لأنه يحتوي على منتجات. انقل المنتجات إلى تصنيف آخر أو احذفها أولاً.",
      );
      setDeleting(false);
      setPendingDelete(null);
      return;
    }

    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", pendingDelete.id)
      .eq("restaurant_id", restaurantId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      toast.error(getCategoryErrorMessage(error));
      setDeleting(false);
      setPendingDelete(null);
      return;
    }

    const deletedCategory = pendingDelete;
    const remaining = categories.filter((category) => category.id !== data.id);
    const matchingCount = remaining.filter((category) =>
      category.name
        .toLocaleLowerCase("ar")
        .includes(search.trim().toLocaleLowerCase("ar")),
    ).length;
    setCategories(remaining);
    setPage((currentPage) =>
      Math.min(currentPage, Math.max(1, Math.ceil(matchingCount / pageSize))),
    );
    setDeleting(false);
    setPendingDelete(null);
    toast.success("تم حذف التصنيف بنجاح");

    const oldImagePath = getOwnedCategoryImagePath(
      deletedCategory.image_url,
      getSupabasePublicConfig().url,
      restaurantId,
    );
    if (oldImagePath) {
      const { error: storageError } = await supabase.storage
        .from("category-images")
        .remove([oldImagePath]);
      if (storageError) {
        toast.error("تم حذف التصنيف، لكن تعذر حذف صورته القديمة.");
      }
    }
  }

  function openEdit(category: CategoryRecord) {
    router.push(`/dashboard/categories/${category.id}/edit`);
  }

  const createHref = "/dashboard/categories/new";

  return (
    <section className="grid gap-6" dir="rtl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">التصنيفات</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            نظّم أصناف قائمة مطعمك ليسهل على العملاء استكشافها.
          </p>
        </div>
        <Link
          href={createHref}
          className="ui-button ui-button-primary min-h-11"
        >
          <Plus aria-hidden="true" size={18} />
          إضافة تصنيف
        </Link>
      </header>

      <div className="ui-card grid gap-4 rounded-lg p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">البحث في التصنيفات</span>
            <Search
              aria-hidden="true"
              size={17}
              className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground"
            />
            <input
              type="search"
              className="ui-input h-11 ps-10 pe-3"
              placeholder="ابحث عن تصنيف..."
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
            />
          </label>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {new Intl.NumberFormat("ar-EG").format(filteredCategories.length)}{" "}
            تصنيفات
          </p>
        </div>

        {loadError && (
          <p className="ui-field-error" role="alert">
            {loadError}
          </p>
        )}

        <DataTable
          ariaLabel="جدول تصنيفات المطعم"
          columns={columns}
          rows={visibleCategories}
          getRowKey={(category) => category.id}
          loading={loading}
          emptyMessage={
            search.trim()
              ? "لا توجد تصنيفات تطابق البحث."
              : "لا توجد تصنيفات حتى الآن. أضف تصنيفك الأول للبدء."
          }
          renderActions={(category) => (
            <RowActionsMenu
              row={category}
              actions={[
                {
                  id: "edit",
                  label: "تعديل",
                  icon: PencilLine,
                  onSelect: openEdit,
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

        {!loading && totalPages > 0 && (
          <Pagination
            page={page}
            totalItems={filteredCategories.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="تأكيد حذف التصنيف"
        description={
          pendingDelete
            ? `هل أنت متأكد من رغبتك في حذف تصنيف «${pendingDelete.name}»؟ لا يمكن التراجع عن هذا الإجراء.`
            : undefined
        }
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteCategory}
      />
    </section>
  );
}
