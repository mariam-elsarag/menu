"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, type LucideIcon } from "lucide-react";

export interface RowAction<Row> {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: (row: Row) => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface RowActionsMenuProps<Row> {
  row: Row;
  actions: readonly RowAction<Row>[];
  label?: string;
}

export function RowActionsMenu<Row>({
  row,
  actions,
  label = "إجراءات الصف",
}: RowActionsMenuProps<Row>) {
  return (
    <DropdownMenu.Root dir="rtl">
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="ui-icon-button mx-auto"
          aria-label={label}
          disabled={actions.length === 0}
        >
          <MoreVertical aria-hidden="true" size={19} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="ui-dropdown-menu z-[80] min-w-40 p-1 outline-none"
        >
          {actions.map(
            ({
              id,
              label: actionLabel,
              icon: Icon,
              onSelect,
              destructive,
              disabled,
            }) => (
              <DropdownMenu.Item
                key={id}
                disabled={disabled}
                onSelect={() => onSelect(row)}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${
                  destructive
                    ? "text-destructive data-[highlighted]:bg-destructive/10"
                    : "text-foreground"
                }`}
              >
                <Icon aria-hidden="true" size={16} />
                <span>{actionLabel}</span>
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
