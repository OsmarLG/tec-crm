<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $project = Project::factory();

        return [
            'project_id' => $project,
            'task_status_id' => TaskStatus::factory()->for($project),
            'assigned_to' => null,
            'created_by' => null,
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'priority' => fake()->randomElement(TaskPriority::values()),
            'position' => 0,
            'due_date' => fake()->optional()->dateTimeBetween('now', '+1 month'),
            'completed_at' => null,
        ];
    }

    /**
     * Place the task in the given column, keeping the project in sync.
     */
    public function inStatus(TaskStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => $status->project_id,
            'task_status_id' => $status->id,
        ]);
    }

    /**
     * Indicate that the task is complete.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'completed_at' => now(),
        ]);
    }
}
