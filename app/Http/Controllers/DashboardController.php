<?php

namespace App\Http\Controllers;

use App\Models\WorkSchedule;
use App\Services\DashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $service,
    ) {}

    public function index(Request $request)
    {
        $empId      = (string) session('emp_data.emp_id');
        $isHrAdmin  = (string) session('emp_data.emp_system_role') === 'hr_admin';

        // A user is a "manager" when they have schedules where they are the
        // creator or an approver (i.e. they manage other employees' schedules).
        $isManager = !$isHrAdmin && WorkSchedule::where(function ($q) use ($empId) {
            $q->where('created_by', $empId)
              ->orWhere('approver2_id', $empId);
        })->exists();

        return Inertia::render('Dashboard', $this->service->getDashboardData($empId, $isHrAdmin, $isManager));
    }
}
