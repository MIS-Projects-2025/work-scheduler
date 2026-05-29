import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Badge } from "@/Components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/Components/ui/card";
import { toast } from "sonner";
import { CalendarDays, Loader2, Pencil, Trash2 } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

import { usePaginatedResource } from "./hooks/usePaginatedResource";
import { useCrudDialog } from "./hooks/useCrudDialog";
import { PageHeader } from "./components/PageHeader";
import { DataToolbar } from "./components/DataToolbar";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import ServerTable from "@/Components/ServerTable";
import { Pagination } from "@/Components/Pagination";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOLIDAY_TYPES = ["Regular", "Special"];

const PRESET_COLORS = [
    { label: "Red",    value: "#EF4444" },
    { label: "Orange", value: "#F97316" },
    { label: "Amber",  value: "#F59E0B" },
    { label: "Green",  value: "#22C55E" },
    { label: "Blue",   value: "#3B82F6" },
    { label: "Purple", value: "#A855F7" },
    { label: "Pink",   value: "#EC4899" },
];

const EMPTY_FORM = {
    holiday_name: "",
    holiday_date: "",
    holiday_type: "Regular",
    color: "#EF4444",
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
    { label: "All years", value: "all" },
    ...Array.from({ length: 5 }, (_, i) => {
        const y = String(currentYear - 1 + i);
        return { label: y, value: y };
    }),
];

// ─── Table columns ────────────────────────────────────────────────────────────

