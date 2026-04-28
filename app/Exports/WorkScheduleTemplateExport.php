<?php

namespace App\Exports;

use App\Models\PayrollCutoffSchedule;
use App\Models\ShiftCode;
use App\Services\HrisApiService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Illuminate\Support\Facades\Log;

class WorkScheduleTemplateExport implements WithMultipleSheets
{
    use Exportable;

    private int        $cutoffId;
    private array      $employeeIds;
    private HrisApiService $hris;
    private ?string    $managerProdLine;
    private Collection $filteredShiftCodes;
    private array      $holidays; // [['date'=>'YYYY-MM-DD','name'=>...,'type'=>...,'color'=>...], ...]

    public function __construct(
        int     $cutoffId,
        ?array  $employeeIds    = [],
        ?string $managerProdLine = null,
        mixed   $holidays        = null   // Collection or array from service
    ) {
        $this->cutoffId          = $cutoffId;
        $this->employeeIds       = $employeeIds ?? [];
        $this->hris              = new HrisApiService();
        $this->managerProdLine   = $managerProdLine;
        $this->filteredShiftCodes = $this->getFilteredShiftCodes();

        // Normalise holidays to a plain array of ['date','name','type','color']
        if ($holidays instanceof Collection) {
            $this->holidays = $holidays->map(fn($h) => [
                'date'  => $h->holiday_date instanceof \Carbon\Carbon
                    ? $h->holiday_date->format('Y-m-d')
                    : (string) $h->holiday_date,
                'name'  => $h->holiday_name,
                'type'  => $h->holiday_type,
                'color' => $h->color ?? '#FF5733',
            ])->values()->all();
        } else {
            $this->holidays = (array) ($holidays ?? []);
        }
    }

    private function getFilteredShiftCodes(): Collection
    {
        try {
            $prodLine = $this->managerProdLine;

            if (!empty($prodLine)) {
                if (str_contains($prodLine, 'PL8')) {
                    return ShiftCode::where('shift_group', 'AMS')
                        ->where('shift_code_status', 1)
                        ->orderBy('shiftcode')
                        ->get();
                }
                if (str_contains($prodLine, 'PL2')) {
                    return ShiftCode::where('shift_group', 'PL2/DEFAULT')
                        ->where('shift_code_status', 1)
                        ->orderBy('shiftcode')
                        ->get();
                }
                return ShiftCode::whereIn('shift_group', ['DEFAULT', 'PL2/DEFAULT'])
                    ->where('shift_code_status', 1)
                    ->orderBy('shiftcode')
                    ->get();
            }

            return ShiftCode::where('shift_code_status', 1)->orderBy('shiftcode')->get();
        } catch (\Exception $e) {
            Log::error('Shift codes filtering error: ' . $e->getMessage());
            return ShiftCode::where('shift_code_status', 1)->orderBy('shiftcode')->get();
        }
    }

    public function sheets(): array
    {
        $cutoff = PayrollCutoffSchedule::find($this->cutoffId)
            ?? PayrollCutoffSchedule::orderBy('ID', 'desc')->first();

        $days = $this->getDaysBetween($cutoff->payroll_date_start, $cutoff->payroll_date_end);

        return [
            new EmployeeListSheet(
                $this->cutoffId,
                $this->employeeIds,
                $this->hris,
                $this->filteredShiftCodes,
                $days,
                $this->managerProdLine,
                $this->holidays
            ),
            new ShiftCodesReferenceSheet($this->filteredShiftCodes),
        ];
    }

    private function getDaysBetween(string $start, string $end): array
    {
        $days    = [];
        $current = strtotime($start);
        $endTs   = strtotime($end);
        while ($current <= $endTs) {
            $days[]  = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }
        return $days;
    }
}

// -----------------------------------------------------------------------------
// Sheet 1 - Employee schedule
// -----------------------------------------------------------------------------
class EmployeeListSheet implements FromCollection, ShouldAutoSize, WithEvents
{
    private int            $cutoffId;
    private array          $employeeIds;
    private HrisApiService $hris;
    private Collection     $shiftCodes;
    private array          $days;
    private ?string        $managerProdLine;
    private array          $holidays;      // normalised plain array
    private array          $holidayMap;    // ['YYYY-MM-DD' => ['name','type','color']]

    // 8 info columns: Emp ID, Name, Dept, Prod Line, Team, Shift Type, Supervisor ID, Approver2 ID
    private const INFO_COLS = 8;

    // Auto-fill rules: team_id=1 & shift_type_id=1
    // weekday shift_code_id=17, weekend=11, holiday+weekday=21
    private const AUTO_TEAM_ID       = 1;
    private const AUTO_SHIFT_TYPE_ID = 1;
    private const SC_WEEKDAY         = 17;
    private const SC_WEEKEND         = 11;
    private const SC_HOLIDAY_WEEKDAY = 21;

