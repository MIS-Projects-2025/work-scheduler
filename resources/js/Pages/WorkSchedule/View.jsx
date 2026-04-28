import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import dayjs from "dayjs";
import { Loader2, Search, CheckCheck, RotateCcw, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BulkActionBar from "./components/BulkActionBar";
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
    holidays = [],
}) {
    const {
        selectedRows,
        remarksDialog,
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
        tableResetKey,
        editedCellCount,
        submitProcessing,
        handleCellChange,
        handleResetEdits,
        handleSubmitEdits,
        toggleFullscreen,
        handleRowSelect,
        handleSelectAll,
        openBulkAction,
        openDialog,
        closeDialog,
        handleConfirm,
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

                        {/* Action buttons + Search + per-page controls */}
                        <div className="px-4 py-2 flex items-center justify-between gap-3 border-b flex-wrap">
                            {/* Left: acknowledge / bulk approve-disapprove */}
                            <div className="flex items-center gap-2">
                                {canAcknowledge && (
                                    <Button
                                        size="sm"
                                        onClick={() => openDialog("acknowledge")}
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
                                {canApprove && (
                                    <BulkActionBar
                                        selectedCount={selectedRows.size}
                                        processing={bulkProcessing}
                                        onApprove={() => openBulkAction("approve")}
                                        onDisapprove={() => openBulkAction("disapprove")}
                                    />
                                )}
                            </div>

                            {/* Right: search + per-page */}
                            <div className="flex items-center gap-3">
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
                                    {/* Reset / Submit bar — visible when there are unsaved edits */}
                                    {canEdit && editedCellCount > 0 && (
                                        <div className="flex items-center justify-between gap-3 rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 px-4 py-2">
                                            <span className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                                                {editedCellCount} cell{editedCellCount !== 1 ? "s" : ""} edited — unsaved changes
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleResetEdits}
                                                    disabled={submitProcessing}
                                                    className="gap-1.5"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Reset
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSubmitEdits}
                                                    disabled={submitProcessing}
                                                    className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                                                >
                                                    {submitProcessing ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    {submitProcessing ? "Saving..." : "Save Changes"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <ScheduleTableViewing
                                        key={tableResetKey}
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
                                        onCellChange={handleCellChange}
                                        selectable={canApprove}
                                        selectedRows={selectedRows}
                                        onRowSelect={handleRowSelect}
                                        onSelectAll={handleSelectAll}
                                        dateStart={dateStart}
                                        holidays={holidays}
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

            {/* Action confirmation dialog (approve / disapprove / acknowledge) */}
            <RemarksDialog
                open={remarksDialog.open}
                action={remarksDialog.action}
                selectedCount={selectedRows.size}
                remarks={remarks}
                onRemarksChange={setRemarks}
                onConfirm={handleConfirm}
                onClose={closeDialog}
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
