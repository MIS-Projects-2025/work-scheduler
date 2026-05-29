import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

export default function ResultModal({ open, onClose, result }) {
    if (!result) return null;

    const sections = [
        {
            key: "saved",
            label: "Saved",
            className: "bg-green-50 dark:bg-green-950",
        },
        {
            key: "overwritten",
            label: "Overwritten",
            className: "bg-blue-50 dark:bg-blue-950",
        },
        {
            key: "blocked",
            label: "Blocked",
            className: "bg-red-50 dark:bg-red-950",
        },
        {
            key: "skipped",
            label: "Skipped",
            className: "bg-yellow-50 dark:bg-yellow-950",
        },
        {
            key: "unauthorized",
            label: "Unauthorized",
            className: "bg-red-100 dark:bg-red-900",
        },
        {
            key: "errors",
            label: "Errors",
            className: "bg-red-50 dark:bg-red-950",
        },
    ];

    const formatItems = (items) => {
        if (!items) return [];

        return items.map((item) => {
            if (typeof item === "string") return item;
            return item.empId ?? "Unknown";
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {result.status === "success" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : result.status === "warning" ? (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        Operation Complete
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    {sections.map(({ key, label, className }) => {
                        const items = result[key] || [];

                        if (items.length === 0) return null;

                        return (
                            <div
                                key={key}
                                className={`p-3 rounded-md ${className}`}
                            >
                                <strong>
                                    {label} ({items.length}):
                                </strong>

                                {/* ✅ COMMA SEPARATED OUTPUT */}
                                <div className="text-sm mt-1">
                                    {formatItems(items).join(", ")}
                                </div>

                                {/* Optional reason display for blocked/errors */}
                                {items.some(
                                    (i) => typeof i === "object" && i.reason,
                                ) && (
                                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                        {items.map((item, index) =>
                                            typeof item === "object" &&
                                            item.reason ? (
                                                <div key={index}>
                                                    {item.empId} — {item.reason}
                                                </div>
                                            ) : null,
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {result.error && (
                        <Alert variant="destructive">
                            <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
