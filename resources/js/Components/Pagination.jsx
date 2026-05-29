import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/Components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";

const DEFAULT_PER_PAGE_OPTIONS = ["10", "15", "25", "50"];

/**
 * Reusable server-side pagination control.
 *
 * Basic usage (prev/next only):
 *   <Pagination meta={meta} onPageChange={setPage} />
 *
 * With per-page selector (replaces PaginationFooter):
 *   <Pagination
 *     meta={meta}
 *     onPageChange={setPage}
 *     from={from}
 *     to={to}
 *     perPage={perPage}
 *     onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
 *   />
 *
 * Props:
 *   meta              — { current_page, last_page, from?, to?, total }
 *   onPageChange      — (page: number) => void
 *   from?             — row-range start; falls back to meta.from
 *   to?               — row-range end;   falls back to meta.to
 *   perPage?          — current per-page value (string or number)
 *   onPerPageChange?  — (value: string) => void — enables the per-page selector
 *   perPageOptions?   — string[] defaults to ["10","15","25","50"]
 */
export function Pagination({
    meta,
    onPageChange,
    from,
    to,
    perPage,
    onPerPageChange,
    perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
}) {
    if (!meta || meta.total === 0) return null;

    const { current_page, last_page, total } = meta;
    const displayFrom = from ?? meta.from ?? 0;
    const displayTo   = to   ?? meta.to   ?? 0;
    const hasPerPage  = !!onPerPageChange;

    // Full layout (per-page selector on left, counter + nav on right)
    if (hasPerPage) {
        return (
            <div className="flex items-center justify-between px-1 py-3 border-t text-sm text-muted-foreground">
                {/* Per-page selector */}
                <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <Select
                        value={String(perPage)}
                        onValueChange={onPerPageChange}
                    >
                        <SelectTrigger className="h-8 w-16">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {perPageOptions.map((o) => (
                                <SelectItem key={o} value={String(o)}>
                                    {o}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Counter + nav */}
                <div className="flex items-center gap-4">
                    <span>
                        {displayFrom}–{displayTo} of {total}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={current_page <= 1}
                            onClick={() => onPageChange(current_page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={current_page >= last_page}
                            onClick={() => onPageChange(current_page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Compact layout (no per-page selector)
    if (last_page <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 mt-4">
            <p className="text-xs text-muted-foreground">
                Showing {displayFrom}–{displayTo} of {total}
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={current_page === 1}
                    onClick={() => onPageChange(current_page - 1)}
                    className="h-8 px-3 text-xs"
                >
                    Previous
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                    {current_page} / {last_page}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={current_page === last_page}
                    onClick={() => onPageChange(current_page + 1)}
                    className="h-8 px-3 text-xs"
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
