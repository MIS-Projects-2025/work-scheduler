import { router } from "@inertiajs/react";
import { Separator } from "@/Components/ui/separator";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Combobox } from "@/Components/ui/combobox";
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
} from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import ScheduleTableViewing from "./ScheduleTableViewing";
import ValidationErrors from "./components/ValidationErrors";
import ShiftLegend from "./components/ShiftLegend";
import ResultModal from "./components/ResultModal";
import { useWorkSchedule } from "./hooks/useWorkSchedule";

export default function WorkScheduleTemplate({
    cutoffList = [],
    employees = [],
    shifts = [],
}) {
    const handleSubmitSchedule = async (data) => {
        try {
            const response = await fetch(
                route("workschedule.template.submit"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute("content"),
                    },
                    body: JSON.stringify(data),
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw {
                    status: "error",
                    error: errorData?.error || "Request failed",
                };
            }

            const result = await response.json();

            return result; // ✅ THIS goes to your modal
        } catch (err) {
            throw {
                status: "error",
                error: err.error || "Failed to submit schedules",
            };
        }
    };
    // Pass the handler to the hook
    const {
        isFullscreen,
        selectedCutoff,
        selectedCutoffData,
        isLoading,
        downloadComplete,
        legendCollapsed,
        setLegendCollapsed,
        file,
        employeeData,
        employeeHeaders,
        cutoffText,
        editedCells,
        validationErrors,
        resultModalOpen,
        submitResult,
        isSubmitting,
        shiftMap,
        shiftOptions,
        cutoffOptions,
        hasData,
        holidays,
        handleCutoffChange,
        handleFileChange,
        handleCellEdit,
        handleReset,
        handleDownload,
        handleSubmit,
        handleResultClose,
        toggleFullscreen,
    } = useWorkSchedule({
        cutoffList,
        employees,
        shifts,
        onSubmitSchedule: handleSubmitSchedule, // Pass the handler here
    });

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

            <div className="space-y-4 mt-4">
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
                                placeholder="Select a cutoff period..."
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
                            {file && (
                                <Badge variant="secondary">{file.name}</Badge>
                            )}
                        </label>

                        <ValidationErrors errors={validationErrors} />

                        {hasData && validationErrors.length === 0 && (
                            <div className="space-y-4">
                                {cutoffText && (
                                    <div className="rounded-md border bg-primary/5 px-4 py-2.5 text-center text-sm font-semibold text-primary">
                                        {cutoffText}
                                    </div>
                                )}
                                <ShiftLegend
                                    shifts={shifts}
                                    shiftMap={shiftMap}
                                    collapsed={legendCollapsed}
                                    onToggle={() =>
                                        setLegendCollapsed((p) => !p)
                                    }
                                />
                                <ScheduleTableViewing
                                    data={employeeData}
                                    headers={employeeHeaders}
                                    frozenColumns={8}
                                    stickyColumns={2}
                                    shiftMap={shiftMap}
                                    shiftOptions={shiftOptions}
                                    maxHeight="60vh"
                                    editable={true}
                                    onCellChange={handleCellEdit}
                                    editedCells={editedCells}
                                    holidays={holidays}
                                    dateStart={selectedCutoffData?.start ?? null}
                                />
                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleReset}
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Reset
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        {isSubmitting
                                            ? "Submitting..."
                                            : "Submit Schedule"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ResultModal
                open={resultModalOpen}
                onClose={handleResultClose}
                result={submitResult}
            />
        </AuthenticatedLayout>
    );
}
