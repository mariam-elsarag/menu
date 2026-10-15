"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PageToken = number | "start-gap" | "end-gap";

export interface PaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-EG").format(value);
}

function getPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) tokens.push("start-gap");
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    tokens.push(pageNumber);
  }
  if (end < totalPages - 1) tokens.push("end-gap");
  tokens.push(totalPages);

  return tokens;
}

export function Pagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  const safeTotal = Math.max(0, totalItems);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.ceil(safeTotal / safePageSize);
  const currentPage = totalPages ? Math.min(Math.max(1, page), totalPages) : 0;
  const startItem = totalPages ? (currentPage - 1) * safePageSize + 1 : 0;
  const endItem = Math.min(currentPage * safePageSize, safeTotal);
  const pageTokens = getPageTokens(currentPage, totalPages);

  return (
    <nav
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="التنقل بين الصفحات"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span aria-live="polite">
          {safeTotal === 0
            ? "لا توجد عناصر"
            : `عرض ${formatNumber(startItem)}–${formatNumber(endItem)} من ${formatNumber(safeTotal)} عنصرًا`}
        </span>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span>عدد الصفوف</span>
            <select
              className="ui-select h-9 w-auto min-w-20 px-2 text-sm"
              value={safePageSize}
              onChange={(event) =>
                onPageSizeChange(Number(event.currentTarget.value))
              }
              aria-label="عدد الصفوف في الصفحة"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatNumber(option)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="صفحات النتائج"
      >
        <button
          type="button"
          className="ui-icon-button h-9 w-9 cursor-pointer"
          aria-label="السابق"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
        {pageTokens.map((token) =>
          typeof token === "number" ? (
            <button
              type="button"
              key={`page-${token}`}
              className={`grid size-9 place-items-center rounded-md text-sm transition-colors ${
                token === currentPage
                  ? "bg-primary text-surface cursor-pointer"
                  : "text-foreground hover:bg-muted"
              }`}
              aria-label={`الصفحة ${formatNumber(token)}`}
              aria-current={token === currentPage ? "page" : undefined}
              onClick={() => onPageChange(token)}
            >
              {formatNumber(token)}
            </button>
          ) : (
            <span
              key={token}
              className="grid size-9 place-items-center text-muted-foreground"
              aria-hidden="true"
            >
              …
            </span>
          ),
        )}
        <button
          type="button"
          className="ui-icon-button h-9 w-9 cursor-pointer"
          aria-label="التالي"
          disabled={currentPage === 0 || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
      </div>
    </nav>
  );
}
