import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ValidationErrors({ errors }) {
    if (!errors?.length) return null;

    const blockingErrors = errors.filter((e) => e.isBlocking);
    const scheduleErrors = errors.filter((e) => e.type === "schedule");

    return (
        <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Schedule Validation Failed</AlertTitle>
            <AlertDescription>
                <div className="mt-2 space-y-2">
                    {blockingErrors.map((error, idx) => (
                        <div key={idx} className="text-sm">
                            <strong>
                                {error.type === "duplicate"
                                    ? "Duplicate Employee IDs:"
                                    : error.type === "cutoff_mismatch"
                                      ? "Cutoff Mismatch:"
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
                                    key={idx}
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
}
