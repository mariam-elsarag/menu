"use client";

import Link from "next/link";
import { Check, ChevronRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import styles from "./menu-styles";
import { MenuPhoto } from "./customer-menu";
import { useMenuCart } from "./menu-cart-provider";

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(value)} ج.م`;
}

function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
  );
}

export function CustomerCart() {
  const { slug, lines, count, total, setQuantity } = useMenuCart();
  const [tableNumber, setTableNumber] = useState("");
  const [tableTouched, setTableTouched] = useState(false);
  const normalizedTableNumber = normalizeDigits(tableNumber.trim());
  const tableIsValid =
    /^\d+$/.test(normalizedTableNumber) && Number(normalizedTableNumber) > 0;
  const tableError = tableTouched && !tableIsValid;

  return (
    <main className={styles.cartPage}>
      <header className={styles.cartHeader}>
        <Link
          href={`/menu/${encodeURIComponent(slug)}`}
          className={styles.cartBack}
          aria-label="العودة إلى القائمة"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </Link>
        <div>
          <h1>سلة الطلبات</h1>
          <p>{count} منتجات</p>
        </div>
      </header>

      {lines.length === 0 ? (
        <section className={styles.statusPage}>
          <span className={styles.statusIcon}>
            <ShoppingBag aria-hidden="true" size={27} />
          </span>
          <h1>سلتك فارغة</h1>
          <p>أضف أصنافك المفضلة من قائمة المطعم لتظهر هنا.</p>
          <Link
            href={`/menu/${encodeURIComponent(slug)}`}
            className={styles.statusLink}
          >
            تصفح القائمة
          </Link>
        </section>
      ) : (
        <>
          <div className={styles.cartLines}>
            {lines.map(({ product, quantity }) => (
              <article className={styles.cartLine} key={product.id}>
                <MenuPhoto
                  src={product.imageUrl}
                  alt={product.name}
                  kind="product"
                  className={styles.cartPhoto}
                />
                <div className={styles.cartLineDetails}>
                  <div className={styles.cartLineTitle}>
                    <h2>{product.name}</h2>
                    <button
                      type="button"
                      className={styles.removeButton}
                      aria-label={`حذف ${product.name} من السلة`}
                      onClick={() => setQuantity(product.id, 0)}
                    >
                      <X aria-hidden="true" size={17} />
                    </button>
                  </div>
                  <div className={styles.cartLineBottom}>
                    <div
                      className={styles.quantityControl}
                      role="group"
                      aria-label={`كمية ${product.name}`}
                    >
                      <button
                        type="button"
                        className={styles.quantityButton}
                        aria-label={`إنقاص كمية ${product.name}`}
                        onClick={() => setQuantity(product.id, quantity - 1)}
                      >
                        <Minus aria-hidden="true" size={15} />
                      </button>
                      <span className={styles.quantityValue} aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        className={styles.quantityButton}
                        aria-label={`زيادة كمية ${product.name}`}
                        onClick={() => setQuantity(product.id, quantity + 1)}
                      >
                        <Plus aria-hidden="true" size={15} />
                      </button>
                    </div>
                    <span className={styles.price}>
                      {formatPrice(product.price * quantity)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.tableField}>
            <label htmlFor="table-number" className={styles.tableLabel}>
              رقم الطاولة
            </label>
            <input
              id="table-number"
              className={styles.tableInput}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={tableNumber}
              placeholder="أدخل رقم الطاولة"
              aria-invalid={tableError}
              aria-describedby={tableError ? "table-number-error" : undefined}
              onChange={(event) => setTableNumber(event.target.value)}
              onBlur={() => setTableTouched(true)}
            />
            {tableError && (
              <p
                id="table-number-error"
                className={styles.fieldError}
                role="alert"
              >
                أدخل رقم طاولة صحيحًا.
              </p>
            )}
          </div>

          <section className={styles.cartSummary} aria-label="ملخص الطلب">
            <div className={styles.summaryRow}>
              <span>عدد الأصناف</span>
              <span>{count}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>الإجمالي</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button type="button" className={styles.confirmButton} disabled>
              تأكيد الطلب
            </button>
            <p className={styles.cartNotice}>
              سيتم تفعيل تأكيد الطلب بعد ربط خدمة الطلبات.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

export function CustomerOrderSuccess() {
  const { slug } = useMenuCart();

  return (
    <main className={styles.menuFrame}>
      <section className={styles.statusPage}>
        <span className={styles.statusIcon}>
          <Check aria-hidden="true" size={29} />
        </span>
        <h1>تم استلام الطلب</h1>
        <p>شكرًا لك. يمكنك متابعة قائمة المطعم في أي وقت.</p>
        <Link
          href={`/menu/${encodeURIComponent(slug)}`}
          className={styles.statusLink}
        >
          العودة إلى القائمة
        </Link>
      </section>
    </main>
  );
}
