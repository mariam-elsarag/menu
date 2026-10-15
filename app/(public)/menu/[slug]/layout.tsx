import { Suspense } from "react";
import type { ReactNode } from "react";
import "@/components/menu/customer-menu.module.css";
import styles from "@/components/menu/menu-styles";
import { MenuCartProvider } from "@/components/menu/menu-cart-provider";

export default function MenuLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.menuTheme} dir="rtl">
      <Suspense
        fallback={
          <div className={styles.loadingScreen}>جارٍ تحميل القائمة...</div>
        }
      >
        <MenuCartProvider>{children}</MenuCartProvider>
      </Suspense>
    </div>
  );
}
