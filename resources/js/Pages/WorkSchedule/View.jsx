import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useMemo } from "react";
import { FileSpreadsheet, Calendar, Clock, User } from "lucide-react";
import ScheduleTableViewing from "./ScheduleTableViewing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export default function WorkScheduleView({
    groupedData = [],
    shiftCodes = [],
    dateStart,
    dateEnd,
}) {
    const shiftMap = useMemo(() => {
        const map = {};
        (shiftCodes || []).forEach((s) => {
            let bgColor = s.shiftcode_bg_color;
            let fontColor = s.shiftcode_font_color;
            if (bgColor && /^[0-9A-Fa-f]{6}$/.test(bgColor))
                bgColor = `#${bgColor}`;
            if (fontColor && /^[0-9A-Fa-f]{6}$/.test(fontColor))
                fontColor = `#${fontColor}`;
            map[s.shiftcode] = {
                bg: bgColor || "#FFFFFF",
                color: fontColor || "#000000",
            };
        });
        return map;
    }, [shiftCodes]);

    const shiftOptions = useMemo(
        () =>
            (shiftCodes || []).map((shift) => ({
                value: shift.shiftcode,
                label: `${shift.shiftcode} - ${shift.shiftcode_desc}`,
            })),
        [shiftCodes],
    );

    const renderLegend = () => {
        if (!shiftCodes?.length) return null;
        const codes = shiftCodes.filter((s) => s.shiftcode);
        const codesPerRow = 6;

        return (
            <div className="rounded-md border bg-muted/30 overflow-auto">
                <Table>
                    <TableBody>
                        {Array.from({
                            length: Math.ceil(codes.length / codesPerRow),
                        }).map((_, rowIdx) => {
                            const rowCodes = codes.slice(
                                rowIdx * codesPerRow,
                                (rowIdx + 1) * codesPerRow,
                            );
                            return (
                                <TableRow key={`legend-row-${rowIdx}`}>
                                    {rowCodes.map((code, colIdx) => {
                                        const style =
                                            shiftMap[code.shiftcode] ?? {};
                                        return (
                                            <TableCell
                                                key={`legend-${rowIdx}-${colIdx}`}
                                                className="text-center p-2 font-semibold text-sm"
                                                style={{
                                                    backgroundColor:
                                                        style.bg ?? undefined,
                                                    color:
                                                        style.color ??
                                                        undefined,
                                                }}
                                            >
                                                <div>{code.shiftcode}</div>
                                                <div className="text-xs font-normal opacity-75 mt-0.5">
                                                    {code.shiftcode_desc}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                    {/* Pad remaining cells */}
                                    {rowCodes.length < codesPerRow &&
                                        Array.from({
                                            length:
                                                codesPerRow - rowCodes.length,
                                        }).map((_, i) => (
                                            <TableCell
                                                key={`pad-${rowIdx}-${i}`}
                                            />
                                        ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Work Schedule View" />

            <div className="min-h-screen bg-background">
                {/* Top bar */}
                <div className="border-b bg-card px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                <FileSpreadsheet className="w-5 h-5 text-primary" />
                                Work Schedule View
                            </h1>
                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    {dateStart} — {dateEnd}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {groupedData.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                No schedules found for this period.
                            </CardContent>
                        </Card>
                    )}

                    {groupedData.map((group, groupIdx) => {
                        const data = group.schedules || [];
                        const headers = group.headers || [];

                        if (data.length === 0) {
                            return (
                                <Card key={groupIdx}>
                                    <CardContent className="py-12 text-center text-muted-foreground">
                                        No schedules found for this period.
                                    </CardContent>
                                </Card>
                            );
                        }

                        return (
                            <Card key={groupIdx} className="overflow-hidden">
                                <CardHeader className="bg-muted/50 py-3 px-4">
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Created by: {group.created_by}
                                        </span>
                                        <Separator
                                            orientation="vertical"
                                            className="h-4"
                                        />
                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            {group.payroll_date_start} —{" "}
                                            {group.payroll_date_end}
                                        </span>
                                        <Separator
                                            orientation="vertical"
                                            className="h-4"
                                        />
                                        <Badge
                                            variant="secondary"
                                            className="flex items-center gap-1"
                                        >
                                            <Clock className="w-3 h-3" />
                                            {data.length} employees
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                            Shift Code Legend
                                        </p>
                                        {renderLegend()}
                                    </div>

                                    <ScheduleTableViewing
                                        data={data}
                                        headers={headers}
                                        frozenColumns={6}
                                        stickyColumns={2}
                                        shiftMap={shiftMap}
                                        shiftOptions={shiftOptions}
                                        maxHeight="60vh"
                                        showHeader={true}
                                        editable={false}
                                    />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
