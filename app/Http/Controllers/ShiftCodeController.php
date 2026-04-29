<?php

namespace App\Http\Controllers;

use App\Services\ShiftCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ShiftCodeController extends Controller
{
    public function __construct(
        private ShiftCodeService $service
    ) {}

    public function page(): Response
    {
        return Inertia::render('Admin/ShiftCode');
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $search  = $request->query('search', '');
            $perPage = (int) $request->query('per_page', 15);

            $data = $this->service->paginate($search, $perPage);

            // No need to transform - the model accessor will handle it
            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            Log::error('ShiftCode index error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to fetch shift codes.'], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $record = $this->service->getById($id);

            if (!$record) {
                return response()->json(['success' => false, 'message' => 'Shift code not found.'], 404);
            }

            return response()->json(['success' => true, 'data' => $record]);
        } catch (\Exception $e) {
            Log::error("ShiftCode show error [{$id}]: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to fetch shift code.'], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shiftcode'            => 'required|string|max:50',
            'shiftcode_desc'       => 'nullable|string|max:255',
            'shift_group'          => 'nullable|string|max:100',
            'shiftcode_bg_color'   => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'shiftcode_font_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'shift_code_status'    => 'required|in:Active,Inactive',
            'ot_hrs'               => 'nullable|numeric|min:0',
            'time_windows'         => 'required|array|size:8',
            'time_windows.*'       => 'nullable|string|regex:/^\d{2}:\d{2}$/',
        ]);

        try {
            $record = $this->service->create($validated, (int) session('emp_data.emp_id'));

            // The model mutator will automatically convert 'Active'/'Inactive' to '1'/'2'

            return response()->json([
                'success' => true,
                'message' => 'Shift code created successfully.',
                'data'    => $record,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('ShiftCode store error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to create shift code.'], 500);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'shiftcode'            => 'required|string|max:50',
            'shiftcode_desc'       => 'nullable|string|max:255',
            'shift_group'          => 'nullable|string|max:100',
            'shiftcode_bg_color'   => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'shiftcode_font_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'shift_code_status'    => 'required|in:Active,Inactive',
            'ot_hrs'               => 'nullable|numeric|min:0',
            'time_windows'         => 'required|array|size:8',
            'time_windows.*'       => 'nullable|string|regex:/^\d{2}:\d{2}$/',
        ]);

        $validated['updated_by'] = (int) session('emp_data.emp_id');

        try {
            $record = $this->service->update($id, $validated);

            // The model mutator will automatically handle status conversion

            return response()->json([
                'success' => true,
                'message' => 'Shift code updated successfully.',
                'data'    => $record,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error("ShiftCode update error [{$id}]: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to update shift code.'], 500);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->service->delete($id);

            return response()->json([
                'success' => true,
                'message' => 'Shift code deleted successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error("ShiftCode destroy error [{$id}]: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to delete shift code.'], 500);
        }
    }
}
