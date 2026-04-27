import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

// ─── Single Combobox ──────────────────────────────────────────────────────────

export const Combobox = ({
    options = [],
    value,
    onChange,
    onFocus,
    placeholder = "Select…",
    loading = false,
    disabled = false,
    clearable = true,
    className,
    style,
    allowCustomValue = true,
    loadOptions,
}) => {
    const [open, setOpen] = useState(false);
    const [asyncOptions, setAsyncOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentSearch, setCurrentSearch] = useState("");
    const [searchTimeout, setSearchTimeout] = useState(null);

    const matchedOption = (
        asyncOptions.length > 0 ? asyncOptions : options
    ).find((o) => String(o.value) === String(value));

    const selectedLabel = matchedOption?.label ?? (value ? String(value) : "");

    const handleSelect = (optValue) => {
        const opt = (asyncOptions.length > 0 ? asyncOptions : options).find(
            (o) => String(o.label) === optValue || String(o.value) === optValue,
        );
        if (!opt) return;
        onChange?.(opt.value === value ? undefined : opt.value);
        setOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange?.(undefined);
    };

    const displayOptions =
        allowCustomValue && value && !matchedOption
            ? [
                  ...(asyncOptions.length > 0 ? asyncOptions : options),
                  { value, label: value },
              ]
            : asyncOptions.length > 0
              ? asyncOptions
              : options;

    const load = async (search, page) => {
        if (!loadOptions) return;
        setIsLoading(true);
        try {
            const result = await loadOptions(search, page);
            if (page === 1) {
                setAsyncOptions(result.options);
            } else {
                setAsyncOptions((prev) => [...prev, ...result.options]);
            }
            setHasMore(result.hasMore);
            setCurrentPage(page);
            setCurrentSearch(search);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchChange = (value) => {
        setCurrentSearch(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        setSearchTimeout(
            setTimeout(() => {
                load(value, 1);
            }, 300),
        );
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (
            scrollTop + clientHeight >= scrollHeight - 50 &&
            hasMore &&
            !isLoading
        ) {
            load(currentSearch, currentPage + 1);
        }
    };

    useEffect(() => {
        if (open && asyncOptions.length === 0 && loadOptions) {
            load("", 1);
        }
    }, [open]);

    useEffect(() => {
        return () => {
            if (searchTimeout) clearTimeout(searchTimeout);
        };
    }, [searchTimeout]);

    return (
        <Popover
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (o) onFocus?.();
            }}
        >
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled || loading}
                    className={cn(
                        "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 h-11 text-sm",
                        "hover:bg-accent/40 transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                    style={style}
                >
                    <span
                        className={cn(
                            "truncate text-left flex-1",
                            !selectedLabel && "text-muted-foreground",
                        )}
                    >
                        {loading ? "Loading…" : selectedLabel || placeholder}
                    </span>

                    <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {clearable &&
                            value != null &&
                            value !== "" &&
                            !disabled &&
                            !loading && (
                                <span
                                    role="button"
                                    tabIndex={-1}
                                    className="rounded p-1 hover:bg-muted transition-colors"
                                    onClick={handleClear}
                                >
                                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </span>
                            )}

                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[160px] shadow-md"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onWheel={(e) => e.stopPropagation()}
            >
                <Command>
                    <CommandInput
                        placeholder="Search…"
                        className="h-9 text-sm border-none focus:ring-0"
                        onValueChange={
                            loadOptions ? handleSearchChange : undefined
                        }
                    />

                    <CommandList
                        className="max-h-56 overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                        onScroll={loadOptions ? handleScroll : undefined}
                    >
                        <CommandEmpty className="py-5 text-center text-xs text-muted-foreground">
                            No results found.
                        </CommandEmpty>

                        <CommandGroup>
                            {displayOptions.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={String(opt.label ?? opt.value)}
                                    onSelect={handleSelect}
                                    className="text-sm cursor-pointer gap-2"
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4 flex-shrink-0 text-primary",
                                            String(value) === String(opt.value)
                                                ? "opacity-100"
                                                : "opacity-0",
                                        )}
                                    />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

// ─── Multi Combobox ───────────────────────────────────────────────────────────

export const MultiCombobox = ({
    options = [],
    value = [],
    onChange,
    onFocus,
    placeholder = "Select…",
    loading = false,
    disabled = false,
    className,
    style,
}) => {
    const [open, setOpen] = useState(false);
    const selected = Array.isArray(value) ? value : [];

    const selectedLabels = selected.map(
        (v) =>
            options.find((o) => String(o.value) === String(v))?.label ??
            String(v),
    );

    const toggle = (optValue) => {
        const next = selected.some((v) => String(v) === String(optValue))
            ? selected.filter((v) => String(v) !== String(optValue))
            : [...selected, optValue];
        onChange?.(next);
    };

    return (
        <Popover
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (o) onFocus?.();
            }}
        >
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled || loading}
                    className={cn(
                        "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 h-11 text-sm",
                        "hover:bg-accent/40 transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                    style={style}
                >
                    <span className="flex-1 truncate text-left min-w-0">
                        {loading ? (
                            <span className="text-muted-foreground">
                                Loading…
                            </span>
                        ) : selectedLabels.length > 0 ? (
                            <span className="flex gap-1 flex-wrap">
                                {selectedLabels.map((l) => (
                                    <Badge
                                        key={l}
                                        variant="secondary"
                                        className="text-xs px-2 py-0.5"
                                    >
                                        {l}
                                    </Badge>
                                ))}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        )}
                    </span>

                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-2" />
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[160px] shadow-md"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command>
                    <CommandInput
                        placeholder="Search…"
                        className="h-9 text-sm border-none focus:ring-0"
                    />

                    <CommandList
                        className="max-h-56 overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <CommandEmpty className="py-5 text-center text-xs text-muted-foreground">
                            No results found.
                        </CommandEmpty>

                        <CommandGroup>
                            {options.map((opt) => {
                                const isSelected = selected.some(
                                    (v) => String(v) === String(opt.value),
                                );

                                return (
                                    <CommandItem
                                        key={opt.value}
                                        value={String(opt.label ?? opt.value)}
                                        onSelect={() => toggle(opt.value)}
                                        className="text-sm cursor-pointer gap-2"
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4 flex-shrink-0 text-primary",
                                                isSelected
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
