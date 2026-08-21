<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use App\Notifications\ProjectInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectMemberController extends Controller
{
    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $validated['email'])->firstOrFail();
        abort_if($project->user_id === $user->id, 422, __('You already own this project.'));
        abort_if($project->members()->whereKey($user->id)->exists(), 422, __('This user is already a member.'));

        $alreadyInvited = $user->notifications()
            ->where('type', ProjectInvitation::class)
            ->get()
            ->contains(fn ($notification) => (int) ($notification->data['project_id'] ?? 0) === $project->id);

        abort_if($alreadyInvited, 422, __('This user already has a pending invitation.'));

        $user->notify(new ProjectInvitation($project, $request->user()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation sent.')]);

        return back();
    }

    public function destroy(Project $project, User $user): RedirectResponse
    {
        $this->authorize('update', $project);
        abort_if($project->user_id === $user->id, 422, __('The project owner cannot be removed.'));

        $project->members()->detach($user->id);
        $project->tasks()->whereHas('assignees', fn ($query) => $query->whereKey($user->id))
            ->each(fn ($task) => $task->assignees()->detach($user->id));
        $project->tasks()->where('assigned_to', $user->id)->update(['assigned_to' => null]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member removed.')]);

        return back();
    }
}
