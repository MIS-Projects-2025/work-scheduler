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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "sonner";
import { Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

import { usePaginatedResource } from "./hooks/usePaginatedResource";
import { useCrudDialog } from "./hooks/useCrudDialog";
import { PageHeader } from "./components/PageHeader";
import { DataToolbar } from "./components/DataToolbar";
import { PaginationFooter } from "./components/PaginationFooter";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["Active", "Inactive"];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeColor(color) {
    if (!color) return "#FFFFFF";
    return color.startsWith("#") ? color : `#${color}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShiftCode() {
    // ── Paginated data ────────────────────────────────────────────────────────
    const {
        records,
        meta,
        loading,
        perPage,
        setPerPage,
        page,
        setPage,
        searchInput,
        handleSearchInput,
        refresh,
        pageAfterDelete,
        from,
        to,
    } = usePaginatedResource({
        fetchFn: async (params) => {
            const response = await axios.get(
                route("shift-codes.index", Object.fromEntries(params)),
            );
            if (!response.data.success)
                throw new Error(response.data.message || "Failed to fetch.");
            return response.data.data;
        },
    });

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const crud = useCrudDialog({
        emptyForm: EMPTY_FORM,
        buildForm: (r) => ({
            shiftcode: r.shiftcode ?? "",
            shiftcode_desc: r.shiftcode_desc ?? "",
            shift_group: r.shift_group ?? "DEFAULT",
            shiftcode_bg_color: normalizeColor(r.shiftcode_bg_color),
            shiftcode_font_color: normalizeColor(r.shiftcode_font_color),
            shift_code_status: r.shift_code_status ?? "Active",
            ot_hrs: String(r.ot_hrs ?? "0"),
            time_windows:
                Array.isArray(r.time_windows) && r.time_windows.length === 8
                    ? r.time_windows
                    : ["", "", "", "", "", "", "", ""],
        }),
        validate: (form) => {
            const errors = {};
            const hex = /^#[0-9A-Fa-f]{6}$/;
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
            if (!hex.test(form.shiftcode_bg_color))
                errors.shiftcode_bg_color =
                    "Invalid hex color. Must be format: #RRGGBB";
            if (!hex.test(form.shiftcode_font_color))
                errors.shiftcode_font_color =
                    "Invalid hex color. Must be format: #RRGGBB";
            return errors;
        },
        onCreate: async (form) => {
            await axios.post(route("shift-codes.store"), buildPayload(form));
            toast.success("Shift code created successfully.");
        },
        onUpdate: async (target, form) => {
            await axios.put(
                route("shift-codes.update", { id: target.shift_code_id }),
                buildPayload(form),
            );
            toast.success("Shift code updated successfully.");
        },
        onDelete: async (target) => {
            await axios.delete(
                route("shift-codes.destroy", { id: target.shift_code_id }),
            );
            toast.success("Shift code deleted successfully.");
        },
        afterSave: refresh,
        afterDelete: pageAfterDelete,
    });

    function setTimeWindow(index, value) {
        const updated = [...crud.form.time_windows];
        updated[index] = value;
        crud.setForm({ ...crud.form, time_windows: updated });
    }

    // ── Render ────────────────────────────────────────────────────────────────
    const safeRecords = Array.isArray(records) ? records : [];

    return (
        <AuthenticatedLayout>
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
                <PageHeader
                    icon={<Clock className="h-6 w-6 text-primary" />}
                    title="Shift Code Maintenance"
                    subtitle="Manage shift codes, schedules, and time windows."
                />

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
                            <DataToolbar
                                searchValue={searchInput}
                                onSearchChange={handleSearchInput}
                                loading={loading}
                                onRefresh={refresh}
                                addLabel="Add Shift Code"
                                onAdd={crud.openCreate}
                            />
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
                                        <TableRow key={r.shift_code_id ?? idx}>
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
                                                        title={`BG: ${r.shiftcode_bg_color ?? "#FFFFFF"}`}
                                                    />
                                                    <span
                                                        className="h-5 w-5 rounded border border-border"
                                                        style={{
                                                            backgroundColor:
                                                                normalizeColor(
                                                                    r.shiftcode_font_color,
                                                                ),
                                                        }}
                                                        title={`Font: ${r.shiftcode_font_color ?? "#000000"}`}
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
                                                    {r.shift_code_status ??
                                                        "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <RowActions
                                                    onEdit={() =>
                                                        crud.openEdit(r)
                                                    }
                                                    onDelete={() =>
                                                        crud.setDeleteTarget(r)
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <PaginationFooter
                            meta={meta}
                            from={from}
                            to={to}
                            perPage={perPage}
                            onPerPageChange={(v) => {
                                setPerPage(v);
                                setPage(1);
                            }}
                            onPrev={() => setPage((p) => p - 1)}
                            onNext={() => setPage((p) => p + 1)}
                        />
                    </CardContent>
                </Card>

                {/* ── Create / Edit Dialog ── */}
                <Dialog
                    open={crud.dialogOpen}
                    onOpenChange={crud.setDialogOpen}
                >
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {crud.editTarget
                                    ? "Edit Shift Code"
                                    : "Add Shift Code"}
                            </DialogTitle>
                            <DialogDescription>
                                {crud.editTarget
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
                                        value={crud.form.shiftcode}
                                        onChange={(e) =>
                                            crud.setForm({
                                                ...crud.form,
                                                shiftcode:
                                                    e.target.value.toUpperCase(),
                                            })
                                        }
                                    />
                                    {crud.formErrors.shiftcode && (
                                        <p className="text-xs text-destructive">
                                            {crud.formErrors.shiftcode}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Background Color</Label>
                                    <ColorInput
                                        value={crud.form.shiftcode_bg_color}
                                        onChange={(v) =>
                                            crud.setForm({
                                                ...crud.form,
                                                shiftcode_bg_color: v,
                                            })
                                        }
                                        placeholder="#FFFFFF"
                                    />
                                    {crud.formErrors.shiftcode_bg_color && (
                                        <p className="text-xs text-destructive">
                                            {crud.formErrors.shiftcode_bg_color}
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
                                        value={crud.form.shiftcode_desc}
                                        onChange={(e) =>
                                            crud.setForm({
                                                ...crud.form,
                                                shiftcode_desc: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Font Color</Label>
                                    <ColorInput
                                        value={crud.form.shiftcode_font_color}
                                        onChange={(v) =>
                                            crud.setForm({
                                                ...crud.form,
                                                shiftcode_font_color: v,
                                            })
                                        }
                                        placeholder="#000000"
                                    />
                                    {crud.formErrors.shiftcode_font_color && (
                                        <p className="text-xs text-destructive">
                                            {
                                                crud.formErrors
                                                    .shiftcode_font_color
                                            }
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
                                        value={crud.form.shift_group}
                                        onChange={(e) =>
                                            crud.setForm({
                                                ...crud.form,
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
                                                    crud.form
                                                        .shiftcode_bg_color,
                                                ),
                                                color: normalizeColor(
                                                    crud.form
                                                        .shiftcode_font_color,
                                                ),
                                                padding: "2px 8px",
                                                borderRadius: "4px",
                                            }}
                                        >
                                            {crud.form.shiftcode || "SAMPLE"}
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
                                        value={crud.form.shift_code_status}
                                        onValueChange={(v) =>
                                            crud.setForm({
                                                ...crud.form,
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
                                    {crud.formErrors.shift_code_status && (
                                        <p className="text-xs text-destructive">
                                            {crud.formErrors.shift_code_status}
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
                                        value={crud.form.ot_hrs}
                                        onChange={(e) =>
                                            crud.setForm({
                                                ...crud.form,
                                                ot_hrs: e.target.value,
                                            })
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter overtime hours (e.g., 1, 1.5, 2)
                                    </p>
                                    {crud.formErrors.ot_hrs && (
                                        <p className="text-xs text-destructive">
                                            {crud.formErrors.ot_hrs}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Shift Times */}
                            <Separator />
                            <div className="space-y-3">
                                <p className="text-sm font-medium">
                                    Shift Times
                                </p>
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
                                                    crud.form.time_windows[
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
                                            {crud.formErrors[
                                                `time_windows_${field.index}`
                                            ] && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        crud.formErrors[
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
                                onClick={() => crud.setDialogOpen(false)}
                                disabled={crud.saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={crud.handleSave}
                                disabled={crud.saving}
                                className="gap-1.5"
                            >
                                {crud.saving && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {crud.editTarget
                                    ? "Save Changes"
                                    : "Add Shift Code"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Delete Confirm ── */}
                <DeleteConfirmDialog
                    open={!!crud.deleteTarget}
                    onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
                    title="Delete Shift Code"
                    description={
                        <>
                            Are you sure you want to delete shift code{" "}
                            <span className="font-semibold text-foreground">
                                {crud.deleteTarget?.shiftcode}
                            </span>
                            ? This action cannot be undone.
                        </>
                    }
                    onConfirm={crud.handleDelete}
                    isDeleting={crud.deleting}
                />
            </div>
        </AuthenticatedLayout>
    );
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function buildPayload(form) {
    return {
        ...form,
        ot_hrs: Number(form.ot_hrs),
        shiftcode_bg_color: form.shiftcode_bg_color.startsWith("#")
            ? form.shiftcode_bg_color
            : `#${form.shiftcode_bg_color}`,
        shiftcode_font_color: form.shiftcode_font_color.startsWith("#")
            ? form.shiftcode_font_color
            : `#${form.shiftcode_font_color}`,
    };
}

function ColorInput({ value, onChange, placeholder }) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={normalizeColor(value)}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
            />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="font-mono uppercase flex-1"
                maxLength={7}
                placeholder={placeholder}
            />
        </div>
    );
}

function RowActions({ onEdit, onDelete }) {
    return (
        <div className="flex justify-end gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
            >
                <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
