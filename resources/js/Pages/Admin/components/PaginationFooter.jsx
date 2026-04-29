import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PER_PAGE_OPTIONS = ["10", "15", "25", "50"];

/**
 * PaginationFooter
 *
 * Rows-per-page selector + "X–Y of Z" counter + prev/next buttons.
 * Renders nothing when total === 0.
 *
 * @param {object}   props
 * @param {object}   props.meta       - { current_page, last_page, total, per_page }
 * @param {number}   props.from       - First row number on the current page.
 * @param {number}   props.to         - Last row number on the current page.
 * @param {string}   props.perPage    - Current per-page value (string).
 * @param {Function} props.onPerPageChange
 * @param {Function} props.onPrev
 * @param {Function} props.onNext
 * @param {string[]} [props.options]  - Per-page options. Default ["10","15","25","50"].
 */
export function PaginationFooter({
    meta,
    from,
    to,
    perPage,
    onPerPageChange,
    onPrev,
    onNext,
    options = PER_PAGE_OPTIONS,
}) {
    if (meta.total === 0) return null;

    return (
        <div className="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <Select value={String(perPage)} onValueChange={onPerPageChange}>
                    <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((o) => (
                            <SelectItem key={o} value={o}>
                                {o}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Counter + nav */}
            <div className="flex items-center gap-4">
                <span>
                    {from}–{to} of {meta.total}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={meta.current_page <= 1}
                        onClick={onPrev}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={meta.current_page >= meta.last_page}
                        onClick={onNext}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
