<?php

use App\Http\Controllers\General\AdminController;
use App\Http\Controllers\General\ProfileController;
use App\Http\Controllers\WorkScheduleController;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\AuthMiddleware;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;

$app_name = env('APP_NAME', '');

Route::redirect('/', "/$app_name");

Route::prefix($app_name)->middleware(AuthMiddleware::class)->group(function () {

  Route::middleware(AdminMiddleware::class)->group(function () {
    Route::get("/admin", [AdminController::class, 'index'])->name('admin');
    Route::get("/new-admin", [AdminController::class, 'index_addAdmin'])->name('index_addAdmin');
    Route::post("/add-admin", [AdminController::class, 'addAdmin'])->name('addAdmin');
    Route::post("/remove-admin", [AdminController::class, 'removeAdmin'])->name('removeAdmin');
    Route::patch("/change-admin-role", [AdminController::class, 'changeAdminRole'])->name('changeAdminRole');

    Route::get("/workschedule/cutoff-days", [WorkScheduleController::class, 'getCutoffDays'])->name('workschedule.cutoffDays');
  });

  Route::get("/workschedule/template", [WorkScheduleController::class, 'templatePage'])->name('workschedule.template.page');
  Route::get("/workschedule/download", [WorkScheduleController::class, 'downloadTemplate'])->name('workschedule.template.download');
  Route::get("/workschedule/view", [WorkScheduleController::class, 'viewSchedules'])->name('workschedule.view');

  Route::get("/", [DashboardController::class, 'index'])->name('dashboard');
  Route::get("/profile", [ProfileController::class, 'index'])->name('profile.index');
  Route::post("/change-password", [ProfileController::class, 'changePassword'])->name('changePassword');
});
