<?php

namespace Database\Seeders;

use App\Enums\TaskPriority;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'is_admin' => true,
        ]);

        $project = Project::factory()
            ->for($user)
            ->withDefaultStatuses()
            ->create([
                'name' => 'CRM Roadmap',
                'description' => 'Everything we need to ship the first release.',
            ]);

        $statuses = $project->statuses()->get();

        $samples = [
            ['Design the Kanban board', TaskPriority::High, 0],
            ['Wire up the task API', TaskPriority::Urgent, 1],
            ['Embed the Excalidraw whiteboard', TaskPriority::Medium, 2],
            ['Write feature tests', TaskPriority::Low, 3],
        ];

        foreach ($samples as $index => [$title, $priority, $statusIndex]) {
            $status = $statuses[$statusIndex % $statuses->count()];

            $task = Task::factory()
                ->inStatus($status)
                ->create([
                    'title' => $title,
                    'priority' => $priority,
                    'position' => $index,
                    'assigned_to' => $user->id,
                    'created_by' => $user->id,
                    'completed_at' => $status->is_done ? now() : null,
                ]);

            $task->assignees()->attach($user);
        }
    }
}
