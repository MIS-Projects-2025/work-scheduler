<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;

class WorkSchedule extends Model
{
    use Loggable;
    protected $table = 'work_schedule';

    protected $primaryKey = 'id';

    public $timestamps = false;

    protected $fillable = [
        'emp_id',
        'payroll_date_start',
        'payroll_date_end',
        'work_sched_status',
        'shift',
        'supervisor_id',
        'approver2_id',
        'remarks',
        'created_by',
        'date_created',
        'date_updated',
    ];
    const STATUS_PENDING_APPROVAL = 1;
    const STATUS_APPROVED = 2;
    const STATUS_ACKNOWLEDGED = 3;
    const STATUS_DISAPPROVED = 4;
    // Relationship: one schedule has many days
    public function days()
    {
        return $this->hasMany(WorkScheduleDay::class, 'work_schedule_id');
    }
}
