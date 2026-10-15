"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LoaderCircle,
  LogOut,
  Menu,
  Package,
  Settings,
  Tags,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import { Suspense, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/categories", label: "التصنيفات", icon: Tags },
  { href: "/dashboard/products", label: "المنتجات", icon: Package },
  { href: "/dashboard/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

function LinkList({
  pathname,
  onNavigate,
}: {
  pathname?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="التنقل الرئيسي" className="grid gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`dashboard-nav-link${active ? " is-active" : ""}`}
          >
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function CurrentLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <LinkList pathname={pathname} onNavigate={onNavigate} />;
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<LinkList onNavigate={onNavigate} />}>
      <CurrentLinks onNavigate={onNavigate} />
    </Suspense>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <span className="grid size-10 place-items-center rounded-lg bg-primary text-surface">
        <Utensils aria-hidden="true" size={19} strokeWidth={1.8} />
      </span>
      <span>
        <span className="block text-base font-bold leading-5">منيو</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          إدارة المطعم
        </span>
      </span>
    </div>
  );
}

function LogoutButton({
  isLoggingOut,
  onLogout,
}: {
  isLoggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <button
      type="button"
      className="dashboard-nav-link w-full text-start disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onLogout}
      disabled={isLoggingOut}
      aria-busy={isLoggingOut}
    >
      {isLoggingOut ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" size={18} />
      ) : (
        <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
      )}
      <span>{isLoggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}</span>
    </button>
  );
}

export function DashboardShell({
  children,
}: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutLock = useRef(false);

  async function handleLogout() {
    if (logoutLock.current) return;

    logoutLock.current = true;
    setIsLoggingOut(true);
    let signedOut = false;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("تعذر تسجيل الخروج. يرجى المحاولة مرة أخرى.");
        return;
      }

      signedOut = true;
      toast.success("تم تسجيل الخروج بنجاح");
      router.replace("/dashboard/login");
      router.refresh();
    } catch {
      toast.error("تعذر تسجيل الخروج. يرجى المحاولة مرة أخرى.");
    } finally {
      if (!signedOut) {
        logoutLock.current = false;
        setIsLoggingOut(false);
      }
    }
  }

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-l bg-surface lg:flex">
        <Brand />
        <div className="px-3 pt-5">
          <p className="mb-3 px-3 text-xs font-semibold text-muted-foreground">
            القائمة الرئيسية
          </p>
          <Navigation />
        </div>
        <div className="mt-auto  px-4 py-2">
          <LogoutButton isLoggingOut={isLoggingOut} onLogout={handleLogout} />
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="absolute inset-0 bg-foreground/35"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            id="mobile-navigation"
            aria-label="قائمة لوحة التحكم"
            className="relative z-10 flex h-full w-[min(18rem,88vw)] flex-col border-l bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                className="ui-icon-button ms-3 me-4"
                aria-label="إغلاق القائمة"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="px-3 pt-5">
              <p className="mb-3 px-3 text-xs font-semibold text-muted-foreground">
                القائمة الرئيسية
              </p>
              <Navigation onNavigate={() => setMobileMenuOpen(false)} />
            </div>
            <div className="mt-auto border-t p-4">
              <LogoutButton
                isLoggingOut={isLoggingOut}
                onLogout={handleLogout}
              />
            </div>
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="ui-icon-button lg:hidden"
              aria-label="فتح القائمة"
              aria-controls="mobile-navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu aria-hidden="true" size={19} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">لوحة التحكم</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                إدارة مطعمك من مكان واحد
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              مدير المطعم
            </span>
            <span
              className="grid size-9 place-items-center rounded-full border border-border bg-secondary text-sm font-bold text-foreground"
              aria-label="مدير المطعم"
            >
              م
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
