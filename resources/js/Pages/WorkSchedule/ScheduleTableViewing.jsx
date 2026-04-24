import { useRef, useState } from "react";
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
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
// NOTE: We intentionally use plain <table> elements here instead of shadcn's
// <Table> component. shadcn/Table renders an extra `overflow-auto` wrapper div
// which creates a nested scroll context and breaks `position: sticky` on both
// the thead (vertical) and frozen columns (horizontal) simultaneously.
import { cn } from "@/lib/utils";

export default function ScheduleTableViewing({
    data = [],
    headers = [],
    frozenColumns = 6, // alias kept for callers that use frozenColumns
    nonEditableColumns, // preferred name; falls back to frozenColumns
    stickyColumns = 2,
    shiftMap = {},
    shiftOptions = [],
    maxHeight = "60vh",
    showHeader = true,
    className = "",
    onCellClick = null,
    editable = false,
    onCellChange = null,
}) {
    // Support both prop names
    const readonlyCols = nonEditableColumns ?? frozenColumns ?? 6;

    const tableContainerRef = useRef(null);
    const [editingCell, setEditingCell] = useState({
        open: false,
        rowIndex: null,
        colIndex: null,
        currentValue: "",
        originalValue: "",
    });
    const [selectedShift, setSelectedShift] = useState("");

    const getColumnWidth = (columnIndex) => {
        let maxLength = 0;
        if (headers[columnIndex] && typeof headers[columnIndex] === "string") {
            maxLength = Math.max(maxLength, headers[columnIndex].length);
        }
        data.forEach((row) => {
            const cell = row[columnIndex];
            if (cell != null) {
                maxLength = Math.max(maxLength, String(cell).length);
            }
        });
        return Math.min(Math.max(maxLength * 8, 80), 250);
    };

    const getStickyLeftPosition = (columnIndex) => {
        let left = 0;
        for (let i = 0; i < columnIndex; i++) left += getColumnWidth(i);
        return left;
    };

    const getCellStyle = (cell) => {
        const style = shiftMap[cell];
        return {
            backgroundColor: style?.bg ?? null,
            color: style?.color ?? null,
            fontWeight: style ? "600" : "normal",
        };
    };

    const handleCellClick = (rowIndex, colIndex, value) => {
        onCellClick?.(rowIndex, colIndex, value);
    };

    const handleCellDoubleClick = (rowIndex, colIndex, value) => {
        if (!editable || colIndex < readonlyCols) return;
        setEditingCell({
            open: true,
            rowIndex,
            colIndex,
            currentValue: value || "",
            originalValue: value || "",
        });
        setSelectedShift(value || "");
    };

    const handleSaveEdit = () => {
        if (onCellChange && editable && selectedShift !== undefined) {
            onCellChange(
                editingCell.rowIndex,
                editingCell.colIndex,
                selectedShift,
            );
        }
        closeDialog();
    };

    const closeDialog = () => {
        setEditingCell({
            open: false,
            rowIndex: null,
            colIndex: null,
            currentValue: "",
            originalValue: "",
        });
        setSelectedShift("");
    };

    const getHeaderName = () =>
        editingCell.colIndex !== null && headers[editingCell.colIndex]
            ? headers[editingCell.colIndex]
            : "Cell";

    const previewStyle = getCellStyle(selectedShift);

    const getSelectedShiftLabel = () =>
        shiftOptions.find((s) => s.value === selectedShift)?.label ??
        selectedShift;

    return (
        <>
            {/*
             * Single scroll container — overflow:auto on both axes.
             * We use a plain <table> (not shadcn <Table>) because shadcn wraps
             * it in an extra overflow-auto <div>, which creates a nested scroll
             * context. Once a scroll context is nested, the browser refuses to
             * let a child cell be sticky relative to the *outer* viewport, so
             * both `top:0` (vertical freeze) and `left:Xpx` (horizontal freeze)
             * stop working at the same time.
             *
             * z-index layers:
             *   50 — corner <th>  (sticky top AND sticky left — must win over both axes)
             *   20 — non-corner <th>  (sticky top only, scrolls with horizontal)
             *   10 — frozen body <td>  (sticky left only, scrolls with vertical)
             *    1 — normal body <td>
             */}
            <div
                ref={tableContainerRef}
                className={cn("rounded-md border overflow-auto", className)}
                style={{ maxHeight }}
            >
                <table
                    className="min-w-max border-collapse text-sm"
                    style={{ tableLayout: "fixed" }}
                >
                    {showHeader && headers.length > 0 && (
                        <thead>
                            <tr>
                                {headers.map((header, idx) => {
                                    const isColSticky = idx < stickyColumns;
                                    const width = getColumnWidth(idx);
                                    const left = isColSticky
                                        ? getStickyLeftPosition(idx)
                                        : undefined;

                                    return (
                                        <th
                                            key={`header-${idx}`}
                                            className="whitespace-nowrap font-semibold text-left px-4 py-3 text-muted-foreground bg-muted border-b border-border"
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                ...(isColSticky
                                                    ? { left }
                                                    : {}),
                                                width,
                                                minWidth: width,
                                                maxWidth: width,
                                                zIndex: isColSticky ? 50 : 20,
                                                boxShadow: isColSticky
                                                    ? "2px 0 4px -2px hsl(var(--border)), 0 2px 0 0 hsl(var(--border))"
                                                    : "0 2px 0 0 hsl(var(--border))",
                                            }}
                                        >
                                            {header}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {data.map((row, rowIdx) => (
                            <tr
                                key={`row-${rowIdx}`}
                                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                            >
                                {row.map((cell, colIdx) => {
                                    const isColSticky = colIdx < stickyColumns;
                                    const isReadonly = colIdx < readonlyCols;
                                    const cellStyle = getCellStyle(cell);
                                    const hasStyle =
                                        cellStyle.backgroundColor !== null;
                                    const width = getColumnWidth(colIdx);
                                    const left = isColSticky
                                        ? getStickyLeftPosition(colIdx)
                                        : undefined;

                                    return (
                                        <td
                                            key={`cell-${rowIdx}-${colIdx}`}
                                            className={cn(
                                                "whitespace-nowrap px-4 py-2",
                                                editable &&
                                                    !isReadonly &&
                                                    "cursor-pointer hover:outline hover:outline-2 hover:outline-ring hover:outline-offset-[-2px]",
                                            )}
                                            style={{
                                                // Shift colours only on non-frozen body cells
                                                ...(hasStyle && !isColSticky
                                                    ? {
                                                          backgroundColor:
                                                              cellStyle.backgroundColor,
                                                          color: cellStyle.color,
                                                          fontWeight:
                                                              cellStyle.fontWeight,
                                                      }
                                                    : {}),
                                                // Frozen column body cells
                                                ...(isColSticky
                                                    ? {
                                                          position: "sticky",
                                                          left,
                                                          zIndex: 10,
                                                          backgroundColor:
                                                              "hsl(var(--background))",
                                                          boxShadow:
                                                              "2px 0 4px -2px hsl(var(--border))",
                                                      }
                                                    : {
                                                          position: "relative",
                                                          zIndex: 1,
                                                      }),
                                                width,
                                                minWidth: width,
                                                maxWidth: width,
                                            }}
                                            onClick={() =>
                                                handleCellClick(
                                                    rowIdx,
                                                    colIdx,
                                                    cell,
                                                )
                                            }
                                            onDoubleClick={() =>
                                                handleCellDoubleClick(
                                                    rowIdx,
                                                    colIdx,
                                                    cell,
                                                )
                                            }
                                            title={
                                                isReadonly
                                                    ? "Read-only column"
                                                    : editable
                                                      ? "Double-click to edit"
                                                      : undefined
                                            }
                                        >
                                            {cell}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editingCell.open} onOpenChange={closeDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Schedule</DialogTitle>
                        <DialogDescription>
                            Assign a shift code for{" "}
                            <span className="font-medium text-foreground">
                                {getHeaderName()}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Shift Code</Label>
                            <Combobox
                                options={shiftOptions}
                                value={selectedShift}
                                onChange={setSelectedShift}
                                placeholder="Search or select shift code…"
                                emptyMessage="No shift codes found."
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
                                        {getSelectedShiftLabel()}
                                    </span>
                                </div>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    ✓ Valid shift code
                                </p>
                            </div>
                        )}

                        <div className="border-t pt-3 text-xs text-muted-foreground flex items-center gap-2">
                            Current value:
                            {editingCell.currentValue ? (
                                <Badge
                                    variant="outline"
                                    className="font-mono"
                                    style={getCellStyle(
                                        editingCell.currentValue,
                                    )}
                                >
                                    {editingCell.currentValue}
                                </Badge>
                            ) : (
                                <span className="italic">(empty)</span>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={closeDialog}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={!selectedShift}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
