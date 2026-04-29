<?php

namespace App\Repositories;

use App\Models\ShiftCode;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ShiftCodeRepository
{
    public function paginate(string $search, int $perPage): LengthAwarePaginator
    {
        return ShiftCode::query()
            ->when($search, fn($q) => $q->where(function ($q2) use ($search) {
                $q2->where('shiftcode',       'like', "%{$search}%")
                    ->orWhere('shiftcode_desc', 'like', "%{$search}%")
                    ->orWhere('shift_group',    'like', "%{$search}%");
            }))
            ->orderBy('shiftcode', 'asc')
            ->paginate($perPage);
    }

    public function findById(int $id): ?ShiftCode
    {
        return ShiftCode::find($id);
    }

    public function create(array $data): ShiftCode
    {
        return ShiftCode::create($data);
    }

    public function update(int $id, array $data): ShiftCode
    {
        $record = ShiftCode::findOrFail($id);
        $record->update($data);
        return $record->fresh();
    }

    public function delete(int $id): bool
    {
        return ShiftCode::findOrFail($id)->delete();
    }

    public function existsByCode(string $shiftcode, ?int $excludeId = null): bool
    {
        return ShiftCode::query()
            ->where('shiftcode', $shiftcode)
            ->when($excludeId, fn($q) => $q->where('shift_code_id', '!=', $excludeId))
            ->exists();
    }
}
