import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline bar showing how many employees are selected and
 * approve / disapprove buttons for bulk actions.
 *
 * Props:
 *   selectedCount  number
 *   processing     boolean
 *   onApprove      () => void
 *   onDisapprove   () => void
 */
export default function BulkActionBar({
    selectedCount,
    processing,
    onApprove,
    onDisapprove,
}) {
    return (
        <div
            className={cn(
                "px-3 py-1.5 flex items-center gap-3 rounded-md border transition-colors",
                selectedCount > 0 ? "bg-primary/5 border-primary/20" : "",
            )}
        >
            <span className="text-sm text-muted-foreground">
                {selectedCount > 0
                    ? `${selectedCount} employee${selectedCount !== 1 ? "s" : ""} selected`
                    : "Select employees to bulk approve or disapprove"}
            </span>

            {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={onApprove}
                        disabled={processing}
                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    >
                        {processing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <ThumbsUp className="w-3.5 h-3.5" />
                        )}
                        Approve ({selectedCount})
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={onDisapprove}
                        disabled={processing}
                        className="gap-1.5"
                    >
                        {processing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <ThumbsDown className="w-3.5 h-3.5" />
                        )}
                        Disapprove ({selectedCount})
                    </Button>
                </div>
            )}
        </div>
    );
}
