<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->default('#64748b');
            $table->timestamps();
            $table->unique(['project_id', 'name']);
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->default('#64748b');
            $table->timestamps();
            $table->unique(['project_id', 'name']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('project_module_id')->nullable()->after('task_status_id')->constrained()->nullOnDelete();
        });

        Schema::create('tag_task', function (Blueprint $table) {
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->primary(['tag_id', 'task_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tag_task');
        Schema::table('tasks', fn (Blueprint $table) => $table->dropConstrainedForeignId('project_module_id'));
        Schema::dropIfExists('tags');
        Schema::dropIfExists('project_modules');
    }
};
