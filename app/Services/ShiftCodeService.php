<?php

namespace App\Services;

use App\Models\ShiftCode;
use App\Repositories\ShiftCodeRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ShiftCodeService
{
    public function __construct(
        private ShiftCodeRepository $repository
    ) {}

    public function paginate(string $search, int $perPage): LengthAwarePaginator
    {
        return $this->repository->paginate($search, $perPage);
    }

    public function getById(int $id): ?ShiftCode
    {
        return $this->repository->findById($id);
    }

    public function create(array $data, int $createdBy): ShiftCode
    {
        if ($this->repository->existsByCode($data['shiftcode'])) {
            throw new \InvalidArgumentException("Shift code '{$data['shiftcode']}' already exists.");
        }

        return $this->repository->create([
            'shiftcode'            => strtoupper(trim($data['shiftcode'])),
            'shiftcode_value'      => strtoupper(trim($data['shiftcode'])),
            'shiftcode_desc'       => $data['shiftcode_desc']       ?? null,
            'shift_group'          => $data['shift_group']          ?? 'DEFAULT',
            'shiftcode_bg_color'   => $data['shiftcode_bg_color']   ?? '#FFFFFF',
            'shiftcode_font_color' => $data['shiftcode_font_color'] ?? '#000000',
            'shift_code_status'    => $data['shift_code_status']    ?? '1',
            'ot_hrs'               => $data['ot_hrs']               ?? 0,
            'time_windows'         => $data['time_windows'],
            'created_by'           => $createdBy,
            'created_at'           => now(),
        ]);
    }

    public function update(int $id, array $data): ShiftCode
    {
        if ($this->repository->existsByCode($data['shiftcode'], $id)) {
            throw new \InvalidArgumentException("Shift code '{$data['shiftcode']}' already exists.");
        }

        return $this->repository->update($id, [
            'shiftcode'            => strtoupper(trim($data['shiftcode'])),
            'shiftcode_value'      => strtoupper(trim($data['shiftcode'])),
            'shiftcode_desc'       => $data['shiftcode_desc']       ?? null,
            'shift_group'          => $data['shift_group']          ?? 'DEFAULT',
            'shiftcode_bg_color'   => $data['shiftcode_bg_color']   ?? '#FFFFFF',
            'shiftcode_font_color' => $data['shiftcode_font_color'] ?? '#000000',
            'shift_code_status'    => $data['shift_code_status']    ?? '1',
            'ot_hrs'               => $data['ot_hrs']               ?? 0,
            'time_windows'         => $data['time_windows'],
            'updated_by'           => $data['updated_by'] ?? null,
            'updated_at'           => now(),
        ]);
    }

    public function delete(int $id): bool
    {
        return $this->repository->delete($id);
    }
}
