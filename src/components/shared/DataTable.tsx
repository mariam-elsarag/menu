import type { Key, ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

export interface DataTableColumn<Row> {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  className?: string;
}

export interface DataTableProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => Key;
  ariaLabel: string;
  renderActions?: (row: Row) => ReactNode;
  actionsHeader?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  loading?: boolean;
  skeletonRows?: number;
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  ariaLabel,
  renderActions,
  actionsHeader = "الإجراءات",
  emptyMessage = "لا توجد بيانات لعرضها.",
  emptyIcon: EmptyIcon = Inbox,
  loading = false,
  skeletonRows = 5,
}: DataTableProps<Row>) {
  const columnCount = columns.length + (renderActions ? 1 : 0);

  return (
    <div className="ui-table-wrap" aria-busy={loading}>
      <table className="ui-table" aria-label={ariaLabel}>
        <caption className="sr-only">{ariaLabel}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.id} scope="col">
                {column.header}
              </th>
            ))}
            {renderActions && (
              <th className="w-16 text-center" scope="col">
                {actionsHeader}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: Math.max(1, skeletonRows) }, (_, rowIndex) => (
              <tr key={`loading-row-${rowIndex}`} aria-hidden="true">
                {columns.map((column) => (
                  <td className={column.className} key={column.id}>
                    <span className="ui-skeleton block h-4 w-3/4" />
                  </td>
                ))}
                {renderActions && (
                  <td className="text-center">
                    <span className="ui-skeleton mx-auto block size-9 rounded-md" />
                  </td>
                )}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={Math.max(1, columnCount)}>
                <div className="ui-empty-state" role="status">
                  <div className="grid justify-items-center gap-2">
                    <EmptyIcon
                      className="text-muted-foreground"
                      size={25}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-muted-foreground">
                      {emptyMessage}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className={column.className} key={column.id}>
                    {column.cell(row)}
                  </td>
                ))}
                {renderActions && (
                  <td className="text-center">{renderActions(row)}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
