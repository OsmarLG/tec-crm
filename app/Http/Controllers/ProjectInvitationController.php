<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Notifications\ProjectInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProjectInvitationController extends Controller
{
    public function accept(Request $request, string $notification): RedirectResponse
    {
        $project = DB::transaction(function () use ($request, $notification): ?Project {
            $invitation = DatabaseNotification::query()
                ->whereKey($notification)
                ->whereMorphedTo('notifiable', $request->user())
                ->where('type', ProjectInvitation::class)
                ->lockForUpdate()
                ->firstOrFail();

            $project = Project::find($invitation->data['project_id']);

            if ($project) {
                $project->members()->syncWithoutDetaching([
                    $request->user()->id => ['role' => 'member'],
                ]);
            }

            $invitation->delete();

            return $project;
        });

        Inertia::flash('toast', [
            'type' => $project ? 'success' : 'error',
            'message' => $project ? __('Invitation accepted.') : __('The project no longer exists.'),
        ]);

        return $project ? to_route('projects.show', $project) : back();
    }

    public function reject(Request $request, string $notification): RedirectResponse
    {
        DatabaseNotification::query()
            ->whereKey($notification)
            ->whereMorphedTo('notifiable', $request->user())
            ->where('type', ProjectInvitation::class)
            ->firstOrFail()
            ->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation rejected.')]);

        return back();
    }
}
