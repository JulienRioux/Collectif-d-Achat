"use client"

import { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  cell: (row: T, rowIndex: number) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  rowKey?: (row: T, rowIndex: number) => string
  emptyState?: ReactNode
  emptyColSpan?: number
  className?: string
  tableClassName?: string
  headClassName?: string
  getRowClassName?: (row: T, rowIndex: number) => string | undefined
  onRowClick?: (row: T, rowIndex: number) => void
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  emptyState,
  emptyColSpan,
  className,
  tableClassName,
  headClassName,
  getRowClassName,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn("min-w-full text-left text-sm", tableClassName)}>
        <thead className={cn("border-b text-zinc-600", headClassName)}>
          <tr>
            {columns.map((column) => (
              <th key={column.id} className={cn("px-2 py-2 font-medium", column.headerClassName)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rowIndex) => {
              const clickable = Boolean(onRowClick)

              return (
                <tr
                  key={rowKey ? rowKey(row, rowIndex) : String(rowIndex)}
                  className={cn(
                    "border-b last:border-0",
                    clickable && "cursor-pointer",
                    getRowClassName?.(row, rowIndex)
                  )}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {columns.map((column) => (
                    <td key={column.id} className={cn("px-2 py-2", column.cellClassName)}>
                      {column.cell(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              )
            })
          ) : (
            <tr>
              <td className="px-2 py-3 text-zinc-500" colSpan={emptyColSpan ?? columns.length}>
                {emptyState ?? "Aucune donnee."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}