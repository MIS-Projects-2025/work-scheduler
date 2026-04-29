import { useState } from "react";
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
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { CalendarRange, Loader2, Pencil, Trash2 } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

import { usePaginatedResource } from "./hooks/usePaginatedResource";
import { useCrudDialog } from "./hooks/useCrudDialog";
import { PageHeader } from "./components/PageHeader";
import { DataToolbar } from "./components/DataToolbar";
import { PaginationFooter } from "./components/PaginationFooter";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

const EMPTY_FORM = { payroll_date_start: "", payroll_date_end: "" };

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
    { label: "All years", value: "all" },
    ...Array.from({ length: 5 }, (_, i) => {
        const y = String(currentYear - 1 + i);
        return { label: y, value: y };
    }),
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayrollCutoffSchedule() {
    const [yearFilter, setYearFilter] = useState(String(currentYear));

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
        extraFilters: { year: yearFilter },
        fetchFn: async (params) => {
            const { data: json } = await axios.get(
                route(
                    "payroll-cutoff-schedules.index",
                    Object.fromEntries(params),
                ),
            );
            return json.data;
        },
    });

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const crud = useCrudDialog({
        emptyForm: EMPTY_FORM,
        buildForm: (r) => ({
            payroll_date_start: r.payroll_date_start?.substring(0, 10) ?? "",
            payroll_date_end: r.payroll_date_end?.substring(0, 10) ?? "",
        }),
        validate: (form) => {
            const errors = {};
            if (!form.payroll_date_start)
                errors.payroll_date_start = "Start date is required.";
            if (!form.payroll_date_end)
                errors.payroll_date_end = "End date is required.";
            if (
                form.payroll_date_start &&
                form.payroll_date_end &&
                form.payroll_date_end <= form.payroll_date_start
            ) {
                errors.payroll_date_end = "End date must be after start date.";
            }
            return errors;
        },
        onCreate: async (form) => {
            await axios.post(route("payroll-cutoff-schedules.store"), form);
            toast.success("Cutoff schedule created successfully.");
        },
        onUpdate: async (target, form) => {
            await axios.put(
                route("payroll-cutoff-schedules.update", { id: target.ID }),
                form,
            );
            toast.success("Cutoff schedule updated successfully.");
        },
        onDelete: async (target) => {
            await axios.delete(
                route("payroll-cutoff-schedules.destroy", { id: target.ID }),
            );
            toast.success("Cutoff schedule deleted successfully.");
        },
        afterSave: refresh,
        afterDelete: pageAfterDelete,
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AuthenticatedLayout>
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                <PageHeader
                    icon={<CalendarRange className="h-6 w-6 text-primary" />}
                    title="Payroll Cutoff Schedule"
                    subtitle="Manage payroll cutoff date ranges for processing."
                />

                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">
                                    Schedules
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
                                addLabel="Add Schedule"
                                onAdd={crud.openCreate}
                                filters={[
                                    {
                                        value: yearFilter,
                                        onChange: (v) => {
                                            setYearFilter(v);
                                            setPage(1);
                                        },
                                        placeholder: "Year",
                                        options: YEAR_OPTIONS,
                                    },
                                ]}
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
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead className="text-right pr-6">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                                            Loading schedules...
                                        </TableCell>
                                    </TableRow>
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            No schedules found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((r, idx) => (
                                        <TableRow key={r.ID} className="group">
                                            <TableCell className="pl-6 text-muted-foreground text-sm">
                                                {from + idx}
                                            </TableCell>
                                            <TableCell className="tabular-nums text-sm font-medium">
                                                {formatDate(
                                                    r.payroll_date_start,
                                                )}
                                            </TableCell>
                                            <TableCell className="tabular-nums text-sm">
                                                {formatDate(r.payroll_date_end)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {r.created_by ?? "—"}
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
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {crud.editTarget
                                    ? "Edit Schedule"
                                    : "Add Schedule"}
                            </DialogTitle>
                            <DialogDescription>
                                {crud.editTarget
                                    ? "Update the cutoff date range."
                                    : "Define a new payroll cutoff date range."}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="payroll_date_start">
                                    Start Date{" "}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="payroll_date_start"
                                    type="date"
                                    value={crud.form.payroll_date_start}
                                    onChange={(e) =>
                                        crud.setForm({
                                            ...crud.form,
                                            payroll_date_start: e.target.value,
                                        })
                                    }
                                />
                                {crud.formErrors.payroll_date_start && (
                                    <p className="text-xs text-destructive">
                                        {crud.formErrors.payroll_date_start}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="payroll_date_end">
                                    End Date{" "}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="payroll_date_end"
                                    type="date"
                                    value={crud.form.payroll_date_end}
                                    min={
                                        crud.form.payroll_date_start ||
                                        undefined
                                    }
                                    onChange={(e) =>
                                        crud.setForm({
                                            ...crud.form,
                                            payroll_date_end: e.target.value,
                                        })
                                    }
                                />
                                {crud.formErrors.payroll_date_end && (
                                    <p className="text-xs text-destructive">
                                        {crud.formErrors.payroll_date_end}
                                    </p>
                                )}
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
                                    : "Add Schedule"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Delete Confirm ── */}
                <DeleteConfirmDialog
                    open={!!crud.deleteTarget}
                    onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
                    title="Delete Schedule"
                    description={
                        <>
                            Are you sure you want to delete the cutoff schedule
                            from{" "}
                            <span className="font-semibold text-foreground">
                                {formatDate(
                                    crud.deleteTarget?.payroll_date_start,
                                )}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-foreground">
                                {formatDate(
                                    crud.deleteTarget?.payroll_date_end,
                                )}
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
