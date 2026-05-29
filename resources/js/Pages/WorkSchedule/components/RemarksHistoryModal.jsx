import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "../hooks/useDebounce";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Badge } from "@/Components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import { Loader2, Clock, User, FileText, RefreshCw, Download, Search } from "lucide-react";
import dayjs from "dayjs";
import ServerTable from "@/Components/ServerTable";
import { Pagination } from "@/Components/Pagination";

const PAGE_SIZES = [10, 20, 50, 100];

const OPERATION_CONFIG = {
    CREATE:      { label: "Created",      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    UPDATE:      { label: "Updated",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    DELETE:      { label: "Deleted",      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
    APPROVE:     { label: "Approved",     color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
    DISAPPROVE:  { label: "Disapproved",  color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
    ACKNOWLEDGE: { label: "Acknowledged", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300" },
};

function OperationBadge({ operation }) {
    const cfg = OPERATION_CONFIG[operation] ?? OPERATION_CONFIG.UPDATE;
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
}

const COLUMNS = [
    {
        key: "emp_name",
        label: "Employee",
        render: (row) => (
            <div>
                <div className="font-medium text-sm">{row.emp_name}</div>
                <div className="text-xs text-muted-foreground">{row.emp_id}</div>
            </div>
        ),
    },
    {
        key: "operation",
        label: "Operation",
        render: (row) => <OperationBadge operation={row.operation} />,
    },
    {
        key: "old_remarks",
        label: "Old Remarks",
        className: "max-w-[180px]",
        render: (row) => (
            <span className="block truncate" title={row.old_remarks}>
                {row.old_remarks || "—"}
            </span>
        ),
    },
    {
        key: "new_remarks",
        label: "New Remarks",
        className: "max-w-[180px]",
        render: (row) => (
            <span className="block truncate" title={row.new_remarks}>
                {row.new_remarks || "—"}
            </span>
        ),
    },
    {
        key: "updated_by_name",
        label: "Updated By",
    },
    {
        key: "updated_at",
        label: "Date",
        className: "whitespace-nowrap",
        render: (row) => dayjs(row.updated_at).format("MMM D, YYYY h:mm A"),
    },
];

export default function RemarksHistoryModal({
    open,
    onClose,
    dateStart,
    dateEnd,
    cutoffLabel,
}) {
    const [loading, setLoading]       = useState(false);
    const [data, setData]             = useState([]);
    const [summary, setSummary]       = useState(null);
    const [pagination, setPagination] = useState(null);
    const [error, setError]           = useState(null);

    const [search, setSearch]   = useState("");
    const [page, setPage]       = useState(1);
    const [perPage, setPerPage] = useState(20);

    const debouncedSearch = useDebounce(search, 350);

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const fetchHistory = useCallback(async () => {
        if (!dateStart || !dateEnd) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                date_start: dateStart,
                date_end:   dateEnd,
                page:       String(page),
                per_page:   String(perPage),
            });
            if (debouncedSearch) params.set("search", debouncedSearch);

            const res = await fetch(
                route("workschedule.remarks-history") + "?" + params.toString(),
                { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json.data ?? []);
            setSummary(json.summary ?? null);
            setPagination(json.pagination ?? null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [dateStart, dateEnd, page, perPage, debouncedSearch]);

    // Fetch when modal opens or params change
    useEffect(() => {
        if (open) fetchHistory();
    }, [open, fetchHistory]);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setSearch("");
            setPage(1);
            setPerPage(20);
            setData([]);
            setSummary(null);
            setPagination(null);
            setError(null);
        }
    }, [open]);

    const handleExport = () => {
        const params = new URLSearchParams({ date_start: dateStart, date_end: dateEnd });
        window.location.href = route("workschedule.remarks-history.export") + "?" + params.toString();
    };

    const paginationMeta = pagination
        ? {
              current_page: pagination.current_page,
              last_page:    pagination.last_page,
              from:         pagination.from,
              to:           pagination.to,
              total:        pagination.total,
              per_page:     pagination.per_page,
          }
        : null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
                        <span>Remarks History — {cutoffLabel}</span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={loading}
                            >
                                <Download className="w-4 h-4 mr-1.5" />
                                Export
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchHistory}
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Summary cards */}
                {summary && (
                    <div className="grid grid-cols-3 gap-3 shrink-0">
                        <div className="bg-primary/10 rounded-lg p-3 text-center">
                            <FileText className="w-6 h-6 mx-auto mb-1 text-primary" />
                            <div className="text-xl font-bold">{summary.total_changes}</div>
                            <div className="text-xs text-muted-foreground">Total Changes</div>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-3 text-center">
                            <User className="w-6 h-6 mx-auto mb-1 text-green-600 dark:text-green-400" />
                            <div className="text-xl font-bold">{summary.employees_affected}</div>
                            <div className="text-xs text-muted-foreground">Employees Affected</div>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                            <Clock className="w-6 h-6 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                            <div className="text-xs font-mono">
                                {summary.latest_change
                                    ? dayjs(summary.latest_change).format("MMM D, YYYY h:mm A")
                                    : "No changes"}
                            </div>
                            <div className="text-xs text-muted-foreground">Latest Change</div>
                        </div>
                    </div>
                )}

                {/* Search + page size controls */}
                <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by ID, name, or updated by..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Show</span>
                        <Select
                            value={String(perPage)}
                            onValueChange={(v) => {
                                setPerPage(Number(v));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-20 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZES.map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>entries</span>
                    </div>
                </div>

                {/* Table area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-7 h-7 animate-spin text-primary" />
                            <span className="ml-2 text-muted-foreground">Loading...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-destructive">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">{error}</p>
                            <Button variant="outline" onClick={fetchHistory} className="mt-4">
                                Try Again
                            </Button>
                        </div>
                    ) : (
                        <ServerTable
                            columns={COLUMNS}
                            data={data}
                            orderBy=""
                            orderDir="asc"
                            onSort={() => {}}
                            emptyMessage="No remarks history found for this cutoff period."
                        />
                    )}
                </div>

                {/* Pagination */}
                {paginationMeta && paginationMeta.last_page > 1 && (
                    <div className="shrink-0">
                        <Pagination meta={paginationMeta} onPageChange={setPage} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
