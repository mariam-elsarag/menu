"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import styles from "./menu-styles";
import type { CartLine, MenuProduct } from "@/types/menu";

const emptyCart: CartLine[] = [];
const snapshots = new Map<string, CartLine[]>();
const listeners = new Map<string, Set<() => void>>();

interface MenuCartValue {
  slug: string;
  lines: CartLine[];
  count: number;
  total: number;
  addProduct: (product: MenuProduct) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const MenuCartContext = createContext<MenuCartValue | null>(null);

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;

  const line = value as Partial<CartLine>;
  return Boolean(
    line.product &&
    typeof line.product.id === "string" &&
    typeof line.product.name === "string" &&
    typeof line.product.price === "number" &&
    Number.isFinite(line.product.price) &&
    Number.isInteger(line.quantity) &&
    (line.quantity ?? 0) > 0,
  );
}

function readCart(key: string) {
  if (typeof window === "undefined") return emptyCart;
  const cached = snapshots.get(key);
  if (cached) return cached;

  try {
    const stored = window.localStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    const cart = Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
    snapshots.set(key, cart);
    return cart;
  } catch {
    snapshots.set(key, emptyCart);
    return emptyCart;
  }
}

function subscribe(key: string, listener: () => void) {
  const keyListeners = listeners.get(key) ?? new Set<() => void>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);

  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      snapshots.delete(key);
      listener();
    }
  };

  window.addEventListener("storage", onStorage);
  return () => {
    keyListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    if (keyListeners.size === 0) listeners.delete(key);
  };
}

function writeCart(key: string, cart: CartLine[]) {
  snapshots.set(key, cart);
  try {
    window.localStorage.setItem(key, JSON.stringify(cart));
  } catch {
    // Keep the current cart usable when browser storage is unavailable.
  }
  listeners.get(key)?.forEach((listener) => listener());
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(value)} ج.م`;
}

export function MenuCartProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const storageKey = `restaurant-menu-cart:${slug}`;
  const lines = useSyncExternalStore(
    (listener) => subscribe(storageKey, listener),
    () => readCart(storageKey),
    () => emptyCart,
  );

  function addProduct(product: MenuProduct) {
    if (!product.available) return;
    const current = readCart(storageKey);
    const existing = current.find((line) => line.product.id === product.id);
    const next = existing
      ? current.map((line) =>
          line.product.id === product.id
            ? { product, quantity: line.quantity + 1 }
            : line,
        )
      : [...current, { product, quantity: 1 }];
    writeCart(storageKey, next);
  }

  function setQuantity(productId: string, quantity: number) {
    const next =
      quantity <= 0
        ? readCart(storageKey).filter((line) => line.product.id !== productId)
        : readCart(storageKey).map((line) =>
            line.product.id === productId ? { ...line, quantity } : line,
          );
    writeCart(storageKey, next);
  }

  function clearCart() {
    writeCart(storageKey, []);
  }

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
  const cartValue = {
    slug,
    lines,
    count,
    total,
    addProduct,
    setQuantity,
    clearCart,
  };
  const showCartAction =
    count > 0 &&
    !pathname.endsWith("/cart") &&
    !pathname.endsWith("/order-success");

  return (
    <MenuCartContext.Provider value={cartValue}>
      {children}
      {showCartAction && (
        <div className={styles.cartActionPosition}>
          <Link
            href={`/menu/${encodeURIComponent(slug)}/cart`}
            className={styles.cartAction}
          >
            <span className={styles.cartActionText}>
              <span className={styles.cartActionCount}>{count}</span>
              <span className={styles.cartActionLabel}>
                <ShoppingBag aria-hidden="true" size={18} /> طلبك
              </span>
            </span>
            <span className={styles.cartActionTotal}>
              {formatPrice(total)} <ChevronLeft aria-hidden="true" size={16} />
            </span>
          </Link>
        </div>
      )}
    </MenuCartContext.Provider>
  );
}

export function useMenuCart() {
  const context = useContext(MenuCartContext);
  if (!context)
    throw new Error("useMenuCart must be used within MenuCartProvider");
  return context;
}
