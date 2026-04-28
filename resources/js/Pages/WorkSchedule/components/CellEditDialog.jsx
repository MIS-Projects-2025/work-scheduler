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
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";

/**
 * Dialog that pops when the user double-clicks an editable shift-code cell.
 *
 * Props:
 *   open              boolean
 *   onClose           () => void
 *   headerName        string     — column label shown in description
 *   shiftOptions      { value, label }[]
 *   selectedShift     string
 *   onShiftChange     (value) => void
 *   onSave            () => void
 *   currentValue      string     — existing cell value
 *   currentValueStyle object     — { backgroundColor, color, fontWeight }
 *   previewStyle      object     — style for the selected shift preview
 *   shiftDescription  string     — desc of selectedShift
 *   readonlyCols      number
 */
export default function CellEditDialog({
    open,
    onClose,
    headerName,
    shiftOptions,
    selectedShift,
    onShiftChange,
    onSave,
    currentValue,
    currentValueStyle,
    previewStyle,
    shiftDescription,
    readonlyCols,
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Schedule</DialogTitle>
                    <DialogDescription>
                        Assign a shift code for{" "}
                        <span className="font-medium text-foreground">
                            {headerName}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Shift Code</Label>
                        <Combobox
                            options={shiftOptions}
                            value={selectedShift}
                            onChange={onShiftChange}
                            placeholder="Search or select shift code…"
                            modal={true}
                        />
                        <p className="text-xs text-muted-foreground">
                            First {readonlyCols} columns are read-only.
                        </p>
                    </div>

                    {selectedShift && (
                        <div className="space-y-2">
                            <Label>Preview</Label>
                            <div
                                className="rounded border p-3 text-center font-mono font-semibold text-sm"
                                style={previewStyle}
                            >
                                {selectedShift}
                                <span className="ml-2 text-xs font-normal opacity-80">
                                    {shiftDescription}
                                </span>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400">
                                ✓ Valid shift code
                            </p>
                        </div>
                    )}

                    <div className="border-t pt-3 text-xs text-muted-foreground flex items-center gap-2">
                        Current value:
                        {currentValue ? (
                            <Badge
                                variant="outline"
                                className="font-mono"
                                style={currentValueStyle}
                            >
                                {currentValue}
                            </Badge>
                        ) : (
                            <span className="italic">(empty)</span>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onSave} disabled={!selectedShift}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
