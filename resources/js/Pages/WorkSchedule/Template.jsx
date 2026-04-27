import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
    FileSpreadsheet,
    Download,
    Loader2,
    CheckCircle2,
    Upload,
    Save,
    RotateCcw,
    Maximize2,
    Minimize2,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    XCircle,
    CheckCircle,
} from "lucide-react";
import ScheduleTableViewing from "./ScheduleTableViewing";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function WorkScheduleTemplate({
    cutoffList = [],
    employees = [],
    shifts = [],
    onSubmitSchedule,
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedCutoff, setSelectedCutoff] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [downloadComplete, setDownloadComplete] = useState(false);
    const [legendCollapsed, setLegendCollapsed] = useState(false);

    const [file, setFile] = useState(null);
    const [employeeData, setEmployeeData] = useState([]);
    const [employeeHeaders, setEmployeeHeaders] = useState([]);
    const [cutoffText, setCutoffText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editedCells, setEditedCells] = useState(new Set());

    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [submitResult, setSubmitResult] = useState(null);
    const [uploadedData, setUploadedData] = useState(null);
    const [selectedCutoffData, setSelectedCutoffData] = useState(null);

    const shiftMap = useMemo(() => {
        const map = {};
        (shifts || []).forEach((s) => {
            let bgColor = s.shiftcode_bg_color;
            let fontColor = s.shiftcode_font_color;
            if (bgColor && /^[0-9A-Fa-f]{6}$/.test(bgColor))
                bgColor = `#${bgColor}`;
            if (fontColor && /^[0-9A-Fa-f]{6}$/.test(fontColor))
                fontColor = `#${fontColor}`;
            map[s.shiftcode] = {
                id: s.id,
                bg: bgColor || "#FFFFFF",
                color: fontColor || "#000000",
                desc: s.shiftcode_desc || "",
            };
        });
        return map;
    }, [shifts]);

    const shiftOptions = useMemo(
        () =>
            shifts.map((shift) => ({
                value: shift.shiftcode,
                label: `${shift.shiftcode} - ${shift.shiftcode_desc}`,
            })),
        [shifts],
    );

    const cutoffOptions = useMemo(() => {
        if (!Array.isArray(cutoffList)) return [];
        return cutoffList.map((c) => ({
            value: c.ID?.toString() || c.id?.toString(),
            label: `${c.payroll_date_start} → ${c.payroll_date_end}`,
            start: c.payroll_date_start,
            end: c.payroll_date_end,
        }));
    }, [cutoffList]);

    useEffect(() => {
        if (cutoffOptions.length > 0) {
            setSelectedCutoff(cutoffOptions[0].value);
            setSelectedCutoffData(cutoffOptions[0]);
        }
    }, [cutoffOptions]);

    const handleCutoffChange = (value) => {
        setSelectedCutoff(value);
        const selected = cutoffOptions.find((opt) => opt.value === value);
        setSelectedCutoffData(selected);
    };

    // ========================================================================
    // VALIDATION FUNCTIONS
    // ========================================================================

    const getPayrollPeriodDays = (startDate, endDate) => {
        // Parse date parts directly to avoid timezone issues
        const [sy, sm, sd] = startDate.split("-").map(Number);
        const [ey, em, ed] = endDate.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);
        const diffTime = end - start;
        return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };
    const findScheduleGaps = (schedule, totalDays) => {
        const gaps = [];
        let gapStart = null;
        let consecutiveMissingDays = 0;

        for (let i = 1; i <= totalDays; i++) {
            // Check both string and number keys to be safe
            const hasSchedule =
                (schedule.hasOwnProperty(i.toString()) &&
                    schedule[i.toString()]) ||
                (schedule.hasOwnProperty(i) && schedule[i]);

            if (!hasSchedule) {
                if (gapStart === null) gapStart = i;
                consecutiveMissingDays++;
            } else {
                if (gapStart !== null) {
                    gaps.push({
                        startDay: gapStart,
                        endDay: i - 1,
                        missingDays: consecutiveMissingDays,
                    });
                    gapStart = null;
                    consecutiveMissingDays = 0;
                }
            }
        }

        // Fix trailing gap — use totalDays not gapStart math
        if (gapStart !== null && consecutiveMissingDays >= 1) {
            gaps.push({
                startDay: gapStart,
                endDay: totalDays, // 👈 was: gapStart + consecutiveMissingDays - 1
                missingDays: consecutiveMissingDays,
            });
        }

        return gaps;
    };

    const buildScheduleFromRow = (row, headers, totalDays, shiftMap) => {
        const schedule = {};
        const scheduleStartCol = 6;
        const availableDayCols = headers.length - scheduleStartCol;
        const daysToProcess = Math.min(totalDays, availableDayCols);

        for (let i = 0; i < daysToProcess; i++) {
            const colIndex = scheduleStartCol + i;
            const dayNum = i + 1;
            const value = row[colIndex];

            if (
                value !== undefined &&
                value !== null &&
                value.toString().trim() !== ""
            ) {
                schedule[dayNum.toString()] = value.toString().trim(); // just store the string, nothing else
            }
        }

        console.log("Schedule built:", schedule);
        console.log("Keys count:", Object.keys(schedule).length);
        return schedule;
    };

    const validateSchedules = (
        employeeRows,
        headers,
        cutoffStart,
        cutoffEnd,
        employeeList,
    ) => {
        const errors = [];
        let isValid = true;

        const totalDays = getPayrollPeriodDays(cutoffStart, cutoffEnd);

        // 1. Check for duplicate employee IDs
        const employeeIds = [];
        const duplicateIds = [];

        employeeRows.forEach((row) => {
            const empId = row[0]?.toString();
            if (empId) {
                if (employeeIds.includes(empId)) {
                    if (!duplicateIds.includes(empId)) duplicateIds.push(empId);
                } else {
                    employeeIds.push(empId);
                }
            }
        });

        if (duplicateIds.length > 0) {
            errors.push({
                type: "duplicate",
                message: `Duplicate Employee IDs found: ${duplicateIds.join(", ")}. Each employee should appear only once.`,
                isBlocking: true,
            });
            isValid = false;
        }

        // 2. Check for unauthorized employees
        const authorizedEmployeeIds = employeeList.map(
            (emp) => emp.EMPLOYID?.toString() || emp.emp_id?.toString(),
        );
        const unauthorizedEmployees = [];

        employeeRows.forEach((row) => {
            const empId = row[0]?.toString();
            if (empId && !authorizedEmployeeIds.includes(empId)) {
                unauthorizedEmployees.push({
                    id: empId,
                    name: row[1] || "Unknown",
                });
            }
        });

        if (unauthorizedEmployees.length > 0) {
            const unauthorizedList = unauthorizedEmployees
                .map((emp) => `${emp.name} (${emp.id})`)
                .join(", ");
            errors.push({
                type: "unauthorized",
                message: `Employees not under your supervision: ${unauthorizedList}`,
                isBlocking: true,
            });
            isValid = false;
        }

        if (errors.some((err) => err.isBlocking)) {
            return { isValid: false, errors };
        }

        // 3. Individual schedule validation — all totalDays must be filled
        employeeRows.forEach((row, index) => {
            const empId = row[0]?.toString();
            const empName = row[1] || empId || "Unknown";
            // In validateSchedules, after buildScheduleFromRow:
            const schedule = buildScheduleFromRow(
                row,
                headers,
                totalDays,
                shiftMap,
            );
            const scheduledDays = Object.keys(schedule).length;

            console.log(
                `Employee ${empId}: ${scheduledDays} of ${totalDays} days scheduled`,
            ); // 👈 temporary
            const rowErrors = [];

            if (scheduledDays === 0) {
                rowErrors.push(
                    `No schedule entries found — 0 of ${totalDays} days filled`,
                );
                isValid = false;
            } else if (scheduledDays < totalDays) {
                const missingDays = totalDays - scheduledDays;
                rowErrors.push(
                    `Incomplete schedule — missing ${missingDays} day(s). Expected ${totalDays} days, got ${scheduledDays}`,
                );
                isValid = false;
            }

            const gaps = findScheduleGaps(schedule, totalDays);
            if (gaps.length > 0) {
                gaps.forEach((gap) => {
                    rowErrors.push(
                        `Gap found — missing ${gap.missingDays} day(s) from Day ${gap.startDay} to Day ${gap.endDay}`,
                    );
                });
                isValid = false;
            }

            if (rowErrors.length > 0) {
                errors.push({
                    type: "schedule",
                    employee: { empId, empName },
                    errors: rowErrors,
                    rowIndex: index,
                    isBlocking: false,
                });
            }
        });

        return { isValid, errors };
    };

    // ========================================================================
    // FILE PARSING
    // ========================================================================

    const parseFile = async (uploaded) => {
        if (!uploaded) return;

        if (!selectedCutoffData) {
            toast.error("Please select a cutoff period first");
            return;
        }

        setFile(uploaded);
        setEditedCells(new Set());
        setValidationErrors([]);

        const buffer = await uploaded.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        let headersRow = null;
        let dataStartRow = -1;

        for (let i = 0; i < json.length; i++) {
            const row = json[i];
            if (!row?.length) continue;
            const first = row[0] ? String(row[0]).toLowerCase() : "";

            if (first.includes("cutoff:")) {
                setCutoffText(row[0]);
                continue;
            }
            if (
                row[0] === "Emp ID" ||
                String(row[0] ?? "").includes("Emp ID")
            ) {
                headersRow = row;
                setEmployeeHeaders(row);
                dataStartRow = i + 1;
                break;
            }
        }

        let parsedData = [];
        if (dataStartRow !== -1) {
            parsedData = json
                .slice(dataStartRow)
                .filter((row) => row[0] && row[0].toString().trim() !== "");
            setEmployeeData(parsedData);
        }
        // Temporarily in parseFile, after building parsedData:
        console.log("Headers row:", headersRow);
        console.log("First data row:", parsedData[0]);
        console.log("Headers length:", headersRow?.length);
        if (parsedData.length > 0 && selectedCutoffData) {
            const validation = validateSchedules(
                parsedData,
                headersRow,
                selectedCutoffData.start,
                selectedCutoffData.end,
                employees,
            );
            setValidationErrors(validation.errors);

            if (validation.errors.length > 0) {
                toast.error(
                    "Validation failed. Please check the errors below.",
                );
            } else {
                toast.success("File validated successfully!");
            }
        }
    };

    const handleFileChange = (e) => parseFile(e.target.files[0]);

    const handleCellEdit = (rowIndex, colIndex, newValue) => {
        const cellKey = `${rowIndex}-${colIndex}`;
        setEditedCells((prev) => new Set([...prev, cellKey]));

        setEmployeeData((prev) => {
            const updated = prev.map((r) => [...r]);
            updated[rowIndex][colIndex] = newValue;

            if (selectedCutoffData && employeeHeaders.length > 0) {
                const validation = validateSchedules(
                    updated,
                    employeeHeaders,
                    selectedCutoffData.start,
                    selectedCutoffData.end,
                    employees,
                );
                setValidationErrors(validation.errors);
            }

            return updated;
        });
    };

    const handleReset = () => {
        if (file) {
            setEditedCells(new Set());
            parseFile(file);
            toast.success("Schedule reset to original version");
        }
    };

    // ========================================================================
    // PREVIEW & SUBMIT
    // ========================================================================

    const showPreview = () => {
        if (employeeData.length === 0) {
            toast.error("Please upload a file first");
            return;
        }

        if (validationErrors.length > 0) {
            toast.error("Please fix validation errors before submitting");
            return;
        }

        const codesMap = {};
        shifts.forEach((shift) => {
            codesMap[shift.id] = {
                SHIFTCODE: shift.shiftcode,
                SHIFTCODE_DESC: shift.shiftcode_desc,
                SHIFTCODE_BG_COLOR: shift.shiftcode_bg_color,
                SHIFTCODE_FONT_COLOR: shift.shiftcode_font_color,
            };
        });

        const totalDays = getPayrollPeriodDays(
            selectedCutoffData.start,
            selectedCutoffData.end,
        );

        const employeesData = employeeData.map((row) => ({
            empId: row[0]?.toString() || "",
            empName: row[1] || "",
            department: row[2] || "",
            prodLine: row[3] || "",
            team: row[4] || "",
            shiftType: row[5] || "",
            schedule: buildScheduleFromRow(
                row,
                employeeHeaders,
                totalDays,
                shiftMap,
            ),
            formattedStartDate: selectedCutoffData.start,
            formattedEndDate: selectedCutoffData.end,
        }));

        setUploadedData({ employees: employeesData, shiftCodes: codesMap });
        setPreviewModalOpen(true);
    };

    const handleSubmitSchedules = async () => {
        if (!uploadedData || !selectedCutoffData) return;

        setIsSubmitting(true);

        try {
            let result;
            if (onSubmitSchedule) {
                result = await onSubmitSchedule({
                    employees: uploadedData.employees,
                    cutoff_id: selectedCutoff,
                });
            } else {
                result = {
                    status: "success",
                    saved: uploadedData.employees.map((e) => e.empId),
                    overwritten: [],
                    skipped: [],
                    unauthorized: [],
                };
            }

            setSubmitResult(result);
            setPreviewModalOpen(false);
            setResultModalOpen(true);

            if (result.status === "success") {
                toast.success(
                    `${result.saved?.length || 0} schedules saved successfully`,
                );
            } else if (result.status === "warning") {
                toast.warning(result.error || "Some schedules were skipped");
            } else {
                toast.error(result.error || "Failed to save schedules");
            }
        } catch (error) {
            console.error("Error submitting schedule:", error);
            toast.error("Failed to submit schedules");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    const renderValidationErrors = () => {
        if (validationErrors.length === 0) return null;

        const blockingErrors = validationErrors.filter((e) => e.isBlocking);
        const scheduleErrors = validationErrors.filter(
            (e) => e.type === "schedule",
        );

        return (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Schedule Validation Failed</AlertTitle>
                <AlertDescription>
                    <div className="mt-2 space-y-2">
                        {blockingErrors.map((error, idx) => (
                            <div key={`blocking-${idx}`} className="text-sm">
                                <strong>
                                    {error.type === "duplicate"
                                        ? "Duplicate Employee IDs:"
                                        : "Unauthorized Employees:"}
                                </strong>
                                <p>{error.message}</p>
                            </div>
                        ))}
                        {scheduleErrors.length > 0 && (
                            <div className="mt-3">
                                <strong>Schedule Issues:</strong>
                                {scheduleErrors.map((error, idx) => (
                                    <div
                                        key={`schedule-${idx}`}
                                        className="mt-2 pl-4 border-l-2 border-red-300"
                                    >
                                        <p className="font-medium">
                                            {error.employee?.empName} (Row{" "}
                                            {error.rowIndex + 1})
                                        </p>
                                        <ul className="list-disc list-inside text-sm">
                                            {error.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </AlertDescription>
            </Alert>
        );
    };

    const renderPreviewModal = () => {
        if (!uploadedData) return null;

        const totalDays = getPayrollPeriodDays(
            selectedCutoffData?.start,
            selectedCutoffData?.end,
        );
        const dates = [];
        const start = new Date(selectedCutoffData?.start);
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            dates.push(date);
        }

        return (
            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            Schedule Preview & Confirmation
                        </DialogTitle>
                        <DialogDescription>
                            Review schedules before saving. Period:{" "}
                            {selectedCutoffData?.label}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1">
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <strong>Period:</strong>
                                            <p className="text-muted-foreground">
                                                {selectedCutoffData?.label}
                                            </p>
                                        </div>
                                        <div>
                                            <strong>Total Employees:</strong>
                                            <Badge>
                                                {uploadedData.employees
                                                    ?.length || 0}
                                            </Badge>
                                        </div>
                                        <div>
                                            <strong>File:</strong>
                                            <p className="text-muted-foreground truncate">
                                                {file?.name}
                                            </p>
                                        </div>
                                        <div>
                                            <strong>Status:</strong>
                                            <Badge variant="default">
                                                Ready for Save
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="border rounded-md overflow-auto">
                                <Table>
                                    <thead className="bg-muted sticky top-0">
                                        <TableRow>
                                            <th className="p-2 text-left font-semibold">
                                                Emp ID
                                            </th>
                                            <th className="p-2 text-left font-semibold">
                                                Name
                                            </th>
                                            <th className="p-2 text-left font-semibold">
                                                Dept
                                            </th>
                                            <th className="p-2 text-left font-semibold">
                                                Prod Line
                                            </th>
                                            <th className="p-2 text-left font-semibold">
                                                Team
                                            </th>
                                            <th className="p-2 text-left font-semibold">
                                                Shift Type
                                            </th>
                                            {dates.map((date, idx) => (
                                                <th
                                                    key={idx}
                                                    className="p-2 text-center font-semibold text-xs"
                                                >
                                                    {date.toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            day: "2-digit",
                                                            month: "short",
                                                            weekday: "short",
                                                        },
                                                    )}
                                                </th>
                                            ))}
                                        </TableRow>
                                    </thead>
                                    <tbody>
                                        {uploadedData.employees?.map(
                                            (emp, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="p-2 font-mono">
                                                        {emp.empId}
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        {emp.empName}
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        {emp.department}
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        {emp.prodLine}
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        {emp.team}
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        {emp.shiftType}
                                                    </TableCell>
                                                    {dates.map((_, dayIdx) => {
                                                        const dayNum =
                                                            dayIdx + 1;
                                                        const shiftId =
                                                            emp.schedule?.[
                                                                dayNum
                                                            ];
                                                        const shift =
                                                            uploadedData
                                                                .shiftCodes?.[
                                                                shiftId
                                                            ];
                                                        return (
                                                            <TableCell
                                                                key={dayIdx}
                                                                className="p-1 text-center"
                                                            >
                                                                {shift ? (
                                                                    <span
                                                                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                                                                        style={{
                                                                            backgroundColor:
                                                                                shift.SHIFTCODE_BG_COLOR
                                                                                    ? `#${shift.SHIFTCODE_BG_COLOR}`
                                                                                    : undefined,
                                                                            color: shift.SHIFTCODE_FONT_COLOR
                                                                                ? `#${shift.SHIFTCODE_FONT_COLOR}`
                                                                                : undefined,
                                                                        }}
                                                                    >
                                                                        {
                                                                            shift.SHIFTCODE
                                                                        }
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-xs">
                                                                        -
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ),
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitSchedules}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Confirm & Save
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    };

    const renderResultModal = () => {
        if (!submitResult) return null;

        return (
            <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {submitResult.status === "success" ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : submitResult.status === "warning" ? (
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            Operation Complete
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        {submitResult.saved?.length > 0 && (
                            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
                                <strong>
                                    Saved ({submitResult.saved.length}):
                                </strong>
                                <p className="text-sm">
                                    {submitResult.saved.join(", ")}
                                </p>
                            </div>
                        )}
                        {submitResult.overwritten?.length > 0 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                                <strong>
                                    Overwritten (
                                    {submitResult.overwritten.length}):
                                </strong>
                                <p className="text-sm">
                                    {submitResult.overwritten.join(", ")}
                                </p>
                            </div>
                        )}
                        {submitResult.skipped?.length > 0 && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md">
                                <strong>
                                    Skipped ({submitResult.skipped.length}):
                                </strong>
                                <p className="text-sm">
                                    {submitResult.skipped.join(", ")}
                                </p>
                            </div>
                        )}
                        {submitResult.unauthorized?.length > 0 && (
                            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-md">
                                <strong>
                                    Unauthorized (
                                    {submitResult.unauthorized.length}):
                                </strong>
                                <p className="text-sm">
                                    {submitResult.unauthorized.join(", ")}
                                </p>
                            </div>
                        )}
                        {submitResult.error && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    {submitResult.error}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={() => {
                                setResultModalOpen(false);
                                if (submitResult.status === "success") {
                                    setFile(null);
                                    setEmployeeData([]);
                                    setEmployeeHeaders([]);
                                    setEditedCells(new Set());
                                    setValidationErrors([]);
                                    setUploadedData(null);
                                }
                            }}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    };

    const renderLegend = () => {
        if (!shifts?.length) return null;

        const codes = shifts.filter((s) => s.shiftcode);
        const codesPerRow = 6;

        if (legendCollapsed) {
            return (
                <div className="rounded-md border bg-muted/30 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLegendCollapsed(false)}
                        className="w-full justify-between"
                    >
                        <span className="text-xs font-semibold">
                            Shift Legend ({codes.length} codes)
                        </span>
                        <ChevronDown className="w-4 h-4" />
                    </Button>
                </div>
            );
        }

        return (
            <div className="rounded-md border bg-muted/30 mb-4">
                <div className="flex justify-between px-4 py-2 border-b bg-muted/50">
                    <span className="text-xs font-semibold">
                        Shift Legend ({codes.length} codes)
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLegendCollapsed(true)}
                        className="h-6 w-6 p-0"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </Button>
                </div>
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
                                            <TooltipProvider
                                                key={`legend-${rowIdx}-${colIdx}`}
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell
                                                            className="text-center p-2 font-semibold text-sm cursor-help"
                                                            style={{
                                                                backgroundColor:
                                                                    style.bg,
                                                                color: style.color,
                                                            }}
                                                        >
                                                            {code.shiftcode}
                                                        </TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">
                                                            {style.desc ||
                                                                code.shiftcode_desc}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    const hasData = employeeData.length > 0;

    const handleDownload = () => {
        if (!selectedCutoff) {
            toast.error("Select a cutoff period first");
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setDownloadComplete(true);
            toast.success("Template is being downloaded");
            setTimeout(() => setDownloadComplete(false), 2000);
        }, 1000);
    };

    const toggleFullscreen = useCallback(() => {
        if (!isFullscreen) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
        setIsFullscreen(!isFullscreen);
    }, [isFullscreen]);

    return (
        <AuthenticatedLayout>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6" />
                        Work Schedule Template
                    </h1>
                    <p className="text-muted-foreground">
                        Download, upload, edit, and submit work schedules
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                    {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                    ) : (
                        <Maximize2 className="w-4 h-4" />
                    )}
                </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            1. Select Cutoff
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Combobox
                            options={cutoffOptions}
                            value={selectedCutoff}
                            onChange={handleCutoffChange}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            2. Download Template
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleDownload}
                            disabled={!selectedCutoff || isLoading}
                            className="w-full"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : downloadComplete ? (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {isLoading
                                ? "Preparing..."
                                : downloadComplete
                                  ? "Download Started"
                                  : "Download Excel"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        3. Upload & Edit Schedule
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:bg-muted/40">
                        <Upload className="w-6 h-6" />
                        <span className="text-sm">
                            Click to upload Excel file (.xlsx / .xls)
                        </span>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {file && <Badge variant="secondary">{file.name}</Badge>}
                    </label>

                    {renderValidationErrors()}

                    {hasData && validationErrors.length === 0 && (
                        <div className="space-y-4">
                            {cutoffText && (
                                <div className="rounded-md border bg-primary/5 px-4 py-2.5 text-center text-sm font-semibold text-primary">
                                    {cutoffText}
                                </div>
                            )}
                            {renderLegend()}
                            <ScheduleTableViewing
                                data={employeeData}
                                headers={employeeHeaders}
                                frozenColumns={6}
                                stickyColumns={2}
                                shiftMap={shiftMap}
                                shiftOptions={shiftOptions}
                                maxHeight="60vh"
                                editable={true}
                                onCellChange={handleCellEdit}
                                editedCells={editedCells}
                            />
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={handleReset}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset
                                </Button>
                                <Button
                                    onClick={showPreview}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Preview & Submit
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {renderPreviewModal()}
            {renderResultModal()}
        </AuthenticatedLayout>
    );
}
