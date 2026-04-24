<?php

namespace App\Http\Controllers;

use App\Exports\WorkScheduleTemplateExport;
use App\Models\PayrollCutoffSchedule;
use App\Models\ShiftCode;
use App\Models\WorkSchedule;
use App\Models\WorkScheduleDay;
use App\Services\HrisApiService;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkScheduleController extends Controller
{
    public function templatePage(Request $request)
    {
        $cutoffList = PayrollCutoffSchedule::orderBy('payroll_date_start', 'desc')
            ->limit(24)
            ->get()
            ->toArray();

        $empId = session('emp_data.emp_id');
        $hris = new HrisApiService();
        $managerWorkDetails = $hris->fetchWorkDetails($empId);
        $managerProdLine = $managerWorkDetails['prod_line'] ?? null;

        $shifts = $this->getFilteredShiftCodes($managerProdLine);

        return inertia('WorkSchedule/Template', [
            'cutoffList' => $cutoffList,
            'shifts' => $shifts,
        ]);
    }

    private function getFilteredShiftCodes(?string $prodLine)
    {
        try {
            if (!empty($prodLine)) {
                if (strpos($prodLine, 'PL8') !== false) {
                    return ShiftCode::where('shift_group', 'AMS')
                        ->where('shift_code_status', 1)
                        ->orderBy('shiftcode')
                        ->get()
                        ->toArray();
                } elseif (strpos($prodLine, 'PL2') !== false) {
                    return ShiftCode::where('shift_group', 'PL2/DEFAULT')
                        ->where('shift_code_status', 1)
                        ->orderBy('shiftcode')
                        ->get()
                        ->toArray();
                } else {
                    return ShiftCode::whereIn('shift_group', ['DEFAULT', 'PL2/DEFAULT'])
                        ->where('shift_code_status', 1)
                        ->orderBy('shiftcode')
                        ->get()
                        ->toArray();
                }
            }

            return ShiftCode::where('shift_code_status', 1)
                ->orderBy('shiftcode')
                ->get()
                ->toArray();
        } catch (\Exception $e) {
            return ShiftCode::where('shift_code_status', 1)
                ->orderBy('shiftcode')
                ->get()
                ->toArray();
        }
    }

    public function downloadTemplate(Request $request)
    {
        $request->validate([
            'cutoff_id' => 'required|integer|exists:payroll_cutoff_schedule,ID',
        ]);

        $cutoffId = $request->input('cutoff_id');
        $empId = session('emp_data.emp_id');

        $hris = new HrisApiService();
        $directReports = $hris->fetchDirectReports($empId);
        $employeeIds = array_column($directReports, 'emp_id');

        // 👉 Get manager's work details to get their prodline for shift code filtering
        $managerWorkDetails = $hris->fetchWorkDetails($empId);
        $managerProdLine = $managerWorkDetails['prod_line'] ?? null;

        // 👉 Get cutoff dates
        $cutoff = PayrollCutoffSchedule::find($cutoffId);

        $dateFrom = date('Ymd', strtotime($cutoff->payroll_date_start));
        $dateTo = date('Ymd', strtotime($cutoff->payroll_date_end));

        $extension = 'xlsx';

        // ✅ FINAL FILENAME FORMAT
        $filename = "schedule_template_{$dateFrom}_to_{$dateTo}_{$empId}.{$extension}";

        $export = new WorkScheduleTemplateExport($cutoffId, $employeeIds, $managerProdLine);

        return Excel::download($export, $filename);
    }
    public function getCutoffDays(Request $request)
    {
        $cutoffId = $request->query('cutoff_id');

        if (!$cutoffId) {
            return response()->json(['error' => 'cutoff_id required'], 400);
        }

        $cutoff = PayrollCutoffSchedule::find($cutoffId);

        if (!$cutoff) {
            return response()->json(['error' => 'Cutoff not found'], 404);
        }

        $days = [];
        $current = strtotime($cutoff->payroll_date_start);
        $endTimestamp = strtotime($cutoff->payroll_date_end);

        while ($current <= $endTimestamp) {
            $days[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        return response()->json([
            'cutoff' => $cutoff,
            'days' => $days,
        ]);
    }

    public function viewSchedules(Request $request)
    {
        $empId = session('emp_data.emp_id');
        $hris = new HrisApiService();
        $managerWorkDetails = $hris->fetchWorkDetails($empId);
        $managerProdLine = $managerWorkDetails['prod_line'] ?? null;

        $dateStart = '2025-10-22';
        $dateEnd = '2025-11-06';

        $shiftCodes = $this->getFilteredShiftCodes($managerProdLine);

        $schedules = WorkSchedule::where('payroll_date_start', $dateStart)
            ->where('payroll_date_end', $dateEnd)
            ->where('created_by', $empId)
            ->with(['days.shiftCode'])
            ->orderBy('emp_id')
            ->get();

        $employeeIds = $schedules->pluck('emp_id')->toArray();
        $employees = $hris->fetchEmployeesBulk($employeeIds);

        $workDetailsMap = [];
        foreach ($employeeIds as $empId) {
            $workDetailsMap[$empId] = $hris->fetchWorkDetails($empId);
        }

        $daysInPeriod = [];
        $current = strtotime($dateStart);
        $endTimestamp = strtotime($dateEnd);
        while ($current <= $endTimestamp) {
            $daysInPeriod[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        $staticHeaders = ['Emp ID', 'Employee Name', 'Department', 'Production Line', 'Team', 'Shift Type'];
        $dayHeaders = [];
        foreach ($daysInPeriod as $date) {
            $dayObj = new \DateTime($date);
            $dayHeaders[] = $dayObj->format('d-M') . ' ' . strtoupper(substr($dayObj->format('l'), 0, 3));
        }

        $headers = array_merge($staticHeaders, $dayHeaders);

        $groupedData = [];

        $schedulesData = $schedules->map(function ($schedule) use ($employees, $workDetailsMap, $daysInPeriod) {
            $daysMap = [];
            foreach ($schedule->days as $day) {
                $scheduleCode = $day->shiftCode;
                $codeValue = $scheduleCode ? $scheduleCode->shiftcode : '';
                $daysMap[$day->work_date] = $codeValue;
            }

            $empData = $employees[$schedule->emp_id] ?? [];
            $workData = $workDetailsMap[$schedule->emp_id] ?? [];

            $row = [
                $schedule->emp_id,
                $empData['emp_name'] ?? '',
                $empData['department'] ?? '',
                $empData['prodline'] ?? '',
                $workData['team'] ?? '',
                $workData['shift_type'] ?? '',
            ];

            foreach ($daysInPeriod as $date) {
                $row[] = $daysMap[$date] ?? '';
            }

            return $row;
        })->values()->all();

        $groupedData[] = [
            'created_by' => $empId,
            'payroll_date_start' => $dateStart,
            'payroll_date_end' => $dateEnd,
            'headers' => $headers,
            'staticHeaders' => $staticHeaders,
            'schedules' => $schedulesData,
        ];

        return inertia('WorkSchedule/View', [
            'groupedData' => $groupedData,
            'shiftCodes' => $shiftCodes,
            'dateStart' => $dateStart,
            'dateEnd' => $dateEnd,
        ]);
    }
}