    public function __construct(
        int            $cutoffId,
        array          $employeeIds,
        HrisApiService $hris,
        Collection     $shiftCodes,
        array          $days,
        ?string        $managerProdLine = null,
        array          $holidays        = []
    ) {
        $this->cutoffId        = $cutoffId;
        $this->employeeIds     = $employeeIds;
        $this->hris            = $hris;
        $this->shiftCodes      = $shiftCodes;
        $this->days            = $days;
        $this->managerProdLine = $managerProdLine;
        $this->holidays        = $holidays;

        // Build date-keyed map for fast lookups
        $this->holidayMap = [];
        foreach ($holidays as $h) {
            $this->holidayMap[$h['date']] = $h;
        }
    }

    public function collection()
    {
        return collect([]);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet     = $event->sheet->getDelegate();
                $daysCount = count($this->days);

                // ── Resolve shift codes for auto-fill ─────────────────────────
                $scWeekday        = $this->getShiftCodeString(self::SC_WEEKDAY);
                $scWeekend        = $this->getShiftCodeString(self::SC_WEEKEND);
                $scHolidayWeekday = $this->getShiftCodeString(self::SC_HOLIDAY_WEEKDAY);

                // ── Legend header ─────────────────────────────────────────────
                $sheet->mergeCells('A1:H1');
                $sheet->setCellValue('A1', 'SHIFT CODE LEGEND');
                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                $codes       = $this->shiftCodes->filter(fn($c) => !empty($c->shiftcode))->values();
                $codesPerRow = 4;
                $colsPerCode = 2;

                foreach ($codes as $index => $code) {
                    $row      = 2 + intdiv($index, $codesPerRow);
                    $colIndex = ($index % $codesPerRow) * $colsPerCode;
                    $codeCol  = $this->colLetter($colIndex);
                    $descCol  = $this->colLetter($colIndex + 1);

                    $sheet->setCellValue("{$codeCol}{$row}", $code->shiftcode);
                    $sheet->setCellValue("{$descCol}{$row}", $code->shiftcode_desc);

                    $bg   = ltrim($code->shiftcode_bg_color, '#') ?: 'FFFFFF';
                    $font = ltrim($code->shiftcode_font_color, '#') ?: '000000';

                    $base = [
                        'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                        'font'    => ['bold' => true, 'color' => ['rgb' => $font]],
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'AAAAAA']]],
                    ];
                    $sheet->getStyle("{$codeCol}{$row}")->applyFromArray(array_merge($base, ['alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]]));
                    $sheet->getStyle("{$descCol}{$row}")->applyFromArray(array_merge($base, ['alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT]]));
                }

                $totalRows    = ceil(count($codes) / $codesPerRow);
                $legendEndRow = 1 + $totalRows;

                // ── Holiday legend row ─────────────────────────────────────────
                $holidayLegendRow = $legendEndRow + 1;
                if (!empty($this->holidays)) {
                    $sheet->mergeCells("A{$holidayLegendRow}:H{$holidayLegendRow}");
                    $sheet->setCellValue("A{$holidayLegendRow}", '★ Highlighted columns below are holidays');
                    $sheet->getStyle("A{$holidayLegendRow}")->applyFromArray([
                        'font'      => ['bold' => true, 'color' => ['rgb' => '7B2D00'], 'size' => 10],
                        'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFDDC1']],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
                    ]);
                }

                $sepRow    = $holidayLegendRow + 1;
                $lastCol   = $this->colLetter(self::INFO_COLS + $daysCount - 1);

                // ── Cutoff header ──────────────────────────────────────────────
                $cutoffStart = date('M d, Y', strtotime($this->days[0]));
                $cutoffEnd   = date('M d, Y', strtotime(end($this->days)));
                $cutoffRow   = $sepRow;

                $sheet->mergeCells("A{$cutoffRow}:{$lastCol}{$cutoffRow}");
                $sheet->setCellValue("A{$cutoffRow}", "Cutoff: {$cutoffStart} to {$cutoffEnd}");
                $sheet->getStyle("A{$cutoffRow}")->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 12],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // ── Dual header ────────────────────────────────────────────────
                $dateHeaderRow = $cutoffRow + 1;
                $dayHeaderRow  = $dateHeaderRow + 1;

                $staticHeaders = [
                    'Emp ID',
                    'Employee Name',
                    'Department',
                    'Production Line',
                    'Team',
                    'Shift Type',
                    'Supervisor ID',
                    'Approver2 ID',
                ];

                foreach ($staticHeaders as $ci => $h) {
                    $col = $this->colLetter($ci);
                    $sheet->mergeCells("{$col}{$dateHeaderRow}:{$col}{$dayHeaderRow}");
                    $sheet->setCellValue("{$col}{$dateHeaderRow}", $h);
                }

                foreach ($this->days as $i => $day) {
                    $col     = $this->colLetter(self::INFO_COLS + $i);
                    $holiday = $this->holidayMap[$day] ?? null;
                    $label   = date('d-M', strtotime($day));
                    if ($holiday) {
                        $label .= ' ★';
                    }
                    $sheet->setCellValue("{$col}{$dateHeaderRow}", $label);
                    $sheet->setCellValue("{$col}{$dayHeaderRow}", date('D', strtotime($day)));
                }

                // Default header style
                $sheet->getStyle("A{$dateHeaderRow}:{$lastCol}{$dayHeaderRow}")->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // Override holiday date columns with their color
                foreach ($this->days as $i => $day) {
                    $holiday = $this->holidayMap[$day] ?? null;
                    if (!$holiday) continue;
                    $col     = $this->colLetter(self::INFO_COLS + $i);
                    $hexBg   = ltrim($holiday['color'], '#');
                    $sheet->getStyle("{$col}{$dateHeaderRow}:{$col}{$dayHeaderRow}")->applyFromArray([
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $hexBg]],
                        'font' => ['bold' => true, 'color' => ['rgb' => $this->contrastColor($hexBg)]],
                    ]);
                }

                // Hide supervisor/approver columns
                $sheet->getColumnDimension('G')->setVisible(false);
                $sheet->getColumnDimension('H')->setVisible(false);

                // ── Data rows ──────────────────────────────────────────────────
                $dataStartRow = $dayHeaderRow + 1;
                $row          = $dataStartRow;

                if (!empty($this->employeeIds)) {
                    $employees      = $this->hris->fetchEmployeesBulk($this->employeeIds);
                    $approversCache = [];

                    foreach ($this->employeeIds as $empId) {
                        $emp  = $employees[$empId] ?? [];
                        $work = $this->hris->fetchWorkDetails((int) $empId);

                        $supervisorId = $work['supervisor_id'] ?? null;
                        $approver2Id  = null;

                        if (!isset($approversCache[$empId])) {
                            $approvers = $this->hris->fetchApprovers((int) $empId);
                            if ($approvers) {
                                $supervisorId = $approvers['approver1_id'] ?? $supervisorId;
                                $approver2Id  = $approvers['approver2_id'] ?? null;
                            }
                            $approversCache[$empId] = compact('supervisorId', 'approver2Id');
                        } else {
                            $supervisorId = $approversCache[$empId]['supervisorId'];
                            $approver2Id  = $approversCache[$empId]['approver2Id'];
                        }

                        $sheet->setCellValue("A{$row}", $empId);
                        $sheet->setCellValue("B{$row}", $emp['emp_name']   ?? '');
                        $sheet->setCellValue("C{$row}", $emp['department'] ?? '');
                        $sheet->setCellValue("D{$row}", $emp['prodline']   ?? '');
                        $sheet->setCellValue("E{$row}", $work['team']       ?? '');
                        $sheet->setCellValue("F{$row}", $work['shift_type'] ?? '');
                        $sheet->setCellValue("G{$row}", $supervisorId ?? '');
                        $sheet->setCellValue("H{$row}", $approver2Id  ?? '');


                        // ── Auto-fill for team_id=1 & shift_type_id=1 ─────────
                        $teamId      = (int) ($work['team_id']       ?? $work['team']       ?? 0);
                        $shiftTypeId = (int) ($work['shift_type_id'] ?? $work['shift_type'] ?? 0);

                        if ($teamId === self::AUTO_TEAM_ID && $shiftTypeId === self::AUTO_SHIFT_TYPE_ID) {
                            foreach ($this->days as $i => $day) {
                                $isWeekend = in_array(date('N', strtotime($day)), [6, 7]);
                                $isHoliday = isset($this->holidayMap[$day]);

                                if ($isHoliday && !$isWeekend && $scHolidayWeekday) {
                                    $value      = $scHolidayWeekday;
                                    $shiftCodeId = self::SC_HOLIDAY_WEEKDAY;
                                } elseif ($isWeekend && $scWeekend) {
                                    $value      = $scWeekend;
                                    $shiftCodeId = self::SC_WEEKEND;
                                } elseif (!$isWeekend && $scWeekday) {
                                    $value      = $scWeekday;
                                    $shiftCodeId = self::SC_WEEKDAY;
                                } else {
                                    continue;
                                }

                                $col = $this->colLetter(self::INFO_COLS + $i);
                                $sheet->setCellValue("{$col}{$row}", $value);

                                // ── Apply shift code colors ───────────────────────────
                                $shiftModel = $this->shiftCodes->firstWhere('shift_code_id', $shiftCodeId)
                                    ?? ShiftCode::find($shiftCodeId);

                                if ($shiftModel) {
                                    $bg   = ltrim($shiftModel->shiftcode_bg_color,   '#') ?: 'FFFFFF';
                                    $font = ltrim($shiftModel->shiftcode_font_color, '#') ?: '000000';
                                    $sheet->getStyle("{$col}{$row}")->applyFromArray([
                                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                                        'font' => ['bold' => true, 'color' => ['rgb' => $font]],
                                    ]);
                                }
                            }
                        }

                        $row++;
                    }
                }

                // ── Freeze pane ───────────────────────────────────────────────
                $freezeColumn = $this->colLetter(self::INFO_COLS);
                $sheet->freezePane($freezeColumn . $dataStartRow);

                // ── Column widths ─────────────────────────────────────────────
                $sheet->getColumnDimension('A')->setWidth(12);
                $sheet->getColumnDimension('B')->setWidth(28);
                $sheet->getColumnDimension('C')->setWidth(20);
                $sheet->getColumnDimension('D')->setWidth(18);
                $sheet->getColumnDimension('E')->setWidth(14);
                $sheet->getColumnDimension('F')->setWidth(14);
                $sheet->getColumnDimension('G')->setWidth(12);
                $sheet->getColumnDimension('H')->setWidth(12);

                for ($i = 0; $i < $daysCount; $i++) {
                    $sheet->getColumnDimension($this->colLetter(self::INFO_COLS + $i))->setWidth(10);
                }
            },
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Resolve the shiftcode string (e.g. "N", "D") for a given shift_code_id PK.
     * Returns null if the code does not exist.
     */
    private function getShiftCodeString(int $shiftCodeId): ?string
    {
        // Check in the already-loaded collection first
        $found = $this->shiftCodes->firstWhere('shift_code_id', $shiftCodeId);
        if ($found) {
            return $found->shiftcode;
        }
        // Fallback: query directly (the code might be outside the filtered set)
        $model = ShiftCode::find($shiftCodeId);
        return $model?->shiftcode;
    }

    /**
     * Return '000000' (black) or 'FFFFFF' (white) depending on background luminance.
     */
    private function contrastColor(string $hex): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        $r = hexdec(substr($hex, 0, 2)) / 255;
        $g = hexdec(substr($hex, 2, 2)) / 255;
        $b = hexdec(substr($hex, 4, 2)) / 255;
        $luminance = 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
        return $luminance > 0.5 ? '000000' : 'FFFFFF';
    }

    private function colLetter(int $index): string
    {
        $col = '';
        while ($index >= 0) {
            $col   = chr(65 + ($index % 26)) . $col;
            $index = intdiv($index, 26) - 1;
        }
        return $col;
    }
}

