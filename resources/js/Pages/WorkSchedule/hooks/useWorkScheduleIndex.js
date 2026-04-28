import { useState, useEffect, useCallback, useRef } from "react";
import { router } from "@inertiajs/react";
import { useDebounce } from "./useDebounce";

export function useWorkScheduleIndex({
    initialSchedules,
    initialTabCounts,
    initialFilters,
}) {
    const [schedules, setSchedules] = useState(initialSchedules);
    const [tabCounts, setTabCounts] = useState(initialTabCounts);
    const [activeStatus, setActiveStatus] = useState(
        initialFilters.status || 1,
    );
    const [search, setSearch] = useState(initialFilters.search || "");
    const [orderBy, setOrderBy] = useState(
        initialFilters.orderBy || "payroll_date_start",
    );
    const [orderDir, setOrderDir] = useState(initialFilters.orderDir || "desc");
    const [perPage, setPerPage] = useState(initialFilters.perPage || 15);
    const [loading, setLoading] = useState(false);

    const debouncedSearch = useDebounce(search, 300);
    const isMounted = useRef(false);
    const isUserAction = useRef(false);

    // When Inertia does a full page visit (e.g. sidebar click),
    // re-sync all state from the fresh server props
    useEffect(() => {
        setSchedules(initialSchedules);
        setTabCounts(initialTabCounts);
        setActiveStatus(initialFilters.status || 1);
        setSearch(initialFilters.search || "");
        setOrderBy(initialFilters.orderBy || "payroll_date_start");
        setOrderDir(initialFilters.orderDir || "desc");
        setPerPage(initialFilters.perPage || 15);
        // Mark as freshly synced — don't trigger a navigate
    }, [initialFilters]);

    const navigate = useCallback(
        (params = {}) => {
            setLoading(true);
            const filters = {
                status: activeStatus,
                search: debouncedSearch,
                orderBy,
                orderDir,
                perPage,
                page: 1,
                ...params,
            };
            router.get(
                route("workschedule.index"),
                { hash: btoa(JSON.stringify(filters)) },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ["schedules", "tabCounts", "filters"],
                    onSuccess: (page) => {
                        setSchedules(page.props.schedules);
                        setTabCounts(page.props.tabCounts);
                        setLoading(false);
                    },
                    onError: () => setLoading(false),
                },
            );
        },
        [activeStatus, debouncedSearch, orderBy, orderDir, perPage],
    );

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        navigate({ page: 1 });
    }, [activeStatus, debouncedSearch, orderBy, orderDir, perPage]);
    const handleTabChange = (value) => setActiveStatus(value);

    const handleSort = (col) => {
        if (orderBy === col) setOrderDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setOrderBy(col);
            setOrderDir("asc");
        }
    };

    const handlePageChange = (page) => {
        navigate({ page });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleView = (row) => {
        setLoading(true);
        router.get(route("workschedule.view"), {
            hash: btoa(
                JSON.stringify({
                    created_by: row.created_by,
                    date_start: row.payroll_date_start,
                    date_end: row.payroll_date_end,
                    status: row.work_sched_status,
                    perPage: 20,
                    page: 1,
                    search: "",
                }),
            ),
        });
    };

    return {
        schedules,
        tabCounts,
        loading,
        activeStatus,
        search,
        orderBy,
        orderDir,
        perPage,
        setSearch,
        setPerPage,
        handleTabChange,
        handleSort,
        handlePageChange,
        handleView,
    };
}
