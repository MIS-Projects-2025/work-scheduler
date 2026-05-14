<?php

namespace App\Services;

use App\Repositories\DashboardRepository;

class DashboardService
{
    public function __construct(
        private readonly DashboardRepository $repo,
    ) {}

    /**
     * Aggregate all data needed by the dashboard page.
     *
     * @param string $empId       Current user's employee ID
     * @param bool   $isHrAdmin   True when emp_system_role === 'hr_admin'
     * @param bool   $isManager   True when user has created schedules for others
     *                            (created_by records exist) or is an approver
     */
    public function getDashboardData(string $empId, bool $isHrAdmin, bool $isManager): array
    {
        $statusCounts    = $this->repo->countByStatus($empId, $isHrAdmin, $isManager);
        $monthlyCounts   = $this->repo->countByMonth($empId, $isHrAdmin, $isManager, 6);
        $topShiftCodes   = $this->repo->topShiftCodes($empId, $isHrAdmin, $isManager, 8);
        $shiftGroups     = $this->repo->countByShiftGroup($empId, $isHrAdmin, $isManager);
        $upcomingCutoffs = $this->repo->upcomingCutoffs(5);
        $recentSchedules = $this->repo->recentSchedules($empId, $isHrAdmin, $isManager, 10);

        $totalSchedules = array_sum($statusCounts);

        // Fill every month in the 6-month window, even if count is 0
        $monthLabels = [];
        $monthData   = [];
        for ($i = 5; $i >= 0; $i--) {
            $key           = now()->subMonths($i)->format('Y-m');
            $label         = now()->subMonths($i)->format('M Y');
            $monthLabels[] = $label;
            $monthData[]   = (int) ($monthlyCounts[$key] ?? 0);
        }

        return [
            'isHrAdmin'  => $isHrAdmin,
            'isManager'  => $isManager,
            'stats' => [
                'total'             => $totalSchedules,
                'pending'           => $statusCounts['pending'],
                'approved'          => $statusCounts['approved'],
                'acknowledged'      => $statusCounts['acknowledged'],
                'disapproved'       => $statusCounts['disapproved'],
                'activeShiftCodes'  => $this->repo->countActiveShiftCodes(),
                'distinctEmployees' => $this->repo->countDistinctEmployees($empId, $isHrAdmin, $isManager),
            ],
            'monthlyChart' => [
                'labels' => $monthLabels,
                'data'   => $monthData,
            ],
            'statusChart' => [
                'labels' => ['Pending', 'Approved', 'Acknowledged', 'Disapproved'],
                'data'   => [
                    $statusCounts['pending'],
                    $statusCounts['approved'],
                    $statusCounts['acknowledged'],
                    $statusCounts['disapproved'],
                ],
            ],
            'shiftGroupChart' => [
                'labels' => array_keys($shiftGroups),
                'data'   => array_values($shiftGroups),
            ],
            'topShiftCodes' => $topShiftCodes->map(fn($row) => [
                'code'       => $row->shiftCode?->shiftcode ?? 'N/A',
                'count'      => $row->usage_count,
                'bg_color'   => $row->shiftCode?->shiftcode_bg_color ?? '#e5e7eb',
                'font_color' => $row->shiftCode?->shiftcode_font_color ?? '#111827',
            ])->values()->all(),
            'upcomingCutoffs' => $upcomingCutoffs->map(fn($c) => [
                'id'         => $c->ID,
                'date_start' => $c->payroll_date_start,
                'date_end'   => $c->payroll_date_end,
            ])->values()->all(),
            'recentSchedules' => $recentSchedules->map(fn($s) => [
                'id'         => $s->id,
                'emp_id'     => $s->emp_id,
                'created_by' => $s->created_by,
                'date_start' => $s->payroll_date_start,
                'date_end'   => $s->payroll_date_end,
                'status'     => $s->work_sched_status,
                'created_at' => $s->date_created,
            ])->values()->all(),
        ];
    }
}
