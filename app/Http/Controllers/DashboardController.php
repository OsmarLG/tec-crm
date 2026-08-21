<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $projectIds = Project::query()
            ->whereHas('members', fn (Builder $query) => $query->whereKey($user->id))
            ->active()
            ->pluck('id');

        $openTasks = Task::query()
            ->whereIn('project_id', $projectIds)
            ->whereHas('status', fn (Builder $query) => $query->where('is_done', false));

        $projects = Project::query()
            ->whereIn('id', $projectIds)
            ->withCount([
                'tasks',
                'tasks as completed_tasks_count' => fn (Builder $query) => $query
                    ->whereHas('status', fn (Builder $status) => $status->where('is_done', true)),
                'members',
            ])
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'color' => $project->color,
                'tasks_count' => $project->tasks_count,
                'completed_tasks_count' => $project->completed_tasks_count,
                'members_count' => $project->members_count,
                'updated_at' => $project->updated_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $myTasks = Task::query()
            ->whereIn('project_id', $projectIds)
            ->whereHas('status', fn (Builder $query) => $query->where('is_done', false))
            ->where(fn (Builder $query) => $query
                ->where('assigned_to', $user->id)
                ->orWhereHas('assignees', fn (Builder $assignees) => $assignees->whereKey($user->id)))
            ->with(['project:id,name,color', 'status:id,name,color,is_done', 'assignee:id,name', 'assignees:id,name'])
            ->orderByRaw('due_date IS NULL')
            ->orderBy('due_date')
            ->latest('updated_at')
            ->limit(7)
            ->get()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'priority' => $task->priority->value,
                'due_date' => $task->due_date?->toDateString(),
                'project' => [
                    'id' => $task->project->id,
                    'name' => $task->project->name,
                    'color' => $task->project->color,
                ],
                'status' => [
                    'name' => $task->status->name,
                    'color' => $task->status->color,
                ],
                'assignees' => $task->assignees
                    ->when($task->assignees->isEmpty() && $task->assignee, fn ($assignees) => $assignees->push($task->assignee))
                    ->map(fn ($assignee) => ['id' => $assignee->id, 'name' => $assignee->name])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();

        $calendarTasks = Task::query()
            ->whereIn('project_id', $projectIds)
            ->whereNotNull('due_date')
            ->with(['project:id,name,color', 'status:id,name,color,is_done'])
            ->orderBy('due_date')
            ->get()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'due_date' => $task->due_date?->toDateString(),
                'project' => [
                    'id' => $task->project->id,
                    'name' => $task->project->name,
                    'color' => $task->project->color,
                ],
                'status' => [
                    'name' => $task->status->name,
                    'is_done' => $task->status->is_done,
                ],
            ])
            ->values()
            ->all();

        return Inertia::render('dashboard', [
            'summary' => [
                'projects' => $projectIds->count(),
                'open_tasks' => (clone $openTasks)->count(),
                'due_soon' => (clone $openTasks)
                    ->whereBetween('due_date', [today(), today()->addDays(7)])
                    ->count(),
                'overdue' => (clone $openTasks)
                    ->whereDate('due_date', '<', today())
                    ->count(),
                'completed_this_week' => Task::query()
                    ->whereIn('project_id', $projectIds)
                    ->where('completed_at', '>=', now()->subDays(7))
                    ->count(),
            ],
            'projects' => $projects,
            'myTasks' => $myTasks,
            'calendarTasks' => $calendarTasks,
        ]);
    }
}
