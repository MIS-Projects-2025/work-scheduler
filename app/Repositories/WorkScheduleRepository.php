<?php

namespace App\Repositories;

use App\Models\PayrollCutoffSchedule;
use App\Models\ShiftCode;
use App\Models\WorkSchedule;
use Illuminate\Support\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class WorkScheduleRepository
{
    // -------------------------------------------------------------------------
    // Cutoff
    // -------------------------------------------------------------------------

    public function getRecentCutoffs(int $limit = 24): array
    {
        return PayrollCutoffSchedule::orderBy('payroll_date_start', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    public function findCutoff(int $cutoffId): ?PayrollCutoffSchedule
    {
        return PayrollCutoffSchedule::find($cutoffId);
    }

    // -------------------------------------------------------------------------
    // Shift codes
    // -------------------------------------------------------------------------

    public function getShiftCodesByGroup(string $group): array
    {
        return ShiftCode::where('shift_group', $group)
            ->where('shift_code_status', 1)
            ->orderBy('shiftcode')
            ->get()
            ->toArray();
    }

    public function getShiftCodesByGroups(array $groups): array
    {
        return ShiftCode::whereIn('shift_group', $groups)
            ->where('shift_code_status', 1)
            ->orderBy('shiftcode')
            ->get()
            ->toArray();
    }

    public function getAllActiveShiftCodes(): array
    {
        return ShiftCode::where('shift_code_status', 1)
            ->orderBy('shiftcode')
            ->get()
            ->toArray();
    }

    /**
     * Return shift codes filtered by the manager's production line.
     */
    public function getFilteredShiftCodes(?string $prodLine): array
    {
        try {
            if (!empty($prodLine)) {
                if (str_contains($prodLine, 'PL8')) {
                    return $this->getShiftCodesByGroup('AMS');
                }
                if (str_contains($prodLine, 'PL2')) {
                    return $this->getShiftCodesByGroup('PL2/DEFAULT');
                }
                return $this->getShiftCodesByGroups(['DEFAULT', 'PL2/DEFAULT']);
            }
            return $this->getAllActiveShiftCodes();
        } catch (\Exception) {
            return $this->getAllActiveShiftCodes();
        }
    }

    // -------------------------------------------------------------------------
    // Work schedules — listing (index page) with server-side pagination
    // -------------------------------------------------------------------------

    /**
     * Get paginated, grouped schedule rows (one row per cutoff+creator group).
     * Returns a Laravel LengthAwarePaginator instance.
     */
    public function getPaginatedGroups(
        string $empId,
        int    $status,
        int    $empPosition,
        string $search,
        string $orderBy,
        string $orderDir,
        int    $perPage,
        int    $page
    ): LengthAwarePaginator {
        $query = WorkSchedule::selectRaw('
            MIN(id)                     AS id,
            created_by,
            payroll_date_start,
            payroll_date_end,
            work_sched_status,
            COUNT(DISTINCT emp_id)      AS total_employees
        ')
            ->where(function ($q) use ($empId, $status, $empPosition) {
                $this->applyAccessScope($q, $empId, $status, $empPosition);
            })
            ->groupBy('created_by', 'payroll_date_start', 'payroll_date_end', 'work_sched_status');

        if ($search !== '') {
            $query->where('created_by', 'like', "%{$search}%");
        }

        $allowedOrderCols = ['created_by', 'payroll_date_start', 'work_sched_status'];
        $orderCol = in_array($orderBy, $allowedOrderCols) ? $orderBy : 'payroll_date_start';
        $dir = strtolower($orderDir) === 'asc' ? 'asc' : 'desc';

        $query->orderBy($orderCol, $dir);

        // Use Laravel's built-in paginate method
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Count distinct groups for a specific status (used for XHR responses if needed)
     */
    public function countGroups(string $empId, int $status, int $empPosition, string $search = ''): int
    {
        $q = WorkSchedule::selectRaw('COUNT(DISTINCT created_by, payroll_date_start, payroll_date_end) AS cnt')
            ->where(function ($q) use ($empId, $status, $empPosition) {
                $this->applyAccessScope($q, $empId, $status, $empPosition);
            });

        if ($search !== '') {
            $q->where('created_by', 'like', "%{$search}%");
        }

        return (int) $q->value('cnt');
    }

    /**
     * Count all statuses for the tab badges
     */
    public function countAllStatuses(string $empId, int $empPosition): array
    {
        $statuses = [
            'forApproval' => 1,
            'forAck'      => 2,
            'doneAck'     => 3,
            'disapproved' => 4,
        ];

        $counts = [];
        foreach ($statuses as $label => $statusValue) {
            $counts[$label] = WorkSchedule::selectRaw(
                'COUNT(DISTINCT created_by, payroll_date_start, payroll_date_end) AS cnt'
            )
                ->where(function ($q) use ($empId, $statusValue, $empPosition) {
                    $this->applyAccessScope($q, $empId, $statusValue, $empPosition);
                })
                ->value('cnt') ?? 0;
        }

        return $counts;
    }

    // -------------------------------------------------------------------------
    // Work schedules — detail (view page)
    // -------------------------------------------------------------------------

    /**
     * Fetch all schedule rows for a specific cutoff + creator combination,
     * eager-loading shift code data for each day.
     */
    public function getSchedulesByGroup(
        string $createdBy,
        string $dateStart,
        string $dateEnd
    ): Collection {
        return WorkSchedule::where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('created_by', $createdBy)
            ->with(['days.shiftCode'])
            ->orderBy('emp_id')
            ->get();
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Apply the same access-scoping logic.
     * Modifies the query builder in place.
     */
    private function applyAccessScope($query, string $empId, int $status, int $empPosition): void
    {
        // Status 2 (To Acknowledge) for regular employees only shows their own rows
        if ($status === 2 && $empPosition === 1) {
            $query->where('emp_id', $empId)
                ->where('work_sched_status', 2);
            return;
        }

        $query->where(function ($q) use ($empId) {
            $q->where('emp_id', $empId)
                ->orWhere('created_by', $empId)
                ->orWhere('approver2_id', $empId);
        })->where('work_sched_status', $status);
    }
    public function getSchedulesByGroupQuery(
        string $createdBy,
        string $dateStart,
        string $dateEnd,
        int $status,
        string $viewerEmpId
    ): \Illuminate\Database\Eloquent\Builder {
        $query = WorkSchedule::where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('created_by', $createdBy)
            ->where('work_sched_status', $status)
            ->with(['days.shiftCode'])
            ->orderBy('emp_id');

        $isCreator  = $viewerEmpId === $createdBy;
        $isApprover = WorkSchedule::where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('created_by', $createdBy)
            ->where('approver2_id', $viewerEmpId)
            ->exists();

        if ($isCreator || $isApprover) {
            // See all records in this group
            return $query;
        }

        // Regular employee — only their own record
        return $query->where('emp_id', $viewerEmpId);
    }
    public function updateAcknowledge($empId, $createdBy, $dateStart, $dateEnd)
    {
        return WorkSchedule::where('emp_id', $empId)
            ->where('created_by', $createdBy)
            ->where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('work_sched_status', 2)
            ->update([
                'work_sched_status' => 3
            ]);
    }
    public function bulkUpdateStatus(
        $approverId,
        $createdBy,
        $dateStart,
        $dateEnd,
        $status,
        $empIds = [],
        $remarks = null
    ) {
        $query = WorkSchedule::where('created_by', $createdBy)
            ->where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('approver2_id', $approverId)
            ->where('work_sched_status', WorkSchedule::STATUS_PENDING_APPROVAL);

        if (!empty($empIds)) {
            $query->whereIn('emp_id', $empIds);
        }

        return $query->update([
            'work_sched_status' => $status,
            'remarks'           => $remarks,
        ]);
    }
}
