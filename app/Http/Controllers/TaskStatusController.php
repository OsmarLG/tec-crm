<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskStatusRequest;
use App\Models\Project;
use App\Models\TaskStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskStatusController extends Controller
{
    /**
     * Store a newly created column.
     */
    public function store(TaskStatusRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $maxPosition = $project->statuses()->max('position');

        $project->statuses()->create([
            ...$request->validated(),
            'position' => ($maxPosition ?? -1) + 1,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Column created.')]);

        return back();
    }

    /**
     * Update the specified column.
     */
    public function update(TaskStatusRequest $request, TaskStatus $status): RedirectResponse
    {
        $this->authorize('update', $status);

        $status->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Column updated.')]);

        return back();
    }

    /**
     * Remove the specified column.
     */
    public function destroy(TaskStatus $status): RedirectResponse
    {
        $this->authorize('delete', $status);

        $project = $status->project;

        if ($project->statuses()->count() <= 1) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Cannot delete the last column.')]);

            return back();
        }

        $status->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Column deleted.')]);

        return back();
    }

    /**
     * Reorder columns within the project.
     */
    public function reorder(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $validated = $request->validate([
            'status_id' => ['required', 'integer', 'exists:task_statuses,id'],
            'position' => ['required', 'integer', 'min:0'],
        ]);

        $status = TaskStatus::query()->whereKey($validated['status_id'])->firstOrFail();
        abort_unless($status->project_id === $project->id, 404);
        $this->authorize('update', $status);

        $oldPosition = $status->position;
        $newPosition = $validated['position'];

        if ($oldPosition < $newPosition) {
            TaskStatus::where('project_id', $project->id)
                ->whereBetween('position', [$oldPosition + 1, $newPosition])
                ->decrement('position');
        } else {
            TaskStatus::where('project_id', $project->id)
                ->whereBetween('position', [$newPosition, $oldPosition - 1])
                ->increment('position');
        }

        $status->update(['position' => $newPosition]);

        return back();
    }
}
