<?php

namespace App\Policies;

use App\Models\TaskStatus;
use App\Models\User;

class TaskStatusPolicy
{
    /**
     * Determine whether the user can view the column.
     */
    public function view(User $user, TaskStatus $status): bool
    {
        return $user->can('view', $status->project);
    }

    /**
     * Determine whether the user can update the column.
     */
    public function update(User $user, TaskStatus $status): bool
    {
        return $user->can('view', $status->project);
    }

    /**
     * Determine whether the user can delete the column.
     */
    public function delete(User $user, TaskStatus $status): bool
    {
        return $user->can('view', $status->project);
    }
}
