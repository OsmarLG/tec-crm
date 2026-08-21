<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $project_id
 * @property array<int, mixed>|null $elements
 * @property array<string, mixed>|null $app_state
 * @property array<string, mixed>|null $files
 * @property array<int, mixed>|null $library_items
 * @property int|null $updated_by
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Project $project
 * @property-read User|null $editor
 */
#[Fillable(['name', 'elements', 'app_state', 'files', 'library_items', 'updated_by'])]
class ProjectWhiteboard extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'elements' => 'array',
            'app_state' => 'array',
            'files' => 'array',
            'library_items' => 'array',
        ];
    }

    /**
     * The project the whiteboard belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The user that last saved the whiteboard.
     *
     * @return BelongsTo<User, $this>
     */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
