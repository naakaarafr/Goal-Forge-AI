'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Loader2, SearchX, AlertCircle
} from 'lucide-react';
import { EmptyState, LoadingState, ErrorState } from './StateViews';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableColumn<T = any> {
  /** Unique key matching a field in T, or a custom accessor */
  key: string;
  /** Column header label */
  header: string;
  /** Custom cell renderer — receives the row and full data array */
  render?: (row: T, index: number) => React.ReactNode;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether this column supports sorting */
  sortable?: boolean;
  /** Min width class e.g. 'min-w-[160px]' */
  minWidth?: string;
  /** Hide on small screens */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (row: T) => string;

  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Custom empty state message */
  emptyMessage?: string;
  emptySubMessage?: string;

  /** Row click handler */
  onRowClick?: (row: T) => void;

  /** Sticky header */
  stickyHeader?: boolean;

  /** Caption for the table (accessibility) */
  caption?: string;

  className?: string;
  headerClassName?: string;
  rowClassName?: (row: T, index: number) => string;

  /** Row selection */
  selectedKeys?: Set<string>;
  onSelectRow?: (key: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;

  /** Sorting state (controlled externally) */
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;

  /** Optional footer row */
  footer?: React.ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function alignClass(align: DataTableColumn['align']) {
  if (align === 'center') return 'text-center';
  if (align === 'right')  return 'text-right';
  return 'text-left';
}

function getValue<T>(row: T, key: string): any {
  return (row as any)[key];
}

// ─── DataTable ────────────────────────────────────────────────────────────────

/**
 * DataTable — Full-featured, sortable, selectable enterprise data table.
 *
 * @example
 * <DataTable
 *   data={teamMembers}
 *   keyExtractor={m => m.id}
 *   columns={[
 *     { key: 'full_name', header: 'Name' },
 *     { key: 'avg_progress', header: 'Progress', align: 'center',
 *       render: (m) => <ProgressBar progress={m.avg_progress} /> },
 *   ]}
 *   isLoading={isLoading}
 *   onRowClick={m => router.push(`/manager/performance?id=${m.id}`)}
 * />
 */
export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading,
  error,
  emptyMessage = 'No data found',
  emptySubMessage,
  onRowClick,
  stickyHeader,
  caption,
  className,
  headerClassName,
  rowClassName,
  selectedKeys,
  onSelectRow,
  onSelectAll,
  sortKey,
  sortDir,
  onSort,
  footer,
}: DataTableProps<T>) {
  const hasSelection = !!(onSelectRow && onSelectAll);
  const allSelected  = hasSelection && selectedKeys!.size === data.length && data.length > 0;
  const someSelected = hasSelection && selectedKeys!.size > 0 && selectedKeys!.size < data.length;

  // ── Loading ──
  if (isLoading) return <LoadingState message="Loading data..." className="py-16" />;

  // ── Error ──
  if (error) return <ErrorState message={error} className="py-12" />;

  // ── Empty ──
  if (!isLoading && data.length === 0) {
    return <EmptyState title={emptyMessage} description={emptySubMessage} className="py-16" />;
  }

  return (
    <div className={twMerge('overflow-x-auto rounded-b-3xl', className)}>
      <table className="w-full text-left border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}

        {/* Head */}
        <thead>
          <tr
            className={twMerge(
              'bg-slate-50/60 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100',
              stickyHeader && 'sticky top-0 z-10 backdrop-blur-sm',
              headerClassName
            )}
          >
            {/* Checkbox column */}
            {hasSelection && (
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={e => onSelectAll!(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
              </th>
            )}

            {columns.map(col => (
              <th
                key={col.key}
                className={twMerge(
                  'p-4 whitespace-nowrap',
                  alignClass(col.align),
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.minWidth,
                  col.sortable && 'cursor-pointer select-none hover:text-slate-700 transition-colors'
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortKey === col.key ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-30" />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-slate-50">
          {data.map((row, rowIndex) => {
            const key = keyExtractor(row);
            const isSelected = selectedKeys?.has(key);

            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={twMerge(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-slate-50/60',
                  isSelected && 'bg-indigo-50/40',
                  rowClassName?.(row, rowIndex)
                )}
              >
                {hasSelection && (
                  <td className="p-4" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => onSelectRow!(key, e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                  </td>
                )}

                {columns.map(col => (
                  <td
                    key={col.key}
                    className={twMerge(
                      'p-4 text-sm',
                      alignClass(col.align),
                      col.hideOnMobile && 'hidden md:table-cell'
                    )}
                  >
                    {col.render
                      ? col.render(row, rowIndex)
                      : <span className="text-slate-700 font-semibold">{String(getValue(row, col.key) ?? '—')}</span>
                    }
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>

        {/* Optional footer */}
        {footer && (
          <tfoot>
            <tr className="bg-slate-50/60 border-t border-slate-100">
              <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="p-4">
                {footer}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
