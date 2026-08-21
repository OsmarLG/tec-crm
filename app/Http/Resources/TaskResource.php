<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
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
            'task_status_id' => $this->task_status_id,
            'title' => $this->title,
            'description' => $this->description,
            'details' => $this->details,
            'priority' => $this->priority->value,
            'position' => $this->position,
            'due_date' => $this->due_date?->toDateString(),
            'start_date' => $this->start_date?->toDateString(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'module' => $this->whenLoaded('module', fn () => $this->module === null ? null : [
                'id' => $this->module->id,
                'name' => $this->module->name,
                'color' => $this->module->color,
            ]),
            'tags' => $this->relationLoaded('tags')
                ? $this->tags->map(fn ($tag) => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'color' => $tag->color,
                ])->values()->all()
                : [],
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee === null ? null : [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
                'email' => $this->assignee->email,
            ]),
            'assignees' => $this->relationLoaded('assignees')
                ? $this->assignees->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])->values()->all()
                : [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