// -----------------------------------------------------------------------------
// Sheet 2 - Shift codes reference
// -----------------------------------------------------------------------------
class ShiftCodesReferenceSheet implements FromCollection, ShouldAutoSize, WithEvents
{
    private Collection $shiftCodes;

    public function __construct(Collection $shiftCodes)
    {
        $this->shiftCodes = $shiftCodes;
    }

    public function collection()
    {
        return $this->shiftCodes->map(fn($c) => [
            'shiftcode'   => $c->shiftcode,
            'description' => $c->shiftcode_desc,
            'group'       => $c->shift_group,
            'bg_color'    => $c->shiftcode_bg_color,
            'font_color'  => $c->shiftcode_font_color,
        ]);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                $sheet->setCellValue('A1', 'Shift Code');
                $sheet->setCellValue('B1', 'Description');
                $sheet->setCellValue('C1', 'Group');
                $sheet->setCellValue('D1', 'Background Color');
                $sheet->setCellValue('E1', 'Font Color');

                $sheet->getStyle('A1:E1')->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                $row = 2;
                foreach ($this->shiftCodes as $code) {
                    if (empty($code->shiftcode)) continue;
                    $bg   = ltrim($code->shiftcode_bg_color,   '#') ?: 'FFFFFF';
                    $font = ltrim($code->shiftcode_font_color, '#') ?: '000000';
                    $sheet->getStyle("A{$row}:E{$row}")->applyFromArray([
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg]],
                        'font' => ['bold' => true, 'color' => ['rgb' => $font]],
                    ]);
                    $row++;
                }

                foreach (range('A', 'E') as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }
            },
        ];
    }
}
