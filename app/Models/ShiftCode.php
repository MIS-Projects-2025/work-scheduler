<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;

class ShiftCode extends Model
{
    use Loggable;
    protected $table = 'shift_codes';

    protected $primaryKey = 'shift_code_id';

    public $timestamps = false;

    protected $fillable = [
        'shift_code_status',
        'shiftcode',
        'shiftcode_value',
        'shiftcode_desc',
        'shift_group',
        'shiftcode_bg_color',
        'shiftcode_font_color',
        'time_windows',
        'ot_hrs',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
    ];

    protected $casts = [
        'time_windows' => 'array',
        'shift_code_status' => 'string', // Cast to string to handle '1' and '2'
    ];

    // Accessor to always return status as string for frontend
    public function getShiftCodeStatusAttribute($value)
    {
        if ($value == '1') return 'Active';
        if ($value == '2') return 'Inactive';
        return $value;
    }

    // Mutator to convert status string to database value
    public function setShiftCodeStatusAttribute($value)
    {
        $this->attributes['shift_code_status'] = $value === 'Active' ? '1' : '2';
    }
}
