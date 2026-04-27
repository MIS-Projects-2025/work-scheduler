<?php

namespace App\Traits;



use App\Models\WorkSchedLogs;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\SoftDeletes;

trait Loggable
{
    public static function bootLoggable()
    {
        static::created(function ($model) {
            $model->writeLog('created');
        });

        static::updated(function ($model) {
            if ($model->isDirty()) {
                $model->writeLog('updated');
            }
        });

        static::deleted(function ($model) {
            $model->writeLog('deleted');
        });

        // Register restored only if SoftDeletes is used
        if (in_array(SoftDeletes::class, class_uses_recursive(static::class))) {
            static::restored(function ($model) {
                $model->writeLog('restored');
            });
        }
    }

    protected function writeLog(string $action): void
    {
        $empData = session('emp_data');

        $dirty = collect($this->getDirty())
            ->except(['updated_at'])
            ->toArray();

        $actionType = $this->currentAction ?? strtoupper($action);

        if ($action === 'updated' && empty($dirty)) return;

        // Format any datetime fields to standard string (local timezone)
        $formatDateFields = function ($array) {
            return collect($array)->map(function ($value, $key) {
                if ($value instanceof Carbon) {
                    return $value->format('Y-m-d H:i:s'); // Asia/Manila format
                }
                return $value;
            })->toArray();
        };

        WorkSchedLogs::create([
            'loggable_type' => get_class($this),
            'loggable_id'   => $this->getKey(),
            'action_type'   => $actionType,
            'action_by'     => $empData['emp_id'] ?? $empData['EMPLOYID'] ?? null,
            'action_at'     => now()->format('Y-m-d H:i:s'),
            'old_values'    => $action === 'updated' ? $formatDateFields(array_intersect_key($this->getOriginal(), $dirty)) : null,
            'new_values'    => $action === 'updated' ? $formatDateFields($dirty) : $formatDateFields($this->getAttributes()),
            'related_id'    => $this->attributes['employid'] ?? null,
        ]);
    }

    public function WorkSchedLogs()
    {
        return $this->morphMany(WorkSchedLogs::class, 'loggable');
    }
}