function buildColumns(from, onEdit, onDelete) {
    return [
        {
            key: "_row",
            label: "#",
            headerClassName: "w-12 pl-6",
            className: "pl-6 text-muted-foreground text-sm",
            render: (_, idx) => from + idx,
        },
        {
            key: "holiday_name",
            label: "Holiday Name",
            className: "font-medium",
        },
        {
            key: "holiday_date",
            label: "Date",
            className: "tabular-nums text-sm",
            render: (row) =>
                new Date(row.holiday_date).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }),
        },
        {
            key: "holiday_type",
            label: "Type",
            render: (row) => (
                <Badge variant={row.holiday_type === "Regular" ? "default" : "secondary"}>
                    {row.holiday_type}
                </Badge>
            ),
        },
        {
            key: "color",
            label: "Color",
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block h-5 w-5 rounded border border-border shadow-sm flex-shrink-0"
                        style={{ backgroundColor: row.color ?? "#EF4444" }}
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                        {(row.color ?? "#EF4444").toUpperCase()}
                    </span>
                </div>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            headerClassName: "text-right pr-6",
            className: "text-right pr-6",
            render: (row) => <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />,
        },
    ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Holiday() {
    const [yearFilter, setYearFilter] = useState(String(currentYear));

    const {
        records: holidays,
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
                route("holidays.index", Object.fromEntries(params)),
            );
            return json.data;
        },
    });

    const crud = useCrudDialog({
        emptyForm: EMPTY_FORM,
        buildForm: (h) => ({
            holiday_name: h.holiday_name,
            holiday_date: h.holiday_date?.substring(0, 10) ?? "",
            holiday_type: h.holiday_type,
            color: h.color ?? "#EF4444",
        }),
        validate: (form) => {
            const errors = {};
            if (!form.holiday_name.trim()) errors.holiday_name = "Name is required.";
            if (!form.holiday_date)        errors.holiday_date = "Date is required.";
            if (!form.holiday_type)        errors.holiday_type = "Type is required.";
            if (!/^#[0-9A-Fa-f]{6}$/.test(form.color)) errors.color = "Invalid hex color.";
            return errors;
        },
        onCreate: async (form) => {
            await axios.post(route("holidays.store"), form);
            toast.success("Holiday created successfully.");
        },
        onUpdate: async (target, form) => {
            await axios.put(route("holidays.update", { id: target.ID }), form);
            toast.success("Holiday updated successfully.");
        },
        onDelete: async (target) => {
            await axios.delete(route("holidays.destroy", { id: target.ID }));
            toast.success("Holiday removed successfully.");
        },
        afterSave: refresh,
        afterDelete: pageAfterDelete,
    });

    const columns = buildColumns(from, crud.openEdit, crud.setDeleteTarget);

    return (
        <AuthenticatedLayout>
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
                <PageHeader
                    icon={<CalendarDays className="h-6 w-6 text-primary" />}
                    title="Holiday Maintenance"
                    subtitle="Manage company holidays for payroll and scheduling."
                />

                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">Holidays</CardTitle>
                                <CardDescription>
                                    {meta.total} record{meta.total !== 1 ? "s" : ""}
                                </CardDescription>
                            </div>
                            <DataToolbar
                                searchValue={searchInput}
                                onSearchChange={handleSearchInput}
                                loading={loading}
                                onRefresh={refresh}
                                addLabel="Add Holiday"
                                onAdd={crud.openCreate}
                                filters={[
                                    {
                                        value: yearFilter,
                                        onChange: (v) => { setYearFilter(v); setPage(1); },
                                        placeholder: "Year",
                                        options: YEAR_OPTIONS,
                                    },
                                ]}
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Loading holidays...
                            </div>
                        ) : (
                            <ServerTable
                                columns={columns}
                                data={holidays}
                                orderBy=""
                                orderDir="asc"
                                onSort={() => {}}
                                emptyMessage="No holidays found."
                            />
                        )}

                        <Pagination
                            meta={meta}
                            onPageChange={setPage}
                            from={from}
                            to={to}
                            perPage={perPage}
                            onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
                        />
                    </CardContent>
                </Card>

                {/* ── Create / Edit Dialog ── */}
                <Dialog open={crud.dialogOpen} onOpenChange={crud.setDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {crud.editTarget ? "Edit Holiday" : "Add Holiday"}
                            </DialogTitle>
                            <DialogDescription>
                                {crud.editTarget
                                    ? "Update the details of this holiday."
                                    : "Fill in the details to add a new holiday."}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="holiday_name">
                                    Holiday Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="holiday_name"
                                    placeholder="e.g. New Year's Day"
                                    value={crud.form.holiday_name}
                                    onChange={(e) => crud.setForm({ ...crud.form, holiday_name: e.target.value })}
                                />
                                {crud.formErrors.holiday_name && (
                                    <p className="text-xs text-destructive">{crud.formErrors.holiday_name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="holiday_date">
                                    Date <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="holiday_date"
                                    type="date"
                                    value={crud.form.holiday_date}
                                    onChange={(e) => crud.setForm({ ...crud.form, holiday_date: e.target.value })}
                                />
                                {crud.formErrors.holiday_date && (
                                    <p className="text-xs text-destructive">{crud.formErrors.holiday_date}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>Type <span className="text-destructive">*</span></Label>
                                <Select
                                    value={crud.form.holiday_type}
                                    onValueChange={(v) => crud.setForm({ ...crud.form, holiday_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {HOLIDAY_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {crud.formErrors.holiday_type && (
                                    <p className="text-xs text-destructive">{crud.formErrors.holiday_type}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>Color <span className="text-destructive">*</span></Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            title={c.label}
                                            onClick={() => crud.setForm({ ...crud.form, color: c.value })}
                                            className={`h-7 w-7 rounded-md border-2 transition-all ${
                                                crud.form.color === c.value
                                                    ? "border-primary scale-110 shadow-md"
                                                    : "border-transparent hover:border-muted-foreground"
                                            }`}
                                            style={{ backgroundColor: c.value }}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={crud.form.color}
                                        onChange={(e) => crud.setForm({ ...crud.form, color: e.target.value })}
                                        className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
                                    />
                                    <Input
                                        value={crud.form.color}
                                        onChange={(e) => crud.setForm({ ...crud.form, color: e.target.value })}
                                        placeholder="#EF4444"
                                        className="font-mono uppercase flex-1"
                                        maxLength={7}
                                    />
                                    <span
                                        className="inline-block h-9 w-9 rounded border border-input flex-shrink-0"
                                        style={{ backgroundColor: crud.form.color }}
                                    />
                                </div>
                                {crud.formErrors.color && (
                                    <p className="text-xs text-destructive">{crud.formErrors.color}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => crud.setDialogOpen(false)} disabled={crud.saving}>
                                Cancel
                            </Button>
                            <Button onClick={crud.handleSave} disabled={crud.saving} className="gap-1.5">
                                {crud.saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {crud.editTarget ? "Save Changes" : "Add Holiday"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <DeleteConfirmDialog
                    open={!!crud.deleteTarget}
                    onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
                    title="Delete Holiday"
                    description={
                        <>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-foreground">
                                {crud.deleteTarget?.holiday_name}
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
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
