<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('summary.projects', 0)
            ->where('summary.open_tasks', 0)
            ->has('projects', 0)
            ->has('myTasks', 0)
        );
    }

    public function test_dashboard_summarizes_accessible_projects_and_assigned_tasks(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->withDefaultStatuses()->create();
        $status = $project->statuses()->where('is_done', false)->firstOrFail();
        $task = Task::factory()->inStatus($status)->create([
            'title' => 'Revisar propuesta',
            'due_date' => today()->addDays(2),
        ]);
        $task->assignees()->attach($user);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.projects', 1)
                ->where('summary.open_tasks', 1)
                ->where('summary.due_soon', 1)
                ->has('projects', 1)
                ->where('myTasks.0.title', 'Revisar propuesta')
            );
    }
}
