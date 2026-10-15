export function formatEgpPrice(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(numericValue)} ج.م`;
}

export function formatArabicDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}
