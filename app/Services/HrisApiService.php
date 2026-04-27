<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HrisApiService
{
    private string $baseUrl;
    private string $key;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.hris.url'), '/');
        $this->key     = config('services.hris.key');
    }

    /**
     * Fetch the full name of an employee from the HRIS API.
     * Returns null if the employee is not found or the request fails.
     */
    public function fetchEmployeeName(int $employid): ?string
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->key,
            ])->get("{$this->baseUrl}/api/employees/{$employid}");

            if ($response->failed()) {
                return null;
            }

            return $response->json('data.emp_name') ?? null;
        } catch (\Exception $e) {
            Log::error("HRIS fetchEmployeeName exception: {$e->getMessage()}", ['employid' => $employid]);
            return null;
        }
    }

    /**
     * Fetch work details for a single employee.
     *
     * Actual HRIS API response (GET /api/employees/{id}/work → data):
     *   accstatus        1|2            1=active, 2=inactive
     *   emp_status_id    0|1            0=probationary, 1=regular
     *   emp_prodline_id  int            production line numeric ID
     *   emp_prodline     string         production line name e.g. "PL8"
     *   shift_type_id    int            shift type numeric ID
     *   team_id          int            team numeric ID
     *   date_hired       YYYY-MM-DD
     *   date_reg         YYYY-MM-DD
     *
     * Returns a normalized array with internal field names used throughout
     * LeaveAutoUpdateService so field-name changes stay isolated here:
     *   acc_status, emp_status, prod_line, date_hired, date_reg, shift_type, team
     */
    public function fetchWorkDetails(int $employid): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->key,
            ])->get("{$this->baseUrl}/api/employees/{$employid}/work");

            if ($response->failed()) {
                Log::warning('HRIS fetchWorkDetails failed', [
                    'employid' => $employid,
                    'status'   => $response->status(),
                ]);
                return null;
            }

            $raw = $response->json('data');

            if (!$raw) {
                return null;
            }

            // Guard against API returning arrays where scalars are expected
            $arrayFields = array_filter([
                'accstatus'     => $raw['accstatus']      ?? null,
                'emp_status_id' => $raw['emp_status_id']  ?? null,
                'date_hired'    => $raw['date_hired']     ?? null,
                'date_reg'      => $raw['date_reg']       ?? null,
            ], 'is_array');

            if (!empty($arrayFields)) {
                Log::warning('HRIS fetchWorkDetails: unexpected array values in response', [
                    'employid'      => $employid,
                    'array_fields'  => array_keys($arrayFields),
                    'raw_data'      => $raw,
                ]);
                return null;
            }

            // Normalize API field names → internal names
            return array_merge($raw, [
                'acc_status'  => $raw['accstatus']       ?? null,  // 1=active, 2=separated
                'emp_status'  => $raw['emp_status_id']   ?? null,  // 0=probationary, 1=regular
                'date_hired'  => $raw['date_hired']      ?? null,
                'date_reg'    => $raw['date_reg']        ?? null,
                'prod_line'   => $raw['emp_prodline']    ?? null,  // name string e.g. "PL8"
                'shift_type'  => $raw['shift_type']    ?? null,  // numeric shift type
                'team'        => $raw['team']          ?? null,  // numeric team
            ]);
        } catch (\Exception $e) {
            Log::error("HRIS fetchWorkDetails exception: {$e->getMessage()}", ['employid' => $employid]);
            return null;
        }
    }

    /**
     * Fetch approver IDs for an employee from HRIS work details.
     * Returns [approver1_id, approver1_name, approver2_id, approver2_name] or null.
     */
    public function fetchApprovers(int $employid): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->key,
            ])->get("{$this->baseUrl}/api/employees/{$employid}/work");

            if ($response->failed()) return null;

            $approver = $response->json('data.approver');
            if (!$approver) return null;

            return [
                'approver1_id'   => (int) ($approver['approver1_id'] ?? 0),
                'approver1_name' => $approver['approver1'] ?? null,
                'approver2_id'   => (int) ($approver['approver2_id'] ?? 0),
                'approver2_name' => $approver['approver2'] ?? null,
            ];
        } catch (\Exception $e) {
            Log::error("HRIS fetchApprovers exception: {$e->getMessage()}", ['employid' => $employid]);
            return null;
        }
    }

    /**
     * Fetch the Operation Director from HRIS.
     * Returns ['emp_id' => int, 'name' => string] or null.
     */
    public function fetchOperationDirector(): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->key,
            ])->get("{$this->baseUrl}/api/employees/operation-director");

            if ($response->failed()) return null;

            $data = $response->json('data');
            if (empty($data['emp_id'])) return null;

            return ['emp_id' => (int) $data['emp_id'], 'name' => $data['name'] ?? null];
        } catch (\Exception $e) {
            Log::error("HRIS fetchOperationDirector exception: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Fetch a paginated/filtered list of active employees for UI comboboxes.
     * Passes search + pagination params to HRIS (if supported); falls back
     * to returning an empty list on failure.
     *
     * Returns:
     *   data    — array of rows, each with emp_id + emp_name (at minimum)
     *   hasMore — true when another page is available
     */
    public function fetchActiveEmployees(string $search = '', int $page = 1, int $perPage = 20): array
    {
        try {
            $q = base64_encode(json_encode([
                'search'   => $search,
                'page'     => $page,
                'per_page' => $perPage,
            ]));

            $response = Http::withHeaders([
                'X-Internal-Key' => $this->key,
            ])->get("{$this->baseUrl}/api/employees/active", ['q' => $q]);

            if ($response->failed()) {
                Log::warning('HRIS fetchActiveEmployees failed', [
                    'status' => $response->status(),
                ]);
                return ['data' => [], 'hasMore' => false];
            }

            $json        = $response->json();
            $list        = $json['data']         ?? [];
            $currentPage = (int) ($json['current_page'] ?? $page);
            $lastPage    = (int) ($json['last_page']    ?? 1);

            return [
                'data'    => is_array($list) ? $list : [],
                'hasMore' => $currentPage < $lastPage,
            ];
        } catch (\Exception $e) {
            Log::error("HRIS fetchActiveEmployees exception: {$e->getMessage()}");
            return ['data' => [], 'hasMore' => false];
        }
    }

    /**
     * Fetch all direct reports for a supervisor from HRIS.
     *
     * Response shape: { success: true, data: [{ emp_id, emp_name, prodline_id, prodline,
     *                                             department_id, department, station_id, station }] }
     *
     * Returns an array of direct-report rows, empty on failure.
     */
    public function fetchDirectReports(int $empId): array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->key,
            ])->get("{$this->baseUrl}/api/employees/direct-reports/{$empId}");

            if ($response->failed()) {
                Log::warning('HRIS fetchDirectReports failed', [
                    'emp_id' => $empId,
                    'status' => $response->status(),
                ]);
                return [];
            }

            $data = $response->json('data');

            return is_array($data) ? $data : [];
        } catch (\Exception $e) {
            Log::error("HRIS fetchDirectReports exception: {$e->getMessage()}", ['emp_id' => $empId]);
            return [];
        }
    }

    /**
     * Fetch basic info for multiple employees in a single bulk request.
     *
     * Calls POST /api/employees/bulk with { "emp_nos": [...] }
     * Expected response:
     *   {
     *     "data": {
     *       "<emp_no>": {
     *         "emp_name":   "Juan dela Cruz",
     *         "department": "Production",
     *         "prodline":   "PL8",
     *         "station":    "Station A"
     *       },
     *       ...
     *     }
     *   }
     *
     * Returns a map of (int) emp_no → ['emp_name', 'department', 'prodline', 'station'].
     * Missing or failed entries are omitted.
     */
    public function fetchEmployeesBulk(array $empNos): array
    {
        if (empty($empNos)) {
            return [];
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Key' => $this->key,
            ])->post("{$this->baseUrl}/api/employees/bulk", [
                'emp_nos' => array_values(array_unique($empNos)),
            ]);

            if ($response->failed()) {
                Log::warning('HRIS fetchEmployeesBulk failed', [
                    'status'  => $response->status(),
                    'emp_nos' => $empNos,
                ]);
                return [];
            }

            $data = $response->json('data') ?? [];
            $map  = [];
            foreach ($data as $no => $info) {
                if (!is_array($info)) continue;
                $map[(int) $no] = [
                    'emp_name'   => $info['emp_name']   ?? null,
                    'department' => $info['department']  ?? null,
                    'prodline'   => $info['prodline']    ?? null,
                    'station'    => $info['station']     ?? null,
                    'team'       => $info['team']        ?? null,
                    'shift'      => $info['shift']       ?? null,
                ];
            }

            return $map;
        } catch (\Exception $e) {
            Log::error("HRIS fetchEmployeesBulk exception: {$e->getMessage()}", ['emp_nos' => $empNos]);
            return [];
        }
    }

    /**
     * Check if work data is usable — skip employees with missing/invalid dates.
     * Expects the normalized array returned by fetchWorkDetails().
     */
    public function isValidWorkData(?array $work): bool
    {
        if (!$work) return false;

        $required = ['emp_status', 'acc_status', 'date_hired', 'date_reg'];
        foreach ($required as $field) {
            if (is_null($work[$field]) || $work[$field] === '' || is_array($work[$field])) return false;
        }

        $invalidDates = ['0000-00-00', '1970-01-01'];
        foreach (['date_hired', 'date_reg'] as $field) {
            if (in_array($work[$field], $invalidDates)) return false;
        }

        return true;
    }
}
