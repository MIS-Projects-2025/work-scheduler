import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect, useCallback } from "react";
import {
    FileSpreadsheet,
    Search,
    Eye,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Pagination } from "@/Components/Pagination";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STATUS_TABS = [
    {
        value: 1,
        label: "For Approval",
        countKey: "forApproval",
        variant: "warning",
    },
    { value: 2, label: "To Acknowledge", countKey: "forAck", variant: "info" },
    {
        value: 3,
        label: "Acknowledged",
        countKey: "doneAck",
        variant: "success",
    },
    {
        value: 4,
        label: "Disapproved",
        countKey: "disapproved",
        variant: "destructive",
    },
];

const STATUS_BADGE_CLASS = {
    0: "bg-muted text-muted-foreground",
    1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    2: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    3: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    4: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PAGE_SIZES = [10, 15, 25, 50];

// ─────────────────────────────────────────────
// Debounce Hook
// ─────────────────────────────────────────────

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function WorkScheduleIndex({
    schedules: initialSchedules,
    tabCounts: initialTabCounts = {},
    filters: initialFilters = {},
    empPosition = 0,
}) {
    // ── State from Inertia props ──
    const [schedules, setSchedules] = useState(initialSchedules);
    const [tabCounts, setTabCounts] = useState(initialTabCounts);
    const [activeStatus, setActiveStatus] = useState(
        initialFilters.status || 0,
    );
    const [search, setSearch] = useState(initialFilters.search || "");
    const [orderBy, setOrderBy] = useState(
        initialFilters.orderBy || "payroll_date_start",
    );
    const [orderDir, setOrderDir] = useState(initialFilters.orderDir || "desc");
    const [perPage, setPerPage] = useState(initialFilters.perPage || 15);
    const [loading, setLoading] = useState(false);

    // Debounce search
    const debouncedSearch = useDebounce(search, 300);

    // ── Navigation function ──
    const navigate = useCallback(
        (params = {}) => {
            setLoading(true);

            // Merge current filters with new params
            const newFilters = {
                status: activeStatus,
                search: debouncedSearch,
                orderBy: orderBy,
                orderDir: orderDir,
                perPage: perPage,
                page: params.page || 1,
                ...params,
            };

            // Create hash from filters
            const hash = btoa(JSON.stringify(newFilters));

            router.get(
                route("workschedule.index"),
                { hash: hash },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ["schedules", "tabCounts", "hash"],
                    onSuccess: (page) => {
                        setSchedules(page.props.schedules);
                        setTabCounts(page.props.tabCounts);
                        setLoading(false);
                    },
                    onError: () => {
                        setLoading(false);
                    },
                },
            );
        },
        [activeStatus, debouncedSearch, orderBy, orderDir, perPage],
    );

    // Trigger navigation when filters change
    useEffect(() => {
        navigate({ page: 1 });
    }, [activeStatus, debouncedSearch, orderBy, orderDir, perPage]);

    // ── Event handlers ──
    const handleTabChange = (statusValue) => {
        setActiveStatus(statusValue);
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
    };

    const handleSort = (col) => {
        if (orderBy === col) {
            setOrderDir(orderDir === "asc" ? "desc" : "asc");
        } else {
            setOrderBy(col);
            setOrderDir("asc");
        }
    };

    const handlePageChange = (page) => {
        navigate({ page });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePerPageChange = (value) => {
        setPerPage(Number(value));
    };

    const handleView = (row) => {
        const params = {
            created_by: row.created_by,
            date_start: row.payroll_date_start,
            date_end: row.payroll_date_end,
            status: row.work_sched_status,
            perPage: 20,
            page: 1,
            search: "",
        };
        router.get(route("workschedule.view"), {
            hash: btoa(JSON.stringify(params)),
        });
    };

    // ── Get data from paginator ──
    const rows = schedules?.data || [];
    const meta = schedules
        ? {
              current_page: schedules.current_page,
              last_page: schedules.last_page,
              from: schedules.from,
              to: schedules.to,
              total: schedules.total,
              per_page: schedules.per_page,
          }
        : null;

    // ── Sort icon helper ──
    const SortIcon = ({ col }) => {
        if (orderBy !== col)
            return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
        return orderDir === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5" />
        ) : (
            <ArrowDown className="w-3.5 h-3.5" />
        );
    };

    const SortableHead = ({ col, children }) => (
        <th
            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors"
            onClick={() => handleSort(col)}
        >
            <span className="flex items-center gap-1.5">
                {children}
                <SortIcon col={col} />
            </span>
        </th>
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AuthenticatedLayout>
            <Head title="Work Schedules" />

            <div className="min-h-screen bg-background p-6 space-y-5">
                {/* ── Page header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                            Work Schedules
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            View and manage work schedule submissions
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() =>
                            router.visit(route("workschedule.template"))
                        }
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Upload Schedule
                    </Button>
                </div>

                <Card>
                    {/* ── Status tabs ── */}
                    <CardHeader className="pb-0 px-0">
                        <div className="flex overflow-x-auto border-b">
                            {STATUS_TABS.map((tab) => {
                                const count = tabCounts[tab.countKey] ?? 0;
                                const isActive = activeStatus === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() =>
                                            handleTabChange(tab.value)
                                        }
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                                            isActive
                                                ? "border-primary text-primary"
                                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                                        )}
                                    >
                                        {tab.label}
                                        {count > 0 && (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold min-w-[1.25rem]",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground",
                                                )}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                        {/* ── Toolbar ── */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by creator ID…"
                                    value={search}
                                    onChange={handleSearch}
                                    className="pl-8"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Show</span>
                                <Select
                                    value={String(perPage)}
                                    onValueChange={handlePerPageChange}
                                >
                                    <SelectTrigger className="w-20 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAGE_SIZES.map((s) => (
                                            <SelectItem
                                                key={s}
                                                value={String(s)}
                                            >
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>entries</span>
                            </div>
                        </div>

                        {/* ── Loading overlay ── */}
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="ml-2 text-muted-foreground">
                                    Loading...
                                </span>
                            </div>
                        )}

                        {/* ── Table ── */}
                        {!loading && (
                            <>
                                <div className="rounded-md border overflow-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <SortableHead col="created_by">
                                                    Created By
                                                </SortableHead>
                                                <SortableHead col="payroll_date_start">
                                                    Cutoff Period
                                                </SortableHead>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                                                    Employees
                                                </th>
                                                <SortableHead col="work_sched_status">
                                                    Status
                                                </SortableHead>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="py-16 text-center text-muted-foreground"
                                                    >
                                                        No schedules found.
                                                    </td>
                                                </tr>
                                            )}

                                            {rows.map((row, idx) => {
                                                const statusInt = Number(
                                                    row.work_sched_status,
                                                );
                                                return (
                                                    <tr
                                                        key={`${row.created_by}-${row.payroll_date_start}-${idx}`}
                                                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                                                    >
                                                        {/* Created by */}
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-foreground">
                                                                {row.created_by_name ??
                                                                    row.created_by}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {row.created_by}
                                                            </div>
                                                        </td>

                                                        {/* Cutoff period */}
                                                        <td className="px-4 py-3 whitespace-nowrap text-foreground">
                                                            {
                                                                row.payroll_date_start
                                                            }{" "}
                                                            —{" "}
                                                            {
                                                                row.payroll_date_end
                                                            }
                                                        </td>

                                                        {/* Employee count */}
                                                        <td className="px-4 py-3">
                                                            <Badge variant="secondary">
                                                                {row.total_employees ??
                                                                    0}
                                                            </Badge>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                                                    STATUS_BADGE_CLASS[
                                                                        statusInt
                                                                    ] ??
                                                                        "bg-muted text-muted-foreground",
                                                                )}
                                                            >
                                                                {
                                                                    row.status_label
                                                                }
                                                            </span>
                                                        </td>

                                                        {/* Action */}
                                                        <td className="px-4 py-3 text-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleView(
                                                                        row,
                                                                    )
                                                                }
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                                View
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── Pagination (reusable component) ── */}
                                {meta && meta.total > 0 && (
                                    <Pagination
                                        meta={meta}
                                        onPageChange={handlePageChange}
                                    />
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
