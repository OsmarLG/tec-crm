<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Policies\TaskPolicy;
use Carbon\CarbonImmutable;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property int $project_id
 * @property int $task_status_id
 * @property int|null $assigned_to
 * @property int|null $created_by
 * @property string $title
 * @property string|null $description
 * @property array<string, mixed>|null $details
 * @property TaskPriority $priority
 * @property int $position
 * @property CarbonImmutable|null $due_date
 * @property CarbonImmutable|null $completed_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Project $project
 * @property-read TaskStatus $status
 * @property-read User|null $assignee
 * @property-read Collection<int, User> $assignees
 */
#[Fillable([
    'task_status_id',
    'project_module_id',
    'assigned_to',
    'title',
    'description',
    'details',
    'priority',
    'position',
    'start_date',
    'due_date',
    'completed_at',
])]
#[UsePolicy(TaskPolicy::class)]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'priority' => TaskPriority::class,
            'details' => 'array',
            'due_date' => 'date',
            'start_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * The project the task belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The Kanban column the task sits in.
     *
     * @return BelongsTo<TaskStatus, $this>
     */
    public function status(): BelongsTo
    {
        return $this->belongsTo(TaskStatus::class, 'task_status_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(ProjectModule::class, 'project_module_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /**
     * The user the task is assigned to.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Users responsible for the task.
     *
     * @return BelongsToMany<User, $this>
     */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    /**
     * The user that created the task.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Sync the completion timestamp with the column the task was moved into.
     */
    public function syncCompletionWithStatus(TaskStatus $status): void
    {
        if ($status->is_done && $this->completed_at === null) {
            $this->completed_at = now();
        }

        if (! $status->is_done) {
            $this->completed_at = null;
        }
    }
}
