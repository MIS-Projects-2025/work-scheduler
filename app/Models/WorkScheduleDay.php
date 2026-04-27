<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;

class WorkScheduleDay extends Model
{
    use Loggable;
    protected $table = 'work_schedule_days';

    protected $primaryKey = 'id';

    public $timestamps = false;

    protected $fillable = [
        'work_schedule_id',
        'work_date',
        'schedule_code',
    ];

    public function schedule()
    {
        return $this->belongsTo(WorkSchedule::class, 'work_schedule_id');
    }

    public function shiftCode()
    {
        return $this->belongsTo(ShiftCode::class, 'schedule_code', 'shift_code_id');
    }
}
