<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        return Inertia::render('Admin/Users', [
            'users' => User::query()
                ->withCount(['projects', 'taskAssignments'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => $this->serializeUser($user))
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'is_admin' => ['required', 'boolean'],
        ]);

        User::create([
            ...$validated,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User created.')]);

        return back();
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', Password::defaults()],
            'is_admin' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ]);

        if ($request->user()->is($user) && (! $validated['is_admin'] || ! $validated['is_active'])) {
            return back()->withErrors(['user' => __('You cannot remove your own access.')]);
        }

        if ($user->is_admin && $user->is_active && (! $validated['is_admin'] || ! $validated['is_active'])) {
            $otherAdmins = User::query()
                ->whereKeyNot($user->id)
                ->where('is_admin', true)
                ->where('is_active', true)
                ->exists();

            if (! $otherAdmins) {
                return back()->withErrors(['user' => __('At least one active administrator is required.')]);
            }
        }

        if (blank($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User updated.')]);

        return back();
    }

    /** @return array<string, mixed> */
    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'is_active' => $user->is_active,
            'projects_count' => $user->projects_count,
            'task_assignments_count' => $user->task_assignments_count,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
