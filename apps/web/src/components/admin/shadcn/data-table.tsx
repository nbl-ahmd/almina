'use client';
import { useState, type ReactNode } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState, type VisibilityState } from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ViewColumnsIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../cn';
import { Checkbox } from './checkbox';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from './dropdown-menu';

/** Sorting, column visibility and row selection over the rows already loaded on the page.
 *  Paging stays on the server, so sorting never hides rows the server did not send. */
export function DataTable<T>({ caption, data, columns, empty, getRowId, selectable = false, bulk, toolbar }: {
  caption: string; data: T[]; columns: ColumnDef<T, unknown>[]; empty: { title: string; description?: string };
  getRowId: (row: T) => string; selectable?: boolean; toolbar?: ReactNode;
  bulk?: (rows: T[], clear: () => void) => ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [visibility, setVisibility] = useState<VisibilityState>({});
  // TanStack Table returns unmemoizable accessors; React Compiler skips this component, which is expected.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data, columns, getRowId, enableRowSelection: selectable,
    state: { sorting, rowSelection: selection, columnVisibility: visibility },
    onSortingChange: setSorting, onRowSelectionChange: setSelection, onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  const chosen = table.getSelectedRowModel().rows.map(row => row.original);
  const sortable = columns.some(column => column.enableSorting !== false && column.id !== 'actions' && column.id !== 'select');
  const hideable = table.getAllLeafColumns().filter(column => column.getCanHide());
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
        <p className="m-0 text-[13px] text-mute" role="status">{`${data.length} on this page${sortable ? ' · click a heading to sort' : ''}`}</p>
        <div className="flex items-center gap-2">
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-xs font-medium text-ink outline-0 hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink max-md:hidden">
                <ViewColumnsIcon className="size-4" aria-hidden="true" />Columns
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              {hideable.map(column => (
                <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={value => column.toggleVisibility(Boolean(value))} onSelect={event => event.preventDefault()}>
                  {String(column.columnDef.meta?.label ?? column.id)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
        <table className="block w-full border-collapse md:table">
          <caption className="sr-only">{caption}</caption>
          <thead className="hidden md:table-header-group">
            {table.getHeaderGroups().map(group => (
              <tr key={group.id}>
                {group.headers.map(header => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th key={header.id} scope="col" aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className={cn('whitespace-nowrap border-b border-line bg-white px-4 py-3 text-xs font-semibold text-ink', header.column.columnDef.meta?.align === 'end' ? 'text-right' : 'text-left', header.id === 'select' && 'w-10 pr-0')}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 outline-0 hover:underline focus-visible:outline-2 focus-visible:outline-ink">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? <ArrowUpIcon className="size-3" aria-hidden="true" /> : sorted === 'desc' ? <ArrowDownIcon className="size-3" aria-hidden="true" /> : null}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="block md:table-row-group">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} data-selected={row.getIsSelected() || undefined} className="block border-b border-line px-4 py-2.5 last:border-0 data-[selected]:bg-fill md:table-row md:border-line md:p-0 md:hover:bg-fill/60 md:data-[selected]:hover:bg-fill">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} data-label={cell.column.id === 'select' || cell.column.id === 'actions' ? undefined : String(cell.column.columnDef.meta?.label ?? cell.column.id)}
                    className={cn('flex items-center justify-between gap-4 py-0.5 text-[13.5px] before:text-xs before:font-medium before:text-mute before:content-[attr(data-label)] md:table-cell md:border-b md:border-line md:px-4 md:py-3 md:align-middle md:[overflow-wrap:normal] md:before:content-none', cell.column.columnDef.meta?.align === 'end' && 'md:text-right md:tabular-nums', cell.column.id === 'select' && 'justify-start md:w-10 md:pr-0')}>
                    <span className="min-w-0 text-right md:text-inherit">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                  </td>
                ))}
              </tr>
            ))}
            {!data.length ? (
              <tr className="block md:table-row"><td className="block md:table-cell" colSpan={table.getVisibleLeafColumns().length}>
                <div className="grid justify-items-center gap-1 px-6 py-12 text-center">
                  <p className="m-0 text-[15px] font-semibold text-ink">{empty.title}</p>
                  {empty.description ? <p className="m-0 max-w-sm text-[13px] text-mute">{empty.description}</p> : null}
                </div>
              </td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {chosen.length && bulk ? (
        <div role="toolbar" aria-label="Bulk actions" className="fixed bottom-20 left-1/2 z-40 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-pop lg:bottom-6">
          <span className="px-1 text-[13px] font-semibold tabular-nums">{chosen.length} selected</span>
          {bulk(chosen, () => setSelection({}))}
          <button type="button" aria-label="Clear selection" onClick={() => setSelection({})} className="grid size-8 place-items-center rounded-lg border border-line outline-0 hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"><XMarkIcon className="size-4" aria-hidden="true" /></button>
        </div>
      ) : null}
    </div>
  );
}

/** Checkbox column for row selection. */
export function selectColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: 'select', enableSorting: false, enableHiding: false,
    header: ({ table }) => <Checkbox aria-label="Select all rows" checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? 'indeterminate' : false} onCheckedChange={value => table.toggleAllRowsSelected(value === true)} />,
    cell: ({ row }) => <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(value === true)} />,
  };
}

declare module '@tanstack/react-table' {
  // Column metadata used by the shared DataTable.
  interface ColumnMeta<TData, TValue> { label?: string; align?: 'end'; _types?: [TData, TValue] }
}
