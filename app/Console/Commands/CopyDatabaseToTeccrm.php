<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PDO;
use Throwable;

class CopyDatabaseToTeccrm extends Command
{
    protected $signature = 'db:copy-to-teccrm
        {--source=source : Connection to copy data from}
        {--target=mysql : Connection to copy data into}
        {--fresh : Drop and recreate target tables before copying}
        {--skip-create : Skip database creation and grants}
        {--yes : Skip confirmation prompt}';

    protected $description = 'Create the configured MySQL database, run migrations, and copy data from the current source database.';

    public function handle(): int
    {
        $source = (string) $this->option('source');
        $target = (string) $this->option('target');

        if ($this->hasPlaceholderPassword($target)) {
            $this->error('Set DB_PASSWORD in .env before running this command.');

            return self::FAILURE;
        }

        $targetDatabase = (string) Config::get("database.connections.{$target}.database");

        if (! in_array($targetDatabase, ['default', 'teccrm'], true)) {
            $this->error("Refusing to copy into [{$targetDatabase}]. Set DB_DATABASE to default or teccrm first.");

            return self::FAILURE;
        }

        if (! $this->option('yes') && ! $this->confirm("Copy data from [{$source}] into MySQL database [{$targetDatabase}]?")) {
            return self::SUCCESS;
        }

        try {
            if (! $this->option('skip-create')) {
                $this->createTargetDatabase($target);
                DB::purge($target);
            }

            $this->runMigrations($target);
            $this->copyTables($source, $target);
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Done. {$targetDatabase} is ready and the copied data is in MySQL.");

        return self::SUCCESS;
    }

    private function hasPlaceholderPassword(string $connection): bool
    {
        $password = (string) Config::get("database.connections.{$connection}.password");

        return $password === '' || str_contains($password, 'TU_PASSWORD');
    }

    private function createTargetDatabase(string $connection): void
    {
        $config = Config::get("database.connections.{$connection}");
        $database = (string) $config['database'];

        if (! preg_match('/^[A-Za-z0-9_]+$/', $database)) {
            throw new \RuntimeException("Invalid database name [{$database}].");
        }

        $charset = $config['charset'] ?? 'utf8mb4';
        $collation = $config['collation'] ?? 'utf8mb4_unicode_ci';
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? '3306';
        $username = env('DB_ADMIN_USERNAME', $config['username'] ?? 'root');
        $password = env('DB_ADMIN_PASSWORD', $config['password'] ?? '');
        $appUsername = $config['username'] ?? 'root';
        $appPassword = $config['password'] ?? '';

        $pdo = new PDO(
            "mysql:host={$host};port={$port};charset={$charset}",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ],
        );

        $quotedUser = $pdo->quote($appUsername);
        $quotedHost = $pdo->quote('%');
        $quotedPassword = $pdo->quote($appPassword);

        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET {$charset} COLLATE {$collation}");
        $pdo->exec("CREATE USER IF NOT EXISTS {$quotedUser}@{$quotedHost} IDENTIFIED BY {$quotedPassword}");
        $pdo->exec("GRANT ALL PRIVILEGES ON `{$database}`.* TO {$quotedUser}@{$quotedHost}");
        $pdo->exec('FLUSH PRIVILEGES');

        $this->info("Database [{$database}] exists.");
    }

    private function runMigrations(string $target): void
    {
        $command = $this->option('fresh') ? 'migrate:fresh' : 'migrate';

        $this->call($command, [
            '--database' => $target,
            '--force' => true,
        ]);
    }

    private function copyTables(string $source, string $target): void
    {
        $sourceConnection = DB::connection($source);
        $targetConnection = DB::connection($target);
        $sourceTables = $this->tablesByBaseName(Schema::connection($source)->getTableListing());
        $targetTables = $this->tablesByBaseName(Schema::connection($target)->getTableListing());
        $tables = array_values(array_intersect(array_keys($sourceTables), array_keys($targetTables)));

        if ($tables === []) {
            throw new \RuntimeException('No common tables found between source and target connections.');
        }

        $targetConnection->statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            foreach ($tables as $table) {
                $this->truncateTargetTable($targetConnection, $targetTables[$table]);
            }

            foreach ($tables as $table) {
                $this->copyTable(
                    $sourceConnection,
                    $targetConnection,
                    $source,
                    $target,
                    $sourceTables[$table],
                    $targetTables[$table],
                    $table,
                );
            }
        } finally {
            $targetConnection->statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    /**
     * Laravel can return schema-qualified table names such as public.users.
     */
    private function tablesByBaseName(array $tables): array
    {
        $normalized = [];

        foreach ($tables as $table) {
            $parts = explode('.', $table);
            $normalized[end($parts)] = $table;
        }

        return $normalized;
    }

    private function truncateTargetTable(ConnectionInterface $targetConnection, string $table): void
    {
        $wrappedTable = $targetConnection->getQueryGrammar()->wrapTable($table);

        $targetConnection->statement("TRUNCATE TABLE {$wrappedTable}");
    }

    private function copyTable(
        ConnectionInterface $sourceConnection,
        ConnectionInterface $targetConnection,
        string $source,
        string $target,
        string $sourceTable,
        string $targetTable,
        string $displayTable,
    ): void {
        $columns = Schema::connection($source)->getColumnListing($sourceTable);
        $total = $sourceConnection->table($sourceTable)->count();

        if ($total === 0) {
            $this->line("{$displayTable}: 0 rows");

            return;
        }

        $bar = $this->output->createProgressBar($total);
        $bar->setFormat(" {$displayTable} %current%/%max% [%bar%] %percent:3s%%");
        $bar->start();

        $orderColumn = $columns[0] ?? null;
        $query = $sourceConnection->table($sourceTable);

        if ($orderColumn !== null) {
            $query->orderBy($orderColumn);
        }

        $query->chunk(500, function ($rows) use ($targetConnection, $targetTable, $bar): void {
            $targetConnection->table($targetTable)->insert(
                $rows->map(fn (object $row): array => (array) $row)->all(),
            );

            $bar->advance($rows->count());
        });

        $bar->finish();
        $this->newLine();

        $this->syncAutoIncrement($targetConnection, $target, $targetTable);
    }

    private function syncAutoIncrement(ConnectionInterface $targetConnection, string $target, string $table): void
    {
        if (! in_array('id', Schema::connection($target)->getColumnListing($table), true)) {
            return;
        }

        $nextId = ((int) $targetConnection->table($table)->max('id')) + 1;
        $wrappedTable = $targetConnection->getQueryGrammar()->wrapTable($table);

        $targetConnection->statement("ALTER TABLE {$wrappedTable} AUTO_INCREMENT = {$nextId}");
    }
}
