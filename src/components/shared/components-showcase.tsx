"use client";

import { useState } from "react";
import { Check, CircleAlert, Package, PencilLine, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/shared/RowActionsMenu";

interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
}

const initialProducts: DemoProduct[] = [
  {
    id: "demo-product-01",
    name: "شاورما فراخ",
    category: "الشاورما",
    price: 90,
    available: true,
  },
  {
    id: "demo-product-02",
    name: "شاورما لحمة",
    category: "الشاورما",
    price: 120,
    available: true,
  },
  {
    id: "demo-product-03",
    name: "وجبة شاورما",
    category: "الوجبات",
    price: 150,
    available: false,
  },
  {
    id: "demo-product-04",
    name: "ساندوتش كفتة",
    category: "الساندوتشات",
    price: 100,
    available: true,
  },
  {
    id: "demo-product-05",
    name: "بطاطس محمرة",
    category: "المقبلات",
    price: 35,
    available: true,
  },
  {
    id: "demo-product-06",
    name: "ثومية",
    category: "المقبلات",
    price: 15,
    available: true,
  },
  {
    id: "demo-product-07",
    name: "برجر كلاسيك",
    category: "البرجر",
    price: 130,
    available: true,
  },
  {
    id: "demo-product-08",
    name: "تشيز برجر",
    category: "البرجر",
    price: 150,
    available: false,
  },
  {
    id: "demo-product-09",
    name: "بطاطس بالجبنة",
    category: "المقبلات",
    price: 65,
    available: true,
  },
  {
    id: "demo-product-10",
    name: "حلقات بصل",
    category: "المقبلات",
    price: 55,
    available: true,
  },
  {
    id: "demo-product-11",
    name: "فول بالزيت الحار",
    category: "الفول والطعمية",
    price: 35,
    available: true,
  },
  {
    id: "demo-product-12",
    name: "طبق طعمية",
    category: "الفول والطعمية",
    price: 25,
    available: false,
  },
  {
    id: "demo-product-13",
    name: "بيض بالبسطرمة",
    category: "البيض والجبن",
    price: 80,
    available: true,
  },
  {
    id: "demo-product-14",
    name: "فطير بالجبنة",
    category: "الفطائر",
    price: 70,
    available: true,
  },
  {
    id: "demo-product-15",
    name: "شاي بالنعناع",
    category: "المشروبات",
    price: 18,
    available: true,
  },
];

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ar-EG").format(value)} ج.م`;
}

export function ComponentsShowcase() {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showLoading, setShowLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DemoProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const columns: DataTableColumn<DemoProduct>[] = [
    {
      id: "name",
      header: "اسم المنتج",
      cell: (product) => <span className="font-semibold">{product.name}</span>,
    },
    {
      id: "category",
      header: "التصنيف",
      cell: (product) => (
        <span className="text-muted-foreground">{product.category}</span>
      ),
    },
    {
      id: "price",
      header: "السعر",
      cell: (product) => (
        <span className="font-semibold tabular-nums">
          {formatPrice(product.price)}
        </span>
      ),
    },
    {
      id: "availability",
      header: "الحالة",
      cell: (product) => (
        <span
          className={`ui-badge ${product.available ? "ui-badge-success" : "ui-badge-muted"}`}
        >
          {product.available ? "متاح" : "غير متاح"}
        </span>
      ),
    },
  ];

  const actions: RowAction<DemoProduct>[] = [
    {
      id: "edit",
      label: "تعديل",
      icon: PencilLine,
      onSelect: (product) => setFeedback(`تم اختيار تعديل «${product.name}»`),
    },
    {
      id: "delete",
      label: "حذف",
      icon: Trash2,
      destructive: true,
      onSelect: setPendingDelete,
    },
  ];

  const visibleProducts = showEmpty
    ? []
    : products.slice((page - 1) * pageSize, page * pageSize);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
    const remaining = products.filter(
      (product) => product.id !== pendingDelete.id,
    );
    setProducts(remaining);
    setPage((currentPage) =>
      Math.min(
        currentPage,
        Math.max(1, Math.ceil(remaining.length / pageSize)),
      ),
    );
    setDeleting(false);
    setPendingDelete(null);
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            مكونات لوحة التحكم
          </p>
          <h1 className="mt-1 text-2xl font-bold">معاينة المكونات المشتركة</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            بيانات محلية للمعاينة فقط، ولا يتم حفظ أي تغييرات.
          </p>
        </div>
        <span className="ui-badge ui-badge-warning w-fit">
          <CircleAlert aria-hidden="true" size={14} />
          بيئة التطوير فقط
        </span>
      </header>

      <section className="ui-card grid gap-4 rounded-lg p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 className="text-base font-bold">جدول المنتجات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            جدول قابل لإعادة الاستخدام مع حالة فارغة، تحميل، وإجراءات الصف.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-button ui-button-secondary"
            aria-pressed={showLoading}
            onClick={() => setShowLoading((value) => !value)}
          >
            {showLoading ? "إخفاء التحميل" : "معاينة التحميل"}
          </button>
          <button
            type="button"
            className="ui-button ui-button-secondary"
            aria-pressed={showEmpty}
            onClick={() => {
              setShowEmpty((value) => !value);
              setPage(1);
            }}
          >
            {showEmpty ? "عرض البيانات" : "معاينة الحالة الفارغة"}
          </button>
        </div>
      </section>

      {feedback && (
        <p
          className="ui-toast flex items-center gap-2 p-3 text-sm"
          role="status"
        >
          <Check aria-hidden="true" className="text-success" size={17} />
          {feedback}
          <button
            type="button"
            className="ms-auto text-muted-foreground underline underline-offset-2"
            onClick={() => setFeedback("")}
          >
            إخفاء
          </button>
        </p>
      )}

      <DataTable
        ariaLabel="المنتجات التجريبية"
        columns={columns}
        rows={visibleProducts}
        getRowKey={(product) => product.id}
        loading={showLoading}
        emptyMessage="لا توجد منتجات في هذه القائمة."
        emptyIcon={Package}
        renderActions={(product) => (
          <RowActionsMenu row={product} actions={actions} />
        )}
      />

      <Pagination
        page={page}
        totalItems={showEmpty ? 0 : products.length}
        pageSize={pageSize}
        onPageChange={setPage}
        pageSizeOptions={[5, 10]}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="تأكيد حذف المنتج"
        description={
          pendingDelete
            ? `هل أنت متأكد من حذف «${pendingDelete.name}» من بيانات المعاينة؟`
            : undefined
        }
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
