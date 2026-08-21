<?php

namespace App\Http\Resources;

use App\Models\TaskStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TaskStatus
 */
class TaskStatusResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'color' => $this->color,
            'position' => $this->position,
            'is_done' => $this->is_done,
            'tasks' => $this->relationLoaded('tasks')
                ? $this->tasks
                    ->map(fn ($task) => (new TaskResource($task))->resolve($request))
                    ->values()
                    ->all()
                : [],
        ];
    }
}
