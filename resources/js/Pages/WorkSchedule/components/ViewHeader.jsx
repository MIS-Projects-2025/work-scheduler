import { router } from "@inertiajs/react";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import {
    ArrowLeft,
    FileSpreadsheet,
    User,
    Calendar,
    Clock,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { SCHEDULE_STATUS } from "../helpers/scheduleHelpers";

export default function ViewHeader({
    isFullscreen,
    createdBy,
    formattedDateRange,
    totalEmployees,
    status,
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

                {/* Right — fullscreen toggle */}
                <div className="flex items-center gap-2 shrink-0">
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
