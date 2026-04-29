import { useState, useEffect, useCallback, useRef } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    Clock,
    Plus,
    Pencil,
    Trash2,
    Search,
    Loader2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = ["10", "15", "25", "50"];
const STATUS_OPTIONS = ["Active", "Inactive"];

// time_windows positional map
const TIME_WINDOW_FIELDS = [
    { index: 0, label: "Check-in", required: true },
    { index: 1, label: "Break Out 1", required: false },
    { index: 2, label: "Break In 1", required: false },
    { index: 3, label: "Lunch Out", required: false },
    { index: 4, label: "Lunch In", required: false },
    { index: 5, label: "Break Out 2", required: false },
    { index: 6, label: "Break In 2", required: false },
    { index: 7, label: "Checkout", required: true },
];

const EMPTY_FORM = {
    shiftcode: "",
    shiftcode_desc: "",
    shift_group: "DEFAULT",
    shiftcode_bg_color: "#FFFFFF",
    shiftcode_font_color: "#000000",
    shift_code_status: "Active",
    ot_hrs: "0",
    time_windows: ["", "", "", "", "", "", "", ""],
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

// Ensure color has # prefix for display and form
function normalizeColor(color) {
    if (!color) return "#FFFFFF";
    // Add # if missing
    return color.startsWith("#") ? color : `#${color}`;
}

// Keep color with # prefix for backend (backend expects # prefix)
function prepareColorForBackend(color) {
    if (!color) return "#FFFFFF";
    // Ensure # prefix exists
    return color.startsWith("#") ? color : `#${color}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShiftCode() {
    const [records, setRecords] = useState([]);
    const [meta, setMeta] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 15,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [perPage, setPerPage] = useState("15");
    const [page, setPage] = useState(1);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const debounceRef = useRef(null);

    function handleSearchInput(value) {
        setSearchInput(value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(value);
            setPage(1);
        }, 400);
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchRecords = useCallback(
        async (currentPage = page) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (search) params.set("search", search);
                params.set("per_page", perPage);
                params.set("page", String(currentPage));

                const response = await axios.get(
                    route("shift-codes.index", Object.fromEntries(params)),
                );

                if (response.data.success) {
                    const paginatedData = response.data.data;
                    const recordsData = paginatedData.data || [];

                    setMeta({
                        current_page: paginatedData.current_page || 1,
                        last_page: paginatedData.last_page || 1,
                        total: paginatedData.total || 0,
                        per_page: paginatedData.per_page || parseInt(perPage),
                    });

                    setRecords(recordsData);
                } else {
                    toast.error(
                        response.data.message || "Failed to fetch shift codes.",
                    );
                    setRecords([]);
                }
            } catch (e) {
                console.error("Fetch error:", e);
                toast.error(e.response?.data?.message ?? e.message);
                setRecords([]);
                setMeta({
                    current_page: 1,
                    last_page: 1,
                    total: 0,
                    per_page: parseInt(perPage),
                });
            } finally {
                setLoading(false);
            }
        },
        [search, perPage],
    );

    useEffect(() => {
        fetchRecords(page);
    }, [search, perPage, page, fetchRecords]);

    useEffect(() => {
        setPage(1);
    }, [search, perPage]);

    // ── Dialog helpers ────────────────────────────────────────────────────────

    function openCreate() {
        setEditTarget(null);
        setForm({
            ...EMPTY_FORM,
            shiftcode_bg_color: "#FFFFFF",
            shiftcode_font_color: "#000000",
        });
        setFormErrors({});
        setDialogOpen(true);
    }

    function openEdit(record) {
        setEditTarget(record);
        setForm({
            shiftcode: record.shiftcode ?? "",
            shiftcode_desc: record.shiftcode_desc ?? "",
            shift_group: record.shift_group ?? "DEFAULT",
            shiftcode_bg_color:
                normalizeColor(record.shiftcode_bg_color) ?? "#FFFFFF",
            shiftcode_font_color:
                normalizeColor(record.shiftcode_font_color) ?? "#000000",
            shift_code_status: record.shift_code_status ?? "Active",
            ot_hrs: String(record.ot_hrs ?? "0"),
            time_windows:
                Array.isArray(record.time_windows) &&
                record.time_windows.length === 8
                    ? record.time_windows
                    : ["", "", "", "", "", "", "", ""],
        });
        setFormErrors({});
        setDialogOpen(true);
    }

    function setTimeWindow(index, value) {
        const updated = [...form.time_windows];
        updated[index] = value;
        setForm({ ...form, time_windows: updated });
    }

    function validateForm() {
        const errors = {};
        if (!form.shiftcode.trim())
            errors.shiftcode = "Shift code is required.";
        if (!form.shift_code_status)
            errors.shift_code_status = "Status is required.";
        if (isNaN(Number(form.ot_hrs)) || Number(form.ot_hrs) < 0)
            errors.ot_hrs = "OT hours must be a non-negative number.";
        if (!form.time_windows[0])
            errors.time_windows_0 = "Check-in is required.";
        if (!form.time_windows[7])
            errors.time_windows_7 = "Checkout is required.";

        // Validate hex color with # prefix (backend requirement)
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!hexColorRegex.test(form.shiftcode_bg_color))
            errors.shiftcode_bg_color =
                "Invalid hex color. Must be format: #RRGGBB";
        if (!hexColorRegex.test(form.shiftcode_font_color))
            errors.shiftcode_font_color =
                "Invalid hex color. Must be format: #RRGGBB";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }

    // ── Save ──────────────────────────────────────────────────────────────────

    async function handleSave() {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                ot_hrs: Number(form.ot_hrs),
                // Send colors with # prefix as backend expects
                shiftcode_bg_color: prepareColorForBackend(
                    form.shiftcode_bg_color,
                ),
                shiftcode_font_color: prepareColorForBackend(
                    form.shiftcode_font_color,
                ),
            };

            console.log("Sending payload:", payload); // Debug log

            if (editTarget) {
                await axios.put(
                    route("shift-codes.update", {
                        id: editTarget.shift_code_id,
                    }),
                    payload,
                );
                toast.success("Shift code updated successfully.");
            } else {
                await axios.post(route("shift-codes.store"), payload);
                toast.success("Shift code created successfully.");
            }
            setDialogOpen(false);
            fetchRecords(page);
        } catch (e) {
            console.error("Save error:", e.response?.data);
            const errorMessage = e.response?.data?.message || e.message;
            toast.error(errorMessage);
            if (e.response?.data?.errors) {
                setFormErrors(e.response.data.errors);
            }
        } finally {
            setSaving(false);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await axios.delete(
                route("shift-codes.destroy", {
                    id: deleteTarget.shift_code_id,
                }),
            );
            toast.success("Shift code deleted successfully.");
            setDeleteTarget(null);
            const newPage = records.length === 1 && page > 1 ? page - 1 : page;
            setPage(newPage);
            fetchRecords(newPage);
        } catch (e) {
            toast.error(e.response?.data?.message ?? e.message);
        } finally {
            setDeleting(false);
        }
    }

    const from =
        meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1;
    const to = Math.min(meta.current_page * meta.per_page, meta.total);

    // Ensure records is always an array for rendering
    const safeRecords = Array.isArray(records) ? records : [];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AuthenticatedLayout>
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
                {/* ── Page header ── */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Shift Code Maintenance
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage shift codes, schedules, and time windows.
                        </p>
                    </div>
                </div>

                {/* ── Card ── */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">
                                    Shift Codes
                                </CardTitle>
                                <CardDescription>
                                    {meta.total} record
                                    {meta.total !== 1 ? "s" : ""}
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        value={searchInput}
                                        onChange={(e) =>
                                            handleSearchInput(e.target.value)
                                        }
                                        className="pl-8 w-48"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fetchRecords(page)}
                                    disabled={loading}
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                                    />
                                </Button>
                                <Button
                                    onClick={openCreate}
                                    className="gap-1.5"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Shift Code
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 pl-6">
                                        #
                                    </TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Group</TableHead>
                                    <TableHead>OT Hrs</TableHead>
                                    <TableHead>Colors</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                                            Loading shift codes...
                                        </TableCell>
                                    </TableRow>
                                ) : safeRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            No shift codes found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    safeRecords.map((r, idx) => (
                                        <TableRow key={r.shift_code_id || idx}>
                                            <TableCell className="pl-6 text-muted-foreground text-sm">
                                                {from + idx}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                                                    style={{
                                                        backgroundColor:
                                                            normalizeColor(
                                                                r.shiftcode_bg_color,
                                                            ),
                                                        color: normalizeColor(
                                                            r.shiftcode_font_color,
                                                        ),
                                                        border: "1px solid #e5e7eb",
                                                    }}
                                                >
                                                    {r.shiftcode}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {r.shiftcode_desc ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {r.shift_group ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-sm tabular-nums">
                                                {r.ot_hrs ?? 0}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="h-5 w-5 rounded border border-border"
                                                        style={{
                                                            backgroundColor:
                                                                normalizeColor(
                                                                    r.shiftcode_bg_color,
                                                                ),
                                                        }}
                                                        title={`BG: ${r.shiftcode_bg_color || "#FFFFFF"}`}
                                                    />
                                                    <span
                                                        className="h-5 w-5 rounded border border-border"
                                                        style={{
                                                            backgroundColor:
                                                                normalizeColor(
                                                                    r.shiftcode_font_color,
                                                                ),
                                                        }}
                                                        title={`Font: ${r.shiftcode_font_color || "#000000"}`}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        r.shift_code_status ===
                                                        "Active"
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                >
                                                    {r.shift_code_status ||
                                                        "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() =>
                                                            openEdit(r)
                                                        }
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() =>
                                                            setDeleteTarget(r)
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* ── Pagination ── */}
                        {!loading && meta.total > 0 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <span>Rows per page</span>
                                    <Select
                                        value={String(perPage)}
                                        onValueChange={(v) => {
                                            setPerPage(v);
                                            setPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-16">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PER_PAGE_OPTIONS.map((o) => (
                                                <SelectItem key={o} value={o}>
                                                    {o}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                            onClick={() =>
                                                setPage((p) => p - 1)
                                            }
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            disabled={
                                                meta.current_page >=
                                                meta.last_page
                                            }
                                            onClick={() =>
                                                setPage((p) => p + 1)
                                            }
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Create / Edit Dialog ── */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editTarget
                                    ? "Edit Shift Code"
                                    : "Add Shift Code"}
                            </DialogTitle>
                            <DialogDescription>
                                {editTarget
                                    ? "Update shift code details."
                                    : "Fill in the details to add a new shift code."}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 py-2">
                            {/* Row 1 — Code + BG Color */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="shiftcode">
                                        Shift Code{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="shiftcode"
                                        placeholder="e.g. DAY"
                                        value={form.shiftcode}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                shiftcode:
                                                    e.target.value.toUpperCase(),
                                            })
                                        }
                                    />
                                    {formErrors.shiftcode && (
                                        <p className="text-xs text-destructive">
                                            {formErrors.shiftcode}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Background Color</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={normalizeColor(
                                                form.shiftcode_bg_color,
                                            )}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    shiftcode_bg_color:
                                                        e.target.value,
                                                })
                                            }
                                            className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
                                        />
                                        <Input
                                            value={form.shiftcode_bg_color}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    shiftcode_bg_color:
                                                        e.target.value,
                                                })
                                            }
                                            className="font-mono uppercase flex-1"
                                            maxLength={7}
                                            placeholder="#FFFFFF"
                                        />
                                    </div>
                                    {formErrors.shiftcode_bg_color && (
                                        <p className="text-xs text-destructive">
                                            {formErrors.shiftcode_bg_color}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Row 2 — Description + Font Color */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="shiftcode_desc">
                                        Description
                                    </Label>
                                    <Input
                                        id="shiftcode_desc"
                                        placeholder="e.g. Day Shift"
                                        value={form.shiftcode_desc}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                shiftcode_desc: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Font Color</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={normalizeColor(
                                                form.shiftcode_font_color,
                                            )}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    shiftcode_font_color:
                                                        e.target.value,
                                                })
                                            }
                                            className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
                                        />
                                        <Input
                                            value={form.shiftcode_font_color}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    shiftcode_font_color:
                                                        e.target.value,
                                                })
                                            }
                                            className="font-mono uppercase flex-1"
                                            maxLength={7}
                                            placeholder="#000000"
                                        />
                                    </div>
                                    {formErrors.shiftcode_font_color && (
                                        <p className="text-xs text-destructive">
                                            {formErrors.shiftcode_font_color}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Row 3 — Group + Preview */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="shift_group">Group</Label>
                                    <Input
                                        id="shift_group"
                                        placeholder="DEFAULT"
                                        value={form.shift_group}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                shift_group: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Preview</Label>
                                    <div className="flex items-center h-9 px-3 rounded-md border border-input">
                                        <span
                                            className="text-sm font-bold tracking-wide"
                                            style={{
                                                backgroundColor: normalizeColor(
                                                    form.shiftcode_bg_color,
                                                ),
                                                color: normalizeColor(
                                                    form.shiftcode_font_color,
                                                ),
                                                padding: "2px 8px",
                                                borderRadius: "4px",
                                            }}
                                        >
                                            {form.shiftcode || "SAMPLE"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Row 4 — Status + OT Hours */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>
                                        Status{" "}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={form.shift_code_status}
                                        onValueChange={(v) =>
                                            setForm({
                                                ...form,
                                                shift_code_status: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.shift_code_status && (
                                        <p className="text-xs text-destructive">
                                            {formErrors.shift_code_status}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="ot_hrs">OT Hours</Label>
                                    <Input
                                        id="ot_hrs"
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        placeholder="0"
                                        value={form.ot_hrs}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                ot_hrs: e.target.value,
                                            })
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter overtime hours (e.g., 1, 1.5, 2)
                                    </p>
                                    {formErrors.ot_hrs && (
                                        <p className="text-xs text-destructive">
                                            {formErrors.ot_hrs}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Shift Times */}
                            <Separator />
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-medium">
                                        Shift Times
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                                    {TIME_WINDOW_FIELDS.map((field) => (
                                        <div
                                            key={field.index}
                                            className="space-y-1.5"
                                        >
                                            <Label
                                                htmlFor={`tw_${field.index}`}
                                            >
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-destructive">
                                                        {" "}
                                                        *
                                                    </span>
                                                )}
                                            </Label>
                                            <Input
                                                id={`tw_${field.index}`}
                                                type="time"
                                                value={
                                                    form.time_windows[
                                                        field.index
                                                    ] ?? ""
                                                }
                                                onChange={(e) =>
                                                    setTimeWindow(
                                                        field.index,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {formErrors[
                                                `time_windows_${field.index}`
                                            ] && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        formErrors[
                                                            `time_windows_${field.index}`
                                                        ]
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Enter the shift times in order. Optional
                                    second break times can be left empty.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="gap-1.5"
                            >
                                {saving && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {editTarget ? "Save Changes" : "Add Shift Code"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Delete Confirm ── */}
                <AlertDialog
                    open={!!deleteTarget}
                    onOpenChange={(o) => !o && setDeleteTarget(null)}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete Shift Code
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete shift code{" "}
                                <span className="font-semibold text-foreground">
                                    {deleteTarget?.shiftcode}
                                </span>
                                ? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={deleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                            >
                                {deleting && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AuthenticatedLayout>
    );
}
