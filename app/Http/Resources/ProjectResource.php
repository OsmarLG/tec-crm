<?php

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
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
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'archived_at' => $this->archived_at?->toIso8601String(),
            'is_archived' => $this->isArchived(),
            'can_manage_members' => $request->user()?->id === $this->user_id,
            'can_delete' => $request->user()?->can('delete', $this->resource) ?? false,
            'tasks_count' => $this->whenCounted('tasks'),
            'statuses' => $this->relationLoaded('statuses')
                ? $this->statuses
                    ->map(fn ($status) => (new TaskStatusResource($status))->resolve($request))
                    ->values()
                    ->all()
                : [],
            'members' => $this->relationLoaded('members')
                ? $this->members->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->pivot->role,
                ])->values()->all()
                : [],
            'diagrams' => $this->relationLoaded('whiteboards')
                ? $this->whiteboards->map(fn ($diagram) => [
                    'id' => $diagram->id,
                    'name' => $diagram->name,
                    'updated_at' => $diagram->updated_at?->toIso8601String(),
                ])->values()->all()
                : [],
            'modules' => $this->relationLoaded('modules')
                ? $this->modules->map->only(['id', 'name', 'color'])->values()->all()
                : [],
            'tags' => $this->relationLoaded('tags')
                ? $this->tags->map->only(['id', 'name', 'color'])->values()->all()
                : [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
