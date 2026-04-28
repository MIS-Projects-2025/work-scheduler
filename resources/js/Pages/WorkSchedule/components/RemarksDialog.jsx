import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

/**
 * Confirmation dialog for bulk approve / disapprove actions.
 *
 * Props:
 *   open            boolean
 *   action          'approve' | 'disapprove' | null
 *   selectedCount   number
 *   remarks         string
 *   onRemarksChange (value: string) => void
 *   onConfirm       () => void
 *   onClose         () => void
 *   processing      boolean
 */
export default function RemarksDialog({
    open,
    action,
    selectedCount,
    remarks,
    onRemarksChange,
    onConfirm,
    onClose,
    processing,
}) {
    const isDisapprove = action === "disapprove";

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => !processing && !o && onClose()}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isDisapprove ? (
                            <>
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                Disapprove Schedules
                            </>
                        ) : (
                            <>
                                <ThumbsUp className="w-5 h-5 text-green-600" />
                                Approve Schedules
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isDisapprove
                            ? `Disapproving ${selectedCount} employee schedule${selectedCount !== 1 ? "s" : ""}. Please provide a reason.`
                            : `Approving ${selectedCount} employee schedule${selectedCount !== 1 ? "s" : ""}. Remarks are optional.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div className="space-y-2">
                        <Label>
                            Remarks
                            {isDisapprove && (
                                <span className="text-destructive ml-1">*</span>
                            )}
                        </Label>
                        <Textarea
                            placeholder={
                                isDisapprove
                                    ? "Enter reason for disapproval…"
                                    : "Optional remarks…"
                            }
                            value={remarks}
                            onChange={(e) => onRemarksChange(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                        {isDisapprove && !remarks.trim() && (
                            <p className="text-xs text-destructive">
                                Remarks are required for disapproval.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={
                            processing ||
                            (isDisapprove && !remarks.trim())
                        }
                        className={
                            !isDisapprove
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : ""
                        }
                        variant={isDisapprove ? "destructive" : "default"}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Processing...
                            </>
                        ) : isDisapprove ? (
                            <>
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Confirm Disapprove
                            </>
                        ) : (
                            <>
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                Confirm Approve
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
