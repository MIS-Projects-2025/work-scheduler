import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * usePaginatedResource
 *
 * Generic hook for server-side paginated CRUD resources that use axios +
 * Laravel-style JSON responses ({ success, data: { data, current_page, … } }).
 *
 * @param {object} options
 * @param {(params: URLSearchParams) => Promise<any>}  options.fetchFn
 *   Async function that receives a URLSearchParams and returns the Laravel
 *   paginator object ({ data, current_page, last_page, total, per_page }).
 *
 * @param {object}  [options.extraFilters={}]
 *   Any additional filter values whose changes should reset pagination to p.1
 *   (e.g. { yearFilter }).  Pass a stable object reference or use useMemo.
 *
 * @param {number}  [options.defaultPerPage=15]
 *
 * @returns {object}  All state + helpers needed by the page component.
 */
export function usePaginatedResource({
    fetchFn,
    extraFilters = {},
    defaultPerPage = 15,
}) {
    // ── Pagination / filter state ────────────────────────────────────────────
    const [records, setRecords] = useState([]);
    const [meta, setMeta] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: defaultPerPage,
    });
    const [loading, setLoading] = useState(false);
    const [perPage, setPerPage] = useState(String(defaultPerPage));
    const [page, setPage] = useState(1);

    // ── Search (debounced) ───────────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const debounceRef = useRef(null);

    function handleSearchInput(value) {
        setSearchInput(value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(value);
            setPage(1);
        }, 400);
    }

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetch = useCallback(
        async (currentPage = page) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (search) params.set("search", search);
                params.set("per_page", perPage);
                params.set("page", String(currentPage));

                // Spread any extra filters (e.g. year)
                Object.entries(extraFilters).forEach(([k, v]) => {
                    if (v && v !== "all") params.set(k, v);
                });

                const paginator = await fetchFn(params);
                setRecords(paginator.data ?? []);
                setMeta({
                    current_page: paginator.current_page,
                    last_page: paginator.last_page,
                    total: paginator.total,
                    per_page: paginator.per_page,
                });
            } catch (e) {
                toast.error(
                    e.response?.data?.message ?? e.message ?? "Request failed.",
                );
                setRecords([]);
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [search, perPage, page, JSON.stringify(extraFilters)],
    );

    // Re-fetch whenever dependencies change
    useEffect(() => {
        fetch(page);
    }, [search, perPage, page, fetch]);

    // Reset to page 1 on filter / search changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setPage(1);
    }, [search, perPage, JSON.stringify(extraFilters)]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Call after a successful delete to go back a page if list is now empty */
    function pageAfterDelete() {
        const newPage = records.length === 1 && page > 1 ? page - 1 : page;
        setPage(newPage);
        fetch(newPage);
    }

    const from =
        meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1;
    const to = Math.min(meta.current_page * meta.per_page, meta.total);

    return {
        records,
        meta,
        loading,
        perPage,
        setPerPage,
        page,
        setPage,
        searchInput,
        handleSearchInput,
        refresh: () => fetch(page),
        pageAfterDelete,
        from,
        to,
    };
}
