"use client";

import Image from "next/image";
import {
  AtSign,
  Globe,
  ImageOff,
  MessageCircle,
  Music2,
  Minus,
  Plus,
  Tag,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./menu-styles";
import { useMenuCart } from "./menu-cart-provider";
import type {
  MenuCategory,
  MenuProduct,
  PublicRestaurantMenu,
  RestaurantProfile,
  SocialPlatform,
} from "@/types/menu";

const socialIcons = {
  facebook: AtSign,
  instagram: AtSign,
  tiktok: Music2,
  website: Globe,
  whatsapp: MessageCircle,
} satisfies Record<SocialPlatform, LucideIcon>;

const socialLabels: Record<SocialPlatform, string> = {
  facebook: "فيسبوك",
  instagram: "إنستغرام",
  tiktok: "تيك توك",
  website: "الموقع الإلكتروني",
  whatsapp: "واتساب",
};

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(value)} ج.م`;
}

function getSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function MenuPhoto({
  src,
  alt,
  kind,
  className,
}: {
  src?: string | null;
  alt: string;
  kind: "banner" | "logo" | "category" | "product";
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <div className={className}>
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 500px) 100vw, 500px"
          className={styles.photoImage}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (kind === "banner") {
    return (
      <div
        className={`${className} ${styles.bannerFallback}`}
        aria-hidden="true"
      >
        <Utensils />
      </div>
    );
  }

  const fallbackClass =
    kind === "logo"
      ? styles.heroLogoFallback
      : kind === "category"
        ? styles.categoryImageFallback
        : styles.productImageFallback;
  const Icon =
    kind === "category" ? Tag : kind === "product" ? ImageOff : Utensils;

  return (
    <div
      className={`${className} ${styles.photoFallback} ${fallbackClass}`}
      aria-hidden="true"
    >
      <Icon />
    </div>
  );
}

function RestaurantHero({
  restaurant,
}: {
  restaurant: RestaurantProfile | null;
}) {
  return (
    <header>
      <MenuPhoto
        src={restaurant?.bannerImageUrl}
        alt=""
        kind="banner"
        className={styles.heroBanner}
      />
      <div className={styles.heroIntro}>
        <MenuPhoto
          src={restaurant?.logoImageUrl}
          alt={restaurant ? `شعار ${restaurant.name}` : ""}
          kind="logo"
          className={styles.heroLogo}
        />
        <h1 className={styles.heroName}>
          {restaurant?.name ?? "قائمة المطعم"}
        </h1>
        {restaurant?.description && (
          <p className={styles.heroDescription}>{restaurant.description}</p>
        )}
        {restaurant?.socialLinks && restaurant.socialLinks.length > 0 && (
          <nav aria-label="روابط المطعم" className={styles.socialLinks}>
            {restaurant.socialLinks.map((social) => {
              const href = getSafeExternalUrl(social.url);
              const Icon = socialIcons[social.platform];
              if (!href) return null;

              return (
                <a
                  key={social.platform}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.socialLink}
                  aria-label={socialLabels[social.platform]}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                </a>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}

function EmptyState({
  title,
  description,
  role = "status",
  onRetry,
}: {
  title: string;
  description: string;
  role?: "status" | "alert";
  onRetry?: () => void;
}) {
  return (
    <div className={styles.emptyState} role={role}>
      <div>
        <span className={styles.emptyIcon}>
          <Utensils aria-hidden="true" size={21} />
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
        {onRetry && (
          <button type="button" className={styles.addButton} onClick={onRetry}>
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
}

function categorySectionId(categoryId: string) {
  return `menu-category-${encodeURIComponent(categoryId)}`;
}

function CategoryNavigation({ categories }: { categories: MenuCategory[] }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(
      "[data-menu-category-section]",
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              first.boundingClientRect.top - second.boundingClientRect.top,
          );
        const categoryId = visible[0]?.target.getAttribute(
          "data-menu-category-id",
        );
        if (categoryId) setActiveCategory(categoryId);
      },
      { rootMargin: "-15% 0px -68% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    buttonRefs.current.get(activeCategory)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeCategory]);

  function selectCategory(categoryId: string) {
    setActiveCategory(categoryId);
    document.getElementById(categorySectionId(categoryId))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <nav className={styles.categoryNavigation} aria-label="تصنيفات القائمة">
      <div className={styles.categoryRail}>
        {categories.map((category) => (
          <button
            key={category.id}
            ref={(element) => {
              if (element) buttonRefs.current.set(category.id, element);
              else buttonRefs.current.delete(category.id);
            }}
            type="button"
            className={`${styles.categoryButton}${activeCategory === category.id ? ` ${styles.categoryButtonActive}` : ""}`}
            aria-current={activeCategory === category.id ? "true" : undefined}
            onClick={() => selectCategory(category.id)}
          >
            <MenuPhoto
              src={category.imageUrl}
              alt=""
              kind="category"
              className={styles.categoryImage}
            />
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function QuantityControl({
  product,
  quantity,
  onChange,
}: {
  product: MenuProduct;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div
      className={styles.quantityControl}
      role="group"
      aria-label={`كمية ${product.name}`}
    >
      <button
        type="button"
        className={styles.quantityButton}
        aria-label={`إنقاص كمية ${product.name}`}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus aria-hidden="true" size={16} />
      </button>
      <span className={styles.quantityValue} aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className={styles.quantityButton}
        aria-label={`زيادة كمية ${product.name}`}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

function ProductCard({
  product,
  onOpen,
}: {
  product: MenuProduct;
  onOpen: (product: MenuProduct) => void;
}) {
  const { lines, addProduct, setQuantity } = useMenuCart();
  const quantity =
    lines.find((line) => line.product.id === product.id)?.quantity ?? 0;

  return (
    <article className={styles.productCard}>
      <button
        type="button"
        className={styles.productImageButton}
        onClick={() => onOpen(product)}
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        <div className={styles.productImage}>
          <MenuPhoto
            src={product.imageUrl}
            alt={product.name}
            kind="product"
            className={styles.productImage}
          />
          {!product.available && (
            <span className={styles.availabilityOverlay}>غير متاح</span>
          )}
        </div>
        <div className={styles.productInfo}>
          <h3 className={styles.productName}>{product.name}</h3>
          <p className={styles.productDescription}>
            {product.description ?? ""}
          </p>
        </div>
      </button>
      <div className={`${styles.productFooter} ${styles.productInfo}`}>
        <span className={styles.price}>{formatPrice(product.price)}</span>
        {!product.available ? (
          <button type="button" className={styles.addButton} disabled>
            غير متاح
          </button>
        ) : quantity > 0 ? (
          <QuantityControl
            product={product}
            quantity={quantity}
            onChange={(nextQuantity) => setQuantity(product.id, nextQuantity)}
          />
        ) : (
          <button
            type="button"
            className={styles.addButton}
            aria-label={`إضافة ${product.name} إلى السلة`}
            onClick={() => addProduct(product)}
          >
            <Plus aria-hidden="true" size={15} />
            إضافة
          </button>
        )}
      </div>
    </article>
  );
}

function ProductSheet({
  product,
  onClose,
}: {
  product: MenuProduct;
  onClose: () => void;
}) {
  const { lines, addProduct, setQuantity } = useMenuCart();
  const quantity =
    lines.find((line) => line.product.id === product.id)?.quantity ?? 0;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className={styles.sheetBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.productSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-sheet-title"
        tabIndex={-1}
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <button
          type="button"
          className={styles.sheetClose}
          onClick={onClose}
          aria-label="إغلاق التفاصيل"
        >
          <X aria-hidden="true" size={19} />
        </button>
        <MenuPhoto
          src={product.imageUrl}
          alt={product.name}
          kind="product"
          className={styles.sheetPhoto}
        />
        <div className={styles.sheetBody}>
          <h2 id="product-sheet-title" className={styles.sheetTitle}>
            {product.name}
          </h2>
          <p className={styles.sheetDescription}>{product.description ?? ""}</p>
          <div className={styles.sheetFooter}>
            <span className={styles.price}>{formatPrice(product.price)}</span>
            {!product.available ? (
              <button type="button" className={styles.addButton} disabled>
                غير متاح
              </button>
            ) : quantity > 0 ? (
              <QuantityControl
                product={product}
                quantity={quantity}
                onChange={(nextQuantity) =>
                  setQuantity(product.id, nextQuantity)
                }
              />
            ) : (
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addProduct(product)}
              >
                <Plus aria-hidden="true" size={16} />
                إضافة إلى السلة
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function CustomerMenu({
  menu,
  state,
}: {
  menu: PublicRestaurantMenu | null;
  state?: "not-found" | "error";
}) {
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(
    null,
  );
  const availableCategories =
    menu?.categories.filter((category) =>
      menu.products.some((product) => product.categoryId === category.id),
    ) ?? [];

  return (
    <main className={styles.menuFrame}>
      <RestaurantHero restaurant={menu?.restaurant ?? null} />
      {availableCategories.length === 0 ? (
        <div className={styles.menuContent}>
          <EmptyState
            title={
              state === "not-found"
                ? "عذرًا، لم يتم العثور على هذا المطعم."
                : state === "error"
                  ? "تعذر تحميل القائمة الآن"
                  : menu
                    ? "لا توجد أصناف في القائمة"
                    : "القائمة غير متاحة حاليًا"
            }
            description={
              state === "not-found"
                ? "تحقق من الرابط وحاول مرة أخرى."
                : state === "error"
                  ? "يرجى المحاولة مرة أخرى."
                  : menu
                    ? "لم تُضف منتجات إلى هذه القائمة بعد."
                    : "ستظهر تفاصيل المطعم وأصنافه عند توفر القائمة."
            }
            role={state === "error" ? "alert" : "status"}
            onRetry={
              state === "error" ? () => window.location.reload() : undefined
            }
          />
        </div>
      ) : (
        <div className={styles.menuContent}>
          <CategoryNavigation categories={availableCategories} />
          {availableCategories.map((category) => {
            const products =
              menu?.products.filter(
                (product) => product.categoryId === category.id,
              ) ?? [];
            return (
              <section
                key={category.id}
                id={categorySectionId(category.id)}
                data-menu-category-section
                data-menu-category-id={category.id}
                className={styles.categorySection}
              >
                <div className={styles.sectionHeading}>
                  <h2 className={styles.sectionTitle}>{category.name}</h2>
                  <span className={styles.sectionCount}>
                    {products.length} أصناف
                  </span>
                </div>
                <div className={styles.productGrid}>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpen={setSelectedProduct}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {selectedProduct && (
        <ProductSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}
