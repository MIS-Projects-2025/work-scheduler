import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage } from "@inertiajs/react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const STATUS_MAP = {
    1: { label: "Pending",      variant: "warning" },
    2: { label: "Approved",     variant: "success" },
    3: { label: "Acknowledged", variant: "default" },
    4: { label: "Disapproved",  variant: "destructive" },
};

function StatCard({ title, value, description, colorClass = "text-foreground" }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>{title}</CardDescription>
                <CardTitle className={`text-3xl font-bold ${colorClass}`}>
                    {value.toLocaleString()}
                </CardTitle>
            </CardHeader>
            {description && (
                <CardContent>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
            )}
        </Card>
    );
}

export default function Dashboard({
    stats,
    monthlyChart,
    statusChart,
    shiftGroupChart,
    topShiftCodes,
    upcomingCutoffs,
    recentSchedules,
    isHrAdmin,
    isManager,
}) {
    const { display_name } = usePage().props;

    const scopeLabel = isHrAdmin
        ? "All employees — HR Admin view"
        : isManager
        ? "Your staff's schedules"
        : "Your schedules only";

    // Monthly bar chart
    const barData = {
        labels: monthlyChart.labels,
        datasets: [
            {
                label: "Schedules Submitted",
                data: monthlyChart.data,
                backgroundColor: "rgba(99,102,241,0.7)",
                borderRadius: 6,
            },
        ],
    };
    const barOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    };

    // Status doughnut chart
    const doughnutData = {
        labels: statusChart.labels,
        datasets: [
            {
                data: statusChart.data,
                backgroundColor: [
                    "rgba(234,179,8,0.85)",   // pending  - yellow
                    "rgba(34,197,94,0.85)",    // approved - green
                    "rgba(99,102,241,0.85)",   // acked    - indigo
                    "rgba(239,68,68,0.85)",    // disapproved - red
                ],
                borderWidth: 2,
            },
        ],
    };
    const doughnutOptions = {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
        cutout: "65%",
    };

    // Shift group bar chart
    const groupBarData = {
        labels: shiftGroupChart.labels,
        datasets: [
            {
                label: "Schedule Days",
                data: shiftGroupChart.data,
                backgroundColor: "rgba(14,165,233,0.7)",
                borderRadius: 6,
            },
        ],
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        {display_name} — Work Schedule Overview
                    </p>
                    <Badge
                        variant={isHrAdmin ? "default" : isManager ? "success" : "secondary"}
                        className="mt-1"
                    >
                        {scopeLabel}
                    </Badge>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                    <StatCard
                        title="Total Schedules"
                        value={stats.total}
                        description="All time"
                    />
                    <StatCard
                        title="Pending"
                        value={stats.pending}
                        colorClass="text-yellow-500"
                    />
                    <StatCard
                        title="Approved"
                        value={stats.approved}
                        colorClass="text-green-500"
                    />
                    <StatCard
                        title="Acknowledged"
                        value={stats.acknowledged}
                        colorClass="text-indigo-500"
                    />
                    <StatCard
                        title="Disapproved"
                        value={stats.disapproved}
                        colorClass="text-red-500"
                    />
                    <StatCard
                        title="Employees"
                        value={stats.distinctEmployees}
                        description="With schedules"
                    />
                    <StatCard
                        title="Active Shifts"
                        value={stats.activeShiftCodes}
                        description="Shift codes"
                    />
                </div>

                {/* Charts row */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Monthly trend */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Schedules Submitted</CardTitle>
                            <CardDescription>Last 6 months</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Bar data={barData} options={barOptions} />
                        </CardContent>
                    </Card>

                    {/* Status breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Status Breakdown</CardTitle>
                            <CardDescription>All schedules by status</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                            <div className="w-64">
                                <Doughnut data={doughnutData} options={doughnutOptions} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Shift group chart + top shift codes */}
                <div className="grid gap-4 md:grid-cols-2">
                    {shiftGroupChart.labels.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Schedule Days by Shift Group</CardTitle>
                                <CardDescription>Across all schedule days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Bar
                                    data={groupBarData}
                                    options={{
                                        ...barOptions,
                                        indexAxis: "y",
                                        plugins: { legend: { display: false } },
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Top shift codes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Shift Codes Used</CardTitle>
                            <CardDescription>By number of schedule days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {topShiftCodes.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No data yet.</p>
                                )}
                                {topShiftCodes.map((sc, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <span
                                            className="px-2 py-0.5 rounded text-xs font-semibold"
                                            style={{
                                                backgroundColor: sc.bg_color,
                                                color: sc.font_color,
                                            }}
                                        >
                                            {sc.code}
                                        </span>
                                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{
                                                    width: `${Math.round(
                                                        (sc.count /
                                                            (topShiftCodes[0]?.count || 1)) *
                                                            100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-10 text-right">
                                            {sc.count.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom row: upcoming cutoffs + recent schedules */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Upcoming cutoffs */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Payroll Cutoffs</CardTitle>
                            <CardDescription>Next scheduled periods</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {upcomingCutoffs.length === 0 ? (
                                <p className="text-sm text-muted-foreground">None scheduled.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Start</TableHead>
                                            <TableHead>End</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {upcomingCutoffs.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">
                                                    {c.date_start}
                                                </TableCell>
                                                <TableCell>{c.date_end}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent schedules */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Schedules</CardTitle>
                            <CardDescription>Latest 10 submissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentSchedules.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No schedules yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Period</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentSchedules.map((s) => {
                                            const st = STATUS_MAP[s.status] ?? {
                                                label: "Unknown",
                                                variant: "outline",
                                            };
                                            return (
                                                <TableRow key={s.id}>
                                                    <TableCell className="font-medium">
                                                        {s.emp_id}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {s.date_start} – {s.date_end}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={st.variant}>
                                                            {st.label}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
