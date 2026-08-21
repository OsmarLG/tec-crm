<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectInvitationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WhiteboardController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => Auth::check() ? to_route('dashboard') : to_route('login'))->name('home');

Route::middleware(['auth', 'active', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::post('projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::get('projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::patch('projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
    Route::delete('projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
    Route::post('invitations/{notification}/accept', [ProjectInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{notification}', [ProjectInvitationController::class, 'reject'])->name('invitations.reject');

    Route::get('projects/{project}/whiteboard', [WhiteboardController::class, 'legacy'])->name('projects.whiteboard');
    Route::post('projects/{project}/diagrams', [WhiteboardController::class, 'store'])->name('projects.diagrams.store');
    Route::get('projects/{project}/diagrams/{diagram}', [WhiteboardController::class, 'show'])->name('projects.diagrams.show');
    Route::patch('projects/{project}/diagrams/{diagram}', [WhiteboardController::class, 'update'])->name('projects.diagrams.update');
    Route::delete('projects/{project}/diagrams/{diagram}', [WhiteboardController::class, 'destroy'])->name('projects.diagrams.destroy');

    Route::get('admin/users', [UserController::class, 'index'])->name('admin.users.index');
    Route::post('admin/users', [UserController::class, 'store'])->name('admin.users.store');
    Route::patch('admin/users/{user}', [UserController::class, 'update'])->name('admin.users.update');
});

require __DIR__.'/settings.php';
