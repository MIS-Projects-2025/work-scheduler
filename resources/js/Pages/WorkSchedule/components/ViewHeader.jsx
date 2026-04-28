import { router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    FileSpreadsheet,
    User,
    Calendar,
    Clock,
    CheckCheck,
    Maximize2,
    Minimize2,
    Loader2,
} from "lucide-react";
import BulkActionBar from "./BulkActionBar";
import { SCHEDULE_STATUS } from "../helpers/scheduleHelpers";

/**
 * Sticky header bar for the Work Schedule View page.
 *
 * Props:
 *   isFullscreen        boolean
 *   createdBy           string
 *   formattedDateRange  string
 *   totalEmployees      number
 *   canAcknowledge      boolean
 *   acknowledging       boolean
 *   onAcknowledge       () => void
 *   canApprove          boolean
 *   selectedRows        Set
 *   bulkProcessing      boolean
 *   onBulkAction        (action: 'approve'|'disapprove') => void
 *   onToggleFullscreen  () => void
 */
export default function ViewHeader({
    isFullscreen,
    createdBy,
    formattedDateRange,
    totalEmployees,
    status,
    canAcknowledge,
    acknowledging,
    onAcknowledge,
    canApprove,
    selectedRows,
    bulkProcessing,
    onBulkAction,
    onToggleFullscreen,
}) {
    const statusInfo = SCHEDULE_STATUS[status] ?? null;
    return (
        <div
            className={`border-b bg-card px-6 py-4 ${
                isFullscreen ? "sticky top-0 z-50" : ""
            }`}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Left — back button + title / meta */}
                <div className="flex items-center gap-4 min-w-0">
                    {!isFullscreen && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                router.visit(route("workschedule.index"))
                            }
                            className="gap-2 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Button>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
                            Work Schedule View
                            {statusInfo && (
                                <Badge variant={statusInfo.variant} className="text-xs font-medium">
                                    {statusInfo.label}
                                </Badge>
                            )}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <User className="w-4 h-4 shrink-0" />
                                Created by: {createdBy || "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 shrink-0" />
                                {formattedDateRange}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4 shrink-0" />
                                {totalEmployees} employee
                                {totalEmployees !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right — action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {canAcknowledge && (
                        <Button
                            size="sm"
                            onClick={onAcknowledge}
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
                            onApprove={() => onBulkAction("approve")}
                            onDisapprove={() => onBulkAction("disapprove")}
                        />
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleFullscreen}
                        className="gap-2"
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize2 className="w-4 h-4" />
                                Exit Fullscreen
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-4 h-4" />
                                Full Screen
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
