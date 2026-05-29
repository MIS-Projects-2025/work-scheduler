import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import { cn } from "@/lib/utils";

function SortIcon({ sortKey, orderBy, orderDir }) {
    if (orderBy !== sortKey)
        return (
            <ArrowUpDown className="ml-1.5 inline-block w-3.5 h-3.5 opacity-40 shrink-0" />
        );
    return orderDir === "asc" ? (
        <ArrowUp className="ml-1.5 inline-block w-3.5 h-3.5 shrink-0" />
    ) : (
        <ArrowDown className="ml-1.5 inline-block w-3.5 h-3.5 shrink-0" />
    );
}

/**
 * Reusable server-side data table built on ShadCN Table components.
 *
 * Props:
 *   columns: Array<{
 *     key: string             — row property to read / unique column id
 *     sortKey?: string        — server-side sort param (defaults to key)
 *     label: string
 *     sortable?: boolean
 *     className?: string      — applied to every <TableCell> in this column
 *     headerClassName?: string
 *     render?: (row: object) => ReactNode
 *   }>
 *   data: object[]
 *   orderBy: string           — current active sort column (server value)
 *   orderDir: 'asc' | 'desc'
 *   onSort: (sortKey: string) => void
 *   emptyMessage?: string
 */
export default function ServerTable({
    columns,
    data,
    orderBy,
    orderDir,
    onSort,
    emptyMessage = "No records found.",
}) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {columns.map((col) => {
                            const sortKey = col.sortKey ?? col.key;
                            return (
                                <TableHead
                                    key={col.key}
                                    className={cn(
                                        "whitespace-nowrap text-xs font-semibold uppercase tracking-wide",
                                        col.sortable &&
                                            "cursor-pointer select-none hover:text-foreground transition-colors",
                                        col.headerClassName,
                                    )}
                                    onClick={
                                        col.sortable
                                            ? () => onSort(sortKey)
                                            : undefined
                                    }
                                >
                                    <span className="inline-flex items-center">
                                        {col.label}
                                        {col.sortable && (
                                            <SortIcon
                                                sortKey={sortKey}
                                                orderBy={orderBy}
                                                orderDir={orderDir}
                                            />
                                        )}
                                    </span>
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={columns.length}
                                className="text-center py-12 text-muted-foreground text-sm"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row, idx) => (
                            <TableRow key={row.id ?? idx}>
                                {columns.map((col) => (
                                    <TableCell
                                        key={col.key}
                                        className={col.className}
                                    >
                                        {col.render
                                            ? col.render(row)
                                            : (row[col.key] ?? "—")}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
