<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    protected $table      = 'holidays';
    protected $primaryKey = 'ID';
    public    $timestamps = false;

    protected $fillable = [
        'holiday_name',
        'holiday_date',
        'holiday_type',
        'color',
        'created_by',
        'created_at',
    ];

    protected $casts = [
        'holiday_date' => 'date:Y-m-d',
    ];
}
