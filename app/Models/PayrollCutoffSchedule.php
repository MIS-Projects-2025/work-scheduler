<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;

class PayrollCutoffSchedule extends Model
{
    use Loggable;
    protected $table = 'payroll_cutoff_schedule';

    protected $primaryKey = 'ID';

    public $timestamps = false;

    protected $fillable = [
        'payroll_date_start',
        'payroll_date_end',
        'created_by',
    ];
}
