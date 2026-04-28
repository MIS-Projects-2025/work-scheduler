<?php

namespace App\Repositories;

use App\Models\PayrollCutoffSchedule;
use App\Models\ShiftCode;
use App\Models\WorkSchedule;
use App\Models\WorkScheduleDay;
use Illuminate\Support\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class WorkScheduleRepository
{
    // -------------------------------------------------------------------------
    // Cutoff
    // -------------------------------------------------------------------------

    public function getRecentCutoffs(int $limit = 24): Collection
    {
        return PayrollCutoffSchedule::orderBy('payroll_date_start', 'desc')
            ->limit($limit)
            ->get();
    }

    public function findCutoff(int $cutoffId): ?PayrollCutoffSchedule
    {
        return PayrollCutoffSchedule::find($cutoffId);
    }

    // -------------------------------------------------------------------------
    // Shift codes
    // -------------------------------------------------------------------------

    public function getShiftCodesByGroup(string $group): Collection
    {
        return ShiftCode::where('shift_group', $group)
            ->where('shift_code_status', 1)
            ->orderBy('shiftcode')
            ->get();
    }

    public function getShiftCodesByGroups(array $groups): Collection
    {
        return ShiftCode::whereIn('shift_group', $groups)
            ->where('shift_code_status', 1)
            ->orderBy('shiftcode')
            ->get();
    }

    public function getAllActiveShiftCodes(): Collection
    {
        return ShiftCode::where('shift_code_status', 1)
            ->orderBy('shiftcode')
            ->get();
    }

    /**
     * Return shift codes filtered by the manager's production line.
     */
    public function getFilteredShiftCodes(?string $prodLine): Collection
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

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    // -------------------------------------------------------------------------
    // Work schedules — HR admin listing (no access-scope restriction)
    // -------------------------------------------------------------------------

    /**
     * All schedule groups for HR admins, grouped by cutoff period only.
     * Each row = one unique (payroll_date_start, payroll_date_end, work_sched_status).
     */
    public function getPaginatedGroupsForHr(
        int    $status,
        string $search,
        string $orderBy,
        string $orderDir,
        int    $perPage,
        int    $page
    ): LengthAwarePaginator {
        $query = WorkSchedule::selectRaw('
            MIN(id)                          AS id,
            payroll_date_start,
            payroll_date_end,
            work_sched_status,
            COUNT(DISTINCT emp_id)           AS total_employees,
            COUNT(DISTINCT created_by)       AS total_creators
        ')
            ->where('work_sched_status', $status)
            ->groupBy('payroll_date_start', 'payroll_date_end', 'work_sched_status');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('payroll_date_start', 'like', "%{$search}%")
                  ->orWhere('payroll_date_end', 'like', "%{$search}%");
            });
        }

        $allowedOrderCols = ['payroll_date_start', 'payroll_date_end', 'work_sched_status'];
        $orderCol = in_array($orderBy, $allowedOrderCols) ? $orderBy : 'payroll_date_start';
        $dir = strtolower($orderDir) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($orderCol, $dir)->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Tab counts for HR admin — distinct cutoff periods per status.
     */
    public function countAllStatusesForHr(): array
    {
        $row = WorkSchedule::selectRaw("
            COUNT(DISTINCT CASE WHEN work_sched_status = 1 THEN CONCAT(payroll_date_start,'|',payroll_date_end) END) AS forApproval,
            COUNT(DISTINCT CASE WHEN work_sched_status = 2 THEN CONCAT(payroll_date_start,'|',payroll_date_end) END) AS forAck,
            COUNT(DISTINCT CASE WHEN work_sched_status = 3 THEN CONCAT(payroll_date_start,'|',payroll_date_end) END) AS doneAck,
            COUNT(DISTINCT CASE WHEN work_sched_status = 4 THEN CONCAT(payroll_date_start,'|',payroll_date_end) END) AS disapproved
        ")->first();

        return [
            'forApproval' => (int) ($row->forApproval ?? 0),
            'forAck'      => (int) ($row->forAck      ?? 0),
            'doneAck'     => (int) ($row->doneAck     ?? 0),
            'disapproved' => (int) ($row->disapproved ?? 0),
        ];
    }

    /**
     * All schedules for a cutoff period, regardless of creator (HR admin view).
     */
    public function getSchedulesByGroupQueryForHr(
        string $dateStart,
        string $dateEnd,
        int    $status
    ): \Illuminate\Database\Eloquent\Builder {
        return WorkSchedule::where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('work_sched_status', $status)
            ->with(['days.shiftCode'])
            ->orderBy('emp_id');
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
            'forApproval' => WorkSchedule::STATUS_PENDING_APPROVAL,
            'forAck'      => WorkSchedule::STATUS_APPROVED,
            'doneAck'     => WorkSchedule::STATUS_ACKNOWLEDGED,
            'disapproved' => WorkSchedule::STATUS_DISAPPROVED,
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
    /**
     * Find schedule by employee and cutoff period
     */
    public function findScheduleByEmployeeAndCutoff(string $empId, string $dateStart, string $dateEnd): ?WorkSchedule
    {
        return WorkSchedule::where('emp_id', $empId)
            ->where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->first();
    }

    /**
     * Create a new work schedule with its days (using DB transaction)
     */
    public function createScheduleWithDays(array $scheduleData, array $daysData): WorkSchedule
    {
        return DB::transaction(function () use ($scheduleData, $daysData) {
            $schedule = WorkSchedule::create($scheduleData);

            // Add work_schedule_id to each day
            foreach ($daysData as &$day) {
                $day['work_schedule_id'] = $schedule->id;
            }

            WorkScheduleDay::insert($daysData);

            return $schedule;
        });
    }

    /**
     * Update an existing work schedule with its days (using DB transaction)
     */
    public function updateScheduleWithDays(WorkSchedule $schedule, array $scheduleData, array $daysData): WorkSchedule
    {
        return DB::transaction(function () use ($schedule, $scheduleData, $daysData) {
            // Update the schedule
            $schedule->update($scheduleData);

            // Delete existing days
            WorkScheduleDay::where('work_schedule_id', $schedule->id)->delete();

            // Add work_schedule_id to each day
            foreach ($daysData as &$day) {
                $day['work_schedule_id'] = $schedule->id;
            }

            // Insert new days
            WorkScheduleDay::insert($daysData);

            return $schedule->fresh();
        });
    }

    /**
     * Create a new work schedule (without transaction - use for single operations)
     */
    public function createSchedule(array $data): WorkSchedule
    {
        return WorkSchedule::create($data);
    }

    /**
     * Create schedule days (without transaction)
     */
    public function createScheduleDays(array $days): void
    {
        WorkScheduleDay::insert($days);
    }

    /**
     * Delete schedule days
     */
    public function deleteScheduleDays(int $workScheduleId): void
    {
        WorkScheduleDay::where('work_schedule_id', $workScheduleId)->delete();
    }

    /**
     * Update schedule (without transaction)
     */
    public function updateSchedule(WorkSchedule $schedule, array $data): bool
    {
        return $schedule->update($data);
    }

    // -------------------------------------------------------------------------
    // Work schedules — detail (view page)
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // Work schedules - CRUD operations (with Loggable trait support)
    // -------------------------------------------------------------------------

    /**
     * Create a new work schedule
     * Returns the model instance - Loggable trait will automatically log this
     */
    public function createWorkSchedule(array $data): WorkSchedule
    {
        return WorkSchedule::create($data);
    }

    /**
     * Create multiple work schedules
     * Returns collection of created models - each will be logged individually
     */
    public function createMultipleWorkSchedules(array $schedulesData): Collection
    {
        $createdSchedules = new Collection();

        foreach ($schedulesData as $data) {
            $createdSchedules->push(WorkSchedule::create($data));
        }

        return $createdSchedules;
    }

    /**
     * Update a work schedule
     * Returns the updated model - Loggable trait will log the changes
     */
    public function updateWorkSchedule(WorkSchedule $workSchedule, array $data): WorkSchedule
    {
        $workSchedule->update($data);
        return $workSchedule->fresh();
    }

    /**
     * Delete a work schedule
     * Loggable trait will log this deletion
     */
    public function deleteWorkSchedule(WorkSchedule $workSchedule): bool
    {
        return $workSchedule->delete();
    }

    /**
     * Find a single work schedule by ID
     */
    public function findWorkSchedule(int $id): ?WorkSchedule
    {
        return WorkSchedule::with(['days.shiftCode'])->find($id);
    }

    // -------------------------------------------------------------------------
    // Status update methods (with logging support)
    // -------------------------------------------------------------------------

    /**
     * Update acknowledgment status - returns the updated models for logging
     */
    public function updateAcknowledge($empId, $createdBy, $dateStart, $dateEnd): Collection
    {
        $schedules = WorkSchedule::where('emp_id', $empId)
            ->where('created_by', $createdBy)
            ->where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('work_sched_status', WorkSchedule::STATUS_APPROVED)
            ->get();

        foreach ($schedules as $schedule) {
            $schedule->update([
                'work_sched_status' => WorkSchedule::STATUS_ACKNOWLEDGED
            ]);
        }

        return $schedules;
    }

    /**
     * Update acknowledgment status (returns count only)
     * Use this when you don't need the models for additional processing
     */
    public function updateAcknowledgeCountOnly($empId, $createdBy, $dateStart, $dateEnd): int
    {
        return WorkSchedule::where('emp_id', $empId)
            ->where('created_by', $createdBy)
            ->where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('work_sched_status', WorkSchedule::STATUS_APPROVED)
            ->update([
                'work_sched_status' => WorkSchedule::STATUS_ACKNOWLEDGED
            ]);
    }

    /**
     * Bulk update status - returns updated models for logging
     */
    public function bulkUpdateStatus(
        $approverId,
        $createdBy,
        $dateStart,
        $dateEnd,
        $status,
        $empIds = [],
        $remarks = null
    ): Collection {
        $query = WorkSchedule::where('created_by', $createdBy)
            ->where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('approver2_id', $approverId)
            ->where('work_sched_status', WorkSchedule::STATUS_PENDING_APPROVAL);

        if (!empty($empIds)) {
            $query->whereIn('emp_id', $empIds);
        }

        $schedules = $query->get();

        foreach ($schedules as $schedule) {
            $schedule->update([
                'work_sched_status' => $status,
                'remarks'           => $remarks,
            ]);
        }

        return $schedules;
    }

    /**
     * Bulk update status (returns count only)
     * Use this when performance is critical and you don't need logging for each item
     */
    public function bulkUpdateStatusCountOnly(
        $approverId,
        $createdBy,
        $dateStart,
        $dateEnd,
        $status,
        $empIds = [],
        $remarks = null
    ): int {
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

    // -------------------------------------------------------------------------
    // Individual cell edits (view page)
    // -------------------------------------------------------------------------

    /**
     * Update a single schedule day's shift code.
     * $shiftCodeId is the PK from shift_codes; pass null to clear the cell.
     */
    public function updateScheduleDay(
        int    $workScheduleId,
        string $workDate,
        ?int   $shiftCodeId
    ): void {
        // updateOrCreate handles both existing days and days that were left
        // empty during template submission (no WorkScheduleDay row created).
        WorkScheduleDay::updateOrCreate(
            ['work_schedule_id' => $workScheduleId, 'work_date' => $workDate],
            ['schedule_code'    => $shiftCodeId]
        );
    }

    // -------------------------------------------------------------------------
    // Query builders
    // -------------------------------------------------------------------------

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
            return $query;
        }

        return $query->where('emp_id', $viewerEmpId);
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
        // Status 2 (Approved/To Acknowledge) for regular employees only shows their own rows
        if ($status === WorkSchedule::STATUS_APPROVED && $empPosition === 1) {
            $query->where('emp_id', $empId)
                ->where('work_sched_status', WorkSchedule::STATUS_APPROVED);
            return;
        }

        $query->where(function ($q) use ($empId) {
            $q->where('emp_id', $empId)
                ->orWhere('created_by', $empId)
                ->orWhere('approver2_id', $empId);
        })->where('work_sched_status', $status);
    }
}
