<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectWhiteboard;
use App\Models\Task;
use App\Models\User;
use App\Notifications\ProjectInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProjectCollaborationTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_project_adds_the_owner_only_once(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)
            ->post(route('projects.store'), [
                'name' => 'Nuevo proyecto',
                'description' => null,
            ])
            ->assertRedirect();

        $project = Project::where('name', 'Nuevo proyecto')->sole();

        $this->assertDatabaseCount('project_user', 1);
        $this->assertDatabaseHas('project_user', [
            'project_id' => $project->id,
            'user_id' => $owner->id,
            'role' => 'owner',
        ]);
    }

    public function test_project_invitation_must_be_accepted_before_membership_is_created(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();
        $project = Project::factory()->for($owner)->create();

        $this->actingAs($owner)
            ->post(route('projects.members.store', $project), ['email' => $invitee->email])
            ->assertRedirect();

        $this->assertFalse($project->members()->whereKey($invitee->id)->exists());
        $invitation = $invitee->notifications()->where('type', ProjectInvitation::class)->sole();

        $this->actingAs($invitee)
            ->post(route('invitations.accept', $invitation->id))
            ->assertRedirect(route('projects.show', $project));

        $this->assertTrue($project->members()->whereKey($invitee->id)->exists());
        $this->assertDatabaseMissing('notifications', ['id' => $invitation->id]);
    }

    public function test_project_invitation_can_be_rejected(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $invitee->notify(new ProjectInvitation($project, $owner));
        $invitation = $invitee->notifications()->sole();

        $this->actingAs($invitee)
            ->delete(route('invitations.reject', $invitation->id))
            ->assertRedirect();

        $this->assertFalse($project->members()->whereKey($invitee->id)->exists());
        $this->assertDatabaseMissing('notifications', ['id' => $invitation->id]);
    }

    public function test_only_the_owner_can_delete_a_project(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $project->members()->attach($member, ['role' => 'member']);

        $this->actingAs($member)->delete(route('projects.destroy', $project))->assertForbidden();
        $this->actingAs($owner)->delete(route('projects.destroy', $project))->assertRedirect(route('projects.index'));

        $this->assertModelMissing($project);
    }

    public function test_authenticated_member_can_reorder_a_task_through_the_api(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->withDefaultStatuses()->create();
        $statuses = $project->statuses()->get();
        $task = Task::factory()->inStatus($statuses[0])->create(['position' => 0]);

        $this->actingAs($user)
            ->post(route('projects.tasks.reorder', $project), [
                'task_id' => $task->id,
                'task_status_id' => $statuses[1]->id,
                'position' => 0,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'task_status_id' => $statuses[1]->id,
            'position' => 0,
        ]);
    }

    public function test_task_can_store_rich_details_and_multiple_assignees(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->for($owner)->withDefaultStatuses()->create();
        $project->members()->attach($member, ['role' => 'member']);
        $status = $project->statuses()->firstOrFail();

        $this->actingAs($owner)
            ->post(route('projects.tasks.store', $project), [
                'task_status_id' => $status->id,
                'title' => 'Preparar propuesta',
                'priority' => 'high',
                'assignee_ids' => [$owner->id, $member->id],
                'details' => [
                    'type' => 'doc',
                    'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Alcance aprobado']]]],
                ],
            ])
            ->assertRedirect();

        $task = Task::where('title', 'Preparar propuesta')->firstOrFail();

        $this->assertSame('doc', $task->details['type']);
        $this->assertEqualsCanonicalizing([$owner->id, $member->id], $task->assignees()->pluck('users.id')->all());
    }

    public function test_modules_and_tags_are_reused_within_a_project(): void
    {
        $owner = User::factory()->create();
        $project = Project::factory()->for($owner)->withDefaultStatuses()->create();
        $status = $project->statuses()->firstOrFail();

        foreach (['Solicitud', 'Reporte'] as $title) {
            $this->actingAs($owner)->post(route('projects.tasks.store', $project), [
                'task_status_id' => $status->id,
                'title' => $title,
                'module_name' => 'Servicio Social',
                'tag_names' => ['Backend', 'Formatos'],
            ])->assertRedirect();
        }

        $this->assertDatabaseCount('project_modules', 1);
        $this->assertDatabaseCount('tags', 2);
        $this->assertDatabaseCount('tag_task', 4);
        $this->assertSame(2, $project->tasks()->whereHas('module', fn ($query) => $query->where('name', 'Servicio Social'))->count());
    }

    public function test_modules_and_tags_are_isolated_per_project(): void
    {
        $owner = User::factory()->create();
        $projects = Project::factory()->count(2)->for($owner)->withDefaultStatuses()->create();

        foreach ($projects as $project) {
            $this->actingAs($owner)->post(route('projects.tasks.store', $project), [
                'task_status_id' => $project->statuses()->firstOrFail()->id,
                'title' => 'Tarea '.$project->id,
                'module_name' => 'Administración',
                'tag_names' => ['Urgente'],
            ])->assertRedirect();
        }

        $this->assertDatabaseCount('project_modules', 2);
        $this->assertDatabaseCount('tags', 2);
    }

    public function test_project_can_have_multiple_diagrams(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)->post(route('projects.diagrams.store', $project), ['name' => 'Arquitectura'])->assertRedirect();
        $this->actingAs($user)->post(route('projects.diagrams.store', $project), ['name' => 'Flujo comercial'])->assertRedirect();

        $this->assertSame(2, ProjectWhiteboard::whereBelongsTo($project)->count());
    }

    public function test_diagram_library_is_persisted_and_restored(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $diagram = $project->whiteboards()->create(['name' => 'Datos']);
        $libraryItems = [['id' => 'database-icon', 'status' => 'published', 'elements' => [], 'created' => 1]];

        $this->actingAs($user)
            ->patch(route('projects.diagrams.update', [$project, $diagram]), [
                'library_items' => $libraryItems,
            ])
            ->assertRedirect();

        $this->assertSame($libraryItems, $diagram->fresh()->library_items);

        $this->actingAs($user)
            ->get(route('projects.diagrams.show', [$project, $diagram]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('diagram.library_items.0.id', 'database-icon')
            );
    }

    public function test_duplicate_diagram_names_are_rejected_and_diagrams_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('projects.diagrams.store', $project), ['name' => 'Base de datos'])
            ->assertRedirect();

        $this->actingAs($user)
            ->post(route('projects.diagrams.store', $project), ['name' => 'Base de datos'])
            ->assertSessionHasErrors('name');

        $diagram = $project->whiteboards()->sole();

        $this->actingAs($user)
            ->delete(route('projects.diagrams.destroy', [$project, $diagram]))
            ->assertRedirect(route('projects.show', $project));

        $this->assertModelMissing($diagram);
    }
}
