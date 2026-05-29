import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import {
    AlertTriangle,
    ThumbsUp,
    ThumbsDown,
    CheckCheck,
    Loader2,
} from "lucide-react";

const ACTION_CONFIG = {
    approve: {
        title: "Approve Schedules",
        icon: <ThumbsUp className="w-5 h-5 text-green-600" />,
        remarksRequired: false,
        remarksPlaceholder: "Optional remarks…",
        confirmLabel: "Confirm Approve",
        confirmIcon: <ThumbsUp className="w-4 h-4 mr-2" />,
        confirmClass: "bg-green-600 hover:bg-green-700 text-white",
        confirmVariant: "default",
        description: (n) =>
            `Approving ${n} employee schedule${n !== 1 ? "s" : ""}. Remarks are optional.`,
    },
    disapprove: {
        title: "Disapprove Schedules",
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
        remarksRequired: true,
        remarksPlaceholder: "Enter reason for disapproval…",
        confirmLabel: "Confirm Disapprove",
        confirmIcon: <ThumbsDown className="w-4 h-4 mr-2" />,
        confirmClass: "",
        confirmVariant: "destructive",
        description: (n) =>
            `Disapproving ${n} employee schedule${n !== 1 ? "s" : ""}. Please provide a reason.`,
    },
    acknowledge: {
        title: "Acknowledge Schedule",
        icon: <CheckCheck className="w-5 h-5 text-green-600" />,
        remarksRequired: false,
        remarksPlaceholder: "Optional remarks…",
        confirmLabel: "Confirm Acknowledge",
        confirmIcon: <CheckCheck className="w-4 h-4 mr-2" />,
        confirmClass: "bg-green-600 hover:bg-green-700 text-white",
        confirmVariant: "default",
        description: () =>
            "You are acknowledging this work schedule. Remarks are optional.",
    },
};

/**
 * Confirmation dialog for approve / disapprove / acknowledge actions.
 *
 * Props:
 *   open            boolean
 *   action          'approve' | 'disapprove' | 'acknowledge' | null
 *   selectedCount   number   (ignored for acknowledge)
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
    const cfg = ACTION_CONFIG[action] ?? null;
    if (!cfg) return null;

    const remarksEmpty = !remarks.trim();
    const disabled = processing || (cfg.remarksRequired && remarksEmpty);

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => !processing && !o && onClose()}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {cfg.icon}
                        {cfg.title}
                    </DialogTitle>
                    <DialogDescription>
                        {cfg.description(selectedCount)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div className="space-y-2">
                        <Label>
                            Remarks
                            {cfg.remarksRequired && (
                                <span className="text-destructive ml-1">*</span>
                            )}
                        </Label>
                        <Textarea
                            placeholder={cfg.remarksPlaceholder}
                            value={remarks}
                            onChange={(e) => onRemarksChange(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                        {cfg.remarksRequired && remarksEmpty && (
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
                        disabled={disabled}
                        className={cfg.confirmClass}
                        variant={cfg.confirmVariant}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                {cfg.confirmIcon}
                                {cfg.confirmLabel}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
