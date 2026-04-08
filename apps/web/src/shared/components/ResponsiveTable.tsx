/**
 * ResponsiveTable — renders a standard table on desktop, card-view on mobile.
 *
 * Below the `md` breakpoint (768px), switches to a stacked card layout
 * where each row becomes a card with labeled key-value pairs.
 */

import { type ReactNode } from 'react';

export interface ColumnDef<T> {
  /** Unique key for this column */
  readonly key: string;
  /** Column header label */
  readonly label: string;
  /** Render cell content */
  readonly render: (row: T, index: number) => ReactNode;
  /** Optional: column class for desktop table (e.g., 'text-right w-16') */
  readonly className?: string;
  /** If true, this is the primary identifier shown as card title on mobile */
  readonly primary?: boolean;
  /** If true, hide this column on mobile cards (it's shown as the title) */
  readonly hideOnMobile?: boolean;
  /** Optional: emphasize in mobile card (larger text) */
  readonly highlight?: boolean;
}

interface ResponsiveTableProps<T> {
  readonly data: readonly T[];
  readonly columns: readonly ColumnDef<T>[];
  /** Optional: key extractor for stable React keys */
  readonly keyExtractor?: (row: T, index: number) => string;
  /** Optional: row click handler */
  readonly onRowClick?: (row: T, index: number) => void;
  /** Optional: highlight predicate (e.g., user's team) */
  readonly isHighlighted?: (row: T) => boolean;
  /** Optional: empty state message */
  readonly emptyMessage?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  isHighlighted,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-dynasty-muted">
        {emptyMessage}
      </div>
    );
  }

  const primaryCol = columns.find((c) => c.primary);
  const mobileColumns = columns.filter((c) => !c.hideOnMobile && !c.primary);

  return (
    <>
      {/* Desktop table — hidden below md */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dynasty-border text-xs uppercase tracking-wider text-dynasty-muted">
              {columns.map((col) => (
                <th key={col.key} className={`px-3 py-2 font-data font-semibold ${col.className ?? ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={keyExtractor ? keyExtractor(row, idx) : idx}
                className={`border-b border-dynasty-border/50 transition-colors ${
                  isHighlighted?.(row) ? 'bg-accent-primary/10' : 'hover:bg-dynasty-elevated/50'
                } ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 font-data ${col.className ?? ''}`}>
                    {col.render(row, idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view — visible below md */}
      <div className="md:hidden space-y-2">
        {data.map((row, idx) => (
          <div
            key={keyExtractor ? keyExtractor(row, idx) : idx}
            className={`rounded-lg border p-3 transition-colors ${
              isHighlighted?.(row)
                ? 'border-accent-primary/40 bg-accent-primary/10'
                : 'border-dynasty-border/50 bg-dynasty-surface'
            } ${onRowClick ? 'cursor-pointer active:bg-dynasty-elevated' : ''}`}
            onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
          >
            {/* Card title — primary column */}
            {primaryCol && (
              <div className="mb-2 font-heading text-sm font-semibold text-dynasty-text">
                {primaryCol.render(row, idx)}
              </div>
            )}

            {/* Card body — grid of key-value pairs */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
              {mobileColumns.map((col) => (
                <div key={col.key} className={col.highlight ? 'col-span-1' : ''}>
                  <div className="text-[10px] uppercase tracking-wider text-dynasty-muted">
                    {col.label}
                  </div>
                  <div className={`font-data text-xs ${col.highlight ? 'text-accent-primary font-semibold' : 'text-dynasty-text'}`}>
                    {col.render(row, idx)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
