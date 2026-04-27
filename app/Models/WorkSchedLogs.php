<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkSchedLogs extends Model
{
    protected $table = 'work_sched_logs';

    protected $fillable = [
        'loggable_type',
        'loggable_id',
        'action_type',
        'action_by',
        'action_at',
        'remarks',
        'metadata',
        'old_values',
        'new_values',
        'related_type',
        'related_id',
    ];

    protected $casts = [
        'action_at' => 'datetime',
        'metadata' => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
    ];
}
