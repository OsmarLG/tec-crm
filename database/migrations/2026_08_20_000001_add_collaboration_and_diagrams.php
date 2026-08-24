<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('project_user')) {
            Schema::create('project_user', function (Blueprint $table) {
                $table->foreignId('project_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('role', 30)->default('member');
                $table->timestamps();

                $table->primary(['project_id', 'user_id']);
            });
        }

        if (! Schema::hasTable('task_user')) {
            Schema::create('task_user', function (Blueprint $table) {
                $table->foreignId('task_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->timestamps();

                $table->primary(['task_id', 'user_id']);
            });
        }

        if (! Schema::hasColumn('tasks', 'details')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->json('details')->nullable()->after('description');
            });
        }

        $this->allowMultipleWhiteboardsPerProject();

        if (! Schema::hasColumn('project_whiteboards', 'name')) {
            Schema::table('project_whiteboards', function (Blueprint $table) {
                $table->string('name')->default('Diagrama principal')->after('project_id');
            });
        }

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
            $table->dropForeign(['project_id']);
            $table->dropColumn('name');
            $table->unique('project_id');
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('details');
        });

        Schema::dropIfExists('task_user');
        Schema::dropIfExists('project_user');
    }

    private function allowMultipleWhiteboardsPerProject(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            Schema::table('project_whiteboards', function (Blueprint $table) {
                $table->dropUnique(['project_id']);
            });

            return;
        }

        if ($this->mysqlForeignKeyExists('project_whiteboards', 'project_id')) {
            Schema::table('project_whiteboards', function (Blueprint $table) {
                $table->dropForeign(['project_id']);
            });
        }

        if ($this->mysqlIndexExists('project_whiteboards', 'project_whiteboards_project_id_unique')) {
            Schema::table('project_whiteboards', function (Blueprint $table) {
                $table->dropUnique(['project_id']);
            });
        }

        if (! $this->mysqlForeignKeyExists('project_whiteboards', 'project_id')) {
            Schema::table('project_whiteboards', function (Blueprint $table) {
                $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            });
        }
    }

    private function mysqlForeignKeyExists(string $table, string $column): bool
    {
        return DB::select(
            <<<'SQL'
                select constraint_name
                from information_schema.key_column_usage
                where table_schema = database()
                    and table_name = ?
                    and column_name = ?
                    and referenced_table_name is not null
                limit 1
            SQL,
            [$table, $column],
        ) !== [];
    }

    private function mysqlIndexExists(string $table, string $index): bool
    {
        return DB::select(
            <<<'SQL'
                select index_name
                from information_schema.statistics
                where table_schema = database()
                    and table_name = ?
                    and index_name = ?
                limit 1
            SQL,
            [$table, $index],
        ) !== [];
    }
};
