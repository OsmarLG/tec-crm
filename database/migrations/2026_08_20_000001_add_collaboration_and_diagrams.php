<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_user', function (Blueprint $table) {
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 30)->default('member');
            $table->timestamps();

            $table->primary(['project_id', 'user_id']);
        });

        Schema::create('task_user', function (Blueprint $table) {
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['task_id', 'user_id']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->json('details')->nullable()->after('description');
        });

        Schema::table('project_whiteboards', function (Blueprint $table) {
            $table->dropUnique(['project_id']);
            $table->string('name')->default('Diagrama principal')->after('project_id');
        });

        $now = now();

        DB::table('projects')->orderBy('id')->each(function (object $project) use ($now): void {
            DB::table('project_user')->insertOrIgnore([
                'project_id' => $project->id,
                'user_id' => $project->user_id,
                'role' => 'owner',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        DB::table('tasks')->whereNotNull('assigned_to')->orderBy('id')->each(function (object $task) use ($now): void {
            DB::table('task_user')->insertOrIgnore([
                'task_id' => $task->id,
                'user_id' => $task->assigned_to,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('project_whiteboards', function (Blueprint $table) {
            $table->dropColumn('name');
            $table->unique('project_id');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('details');
        });

        Schema::dropIfExists('task_user');
        Schema::dropIfExists('project_user');
    }
};
