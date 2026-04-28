import { useState } from "react";

/**
 * Manages cell editing state for ScheduleTableViewing.
 *
 * @param {object}   opts
 * @param {boolean}  opts.editable
 * @param {number}   opts.readonlyCols      — columns that cannot be edited
 * @param {string[]} opts.headers           — column header labels
 * @param {object}   opts.shiftMap          — { [shiftcode]: { bg, color, desc } }
 * @param {Set}      opts.externalEditedCells — initially-edited cells from parent (Template)
 * @param {function} opts.onCellChange      — (rowIndex, colIndex, value) => void
 */
export function useCellEdit({
    editable,
    readonlyCols,
    headers,
    shiftMap,
    externalEditedCells = new Set(),
    onCellChange,
}) {
    const [editingCell, setEditingCell] = useState({
        open: false,
        rowIndex: null,
        colIndex: null,
        currentValue: "",
        originalValue: "",
    });
    const [selectedShift, setSelectedShift] = useState("");
    const [localEditedCells, setLocalEditedCells] = useState(externalEditedCells);
    // Stores edited values so cells display the new value without a server round-trip
    const [cellEdits, setCellEdits] = useState({});

    const editedCount = localEditedCells.size;

    const getCellStyle = (cell) => {
        const style = shiftMap[cell];
        return {
            backgroundColor: style?.bg ?? null,
            color: style?.color ?? null,
            fontWeight: style ? "600" : "normal",
        };
    };

    const isCellEdited = (rowIndex, colIndex) =>
        localEditedCells.has(`${rowIndex}-${colIndex}`);

    const openEditDialog = (rowIndex, colIndex, value) => {
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

    const closeEditDialog = () => {
        setEditingCell({
            open: false,
            rowIndex: null,
            colIndex: null,
            currentValue: "",
            originalValue: "",
        });
        setSelectedShift("");
    };

    const saveEdit = () => {
        if (!editable) { closeEditDialog(); return; }

        const cellKey = `${editingCell.rowIndex}-${editingCell.colIndex}`;

        // Always track the edit and update the displayed value locally
        setLocalEditedCells((prev) => new Set([...prev, cellKey]));
        setCellEdits((prev) => ({ ...prev, [cellKey]: selectedShift }));

        // Notify parent if a callback was provided (e.g. Template page)
        onCellChange?.(editingCell.rowIndex, editingCell.colIndex, selectedShift);

        closeEditDialog();
    };

    /** Returns the edited value for a cell if one exists, otherwise the original. */
    const getCellValue = (rowIdx, colIdx, original) => {
        const key = `${rowIdx}-${colIdx}`;
        return Object.prototype.hasOwnProperty.call(cellEdits, key)
            ? cellEdits[key]
            : original;
    };

    const getHeaderName = () =>
        editingCell.colIndex !== null && headers[editingCell.colIndex]
            ? headers[editingCell.colIndex]
            : "Cell";

    const previewStyle = getCellStyle(selectedShift);

    return {
        editingCell,
        selectedShift,
        setSelectedShift,
        editedCount,
        getCellStyle,
        getCellValue,
        isCellEdited,
        getHeaderName,
        previewStyle,
        openEditDialog,
        closeEditDialog,
        saveEdit,
    };
}
