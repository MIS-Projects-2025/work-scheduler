import { useRef, useState, useEffect } from "react";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function ScheduleTableViewing({
    data = [],
    headers = [],
    subHeaders = [],
    frozenColumns = 6,
    nonEditableColumns,
    stickyColumns = 2,
    shiftMap = {},
    shiftOptions = [],
    maxHeight = "60vh",
    showHeader = true,
    className = "",
    onCellClick = null,
    editable = false,
    onCellChange = null,
    editedCells = new Set(),
    // ── NEW ──
    selectable = false,
    selectedRows = new Set(),
    onRowSelect = null,
    onSelectAll = null,
}) {
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
    const [localEditedCells, setLocalEditedCells] = useState(editedCells);

    const hasSubHeaders = subHeaders && subHeaders.length > 0;
    const editedCount = localEditedCells.size;
    const allSelected = data.length > 0 && selectedRows.size === data.length;
    const someSelected = selectedRows.size > 0 && !allSelected;

    const getColumnWidth = (columnIndex) => {
        let maxLength = 0;
        if (headers[columnIndex] && typeof headers[columnIndex] === "string") {
            maxLength = Math.max(maxLength, headers[columnIndex].length);
        }
        if (
            hasSubHeaders &&
            subHeaders[columnIndex] &&
            typeof subHeaders[columnIndex] === "string"
        ) {
            maxLength = Math.max(maxLength, subHeaders[columnIndex].length);
        }
        data.forEach((row) => {
            const cell = row[columnIndex];
            if (cell != null)
                maxLength = Math.max(maxLength, String(cell).length);
        });
        return Math.min(Math.max(maxLength * 8, 80), 250);
    };

    const getStickyLeftPosition = (columnIndex) => {
        let left = selectable ? 40 : 0; // offset for checkbox column
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

    const getShiftDescription = (cell) => shiftMap[cell]?.desc || "";

    const isCellEdited = (rowIndex, colIndex) =>
        localEditedCells.has(`${rowIndex}-${colIndex}`);

    const handleCellClick = (rowIndex, colIndex, value) =>
        onCellClick?.(rowIndex, colIndex, value);

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
            const cellKey = `${editingCell.rowIndex}-${editingCell.colIndex}`;
            setLocalEditedCells((prev) => new Set([...prev, cellKey]));
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

    const renderCellContent = (cell, isShiftCode, isEdited) => {
        const content =
            !isShiftCode || !cell ? (
                cell
            ) : (
                <TooltipProvider key={`tooltip-${cell}`}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help block">{cell}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">
                                <span className="font-semibold">{cell}</span>
                                {getShiftDescription(cell) && (
                                    <>
                                        <br />
                                        {getShiftDescription(cell)}
                                    </>
                                )}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        return (
            <div className="relative">
                {content}
                {isEdited && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
            </div>
        );
    };

    return (
        <>
            {editable && editedCount > 0 && (
                <div className="mb-3 flex justify-end">
                    <Badge variant="warning" className="gap-1">
                        <span className="text-xs">{editedCount}</span>
                        <span className="text-xs">
                            cell{editedCount !== 1 ? "s" : ""} edited
                        </span>
                    </Badge>
                </div>
            )}

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
                                {/* Checkbox header */}
                                {selectable && (
                                    <th
                                        className="bg-muted border-b border-border px-2 py-3 text-center"
                                        style={{
                                            position: "sticky",
                                            top: 0,
                                            left: 0,
                                            width: 40,
                                            minWidth: 40,
                                            zIndex: 51,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={(el) => {
                                                if (el)
                                                    el.indeterminate =
                                                        someSelected;
                                            }}
                                            onChange={(e) =>
                                                onSelectAll?.(e.target.checked)
                                            }
                                            className="rounded border-border"
                                        />
                                    </th>
                                )}
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

                            {hasSubHeaders && (
                                <tr>
                                    {selectable && (
                                        <th
                                            className="bg-muted/80 border-b border-border"
                                            style={{
                                                position: "sticky",
                                                top: 45,
                                                left: 0,
                                                width: 40,
                                                minWidth: 40,
                                                zIndex: 51,
                                            }}
                                        />
                                    )}
                                    {subHeaders.map((subHeader, idx) => {
                                        const isColSticky = idx < stickyColumns;
                                        const width = getColumnWidth(idx);
                                        const left = isColSticky
                                            ? getStickyLeftPosition(idx)
                                            : undefined;
                                        return (
                                            <th
                                                key={`subheader-${idx}`}
                                                className="whitespace-nowrap font-medium text-center px-4 py-1 text-xs text-muted-foreground bg-muted/80 border-b border-border"
                                                style={{
                                                    position: "sticky",
                                                    top: 45,
                                                    ...(isColSticky
                                                        ? { left }
                                                        : {}),
                                                    width,
                                                    minWidth: width,
                                                    maxWidth: width,
                                                    zIndex: isColSticky
                                                        ? 49
                                                        : 19,
                                                    boxShadow:
                                                        isColSticky &&
                                                        idx ===
                                                            stickyColumns - 1
                                                            ? "2px 0 4px -2px hsl(var(--border))"
                                                            : undefined,
                                                }}
                                            >
                                                {subHeader}
                                            </th>
                                        );
                                    })}
                                </tr>
                            )}
                        </thead>
                    )}
                    <tbody>
                        {data.map((row, rowIdx) => {
                            const isSelected = selectedRows.has(rowIdx);
                            return (
                                <tr
                                    key={`row-${rowIdx}`}
                                    className={cn(
                                        "border-b border-border last:border-0 hover:bg-muted/40 transition-colors",
                                        isSelected && "bg-primary/5",
                                    )}
                                >
                                    {selectable && (
                                        <td
                                            className="px-2 py-2 text-center"
                                            style={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 10,
                                                backgroundColor: isSelected
                                                    ? "hsl(var(--primary) / 0.05)"
                                                    : "hsl(var(--background))",
                                                width: 40,
                                                minWidth: 40,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) =>
                                                    onRowSelect?.(
                                                        rowIdx,
                                                        e.target.checked,
                                                    )
                                                }
                                                className="rounded border-border"
                                            />
                                        </td>
                                    )}
                                    {row.map((cell, colIdx) => {
                                        const isColSticky =
                                            colIdx < stickyColumns;
                                        const isReadonly =
                                            colIdx < readonlyCols;
                                        const isShiftCode =
                                            colIdx >= readonlyCols &&
                                            cell &&
                                            shiftMap[cell];
                                        const cellStyle = getCellStyle(cell);
                                        const hasStyle =
                                            cellStyle.backgroundColor !== null;
                                        const width = getColumnWidth(colIdx);
                                        const left = isColSticky
                                            ? getStickyLeftPosition(colIdx)
                                            : undefined;
                                        const edited = isCellEdited(
                                            rowIdx,
                                            colIdx,
                                        );

                                        return (
                                            <td
                                                key={`cell-${rowIdx}-${colIdx}`}
                                                className={cn(
                                                    "whitespace-nowrap px-4 py-2 relative",
                                                    editable &&
                                                        !isReadonly &&
                                                        "cursor-pointer hover:outline hover:outline-2 hover:outline-ring hover:outline-offset-[-2px]",
                                                    isShiftCode &&
                                                        "cursor-help",
                                                    edited &&
                                                        "bg-yellow-50 dark:bg-yellow-950/20",
                                                )}
                                                style={{
                                                    ...(hasStyle && !isColSticky
                                                        ? {
                                                              backgroundColor:
                                                                  cellStyle.backgroundColor,
                                                              color: cellStyle.color,
                                                              fontWeight:
                                                                  cellStyle.fontWeight,
                                                          }
                                                        : {}),
                                                    ...(isColSticky
                                                        ? {
                                                              position:
                                                                  "sticky",
                                                              left,
                                                              zIndex: 10,
                                                              backgroundColor:
                                                                  edited
                                                                      ? "rgba(234, 179, 8, 0.1)"
                                                                      : "hsl(var(--background))",
                                                              boxShadow:
                                                                  "2px 0 4px -2px hsl(var(--border))",
                                                          }
                                                        : {
                                                              position:
                                                                  "relative",
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
                                                          : isShiftCode
                                                            ? getShiftDescription(
                                                                  cell,
                                                              )
                                                            : undefined
                                                }
                                            >
                                                {renderCellContent(
                                                    cell,
                                                    isShiftCode,
                                                    edited,
                                                )}
                                                {edited && !isColSticky && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
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
