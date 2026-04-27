<?php

namespace App\Traits;

use App\Models\WorkSchedLogs;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Log;

trait Loggable
{
    public static function bootLoggable()
    {
        Log::info('[Loggable] bootLoggable triggered for: ' . static::class);

        static::created(function ($model) {
            Log::info('[Loggable] created event fired', [
                'id' => $model->getKey()
            ]);

            $model->writeLog('created');
        });

        static::updated(function ($model) {
            Log::info('[Loggable] updated event fired', [
                'id' => $model->getKey(),
                'dirty' => $model->getDirty()
            ]);

            if ($model->isDirty()) {
                $model->writeLog('updated');
            } else {
                Log::info('[Loggable] update skipped - not dirty');
            }
        });

        static::deleted(function ($model) {
            Log::info('[Loggable] deleted event fired', [
                'id' => $model->getKey()
            ]);

            $model->writeLog('deleted');
        });

        if (in_array(SoftDeletes::class, class_uses_recursive(static::class))) {
            static::restored(function ($model) {
                Log::info('[Loggable] restored event fired', [
                    'id' => $model->getKey()
                ]);

                $model->writeLog('restored');
            });
        }
    }

    protected function writeLog(string $action): void
    {
        Log::info('[Loggable] writeLog called', [
            'action' => $action,
            'model' => get_class($this),
            'id' => $this->getKey()
        ]);

        try {
            $empData = session('emp_data');

            Log::info('[Loggable] session emp_data', [
                'emp_data' => $empData
            ]);

            $dirty = collect($this->getDirty())
                ->except(['updated_at'])
                ->toArray();

            Log::info('[Loggable] dirty attributes', [
                'dirty' => $dirty
            ]);

            $actionType = $this->currentAction ?? strtoupper($action);

            if ($action === 'updated' && empty($dirty)) {
                Log::info('[Loggable] skipped - no dirty fields');
                return;
            }

            $formatDateFields = function ($array) {
                return collect($array)->map(function ($value) {
                    if ($value instanceof Carbon) {
                        return $value->format('Y-m-d H:i:s');
                    }
                    return $value;
                })->toArray();
            };

            $logData = [
                'loggable_type' => get_class($this),
                'loggable_id'   => $this->getKey(),
                'action_type'   => $actionType,
                'action_by'     => $empData['emp_id'] ?? $empData['EMPLOYID'] ?? null,
                'action_at'     => now()->format('Y-m-d H:i:s'),
                'old_values'    => $action === 'updated'
                    ? $formatDateFields(array_intersect_key($this->getOriginal(), $dirty))
                    : null,
                'new_values'    => $action === 'updated'
                    ? $formatDateFields($dirty)
                    : $formatDateFields($this->getAttributes()),
                'related_id'    => $this->attributes['employid'] ?? null,
            ];

            Log::info('[Loggable] final log payload', $logData);

            WorkSchedLogs::create($logData);

            Log::info('[Loggable] log successfully inserted');
        } catch (\Throwable $e) {
            Log::error('[Loggable] FAILED to write log', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    public function WorkSchedLogs()
    {
        return $this->morphMany(WorkSchedLogs::class, 'loggable');
    }
}
