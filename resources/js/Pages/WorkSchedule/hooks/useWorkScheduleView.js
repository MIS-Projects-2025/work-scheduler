import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { router } from "@inertiajs/react";
import dayjs from "dayjs";
import { buildShiftMap, buildShiftOptions } from "../helpers/scheduleHelpers";

/**
 * All state, derived values, and handlers for the WorkSchedule View page.
 */
export function useWorkScheduleView({
    groupedData,
    shiftCodes,
    pagination,
    dateStart,
    dateEnd,
    filters,
    viewerContext,
}) {
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [remarksDialog, setRemarksDialog] = useState({
        open: false,
        action: null,
    });
    const [remarks, setRemarks] = useState("");
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [acknowledging, setAcknowledging] = useState(false);
    const [legendCollapsed, setLegendCollapsed] = useState(false);
    const [search, setSearch] = useState(filters.search || "");
    const [perPage, setPerPage] = useState(filters.perPage || 20);

    const isMounted = useRef(false);

    // ── Derived from props ────────────────────────────────────────────────────
    const status = filters.status ?? null;
    const { isOwnRecord, isCreator, canApprove } = viewerContext;
    const canAcknowledge = isOwnRecord && status === 2;
    const isCutoffActive = dayjs().isBefore(dayjs(dateEnd).add(1, "day"));
    const canEdit = !!isCreator && isCutoffActive;

    const currentGroup = groupedData[0] || {};
    const data = currentGroup.schedules || [];
    const headers = currentGroup.headers || [];
    const subHeaders = currentGroup.subHeaders || [];
    const createdBy = currentGroup.created_by || "";

    // ── Shared shift helpers (same source as useWorkSchedule) ─────────────────
    const shiftMap = useMemo(() => buildShiftMap(shiftCodes), [shiftCodes]);
    const shiftOptions = useMemo(
        () => buildShiftOptions(shiftCodes),
        [shiftCodes],
    );

    // ── Navigation ─────────────────────────────────────────────────────────────
    const buildParams = useCallback(
        (overrides = {}) => ({
            hash: btoa(
                JSON.stringify({
                    created_by: createdBy,
                    date_start: dateStart,
                    date_end: dateEnd,
                    status,
                    perPage,
                    search,
                    page: 1,
                    ...overrides,
                }),
            ),
        }),
        [createdBy, dateStart, dateEnd, status, perPage, search],
    );

    /** Partial reload — only refreshes data props, keeps the same page. */
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

    /** Full page visit — used after approve/disapprove/acknowledge. */
    const visitView = useCallback(
        (overrides = {}) => {
            router.visit(
                route("workschedule.view") +
                    "?hash=" +
                    btoa(
                        JSON.stringify({
                            created_by: createdBy,
                            date_start: dateStart,
                            date_end: dateEnd,
                            status,
                            perPage: filters.perPage || 20,
                            page: 1,
                            search: "",
                            ...overrides,
                        }),
                    ),
            );
        },
        [createdBy, dateStart, dateEnd, status, filters.perPage],
    );

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        isMounted.current = true;
    }, []);

    useEffect(() => {
        if (!isMounted.current) return;
        const t = setTimeout(() => navigate({ search, page: 1 }), 500);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        if (!isMounted.current) return;
        navigate({ perPage, page: 1 });
    }, [perPage]);

    // ── Fullscreen ─────────────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
        if (!isFullscreen) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
    }, [isFullscreen]);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        const events = [
            "fullscreenchange",
            "webkitfullscreenchange",
            "msfullscreenchange",
        ];
        events.forEach((e) => document.addEventListener(e, handler));
        return () => events.forEach((e) => document.removeEventListener(e, handler));
    }, []);

    // ── Actions ────────────────────────────────────────────────────────────────
    const handleApprove = () => {
        if (!confirm("Are you sure you want to approve this schedule?")) return;
        router.post(
            route("workschedule.approve"),
            { created_by: createdBy, date_start: dateStart, date_end: dateEnd },
            { onSuccess: () => visitView({ status: 2 }) },
        );
    };

    const handleDisapprove = () => {
        if (!confirm("Are you sure you want to disapprove this schedule?"))
            return;
        router.post(
            route("workschedule.disapprove"),
            { created_by: createdBy, date_start: dateStart, date_end: dateEnd },
            { onSuccess: () => visitView({ status: 4 }) },
        );
    };

    const handleAcknowledge = () => {
        if (!confirm("Are you sure you want to acknowledge this schedule?"))
            return;
        setAcknowledging(true);
        router.post(
            route("workschedule.acknowledge"),
            { created_by: createdBy, date_start: dateStart, date_end: dateEnd },
            {
                onSuccess: () => visitView({ status: 3 }),
                onError: () => setAcknowledging(false),
                onFinish: () => setAcknowledging(false),
            },
        );
    };

    // ── Selection & bulk actions ───────────────────────────────────────────────
    const handleRowSelect = (rowIdx, checked) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            checked ? next.add(rowIdx) : next.delete(rowIdx);
            return next;
        });
    };

    const handleSelectAll = (checked) => {
        setSelectedRows(
            checked ? new Set(data.map((_, i) => i)) : new Set(),
        );
    };

    const openBulkAction = (action) => {
        if (selectedRows.size === 0) return;
        setRemarks("");
        setRemarksDialog({ open: true, action });
    };

    const handleBulkConfirm = () => {
        if (remarksDialog.action === "disapprove" && !remarks.trim()) return;
        setBulkProcessing(true);

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
                    visitView({ status: targetStatus });
                },
                onError: () => setBulkProcessing(false),
                onFinish: () => setBulkProcessing(false),
            },
        );
    };

    // ── Pagination ─────────────────────────────────────────────────────────────
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

    return {
        // state
        selectedRows,
        remarksDialog,
        setRemarksDialog,
        remarks,
        setRemarks,
        bulkProcessing,
        isFullscreen,
        loading,
        acknowledging,
        legendCollapsed,
        setLegendCollapsed,
        search,
        setSearch,
        perPage,
        setPerPage,
        // derived
        status,
        canApprove,
        canAcknowledge,
        canEdit,
        createdBy,
        data,
        headers,
        subHeaders,
        shiftMap,
        shiftOptions,
        paginationMeta,
        // handlers
        toggleFullscreen,
        handleApprove,
        handleDisapprove,
        handleAcknowledge,
        handleRowSelect,
        handleSelectAll,
        openBulkAction,
        handleBulkConfirm,
        goToPage,
    };
}
