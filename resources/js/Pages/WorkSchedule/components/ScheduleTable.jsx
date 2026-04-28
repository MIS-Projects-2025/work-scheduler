import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ServerTable from "@/Components/ServerTable";
import { SCHEDULE_STATUS } from "../helpers/scheduleHelpers";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

function buildColumns(onView, isHrAdmin) {
    const dateStartCol = {
        key: "payroll_date_start",
        label: "Date Start",
        sortable: true,
        render: (row) => formatDate(row.payroll_date_start),
    };
    const dateEndCol = {
        key: "payroll_date_end",
        label: "Date End",
        sortable: true,
        render: (row) => formatDate(row.payroll_date_end),
    };
    const employeesCol = {
        key: "total_employees",
        label: "Employees",
        render: (row) => (
            <Badge variant="secondary">{row.total_employees ?? 0}</Badge>
        ),
    };
    const statusCol = {
        key: "work_sched_status",
        label: "Status",
        sortable: true,
        headerClassName: "text-center",
        className: "text-center",
        render: (row) => {
            const s = SCHEDULE_STATUS[row.work_sched_status] ?? {
                label: "Unknown",
                variant: "secondary",
            };
            return <Badge variant={s.variant}>{s.label}</Badge>;
        },
    };
    const actionsCol = {
        key: "actions",
        label: "Actions",
        render: (row) => (
            <Button size="sm" variant="outline" onClick={() => onView(row)}>
                <Eye className="w-4 h-4 mr-1" />
                View
            </Button>
        ),
    };

    if (isHrAdmin) {
        return [
            dateStartCol,
            dateEndCol,
            employeesCol,
            {
                key: "total_creators",
                label: "Creators",
                render: (row) => (
                    <Badge variant="outline">{row.total_creators ?? 0}</Badge>
                ),
            },
            statusCol,
            actionsCol,
        ];
    }

    return [
        {
            key: "created_by_name",
            sortKey: "created_by",
            label: "Created By",
            sortable: true,
            className: "font-mono",
        },
        dateStartCol,
        dateEndCol,
        employeesCol,
        statusCol,
        actionsCol,
    ];
}

export default function ScheduleTable({
    rows,
    orderBy,
    orderDir,
    onSort,
    onView,
    isHrAdmin = false,
}) {
    const columns = buildColumns(onView, isHrAdmin);

    return (
        <ServerTable
            columns={columns}
            data={rows}
            orderBy={orderBy}
            orderDir={orderDir}
            onSort={onSort}
            emptyMessage="No schedules found."
        />
    );
}
