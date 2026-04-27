<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorkScheduleController;

$app_name = env('APP_NAME', '');

Route::redirect('/', "/$app_name");



Route::prefix('work-schedule')->name('workschedule.')->group(function () {

    // Listing table (Index page)
    // GET  /work-schedule                → WorkScheduleIndex.jsx
    // GET  /work-schedule?...&Accept:json → JSON (XHR pagination / tab switch)
    Route::get('/',          [WorkScheduleController::class, 'index'])->name('index');

    // Template upload page
    Route::get('/template',  [WorkScheduleController::class, 'templatePage'])->name('template');

    // Download the Excel template
    Route::get('/template/download', [WorkScheduleController::class, 'downloadTemplate'])->name('template.download');

    // Submit filled template
    Route::post('/template/submit',  [WorkScheduleController::class, 'submitTemplate'])->name('template.submit');

    // Detail view — reached by clicking "View" in the index table
    // GET  /work-schedule/view?created_by=XXX&date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
    Route::get('/view',      [WorkScheduleController::class, 'viewSchedules'])->name('view');

    // Helper: list all dates in a cutoff period
    Route::get('/cutoff-days', [WorkScheduleController::class, 'getCutoffDays'])->name('cutoff-days');

    Route::post('/acknowledge', [WorkScheduleController::class, 'acknowledge'])->name('acknowledge');
    Route::post('/approve',    [WorkScheduleController::class, 'approve'])->name('approve');
    Route::post('/disapprove', [WorkScheduleController::class, 'disapprove'])->name('disapprove');
});
