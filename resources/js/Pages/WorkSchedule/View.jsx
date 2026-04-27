import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import {
    FileSpreadsheet,
    Calendar,
    Clock,
    User,
    Maximize2,
    Minimize2,
    ArrowLeft,
    Search,
    Loader2,
    ChevronDown,
    ChevronUp,
    CheckCheck,
    ThumbsDown,
    ThumbsUp,
} from "lucide-react";
import ScheduleTableViewing from "./ScheduleTableViewing";
import { Pagination } from "@/Components/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
export default function WorkScheduleView({
    groupedData = [],
    shiftCodes = [],
    pagination = null,
    dateStart,
    dateEnd,
    filters = {},
    viewerContext = {},
}) {
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [remarksDialog, setRemarksDialog] = useState({
        open: false,
        action: null,
    }); // action: 'approve' | 'disapprove'
    const [remarks, setRemarks] = useState("");
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [acknowledging, setAcknowledging] = useState(false);
    const [legendCollapsed, setLegendCollapsed] = useState(false);
    const [search, setSearch] = useState(filters.search || "");
    const [perPage, setPerPage] = useState(filters.perPage || 20);

    const status = filters.status ?? null;
    const { isOwnRecord, isCreator, canApprove } = viewerContext;

    const canAcknowledge = isOwnRecord && status === 2;
    const isMounted = useRef(false);

    const totalEmployees =
        pagination?.total || groupedData[0]?.schedules?.length || 0;
    const createdBy = groupedData[0]?.created_by || "";
    const formattedDateRange = `${dayjs(dateStart).format("MMMM D, YYYY")} — ${dayjs(dateEnd).format("MMMM D, YYYY")}`;

    const today = dayjs();
    const cutoffEnd = dayjs(dateEnd);
    const isCutoffActive = today.isBefore(cutoffEnd.add(1, "day"));
    const canEdit = viewerContext.isCreator && isCutoffActive;
    // ── Navigation ──────────────────────────────────────────────────────────

    const buildParams = useCallback(
        (overrides = {}) => {
            const params = {
                created_by: createdBy,
                date_start: dateStart,
                date_end: dateEnd,
                status,
                perPage,
                search,
                page: 1,
                ...overrides,
            };
            return { hash: btoa(JSON.stringify(params)) };
        },
        [createdBy, dateStart, dateEnd, status, perPage, search],
    );

    const navigate = useCallback(
        (overrides = {}) => {
            setLoading(true);
            router.get(route("workschedule.view"), buildParams(overrides), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["groupedData", "pagination", "filters", "viewerContext"],
                onFinish: () => setLoading(false),
            });
        },
        [buildParams],
    );

    // ── Effects ─────────────────────────────────────────────────────────────

    useEffect(() => {
        isMounted.current = true;
    }, []);

    useEffect(() => {
        if (!isMounted.current) return;
        const timeout = setTimeout(() => navigate({ search, page: 1 }), 500);
        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        if (!isMounted.current) return;
        navigate({ perPage, page: 1 });
    }, [perPage]);
    const handleApprove = () => {
        if (!confirm("Are you sure you want to approve this schedule?")) return;

        router.post(
            route("workschedule.approve"),
            { created_by: createdBy, date_start: dateStart, date_end: dateEnd },
            {
                onSuccess: () => {
                    const params = {
                        created_by: createdBy,
                        date_start: dateStart,
                        date_end: dateEnd,
                        status: 2, // moves to To Acknowledge
                        perPage: filters.perPage || 20,
                        page: 1,
                        search: "",
                    };
                    router.visit(
                        route("workschedule.view") +
                            "?hash=" +
                            btoa(JSON.stringify(params)),
                    );
                },
            },
        );
    };

    const handleDisapprove = () => {
        if (!confirm("Are you sure you want to disapprove this schedule?"))
            return;

        router.post(
            route("workschedule.disapprove"),
            { created_by: createdBy, date_start: dateStart, date_end: dateEnd },
            {
                onSuccess: () => {
                    const params = {
                        created_by: createdBy,
                        date_start: dateStart,
                        date_end: dateEnd,
                        status: 4, // moves to Disapproved
                        perPage: filters.perPage || 20,
                        page: 1,
                        search: "",
                    };
                    router.visit(
                        route("workschedule.view") +
                            "?hash=" +
                            btoa(JSON.stringify(params)),
                    );
                },
            },
        );
    };
    // ── Acknowledge ──────────────────────────────────────────────────────────

    const handleAcknowledge = () => {
        if (!confirm("Are you sure you want to acknowledge this schedule?"))
            return;

        setAcknowledging(true);
        router.post(
            route("workschedule.acknowledge"),
            {
                created_by: createdBy,
                date_start: dateStart,
                date_end: dateEnd,
            },
            {
                onSuccess: () => {
                    // Navigate to the same view but with status 3 (Acknowledged)
                    const params = {
                        created_by: createdBy,
                        date_start: dateStart,
                        date_end: dateEnd,
                        status: 3,
                        perPage: filters.perPage || 20,
                        page: 1,
                        search: "",
                    };
                    router.visit(
                        route("workschedule.view") +
                            "?hash=" +
                            btoa(JSON.stringify(params)),
                    );
                },
                onError: () => setAcknowledging(false),
                onFinish: () => setAcknowledging(false),
            },
        );
    };

    // ── Fullscreen ───────────────────────────────────────────────────────────

    const toggleFullscreen = useCallback(() => {
        if (!isFullscreen) {
            (
                document.documentElement.requestFullscreen ||
                document.documentElement.webkitRequestFullscreen ||
                document.documentElement.msRequestFullscreen
            )?.call(document.documentElement);
        } else {
            (
                document.exitFullscreen ||
                document.webkitExitFullscreen ||
                document.msExitFullscreen
            )?.call(document);
        }
    }, [isFullscreen]);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        document.addEventListener("webkitfullscreenchange", handler);
        document.addEventListener("msfullscreenchange", handler);
        return () => {
            document.removeEventListener("fullscreenchange", handler);
            document.removeEventListener("webkitfullscreenchange", handler);
            document.removeEventListener("msfullscreenchange", handler);
        };
    }, []);

    // ── Shift helpers ────────────────────────────────────────────────────────

    const shiftMap = useMemo(() => {
        return Object.fromEntries(
            (shiftCodes || []).map((s) => {
                const bg = s.shiftcode_bg_color
                    ? /^[0-9A-Fa-f]{6}$/.test(s.shiftcode_bg_color)
                        ? `#${s.shiftcode_bg_color}`
                        : s.shiftcode_bg_color
                    : "#FFFFFF";
                const color = s.shiftcode_font_color
                    ? /^[0-9A-Fa-f]{6}$/.test(s.shiftcode_font_color)
                        ? `#${s.shiftcode_font_color}`
                        : s.shiftcode_font_color
                    : "#000000";
                return [
                    s.shiftcode,
                    { bg, color, desc: s.shiftcode_desc || "" },
                ];
            }),
        );
    }, [shiftCodes]);

    const shiftOptions = useMemo(
        () =>
            (shiftCodes || []).map((s) => ({
                value: s.shiftcode,
                label: `${s.shiftcode} - ${s.shiftcode_desc}`,
            })),
        [shiftCodes],
    );
    const handleRowSelect = (rowIdx, checked) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            checked ? next.add(rowIdx) : next.delete(rowIdx);
            return next;
        });
    };

    const handleSelectAll = (checked) => {
        setSelectedRows(checked ? new Set(data.map((_, i) => i)) : new Set());
    };

    const openBulkAction = (action) => {
        if (selectedRows.size === 0) return;
        setRemarks("");
        setRemarksDialog({ open: true, action });
    };

    const handleBulkConfirm = () => {
        if (remarksDialog.action === "disapprove" && !remarks.trim()) return;

        setBulkProcessing(true);

        // Get emp_ids of selected rows — row[0] is emp_id
        const selectedEmpIds = [...selectedRows].map((idx) => data[idx][0]);

        const routeName =
            remarksDialog.action === "approve"
                ? "workschedule.approve"
                : "workschedule.disapprove";

        const targetStatus = remarksDialog.action === "approve" ? 2 : 4;

        router.post(
            route(routeName),
            {
                created_by: createdBy,
                date_start: dateStart,
                date_end: dateEnd,
                emp_ids: selectedEmpIds,
                remarks: remarks.trim() || null,
            },
            {
                onSuccess: () => {
                    setRemarksDialog({ open: false, action: null });
                    setSelectedRows(new Set());
                    const params = {
                        created_by: createdBy,
                        date_start: dateStart,
                        date_end: dateEnd,
                        status: targetStatus,
                        perPage: filters.perPage || 20,
                        page: 1,
                        search: "",
                    };
                    router.visit(
                        route("workschedule.view") +
                            "?hash=" +
                            btoa(JSON.stringify(params)),
                    );
                },
                onError: () => setBulkProcessing(false),
                onFinish: () => setBulkProcessing(false),
            },
        );
    };
    // ── Pagination meta ──────────────────────────────────────────────────────

    const paginationMeta = pagination
        ? {
              current_page: pagination.currentPage,
              last_page: pagination.lastPage,
              from: pagination.from,
              to: pagination.to,
              total: pagination.total,
              per_page: pagination.perPage,
          }
        : null;

    const goToPage = (page) => {
        if (page < 1 || (pagination && page > pagination.lastPage)) return;
        navigate({ page });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ── Current group ────────────────────────────────────────────────────────

    const currentGroup = groupedData[0] || {};
    const data = currentGroup.schedules || [];
    const headers = currentGroup.headers || [];
    const subHeaders = currentGroup.subHeaders || [];

    // ── Legend ───────────────────────────────────────────────────────────────

    const Legend = () => {
        if (!shiftCodes?.length) return null;
        const codes = shiftCodes.filter((s) => s.shiftcode);
        const codesPerRow = 6;

        if (legendCollapsed) {
            return (
                <div className="rounded-md border bg-muted/30 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLegendCollapsed(false)}
                        className="w-full justify-between px-4 py-2 h-auto"
                    >
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Shift Code Legend ({codes.length} codes)
                        </span>
                        <ChevronDown className="w-4 h-4" />
                    </Button>
                </div>
            );
        }

        return (
            <div className="rounded-md border bg-muted/30 overflow-auto mb-4">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Shift Code Legend ({codes.length} codes)
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLegendCollapsed(true)}
                        className="h-6 w-6 p-0"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </Button>
                </div>
                <Table>
                    <TableBody>
                        {Array.from({
                            length: Math.ceil(codes.length / codesPerRow),
                        }).map((_, rowIdx) => {
                            const rowCodes = codes.slice(
                                rowIdx * codesPerRow,
                                (rowIdx + 1) * codesPerRow,
                            );
                            return (
                                <TableRow key={rowIdx}>
                                    {rowCodes.map((code, colIdx) => {
                                        const style =
                                            shiftMap[code.shiftcode] ?? {};
                                        return (
                                            <TooltipProvider key={colIdx}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell
                                                            className="text-center p-2 font-semibold text-sm cursor-help"
                                                            style={{
                                                                backgroundColor:
                                                                    style.bg,
                                                                color: style.color,
                                                            }}
                                                        >
                                                            <div>
                                                                {code.shiftcode}
                                                            </div>
                                                            <div className="text-xs font-normal opacity-75 mt-0.5">
                                                                {code.shiftcode_desc?.substring(
                                                                    0,
                                                                    30,
                                                                )}
                                                                {code
                                                                    .shiftcode_desc
                                                                    ?.length >
                                                                30
                                                                    ? "..."
                                                                    : ""}
                                                            </div>
                                                        </TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="top"
                                                        className="max-w-xs"
                                                    >
                                                        <p className="text-xs">
                                                            <span className="font-semibold">
                                                                {code.shiftcode}
                                                            </span>
                                                            <br />
                                                            {
                                                                code.shiftcode_desc
                                                            }
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        );
                                    })}
                                    {rowCodes.length < codesPerRow &&
                                        Array.from({
                                            length:
                                                codesPerRow - rowCodes.length,
                                        }).map((_, i) => <TableCell key={i} />)}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    // ── Render ───────────────────────────────────────────────────────────────

    const content = (
        <div className={isFullscreen ? "bg-background" : ""}>
            {/* Header */}
            <div
                className={`border-b bg-card px-6 py-4 ${isFullscreen ? "sticky top-0 z-50" : ""}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {!isFullscreen && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.visit(route("workschedule.index"))
                                }
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                        )}
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                <FileSpreadsheet className="w-5 h-5 text-primary" />
                                Work Schedule View
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" /> Created by:{" "}
                                    {createdBy || "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />{" "}
                                    {formattedDateRange}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />{" "}
                                    {totalEmployees} employee
                                    {totalEmployees !== 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2">
                        {canAcknowledge && (
                            <Button
                                size="sm"
                                onClick={handleAcknowledge}
                                disabled={acknowledging}
                                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                                {acknowledging ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Acknowledging...
                                    </>
                                ) : (
                                    <>
                                        <CheckCheck className="w-4 h-4" />
                                        Acknowledge
                                    </>
                                )}
                            </Button>
                        )}
                        {/* Bulk action bar — only in approval state */}
                        {canApprove && (
                            <div
                                className={cn(
                                    "px-4 py-2 flex items-center justify-between gap-3 border-b transition-colors",
                                    selectedRows.size > 0
                                        ? "bg-primary/5"
                                        : "bg-transparent",
                                )}
                            >
                                <span className="text-sm text-muted-foreground">
                                    {selectedRows.size > 0
                                        ? `${selectedRows.size} employee${selectedRows.size !== 1 ? "s" : ""} selected`
                                        : "Select employees to bulk approve or disapprove"}
                                </span>
                                {selectedRows.size > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                openBulkAction("approve")
                                            }
                                            disabled={bulkProcessing}
                                            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                            Approve ({selectedRows.size})
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                openBulkAction("disapprove")
                                            }
                                            disabled={bulkProcessing}
                                            className="gap-2"
                                        >
                                            <ThumbsDown className="w-3.5 h-3.5" />
                                            Disapprove ({selectedRows.size})
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleFullscreen}
                            className="gap-2"
                        >
                            {isFullscreen ? (
                                <>
                                    <Minimize2 className="w-4 h-4" /> Exit
                                    Fullscreen
                                </>
                            ) : (
                                <>
                                    <Maximize2 className="w-4 h-4" /> Full
                                    Screen
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
                {groupedData.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No schedules found for this period.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        <CardContent className="p-4">
                            <Legend />
                        </CardContent>

                        {/* Controls */}
                        <div className="px-4 pb-2 flex items-center justify-end gap-3 border-b">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by ID or name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 h-8 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Show</span>
                                <Select
                                    value={String(perPage)}
                                    onValueChange={(v) => setPerPage(Number(v))}
                                >
                                    <SelectTrigger className="w-20 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[10, 20, 50, 100].map((n) => (
                                            <SelectItem
                                                key={n}
                                                value={String(n)}
                                            >
                                                {n}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>entries</span>
                            </div>
                        </div>

                        {/* Table */}
                        <CardContent className="p-4 space-y-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <span className="ml-2 text-muted-foreground">
                                        Loading...
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <ScheduleTableViewing
                                        data={data}
                                        headers={headers}
                                        subHeaders={subHeaders}
                                        frozenColumns={6}
                                        stickyColumns={2}
                                        shiftMap={shiftMap}
                                        shiftOptions={shiftOptions}
                                        maxHeight={
                                            isFullscreen
                                                ? "calc(100vh - 400px)"
                                                : "60vh"
                                        }
                                        showHeader={true}
                                        editable={canEdit}
                                        selectable={canApprove}
                                        selectedRows={selectedRows}
                                        onRowSelect={handleRowSelect}
                                        onSelectAll={handleSelectAll}
                                    />
                                    {/* Remarks Dialog */}
                                    <Dialog
                                        open={remarksDialog.open}
                                        onOpenChange={(open) =>
                                            !bulkProcessing &&
                                            setRemarksDialog({
                                                open,
                                                action: null,
                                            })
                                        }
                                    >
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    {remarksDialog.action ===
                                                    "approve" ? (
                                                        <>
                                                            <ThumbsUp className="w-5 h-5 text-green-600" />{" "}
                                                            Approve Schedules
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertTriangle className="w-5 h-5 text-destructive" />{" "}
                                                            Disapprove Schedules
                                                        </>
                                                    )}
                                                </DialogTitle>
                                                <DialogDescription>
                                                    {remarksDialog.action ===
                                                    "approve"
                                                        ? `Approving ${selectedRows.size} employee schedule${selectedRows.size !== 1 ? "s" : ""}. Remarks are optional.`
                                                        : `Disapproving ${selectedRows.size} employee schedule${selectedRows.size !== 1 ? "s" : ""}. Please provide a reason.`}
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-3 py-2">
                                                <div className="space-y-2">
                                                    <Label>
                                                        Remarks
                                                        {remarksDialog.action ===
                                                            "disapprove" && (
                                                            <span className="text-destructive ml-1">
                                                                *
                                                            </span>
                                                        )}
                                                    </Label>
                                                    <Textarea
                                                        placeholder={
                                                            remarksDialog.action ===
                                                            "disapprove"
                                                                ? "Enter reason for disapproval…"
                                                                : "Optional remarks…"
                                                        }
                                                        value={remarks}
                                                        onChange={(e) =>
                                                            setRemarks(
                                                                e.target.value,
                                                            )
                                                        }
                                                        rows={3}
                                                        className="resize-none"
                                                    />
                                                    {remarksDialog.action ===
                                                        "disapprove" &&
                                                        !remarks.trim() && (
                                                            <p className="text-xs text-destructive">
                                                                Remarks are
                                                                required for
                                                                disapproval.
                                                            </p>
                                                        )}
                                                </div>
                                            </div>

                                            <DialogFooter className="gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setRemarksDialog({
                                                            open: false,
                                                            action: null,
                                                        })
                                                    }
                                                    disabled={bulkProcessing}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleBulkConfirm}
                                                    disabled={
                                                        bulkProcessing ||
                                                        (remarksDialog.action ===
                                                            "disapprove" &&
                                                            !remarks.trim())
                                                    }
                                                    className={
                                                        remarksDialog.action ===
                                                        "approve"
                                                            ? "bg-green-600 hover:bg-green-700 text-white"
                                                            : ""
                                                    }
                                                    variant={
                                                        remarksDialog.action ===
                                                        "disapprove"
                                                            ? "destructive"
                                                            : "default"
                                                    }
                                                >
                                                    {bulkProcessing ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                                                            Processing...
                                                        </>
                                                    ) : remarksDialog.action ===
                                                      "approve" ? (
                                                        <>
                                                            <ThumbsUp className="w-4 h-4 mr-2" />{" "}
                                                            Confirm Approve
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ThumbsDown className="w-4 h-4 mr-2" />{" "}
                                                            Confirm Disapprove
                                                        </>
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    {paginationMeta &&
                                        paginationMeta.total >
                                            paginationMeta.per_page && (
                                            <Pagination
                                                meta={paginationMeta}
                                                onPageChange={goToPage}
                                            />
                                        )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );

    return isFullscreen ? (
        <>
            <Head title="Work Schedule View - Fullscreen" />
            {content}
        </>
    ) : (
        <AuthenticatedLayout>
            <Head title="Work Schedule View" />
            {content}
        </AuthenticatedLayout>
    );
}
