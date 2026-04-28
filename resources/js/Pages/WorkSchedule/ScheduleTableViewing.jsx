import { useRef, useMemo } from "react";
import {
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCellEdit } from "./hooks/useCellEdit";
import CellEditDialog from "./components/CellEditDialog";

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
    selectable = false,
    selectedRows = new Set(),
    onRowSelect = null,
    onSelectAll = null,
}) {
    const readonlyCols = nonEditableColumns ?? frozenColumns ?? 6;
    const tableContainerRef = useRef(null);

    const hasSubHeaders = subHeaders && subHeaders.length > 0;
    const allSelected = data.length > 0 && selectedRows.size === data.length;
    const someSelected = selectedRows.size > 0 && !allSelected;

    // ── Cell editing ──────────────────────────────────────────────────────────
    const {
        editingCell,
        selectedShift,
        setSelectedShift,
        editedCount,
        getCellStyle,
        isCellEdited,
        getHeaderName,
        previewStyle,
        openEditDialog,
        closeEditDialog,
        saveEdit,
    } = useCellEdit({
        editable,
        readonlyCols,
        headers,
        shiftMap,
        externalEditedCells: editedCells,
        onCellChange,
    });

    // ── Column widths (memoised — O(cols × rows), not O(cols² × rows)) ───────
    const columnWidths = useMemo(() => {
        const colCount = headers.length || (data[0]?.length ?? 0);
        return Array.from({ length: colCount }, (_, i) => {
            let maxLen = 0;
            if (typeof headers[i] === "string")
                maxLen = Math.max(maxLen, headers[i].length);
            if (hasSubHeaders && typeof subHeaders[i] === "string")
                maxLen = Math.max(maxLen, subHeaders[i].length);
            data.forEach((row) => {
                if (row[i] != null)
                    maxLen = Math.max(maxLen, String(row[i]).length);
            });
            return Math.min(Math.max(maxLen * 8, 80), 250);
        });
    }, [headers, subHeaders, data, hasSubHeaders]);

    const getColumnWidth = (i) => columnWidths[i] ?? 80;

    const getStickyLeft = (i) => {
        let left = selectable ? 40 : 0;
        for (let j = 0; j < i; j++) left += columnWidths[j] ?? 80;
        return left;
    };

    const getShiftDesc = (cell) => shiftMap[cell]?.desc || "";

    // ── Cell content renderer ─────────────────────────────────────────────────
    // TooltipProvider is at the component root — not recreated per-cell.
    const renderCell = (cell, isShiftCode, edited) => {
        const content =
            !isShiftCode || !cell ? (
                cell
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="cursor-help block">{cell}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                            <span className="font-semibold">{cell}</span>
                            {getShiftDesc(cell) && (
                                <>
                                    <br />
                                    {getShiftDesc(cell)}
                                </>
                            )}
                        </p>
                    </TooltipContent>
                </Tooltip>
            );

        return (
            <div className="relative">
                {content}
                {edited && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <TooltipProvider>
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

            {/* Outer div controls scroll/overflow; plain <table> keeps tableLayout */}
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
                        <TableHeader>
                            {/* Main header row */}
                            <TableRow className="hover:bg-transparent border-0">
                                {selectable && (
                                    <TableHead
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
                                    </TableHead>
                                )}
                                {headers.map((header, idx) => {
                                    const sticky = idx < stickyColumns;
                                    const w = getColumnWidth(idx);
                                    return (
                                        <TableHead
                                            key={`h-${idx}`}
                                            className="whitespace-nowrap font-semibold text-left px-4 py-3 text-muted-foreground bg-muted border-b border-border"
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                ...(sticky
                                                    ? {
                                                          left: getStickyLeft(
                                                              idx,
                                                          ),
                                                      }
                                                    : {}),
                                                width: w,
                                                minWidth: w,
                                                maxWidth: w,
                                                zIndex: sticky ? 50 : 20,
                                                boxShadow: sticky
                                                    ? "2px 0 4px -2px hsl(var(--border)), 0 2px 0 0 hsl(var(--border))"
                                                    : "0 2px 0 0 hsl(var(--border))",
                                            }}
                                        >
                                            {header}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>

                            {/* Sub-header row (dates, etc.) */}
                            {hasSubHeaders && (
                                <TableRow className="hover:bg-transparent border-0">
                                    {selectable && (
                                        <TableHead
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
                                    {subHeaders.map((sub, idx) => {
                                        const sticky = idx < stickyColumns;
                                        const w = getColumnWidth(idx);
                                        return (
                                            <TableHead
                                                key={`sh-${idx}`}
                                                className="whitespace-nowrap font-medium text-center px-4 py-1 text-xs text-muted-foreground bg-muted/80 border-b border-border"
                                                style={{
                                                    position: "sticky",
                                                    top: 45,
                                                    ...(sticky
                                                        ? {
                                                              left: getStickyLeft(
                                                                  idx,
                                                              ),
                                                          }
                                                        : {}),
                                                    width: w,
                                                    minWidth: w,
                                                    maxWidth: w,
                                                    zIndex: sticky ? 49 : 19,
                                                    boxShadow:
                                                        sticky &&
                                                        idx ===
                                                            stickyColumns - 1
                                                            ? "2px 0 4px -2px hsl(var(--border))"
                                                            : undefined,
                                                }}
                                            >
                                                {sub}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            )}
                        </TableHeader>
                    )}

                    <TableBody>
                        {data.map((row, rowIdx) => {
                            const isSelected = selectedRows.has(rowIdx);
                            return (
                                <TableRow
                                    key={`row-${rowIdx}`}
                                    className={cn(
                                        "border-b border-border last:border-0 hover:bg-muted/40",
                                        isSelected && "bg-primary/5",
                                    )}
                                >
                                    {/* Checkbox cell */}
                                    {selectable && (
                                        <TableCell
                                            className="px-2 py-2 text-center"
                                            style={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 10,
                                                width: 40,
                                                minWidth: 40,
                                                backgroundColor: isSelected
                                                    ? "hsl(var(--primary) / 0.05)"
                                                    : "hsl(var(--background))",
                                            }}
                                            onClick={(e) =>
                                                e.stopPropagation()
                                            }
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
                                        </TableCell>
                                    )}

                                    {/* Data cells */}
                                    {row.map((cell, colIdx) => {
                                        const sticky = colIdx < stickyColumns;
                                        const readonly =
                                            colIdx < readonlyCols;
                                        const isShiftCode =
                                            colIdx >= readonlyCols &&
                                            cell &&
                                            shiftMap[cell];
                                        const style = getCellStyle(cell);
                                        const hasStyle =
                                            style.backgroundColor !== null;
                                        const w = getColumnWidth(colIdx);
                                        const edited = isCellEdited(
                                            rowIdx,
                                            colIdx,
                                        );

                                        return (
                                            <TableCell
                                                key={`c-${rowIdx}-${colIdx}`}
                                                className={cn(
                                                    "whitespace-nowrap px-4 py-2 relative",
                                                    editable &&
                                                        !readonly &&
                                                        "cursor-pointer hover:outline hover:outline-2 hover:outline-ring hover:outline-offset-[-2px]",
                                                    isShiftCode &&
                                                        "cursor-help",
                                                    edited &&
                                                        "bg-yellow-50 dark:bg-yellow-950/20",
                                                )}
                                                style={{
                                                    ...(hasStyle && !sticky
                                                        ? {
                                                              backgroundColor:
                                                                  style.backgroundColor,
                                                              color: style.color,
                                                              fontWeight:
                                                                  style.fontWeight,
                                                          }
                                                        : {}),
                                                    ...(sticky
                                                        ? {
                                                              position:
                                                                  "sticky",
                                                              left: getStickyLeft(
                                                                  colIdx,
                                                              ),
                                                              zIndex: 10,
                                                              backgroundColor:
                                                                  edited
                                                                      ? "rgba(234,179,8,0.1)"
                                                                      : "hsl(var(--background))",
                                                              boxShadow:
                                                                  "2px 0 4px -2px hsl(var(--border))",
                                                          }
                                                        : {
                                                              position:
                                                                  "relative",
                                                              zIndex: 1,
                                                          }),
                                                    width: w,
                                                    minWidth: w,
                                                    maxWidth: w,
                                                }}
                                                onClick={() =>
                                                    onCellClick?.(
                                                        rowIdx,
                                                        colIdx,
                                                        cell,
                                                    )
                                                }
                                                onDoubleClick={() =>
                                                    openEditDialog(
                                                        rowIdx,
                                                        colIdx,
                                                        cell,
                                                    )
                                                }
                                                title={
                                                    readonly
                                                        ? "Read-only column"
                                                        : editable
                                                          ? "Double-click to edit"
                                                          : isShiftCode
                                                            ? getShiftDesc(
                                                                  cell,
                                                              )
                                                            : undefined
                                                }
                                            >
                                                {renderCell(
                                                    cell,
                                                    isShiftCode,
                                                    edited,
                                                )}
                                                {edited && !sticky && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </table>
            </div>

            {/* Cell edit dialog — extracted from this component */}
            <CellEditDialog
                open={editingCell.open}
                onClose={closeEditDialog}
                headerName={getHeaderName()}
                shiftOptions={shiftOptions}
                selectedShift={selectedShift}
                onShiftChange={setSelectedShift}
                onSave={saveEdit}
                currentValue={editingCell.currentValue}
                currentValueStyle={getCellStyle(editingCell.currentValue)}
                previewStyle={previewStyle}
                shiftDescription={shiftMap[selectedShift]?.desc || ""}
                readonlyCols={readonlyCols}
            />
        </TooltipProvider>
    );
}
