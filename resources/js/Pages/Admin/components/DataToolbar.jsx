import { Search, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";

/**
 * DataToolbar
 *
 * The search + optional filter dropdowns + refresh + primary-action button
 * row shown in a Card header.
 *
 * @param {object}   props
 * @param {string}   props.searchValue        - Controlled value of the search input.
 * @param {Function} props.onSearchChange     - Called with new input string.
 * @param {boolean}  props.loading            - Disables the refresh button and spins its icon.
 * @param {Function} props.onRefresh          - Refresh button click handler.
 * @param {string}   props.addLabel           - Label for the primary add button. Default "Add".
 * @param {Function} props.onAdd              - Add button click handler.
 * @param {Array}    [props.filters]          - Optional extra filter selects.
 *   Each item: { value, onChange, placeholder, options: [{ label, value }], width? }
 * @param {React.ReactNode} [props.extra]     - Any extra nodes rendered after the add button.
 */
export function DataToolbar({
    searchValue,
    onSearchChange,
    loading,
    onRefresh,
    addLabel = "Add",
    onAdd,
    filters = [],
    extra,
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Extra filter selects (e.g. year picker) */}
            {filters.map((f, i) => (
                <Select key={i} value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className={f.width ?? "w-28"}>
                        <SelectValue placeholder={f.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {f.options.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search..."
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8 w-48"
                />
            </div>

            {/* Refresh */}
            <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={loading}
            >
                <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
            </Button>

            {/* Primary action */}
            {onAdd && (
                <Button onClick={onAdd} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    {addLabel}
                </Button>
            )}

            {extra}
        </div>
    );
}
