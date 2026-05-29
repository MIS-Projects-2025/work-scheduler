import { Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/Components/ui/alert-dialog";

/**
 * DeleteConfirmDialog
 *
 * A pre-wired AlertDialog for confirming destructive deletes.
 *
 * @param {object}          props
 * @param {boolean}         props.open            - Controls dialog visibility.
 * @param {Function}        props.onOpenChange     - Called with false when dismissed.
 * @param {string}          props.title            - Dialog title. Default "Delete".
 * @param {React.ReactNode} props.description      - Body text / JSX describing what will be deleted.
 * @param {Function}        props.onConfirm        - Called when the destructive action button is clicked.
 * @param {boolean}         props.isDeleting       - Shows spinner and disables buttons while true.
 * @param {string}          [props.confirmLabel]   - Label for the destructive button. Default "Delete".
 */
export function DeleteConfirmDialog({
    open,
    onOpenChange,
    title = "Delete",
    description,
    onConfirm,
    isDeleting,
    confirmLabel = "Delete",
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div>{description}</div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                    >
                        {isDeleting && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
