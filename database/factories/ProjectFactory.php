<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->unique()->sentence(3),
            'description' => fake()->optional()->sentence(),
            'color' => fake()->hexColor(),
            'archived_at' => null,
        ];
    }

    /**
     * Indicate that the project is archived.
     */
    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'archived_at' => now(),
        ]);
    }

    /**
     * Create the project with its default Kanban columns.
     */
    public function withDefaultStatuses(): static
    {
        return $this->afterCreating(fn (Project $project) => $project->createDefaultStatuses());
    }
}
