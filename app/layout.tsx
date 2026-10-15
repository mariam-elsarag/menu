import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "منيو",
  description: "منصة القوائم والطلبات للمطاعم",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
        <Toaster
          position="top-center"
          containerStyle={{
            direction: "rtl",
            fontFamily: "var(--font-cairo), sans-serif",
          }}
          toastOptions={{
            duration: 4500,
            style: {
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              color: "var(--foreground)",
              fontSize: "0.875rem",
            },
          }}
        />
      </body>
    </html>
  );
}
