<?php

use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskStatusController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::apiResource('projects', ProjectController::class)->except(['index', 'show']);
    Route::post('projects/{project}/tasks', [TaskController::class, 'store'])->name('projects.tasks.store');
    Route::patch('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');
    Route::post('projects/{project}/statuses', [TaskStatusController::class, 'store'])->name('projects.statuses.store');
    Route::patch('statuses/{status}', [TaskStatusController::class, 'update'])->name('statuses.update');
    Route::delete('statuses/{status}', [TaskStatusController::class, 'destroy'])->name('statuses.destroy');
    Route::post('projects/{project}/members', [ProjectMemberController::class, 'store'])->name('projects.members.store');
    Route::delete('projects/{project}/members/{user}', [ProjectMemberController::class, 'destroy'])->name('projects.members.destroy');

    Route::post('projects/{project}/tasks/reorder', [TaskController::class, 'reorder'])->name('projects.tasks.reorder');
    Route::post('projects/{project}/statuses/reorder', [TaskStatusController::class, 'reorder'])->name('projects.statuses.reorder');
});
