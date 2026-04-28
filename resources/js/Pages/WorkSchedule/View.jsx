import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import dayjs from "dayjs";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/Components/Pagination";
import ScheduleTableViewing from "./ScheduleTableViewing";
import ShiftLegend from "./components/ShiftLegend";
import ViewHeader from "./components/ViewHeader";
import RemarksDialog from "./components/RemarksDialog";
import { useWorkScheduleView } from "./hooks/useWorkScheduleView";

const PAGE_SIZES = [10, 20, 50, 100];

export default function WorkScheduleView({
    groupedData = [],
    shiftCodes = [],
    pagination = null,
    dateStart,
    dateEnd,
    filters = {},
    viewerContext = {},
}) {
    const {
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
        toggleFullscreen,
        handleAcknowledge,
        handleRowSelect,
        handleSelectAll,
        openBulkAction,
        handleBulkConfirm,
        goToPage,
    } = useWorkScheduleView({
        groupedData,
        shiftCodes,
        pagination,
        dateStart,
        dateEnd,
        filters,
        viewerContext,
    });

    const totalEmployees =
        pagination?.total || groupedData[0]?.schedules?.length || 0;
    const formattedDateRange = `${dayjs(dateStart).format("MMMM D, YYYY")} — ${dayjs(dateEnd).format("MMMM D, YYYY")}`;

    const content = (
        <div className={isFullscreen ? "bg-background" : ""}>
            <ViewHeader
                isFullscreen={isFullscreen}
                createdBy={createdBy}
                formattedDateRange={formattedDateRange}
                totalEmployees={totalEmployees}
                status={status}
                canAcknowledge={canAcknowledge}
                acknowledging={acknowledging}
                onAcknowledge={handleAcknowledge}
                canApprove={canApprove}
                selectedRows={selectedRows}
                bulkProcessing={bulkProcessing}
                onBulkAction={openBulkAction}
                onToggleFullscreen={toggleFullscreen}
            />

            <div className="p-6 space-y-6">
                {groupedData.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No schedules found for this period.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        {/* Legend */}
                        <CardContent className="p-4">
                            <ShiftLegend
                                shifts={shiftCodes}
                                shiftMap={shiftMap}
                                collapsed={legendCollapsed}
                                onToggle={() =>
                                    setLegendCollapsed((p) => !p)
                                }
                            />
                        </CardContent>

                        {/* Search + per-page controls */}
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
                                    onValueChange={(v) =>
                                        setPerPage(Number(v))
                                    }
                                >
                                    <SelectTrigger className="w-20 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAGE_SIZES.map((n) => (
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

                        {/* Table area */}
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

            {/* Bulk-action confirmation dialog */}
            <RemarksDialog
                open={remarksDialog.open}
                action={remarksDialog.action}
                selectedCount={selectedRows.size}
                remarks={remarks}
                onRemarksChange={setRemarks}
                onConfirm={handleBulkConfirm}
                onClose={() =>
                    setRemarksDialog({ open: false, action: null })
                }
                processing={bulkProcessing}
            />
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
