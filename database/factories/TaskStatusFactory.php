<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskStatus>
 */
class TaskStatusFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => fake()->word(),
            'color' => fake()->hexColor(),
            'position' => 0,
            'is_done' => false,
        ];
    }

    /**
     * Indicate that tasks in this column are considered complete.
     */
    public function done(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Done',
            'is_done' => true,
        ]);
    }
}
