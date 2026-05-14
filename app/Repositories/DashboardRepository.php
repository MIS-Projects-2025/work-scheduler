<?php

namespace App\Repositories;

use App\Models\PayrollCutoffSchedule;
use App\Models\ShiftCode;
use App\Models\WorkSchedule;
use App\Models\WorkScheduleDay;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardRepository
{
    // -------------------------------------------------------------------------
    // Internal scope builder
    // -------------------------------------------------------------------------

    /**
     * Base query scoped to what the current user is allowed to see.
     *
     * - isHrAdmin  → no filter (all records)
     * - isManager  → created_by = empId OR approver2_id = empId OR emp_id = empId
     * - employee   → emp_id = empId only
     */
    private function scopedSchedule(string $empId, bool $isHrAdmin, bool $isManager): Builder
    {
        $query = WorkSchedule::query();

        if ($isHrAdmin) {
            return $query;
        }

        if ($isManager) {
            return $query->where(function ($q) use ($empId) {
                $q->where('emp_id', $empId)
                  ->orWhere('created_by', $empId)
                  ->orWhere('approver2_id', $empId);
            });
        }

        // Plain employee — own records only
        return $query->where('emp_id', $empId);
    }

    // -------------------------------------------------------------------------
    // Counts
    // -------------------------------------------------------------------------

    public function countByStatus(string $empId, bool $isHrAdmin, bool $isManager): array
    {
        $rows = $this->scopedSchedule($empId, $isHrAdmin, $isManager)
            ->selectRaw('work_sched_status, COUNT(*) AS cnt')
            ->groupBy('work_sched_status')
            ->pluck('cnt', 'work_sched_status')
            ->toArray();

        return [
            'pending'      => (int) ($rows[WorkSchedule::STATUS_PENDING_APPROVAL] ?? 0),
            'approved'     => (int) ($rows[WorkSchedule::STATUS_APPROVED]         ?? 0),
            'acknowledged' => (int) ($rows[WorkSchedule::STATUS_ACKNOWLEDGED]     ?? 0),
            'disapproved'  => (int) ($rows[WorkSchedule::STATUS_DISAPPROVED]      ?? 0),
        ];
    }

    public function countDistinctEmployees(string $empId, bool $isHrAdmin, bool $isManager): int
    {
        return $this->scopedSchedule($empId, $isHrAdmin, $isManager)
            ->distinct('emp_id')
            ->count('emp_id');
    }

    // -------------------------------------------------------------------------
    // Monthly trend
    // -------------------------------------------------------------------------

    public function countByMonth(string $empId, bool $isHrAdmin, bool $isManager, int $months = 6): array
    {
        $from = now()->subMonths($months - 1)->startOfMonth()->toDateString();

        return $this->scopedSchedule($empId, $isHrAdmin, $isManager)
            ->selectRaw("DATE_FORMAT(date_created, '%Y-%m') AS month, COUNT(*) AS cnt")
            ->where('date_created', '>=', $from)
            ->groupByRaw("DATE_FORMAT(date_created, '%Y-%m')")
            ->orderByRaw("DATE_FORMAT(date_created, '%Y-%m')")
            ->pluck('cnt', 'month')
            ->toArray();
    }

    // -------------------------------------------------------------------------
    // Shift code usage
    // -------------------------------------------------------------------------

    /**
     * Top N most-used shift codes, restricted to the user's visible schedules.
     */
    public function topShiftCodes(string $empId, bool $isHrAdmin, bool $isManager, int $limit = 8): Collection
    {
        $visibleIds = $this->scopedSchedule($empId, $isHrAdmin, $isManager)
            ->pluck('id');

        return WorkScheduleDay::selectRaw('schedule_code, COUNT(*) AS usage_count')
            ->whereNotNull('schedule_code')
            ->whereIn('work_schedule_id', $visibleIds)
            ->groupBy('schedule_code')
            ->orderByDesc('usage_count')
            ->limit($limit)
            ->with('shiftCode:shift_code_id,shiftcode,shiftcode_bg_color,shiftcode_font_color')
            ->get();
    }

    /**
     * Schedule days per shift group, restricted to visible schedules.
     */
    public function countByShiftGroup(string $empId, bool $isHrAdmin, bool $isManager): array
    {
        $visibleIds = $this->scopedSchedule($empId, $isHrAdmin, $isManager)
            ->pluck('id');

        return DB::table('work_schedule_days AS wsd')
            ->join('shift_codes AS sc', 'wsd.schedule_code', '=', 'sc.shift_code_id')
            ->selectRaw('sc.shift_group, COUNT(*) AS cnt')
            ->whereNotNull('wsd.schedule_code')
            ->whereIn('wsd.work_schedule_id', $visibleIds)
            ->groupBy('sc.shift_group')
            ->orderByDesc('cnt')
            ->pluck('cnt', 'shift_group')
            ->toArray();
    }

    // -------------------------------------------------------------------------
    // Recent schedules
    // -------------------------------------------------------------------------

    public function recentSchedules(string $empId, bool $isHrAdmin, bool $isManager, int $limit = 10): Collection
    {
        return $this->scopedSchedule($empId, $isHrAdmin, $isManager)
            ->orderByDesc('date_created')
            ->limit($limit)
            ->get(['id', 'emp_id', 'created_by', 'payroll_date_start', 'payroll_date_end', 'work_sched_status', 'date_created']);
    }

    // -------------------------------------------------------------------------
    // System-wide (not scoped — not schedule data)
    // -------------------------------------------------------------------------

    public function countActiveShiftCodes(): int
    {
        return ShiftCode::where('shift_code_status', 1)->count();
    }

    public function upcomingCutoffs(int $limit = 5): Collection
    {
        return PayrollCutoffSchedule::where('payroll_date_end', '>=', now()->toDateString())
            ->orderBy('payroll_date_start')
            ->limit($limit)
            ->get(['ID', 'payroll_date_start', 'payroll_date_end']);
    }
}
