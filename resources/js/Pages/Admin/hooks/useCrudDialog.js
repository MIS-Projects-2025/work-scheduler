import { useState } from "react";
import { toast } from "sonner";

/**
 * useCrudDialog
 *
 * Manages open/close state, form values, form errors, saving/deleting flags,
 * and wires up save + delete calls for a standard CRUD dialog + confirm flow.
 *
 * @param {object} options
 * @param {object}   options.emptyForm      - Shape of a blank form (used on "Add").
 * @param {Function} options.buildForm      - (record) => form object used when editing.
 * @param {Function} options.validate       - (form) => errors object.  Return {} if valid.
 * @param {Function} options.onCreate       - async (form) => void   — called on save new.
 * @param {Function} options.onUpdate       - async (editTarget, form) => void — called on save edit.
 * @param {Function} options.onDelete       - async (deleteTarget) => void — called on confirm delete.
 * @param {Function} [options.afterSave]    - () => void  — called after successful save.
 * @param {Function} [options.afterDelete]  - () => void  — called after successful delete.
 *
 * @returns {object}
 */
export function useCrudDialog({
    emptyForm,
    buildForm,
    validate,
    onCreate,
    onUpdate,
    onDelete,
    afterSave,
    afterDelete,
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ── Open helpers ─────────────────────────────────────────────────────────

    function openCreate() {
        setEditTarget(null);
        setForm(emptyForm);
        setFormErrors({});
        setDialogOpen(true);
    }

    function openEdit(record) {
        setEditTarget(record);
        setForm(buildForm(record));
        setFormErrors({});
        setDialogOpen(true);
    }

    // ── Save ─────────────────────────────────────────────────────────────────

    async function handleSave() {
        const errors = validate(form);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSaving(true);
        try {
            if (editTarget) {
                await onUpdate(editTarget, form);
            } else {
                await onCreate(form);
            }
            setDialogOpen(false);
            afterSave?.();
        } catch (e) {
            toast.error(
                e.response?.data?.message ?? e.message ?? "Save failed.",
            );
            if (e.response?.data?.errors) setFormErrors(e.response.data.errors);
        } finally {
            setSaving(false);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await onDelete(deleteTarget);
            setDeleteTarget(null);
            afterDelete?.();
        } catch (e) {
            toast.error(
                e.response?.data?.message ?? e.message ?? "Delete failed.",
            );
        } finally {
            setDeleting(false);
        }
    }

    return {
        // Dialog
        dialogOpen,
        setDialogOpen,
        editTarget,
        form,
        setForm,
        formErrors,
        setFormErrors,
        saving,
        openCreate,
        openEdit,
        handleSave,
        // Delete confirm
        deleteTarget,
        setDeleteTarget,
        deleting,
        handleDelete,
    };
}
