<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProjectBoardTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_board_serializes_statuses_and_tasks_as_arrays(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $project->createDefaultStatuses();

        Task::factory()->for($project)->for($project->statuses()->first(), 'status')->create();

        $this->actingAs($user)
            ->get(route('projects.show', $project))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Projects/Show')
                ->has('project.statuses', 4)
                ->has('project.statuses.0.tasks')
            );
    }
}
