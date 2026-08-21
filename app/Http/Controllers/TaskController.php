<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskController extends Controller
{
    /**
     * Store a newly created task.
     */
    public function store(TaskRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $validated = $request->validated();
        $assigneeIds = $this->validatedAssignees($project, $validated['assignee_ids'] ?? []);
        [$moduleId, $tagIds] = $this->resolveClassification($project, $validated);
        unset($validated['assignee_ids'], $validated['module_name'], $validated['tag_names']);

        $status = $project->statuses()->whereKey($validated['task_status_id'])->firstOrFail();
        $validated['task_status_id'] = $status->id;

        $maxPosition = $project->tasks()
            ->where('task_status_id', $validated['task_status_id'])
            ->max('position');

        $task = $project->tasks()->create([
            ...$validated,
            'position' => ($maxPosition ?? -1) + 1,
            'created_by' => $request->user()->id,
            'assigned_to' => $assigneeIds[0] ?? null,
            'project_module_id' => $moduleId,
        ]);

        $task->assignees()->sync($assigneeIds);
        $task->tags()->sync($tagIds);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task created.')]);

        return back();
    }

    /**
     * Update the specified task.
     */
    public function update(TaskRequest $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $project = $task->project;

        $validated = $request->validated();
        $assigneeIds = array_key_exists('assignee_ids', $validated)
            ? $this->validatedAssignees($project, $validated['assignee_ids'])
            : null;
        [$moduleId, $tagIds] = $this->resolveClassification($project, $validated);
        $classificationProvided = array_key_exists('module_name', $validated) || array_key_exists('tag_names', $validated);
        unset($validated['assignee_ids'], $validated['module_name'], $validated['tag_names']);

        if ($classificationProvided) {
            $validated['project_module_id'] = $moduleId;
        }

        if (isset($validated['task_status_id']) && $validated['task_status_id'] !== $task->task_status_id) {
            $newStatus = $project->statuses()->whereKey($validated['task_status_id'])->firstOrFail();
            $task->syncCompletionWithStatus($newStatus);
        }

        $task->update($validated);

        if ($assigneeIds !== null) {
            $task->assignees()->sync($assigneeIds);
            $task->update(['assigned_to' => $assigneeIds[0] ?? null]);
        }

        if ($classificationProvided) {
            $task->tags()->sync($tagIds);
        }

        return back();
    }

    /**
     * Remove the specified task.
     */
    public function destroy(Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);

        $task->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task deleted.')]);

        return back();
    }

    /**
     * Reorder tasks within a column or across columns.
     */
    public function reorder(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $validated = $request->validate([
            'task_id' => ['required', 'integer', 'exists:tasks,id'],
            'task_status_id' => ['required', 'integer', 'exists:task_statuses,id'],
            'position' => ['required', 'integer', 'min:0'],
        ]);

        $task = Task::query()->whereKey($validated['task_id'])->firstOrFail();
        abort_unless($task->project_id === $project->id, 404);
        $this->authorize('update', $task);

        $newStatus = $project->statuses()->whereKey($validated['task_status_id'])->firstOrFail();

        $oldStatusId = $task->task_status_id;
        $oldPosition = $task->position;

        if ($oldStatusId === $newStatus->id) {
            if ($oldPosition < $validated['position']) {
                Task::where('task_status_id', $oldStatusId)
                    ->whereBetween('position', [$oldPosition + 1, $validated['position']])
                    ->decrement('position');
            } else {
                Task::where('task_status_id', $oldStatusId)
                    ->whereBetween('position', [$validated['position'], $oldPosition - 1])
                    ->increment('position');
            }
        } else {
            Task::where('task_status_id', $oldStatusId)
                ->where('position', '>', $oldPosition)
                ->decrement('position');

            Task::where('task_status_id', $newStatus->id)
                ->where('position', '>=', $validated['position'])
                ->increment('position');

            $task->syncCompletionWithStatus($newStatus);
        }

        $task->update([
            'task_status_id' => $newStatus->id,
            'position' => $validated['position'],
        ]);

        return back();
    }

    /**
     * Ensure every selected assignee belongs to the project.
     *
     * @param  array<int, int>  $assigneeIds
     * @return array<int, int>
     */
    private function validatedAssignees(Project $project, array $assigneeIds): array
    {
        $ids = array_values(array_unique(array_map('intval', $assigneeIds)));
        $validIds = $project->members()->whereKey($ids)->pluck('users.id')->map(fn ($id) => (int) $id)->all();

        abort_if(count($validIds) !== count($ids), 422, __('Every assignee must be a project member.'));

        return $validIds;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: int|null, 1: array<int, int>}
     */
    private function resolveClassification(Project $project, array $validated): array
    {
        $moduleName = trim((string) ($validated['module_name'] ?? ''));
        $moduleId = $moduleName === ''
            ? null
            : $project->modules()->firstOrCreate(['name' => $moduleName])->id;

        $tagNames = collect($validated['tag_names'] ?? [])
            ->map(fn ($name) => trim((string) $name))
            ->filter()
            ->unique(fn ($name) => mb_strtolower($name))
            ->values();

        $tagIds = $tagNames
            ->map(fn ($name) => $project->tags()->firstOrCreate(['name' => $name])->id)
            ->all();

        return [$moduleId, $tagIds];
    }
}
