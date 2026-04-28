import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect, useCallback } from "react";
import {
    FileSpreadsheet,
    Search,
    Eye,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Pagination } from "@/Components/Pagination";
import StatusTabs from "./components/StatusTabs";
import ScheduleTable from "./components/ScheduleTable";
import { useDebounce } from "./hooks/useDebounce";
import { useWorkScheduleIndex } from "./hooks/useWorkScheduleIndex";

export default function WorkScheduleIndex({
    schedules: initialSchedules,
    tabCounts: initialTabCounts = {},
    filters: initialFilters = {},
    empPosition = 0,
    isHrAdmin = false,
}) {
    const {
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
    } = useWorkScheduleIndex({
        initialSchedules,
        initialTabCounts,
        initialFilters,
        isHrAdmin,
    });

    const rows = schedules?.data || [];
    const meta = schedules
        ? {
              current_page: schedules.current_page,
              last_page: schedules.last_page,
              from: schedules.from,
              to: schedules.to,
              total: schedules.total,
              per_page: schedules.per_page,
          }
        : null;

    return (
        <AuthenticatedLayout>
            <Head title="Work Schedules" />
            <div className="min-h-screen bg-background p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                            Work Schedules
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            View and manage work schedule submissions
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() =>
                            router.visit(route("workschedule.template"))
                        }
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Upload Schedule
                    </Button>
                </div>

                <Card>
                    <CardHeader className="pb-0 px-0">
                        <StatusTabs
                            tabs={STATUS_TABS}
                            activeStatus={activeStatus}
                            tabCounts={tabCounts}
                            onTabChange={handleTabChange}
                        />
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by creator ID…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Show</span>
                                <Select
                                    value={String(perPage)}
                                    onValueChange={(v) => setPerPage(Number(v))}
                                >
                                    <SelectTrigger className="w-20 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAGE_SIZES.map((s) => (
                                            <SelectItem
                                                key={s}
                                                value={String(s)}
                                            >
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>entries</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="ml-2 text-muted-foreground">
                                    Loading...
                                </span>
                            </div>
                        ) : (
                            <ScheduleTable
                                rows={rows}
                                orderBy={orderBy}
                                orderDir={orderDir}
                                onSort={handleSort}
                                onView={handleView}
                                isHrAdmin={isHrAdmin}
                            />
                        )}

                        {meta && (
                            <Pagination
                                meta={meta}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}

// ─── Constants (keep co-located since they're only used here) ───
const STATUS_TABS = [
    {
        value: 1,
        label: "For Approval",
        countKey: "forApproval",
        variant: "warning",
    },
    { value: 2, label: "To Acknowledge", countKey: "forAck", variant: "info" },
    {
        value: 3,
        label: "Acknowledged",
        countKey: "doneAck",
        variant: "success",
    },
    {
        value: 4,
        label: "Disapproved",
        countKey: "disapproved",
        variant: "destructive",
    },
];

const PAGE_SIZES = [10, 15, 25, 50];
