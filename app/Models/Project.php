<?php

namespace App\Models;

use App\Policies\ProjectPolicy;
use Carbon\CarbonImmutable;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string|null $description
 * @property string $color
 * @property CarbonImmutable|null $archived_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property int|null $tasks_count
 * @property int|null $completed_tasks_count
 * @property int|null $members_count
 * @property-read User $user
 * @property-read Collection<int, TaskStatus> $statuses
 * @property-read Collection<int, Task> $tasks
 * @property-read Collection<int, User> $members
 * @property-read Collection<int, ProjectWhiteboard> $whiteboards
 * @property-read Collection<int, ProjectModule> $modules
 * @property-read Collection<int, Tag> $tags
 */
#[Fillable(['name', 'description', 'color', 'archived_at'])]
#[UsePolicy(ProjectPolicy::class)]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::created(function (Project $project): void {
            $project->members()->syncWithoutDetaching([
                $project->user_id => ['role' => 'owner'],
            ]);
        });
    }

    /**
     * The default Kanban columns created with every new project.
     *
     * @var array<int, array{name: string, color: string, is_done: bool}>
     */
    public const DEFAULT_STATUSES = [
        ['name' => 'Backlog', 'color' => '#94a3b8', 'is_done' => false],
        ['name' => 'To Do', 'color' => '#3b82f6', 'is_done' => false],
        ['name' => 'In Progress', 'color' => '#f59e0b', 'is_done' => false],
        ['name' => 'Done', 'color' => '#10b981', 'is_done' => true],
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
        ];
    }

    /**
     * The owner of the project.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The Kanban columns belonging to the project.
     *
     * @return HasMany<TaskStatus, $this>
     */
    public function statuses(): HasMany
    {
        return $this->hasMany(TaskStatus::class)->orderBy('position');
    }

    /**
     * The tasks belonging to the project.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(ProjectModule::class)->orderBy('name');
    }

    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class)->orderBy('name');
    }

    /**
     * Users who can collaborate on the project.
     *
     * @return BelongsToMany<User, $this, ProjectMembership, 'pivot'>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->using(ProjectMembership::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Excalidraw diagrams belonging to the project.
     *
     * @return HasMany<ProjectWhiteboard, $this>
     */
    public function whiteboards(): HasMany
    {
        return $this->hasMany(ProjectWhiteboard::class)->latest('updated_at');
    }

    /**
     * Create the default set of Kanban columns for the project.
     */
    public function createDefaultStatuses(): void
    {
        foreach (self::DEFAULT_STATUSES as $position => $status) {
            $this->statuses()->create([...$status, 'position' => $position]);
        }
    }

    /**
     * Determine whether the project is archived.
     */
    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    /**
     * Scope the query to projects that are not archived.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('archived_at');
    }
}
